-- 0001_foundation — tenancy core: diocese -> parish -> ministry -> user/membership.
-- RLS isolation (Architecture §7, §12). Run as the superuser (table owner).

-- App role: the runtime connects as this NON-superuser, NON-bypassrls role so
-- RLS policies actually apply. Migrations/seed run as the owning superuser.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'parvaordo_app') THEN
    CREATE ROLE parvaordo_app LOGIN PASSWORD 'app_local_pw' NOSUPERUSER NOBYPASSRLS;
  END IF;
END$$;

GRANT USAGE ON SCHEMA public TO parvaordo_app;

-- Per-parish roles (Architecture §8); mirrors legacy Narthex membership roles.
CREATE TYPE membership_role AS ENUM (
  'super_admin', 'admin', 'teacher', 'student', 'parish_member'
);

CREATE TABLE dioceses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  short_code  text UNIQUE,
  brand       jsonb,                 -- diocese-level brand overrides (cascade tier)
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE parishes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diocese_id       uuid REFERENCES dioceses(id) ON DELETE SET NULL,
  name             text NOT NULL,
  slug             text UNIQUE NOT NULL,
  primary_hostname text UNIQUE,      -- hostname -> parish resolution (proxy.ts)
  brand            jsonb,            -- parish-level brand overrides (most specific)
  dedicated_db_url text,             -- Architecture §7: reserved, always NULL in Phase 1
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Ministries/councils live within a parish (diocese -> parish -> ministry).
-- ministry_id on memberships is the hook for ministry-scoped RBAC later.
CREATE TABLE ministries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id   uuid NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  name        text NOT NULL,
  kind        text,                  -- e.g. 'council' | 'formation' | 'liturgical'
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ministries_parish_id_idx ON ministries(parish_id);

CREATE TABLE users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text UNIQUE NOT NULL,
  display_name   text NOT NULL,
  is_super_admin boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parish_id   uuid NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  ministry_id uuid REFERENCES ministries(id) ON DELETE CASCADE,  -- NULL = parish-wide
  role        membership_role NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, parish_id, ministry_id, role)
);
CREATE INDEX memberships_parish_id_idx ON memberships(parish_id);
CREATE INDEX memberships_user_id_idx ON memberships(user_id);

-- Row-Level Security: the non-negotiable isolation mechanism (Architecture §7).
-- `app.parish_id` is set transaction-local by getDb(parishId) before each query.
ALTER TABLE parishes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY parish_isolation ON parishes
  USING (id = current_setting('app.parish_id', true)::uuid);

CREATE POLICY ministry_isolation ON ministries
  USING (parish_id = current_setting('app.parish_id', true)::uuid);

CREATE POLICY membership_isolation ON memberships
  USING (parish_id = current_setting('app.parish_id', true)::uuid);

-- Grants. RLS still applies to parvaordo_app (non-owner, non-bypass).
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO parvaordo_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO parvaordo_app;
