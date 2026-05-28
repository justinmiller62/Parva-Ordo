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

/**
 * Upsert a student's answer to a question item. parish-scoped (the answering
 * parish), so RLS isolates answers even when the lesson is global/diocese.
 * Authorization (who may answer) is the caller's concern; student_id is always
 * the acting user, so a user can only write their own answer.
 */
export async function submitAnswer(params: {
  parishId: string;
  studentId: string;
  itemId: string;
  text: string;
}): Promise<void> {
  await getDb(params.parishId).query(
    `INSERT INTO answers (parish_id, item_id, student_id, text)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (item_id, student_id)
     DO UPDATE SET text = EXCLUDED.text, edited_at = now()`,
    [params.parishId, params.itemId, params.studentId, params.text],
  );
}

/** Mark a lesson item complete for a student (idempotent). */
export async function markItemComplete(params: {
  parishId: string;
  studentId: string;
  itemId: string;
}): Promise<void> {
  await getDb(params.parishId).query(
    `INSERT INTO lesson_item_progress (parish_id, student_id, item_id, completed)
     VALUES ($1, $2, $3, true)
     ON CONFLICT (student_id, item_id)
     DO UPDATE SET completed = true, updated_at = now()`,
    [params.parishId, params.studentId, params.itemId],
  );
}

/** Clear a student's answers + progress (dev/test reset; parish-scoped via RLS). */
export async function resetStudentProgress(parishId: string, studentId: string): Promise<void> {
  const db = getDb(parishId);
  await db.query("DELETE FROM answers WHERE student_id = $1", [studentId]);
  await db.query("DELETE FROM lesson_item_progress WHERE student_id = $1", [studentId]);
}

/** The set of lesson_item ids a student has completed within a lesson. */
export async function getCompletedItems(
  parishId: string,
  studentId: string,
  lessonId: string,
): Promise<Set<string>> {
  const { rows } = await getDb(parishId).query<{ item_id: string }>(
    `SELECT p.item_id
       FROM lesson_item_progress p
       JOIN lesson_items li ON li.id = p.item_id
      WHERE li.lesson_id = $1 AND p.student_id = $2 AND p.completed = true`,
    [lessonId, studentId],
  );
  return new Set(rows.map((r) => r.item_id));
}

/** A student's saved answers for a lesson, keyed by lesson_item id. */
export async function getAnswersForLesson(
  parishId: string,
  studentId: string,
  lessonId: string,
): Promise<Record<string, string>> {
  const { rows } = await getDb(parishId).query<{ item_id: string; text: string }>(
    `SELECT a.item_id, a.text
       FROM answers a
       JOIN lesson_items li ON li.id = a.item_id
      WHERE li.lesson_id = $1 AND a.student_id = $2`,
    [lessonId, studentId],
  );
  return Object.fromEntries(rows.map((r) => [r.item_id, r.text]));
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

export type LessonItemKind = "reading" | "video" | "question";

export interface LessonItem {
  id: string;
  position: number;
  kind: LessonItemKind;
  content: Record<string, unknown>;
}

export interface LessonDetail {
  id: string;
  title: string;
  description: string | null;
  scope: ContentScope;
  items: LessonItem[];
}

/**
 * A single lesson with its ordered items, if visible to the parish (RLS returns
 * the lesson only when global / in the parish's diocese / owned by the parish).
 */
export async function getLessonDetail(parishId: string, lessonId: string): Promise<LessonDetail | null> {
  const db = getDb(parishId);

  const { rows: lessonRows } = await db.query<{
    id: string;
    title: string;
    description: string | null;
    scope: ContentScope;
  }>("SELECT id, title, description, scope FROM lessons WHERE id = $1", [lessonId]);

  const lesson = lessonRows[0];
  if (!lesson) return null;

  const { rows: items } = await db.query<{
    id: string;
    position: number;
    kind: LessonItemKind;
    content: Record<string, unknown>;
  }>("SELECT id, position, kind, content FROM lesson_items WHERE lesson_id = $1 ORDER BY position", [lessonId]);

  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    scope: lesson.scope,
    items: items.map((i) => ({ id: i.id, position: i.position, kind: i.kind, content: i.content })),
  };
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
