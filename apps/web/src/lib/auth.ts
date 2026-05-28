import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signOut, withAuth } from "@workos-inc/authkit-nextjs";

const DEV_BYPASS_COOKIE = "po_dev_user";

/**
 * Dev/test-only auth bypass. DOUBLE-GATED: only when not in production AND
 * AUTH_BYPASS=1. Lets tests and local dev authenticate as a seeded user via
 * /dev/login?email=… without the WorkOS browser flow. Real WorkOS login is
 * unaffected. Can never activate in a production build.
 */
export function devBypassEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.AUTH_BYPASS === "1";
}

export interface AuthedUser {
  email: string;
  name: string | null;
}

/** The current user from the bypass cookie (dev) or the WorkOS session. */
export async function getAuthedUser(): Promise<AuthedUser | null> {
  if (devBypassEnabled()) {
    const email = (await cookies()).get(DEV_BYPASS_COOKIE)?.value;
    if (email) return { email, name: null };
  }

  const { user } = await withAuth();
  if (!user) return null;
  return {
    email: user.email,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || null,
  };
}

/** Set the dev bypass user (called only from the gated /dev/login route). */
export async function setDevUser(email: string): Promise<void> {
  (await cookies()).set(DEV_BYPASS_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

/** Sign out of whichever session is active, then land on /login. */
export async function signOutAndRedirect(): Promise<void> {
  if (devBypassEnabled()) {
    const store = await cookies();
    if (store.get(DEV_BYPASS_COOKIE)?.value) {
      store.delete(DEV_BYPASS_COOKIE);
      redirect("/login");
    }
  }
  await signOut();
}
