import { handleAuth } from "@workos-inc/authkit-nextjs";

// WorkOS redirects here after sign-in; exchange the code, seal the session,
// and land the user on the dashboard.
export const GET = handleAuth({ returnPathname: "/" });
