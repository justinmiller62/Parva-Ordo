import { authkitProxy } from "@workos-inc/authkit-nextjs";

/**
 * proxy / tenant-resolution layer (Architecture §4, §12; Next 16's renamed
 * `middleware`). WorkOS AuthKit refreshes the session here. Hostname -> parish_id
 * + brand resolution will be layered in alongside this.
 */
export default authkitProxy();

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.jpg|callback).*)"],
};
