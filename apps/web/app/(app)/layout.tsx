import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/src/components/app-shell";
import { getBrand } from "@/src/lib/brand";
import { getViewer } from "@/src/lib/viewer";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const brand = await getBrand();
  const displayName =
    viewer.identity?.displayName || viewer.authed.name || viewer.authed.email;

  return (
    <AppShell brandName={brand.name} displayName={displayName} role={viewer.identity?.role ?? null}>
      {children}
    </AppShell>
  );
}
