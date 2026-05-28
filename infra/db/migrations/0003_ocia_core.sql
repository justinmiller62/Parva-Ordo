-- 0003_ocia_core — OCIA lesson model, ported & cleaned from legacy Narthex.
--
-- THREE-TIER CONTENT (lessons, lesson_items) — scope cascades DOWN:
--   global  -> visible to every parish (shared library)
--   diocese -> visible only to parishes in that diocese
--   parish  -> visible only to that parish
-- A parish sees: global ∪ (diocese = its diocese) ∪ (parish = itself).
-- WRITE is restricted to scope='parish' owned by the active parish, so
-- PARISH-CREATED CONTENT STAYS IN THE PARISH — it can never be global/diocese
-- and is invisible to other parishes. Global/diocese content is curated via an
-- elevated path (system / diocese admin), not by parishes. Fork-and-edit copies
-- upstream content into a new scope='parish' lesson (source_lesson_id provenance).
--
-- ACTIVITY (cohorts, schedules, answers, …): parish_id NOT NULL, strict
-- tenant isolation (Architecture §7).
--
-- Cleanups vs Narthex: blocks + questions unified into one ordered `lesson_items`
-- list (single position sequence, `kind` discriminator). Video plumbing
-- (videos/segments, Mux→Bunny) deferred to Slice 5. Role-based write
-- authorization (teacher vs student) is enforced in the app layer.

CREATE TYPE content_scope AS ENUM ('global', 'diocese', 'parish');
CREATE TYPE lesson_item_kind AS ENUM ('reading', 'video', 'question');

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ─── CONTENT (three-tier scope) ─────────────────────────────────────────────

CREATE TABLE lessons (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope               content_scope NOT NULL DEFAULT 'parish',
  diocese_id          uuid REFERENCES dioceses(id) ON DELETE CASCADE,  -- set iff scope='diocese'
  parish_id           uuid REFERENCES parishes(id) ON DELETE CASCADE,  -- set iff scope='parish'
  source_lesson_id    uuid REFERENCES lessons(id) ON DELETE SET NULL,  -- fork provenance
  title               text NOT NULL,
  description         text,
  discussion_template text,
  lesson_order        int NOT NULL DEFAULT 0,
  created_by          uuid REFERENCES users(id) ON DELETE SET NULL,    -- NULL for system content
  published_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lessons_scope_owner_chk CHECK (
    (scope = 'global'  AND diocese_id IS NULL     AND parish_id IS NULL) OR
    (scope = 'diocese' AND diocese_id IS NOT NULL AND parish_id IS NULL) OR
    (scope = 'parish'  AND parish_id  IS NOT NULL AND diocese_id IS NULL)
  )
);
CREATE INDEX lessons_parish_id_idx ON lessons(parish_id);
CREATE INDEX lessons_diocese_id_idx ON lessons(diocese_id);
CREATE INDEX lessons_scope_idx ON lessons(scope);
CREATE TRIGGER lessons_set_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Ordered lesson content; `kind` discriminates. scope/diocese_id/parish_id
-- mirror the owning lesson so the same visibility policy applies.
--   reading  -> content = { "html": "..." }
--   question -> content = { "prompt": "...", "format": "open_ended"|"multiple_choice",
--                           "choices": [...]?, "expected_answer": "..."? }
--   video    -> content = { "video_id": "...", "start_ms": int, "end_ms": int }  (Slice 5)
CREATE TABLE lesson_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope       content_scope NOT NULL DEFAULT 'parish',
  diocese_id  uuid REFERENCES dioceses(id) ON DELETE CASCADE,
  parish_id   uuid REFERENCES parishes(id) ON DELETE CASCADE,
  lesson_id   uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  position    int NOT NULL,
  kind        lesson_item_kind NOT NULL,
  content     jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, position),
  CONSTRAINT lesson_items_scope_owner_chk CHECK (
    (scope = 'global'  AND diocese_id IS NULL     AND parish_id IS NULL) OR
    (scope = 'diocese' AND diocese_id IS NOT NULL AND parish_id IS NULL) OR
    (scope = 'parish'  AND parish_id  IS NOT NULL AND diocese_id IS NULL)
  )
);
CREATE INDEX lesson_items_lesson_id_idx ON lesson_items(lesson_id);
CREATE INDEX lesson_items_parish_id_idx ON lesson_items(parish_id);

-- ─── ACTIVITY (parish_id NOT NULL; strict isolation) ────────────────────────

CREATE TABLE cohorts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id           uuid NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  name                text NOT NULL,
  start_date          date,
  end_date            date,
  discussion_day      text,
  discussion_time     text,
  discussion_location text,
  sequential          boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cohorts_parish_id_idx ON cohorts(parish_id);

