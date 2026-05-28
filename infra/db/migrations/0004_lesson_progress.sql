-- 0004_lesson_progress — per-student, per-item completion tracking.
--
-- Powers the one-item-at-a-time wizard: "Step N of M", resume-at-first-incomplete,
-- and advance-gating (can't move on until the current item is complete). Generalizes
-- Narthex's video_watches to every item kind (reading read / video watched / question
-- answered). `max_reached_ms` carries video resume + seek-enforcement state (Slice 5).
-- parish-scoped activity table (strict tenant isolation, Architecture §7).

CREATE TABLE lesson_item_progress (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id     uuid NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  student_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id       uuid NOT NULL REFERENCES lesson_items(id) ON DELETE CASCADE,
  completed     boolean NOT NULL DEFAULT false,
  max_reached_ms int,                 -- video resume / seek enforcement (Slice 5)
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, item_id)
);
CREATE INDEX lesson_item_progress_student_idx ON lesson_item_progress(student_id);
CREATE INDEX lesson_item_progress_parish_id_idx ON lesson_item_progress(parish_id);

ALTER TABLE lesson_item_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY lesson_item_progress_isolation ON lesson_item_progress
  FOR ALL
  USING (parish_id = current_setting('app.parish_id', true)::uuid)
  WITH CHECK (parish_id = current_setting('app.parish_id', true)::uuid);
