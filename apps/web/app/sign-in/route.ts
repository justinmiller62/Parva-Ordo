import { redirect } from "next/navigation";
import { getSignInUrl } from "@workos-inc/authkit-nextjs";

// Route Handler — cookies are writable here, so AuthKit can store PKCE/state
// before redirecting to the hosted sign-in screen. The login page links here.
export async function GET() {
  redirect(await getSignInUrl());
}