CREATE TABLE cohort_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id  uuid NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  cohort_id  uuid NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cohort_id, student_id)
);
CREATE INDEX cohort_members_cohort_id_idx ON cohort_members(cohort_id);

CREATE TABLE learning_paths (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id  uuid NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  cohort_id  uuid NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX learning_paths_cohort_id_idx ON learning_paths(cohort_id);

CREATE TABLE learning_path_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id  uuid NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  path_id    uuid NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (path_id, student_id)
);
CREATE INDEX learning_path_members_path_id_idx ON learning_path_members(path_id);

CREATE TABLE learning_path_lessons (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id   uuid NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  path_id     uuid NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  lesson_id   uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,  -- may be global/diocese
  week_number int NOT NULL,
  UNIQUE (path_id, lesson_id),
  UNIQUE (path_id, week_number)
);
CREATE INDEX learning_path_lessons_path_id_idx ON learning_path_lessons(path_id);

CREATE TABLE cohort_schedule (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id        uuid NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  cohort_id        uuid NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  lesson_id        uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,  -- may be global/diocese
  release_date     date,
  discussion_date  date NOT NULL,
  due_date         date,
  week_number      int,
  is_date_override boolean NOT NULL DEFAULT false,
  skip_sequence    boolean NOT NULL DEFAULT false,
  UNIQUE (cohort_id, lesson_id)
);
CREATE INDEX cohort_schedule_cohort_id_idx ON cohort_schedule(cohort_id);

CREATE TABLE answers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id    uuid NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,  -- answering parish
  item_id      uuid NOT NULL REFERENCES lesson_items(id) ON DELETE CASCADE,
  student_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text         text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  edited_at    timestamptz,
  UNIQUE (item_id, student_id)
);
CREATE INDEX answers_item_id_idx ON answers(item_id);
CREATE INDEX answers_student_id_idx ON answers(student_id);

CREATE TABLE student_questions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id  uuid NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  lesson_id  uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX student_questions_lesson_id_idx ON student_questions(lesson_id);

CREATE TABLE student_feedback (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id  uuid NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  lesson_id  uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX student_feedback_lesson_id_idx ON student_feedback(lesson_id);

-- ─── RLS: content (three-tier read; parish-only write) ──────────────────────
-- "my diocese" is resolved from the active parish via subquery — no extra GUC.

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY lessons_read ON lessons FOR SELECT USING (
  scope = 'global'
  OR (scope = 'diocese' AND diocese_id = (SELECT p.diocese_id FROM parishes p WHERE p.id = current_setting('app.parish_id', true)::uuid))
  OR (scope = 'parish'  AND parish_id  = current_setting('app.parish_id', true)::uuid)
);
CREATE POLICY lessons_insert ON lessons FOR INSERT
  WITH CHECK (scope = 'parish' AND parish_id = current_setting('app.parish_id', true)::uuid);
CREATE POLICY lessons_update ON lessons FOR UPDATE
  USING (scope = 'parish' AND parish_id = current_setting('app.parish_id', true)::uuid)
  WITH CHECK (scope = 'parish' AND parish_id = current_setting('app.parish_id', true)::uuid);
CREATE POLICY lessons_delete ON lessons FOR DELETE
  USING (scope = 'parish' AND parish_id = current_setting('app.parish_id', true)::uuid);

CREATE POLICY lesson_items_read ON lesson_items FOR SELECT USING (
  scope = 'global'
  OR (scope = 'diocese' AND diocese_id = (SELECT p.diocese_id FROM parishes p WHERE p.id = current_setting('app.parish_id', true)::uuid))
  OR (scope = 'parish'  AND parish_id  = current_setting('app.parish_id', true)::uuid)
);
CREATE POLICY lesson_items_insert ON lesson_items FOR INSERT
  WITH CHECK (scope = 'parish' AND parish_id = current_setting('app.parish_id', true)::uuid);
CREATE POLICY lesson_items_update ON lesson_items FOR UPDATE
  USING (scope = 'parish' AND parish_id = current_setting('app.parish_id', true)::uuid)
  WITH CHECK (scope = 'parish' AND parish_id = current_setting('app.parish_id', true)::uuid);
CREATE POLICY lesson_items_delete ON lesson_items FOR DELETE
  USING (scope = 'parish' AND parish_id = current_setting('app.parish_id', true)::uuid);

-- ─── RLS: activity (strict tenant isolation) ────────────────────────────────

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cohorts', 'cohort_members', 'learning_paths', 'learning_path_members',
    'learning_path_lessons', 'cohort_schedule', 'answers',
    'student_questions', 'student_feedback'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (parish_id = current_setting(''app.parish_id'', true)::uuid) WITH CHECK (parish_id = current_setting(''app.parish_id'', true)::uuid)',
      t || '_isolation', t);
  END LOOP;
END$$;
