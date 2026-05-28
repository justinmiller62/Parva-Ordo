import type { Role } from "@parvaordo/shared";
import { getDb } from "./client";

export interface ParishRow {
  id: string;
  name: string;
  slug: string;
}

export interface AppIdentity {
  userId: string;
  displayName: string;
  isSuperAdmin: boolean;
  /** Null when the authenticated user has no membership yet (e.g. fresh signup). */
  role: Role | null;
  parishId: string | null;
}

export type ContentScope = "global" | "diocese" | "parish";

export interface LessonRow {
  id: string;
  title: string;
  scope: ContentScope;
  lessonOrder: number;
  publishedAt: string | null;
}

/**
 * Lessons visible to a parish: the three-tier cascade (global ∪ its diocese ∪
 * its own parish) is enforced by RLS; this just reads what the parish may see.
 */
export async function getLessons(parishId: string): Promise<LessonRow[]> {
  const { rows } = await getDb(parishId).query<{
    id: string;
    title: string;
    scope: ContentScope;
    lesson_order: number;
    published_at: string | null;
  }>("SELECT id, title, scope, lesson_order, published_at FROM lessons ORDER BY scope, lesson_order, title");

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    scope: r.scope,
    lessonOrder: r.lesson_order,
    publishedAt: r.published_at,
  }));
}

/**
 * Map an authenticated email to the app's role/parish via the login_lookup
 * SECURITY DEFINER function (cross-tenant, pre-tenant-context). Returns null
 * when no matching user exists.
 */
export async function lookupAppUser(email: string): Promise<AppIdentity | null> {
  const { rows } = await getDb(null).query<{
    user_id: string;
    display_name: string;
    is_super_admin: boolean;
    role: Role | null;
    parish_id: string | null;
  }>("SELECT user_id, display_name, is_super_admin, role, parish_id FROM login_lookup($1)", [email]);

  const row = rows[0];
  if (!row) return null;
  return {
    userId: row.user_id,
    displayName: row.display_name,
    isSuperAdmin: row.is_super_admin,
    role: row.role,
    parishId: row.parish_id,
  };
}

export interface MinistryRow {
  id: string;
  name: string;
  kind: string | null;
}

/** The active parish (RLS returns only the row matching app.parish_id). */
export async function getParishById(parishId: string): Promise<ParishRow | null> {
  const { rows } = await getDb(parishId).query<ParishRow>(
    "SELECT id, name, slug FROM parishes",
  );
  return rows[0] ?? null;
}

/** Ministries within the active parish. */
export async function getMinistries(parishId: string): Promise<MinistryRow[]> {
  const { rows } = await getDb(parishId).query<MinistryRow>(
    "SELECT id, name, kind FROM ministries ORDER BY name",
  );
  return rows;
}
