-- 0002_login_lookup — map an authenticated identity (by email) to app role/parish.
--
-- At login the tenant is not yet known, so this lookup must read across tenants.
-- A SECURITY DEFINER function (owned by the superuser) does this safely: it is
-- scoped to a single email and bypasses RLS only for that narrow purpose.
-- Mirrors legacy Narthex's get_user_* helpers.

CREATE OR REPLACE FUNCTION login_lookup(p_email text)
RETURNS TABLE (
  user_id        uuid,
  display_name   text,
  is_super_admin boolean,
  role           membership_role,
  parish_id      uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.display_name, u.is_super_admin, m.role, m.parish_id
  FROM users u
  LEFT JOIN memberships m ON m.user_id = u.id
  WHERE lower(u.email) = lower(p_email)
  -- Prefer a parish-wide membership over a ministry-scoped one.
  ORDER BY (m.ministry_id IS NULL) DESC, m.created_at
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION login_lookup(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION login_lookup(text) TO parvaordo_app;
