import { lookupAppUser, resetStudentProgress } from "@parvaordo/core";
import { devBypassEnabled } from "@/src/lib/auth";

/**
 * Dev/test-only: clear a user's answers + lesson progress so wizard tests start
 * clean. Gated like /dev/login (non-production + AUTH_BYPASS=1).
 */
export async function GET(request: Request): Promise<Response> {
  if (!devBypassEnabled()) {
    return new Response("Not found", { status: 404 });
  }
  const email = new URL(request.url).searchParams.get("email");
  if (!email) return new Response("email query param required", { status: 400 });

  const id = await lookupAppUser(email);
  if (id?.parishId) {
    await resetStudentProgress(id.parishId, id.userId);
  }
  return new Response("ok");
}
