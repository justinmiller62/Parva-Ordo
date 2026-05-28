import { redirect } from "next/navigation";
import { devBypassEnabled, setDevUser } from "@/src/lib/auth";

/**
 * Dev/test-only sign-in bypass: /dev/login?email=admin@parvaordo.test[&redirect=/path].
 * 404s unless the bypass is enabled (non-production + AUTH_BYPASS=1).
 */
export async function GET(request: Request): Promise<Response> {
  if (!devBypassEnabled()) {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  if (!email) {
    return new Response("email query param required", { status: 400 });
  }

  await setDevUser(email);
  redirect(url.searchParams.get("redirect") ?? "/");
}
