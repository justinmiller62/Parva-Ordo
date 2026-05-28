import { headers } from "next/headers";
import { resolveBrand } from "@parvaordo/core";
import type { BrandTokens } from "@parvaordo/shared";

/** Resolve the brand for the current request hostname (cascade lives in core). */
export async function getBrand(): Promise<BrandTokens> {
  const host = (await headers()).get("host");
  return resolveBrand(host);
}
