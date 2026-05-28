-- 0005_ocia_roles — rename RBAC roles to OCIA vocabulary.
--   teacher -> catechist
--   student -> catechumen_candidate   (one combined learner role, displayed "Catechumen/Candidate")
-- admin / super_admin / parish_member unchanged. RENAME VALUE updates all existing
-- membership rows automatically and is transaction-safe.

ALTER TYPE membership_role RENAME VALUE 'teacher' TO 'catechist';
ALTER TYPE membership_role RENAME VALUE 'student' TO 'catechumen_candidate';
