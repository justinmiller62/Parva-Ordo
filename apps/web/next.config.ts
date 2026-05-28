import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; let Next compile them.
  transpilePackages: ["@parvaordo/core", "@parvaordo/shared"],
  // `pg` is a Node driver — keep it external to server bundles, not bundled.
  serverExternalPackages: ["pg"],
};

export default nextConfig;
