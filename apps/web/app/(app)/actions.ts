"use server";

import { signOutAndRedirect } from "@/src/lib/auth";

export async function signOutAction(): Promise<void> {
  await signOutAndRedirect();
}
