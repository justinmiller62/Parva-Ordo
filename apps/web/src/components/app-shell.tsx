"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  BookOpenCheck,
  Calendar,
  Film,
  Heart,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Settings,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@parvaordo/shared";
import { signOutAction } from "@/app/(app)/actions";

interface NavItem {
  label: string;
  Icon: LucideIcon;
  href?: string; // present + live = navigable; otherwise "coming soon"
  live?: boolean;
}

// OCIA module nav (matches Narthex). Only `live` items navigate today; the rest
// are shown-but-disabled until their module ships.
const CATECHIST_LINKS: NavItem[] = [
  { href: "/lessons", label: "Lesson Builder", Icon: BookOpen, live: true },
  { label: "Videos", Icon: Film },
  { label: "Calendar", Icon: Calendar },
  { label: "Cohorts", Icon: Users },
  { label: "Dictionary", Icon: BookOpenCheck },
  { label: "Prayers", Icon: Heart },
  { label: "Announcements", Icon: Megaphone },
  { label: "Discussion", Icon: MessageSquare },
  { label: "Settings", Icon: Settings },
];

const LEARNER_LINKS: NavItem[] = [
  { href: "/lessons", label: "My Lessons", Icon: BookOpen, live: true },
  { label: "Calendar", Icon: Calendar },
  { label: "Dictionary", Icon: BookOpenCheck },
  { label: "Prayers", Icon: Heart },
  { label: "Announcements", Icon: Megaphone },
  { label: "Discussion", Icon: MessageSquare },
];

function ociaLinks(role: Role | null): NavItem[] {
  if (role === "catechumen_candidate") return LEARNER_LINKS;
  if (role === "admin" || role === "catechist" || role === "super_admin") return CATECHIST_LINKS;
  return []; // parish_member: no OCIA access
}

export function AppShell({
  brandName,
  displayName,
  role,
  children,
}: {
  brandName: string;
  displayName: string;
  role: Role | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  function renderItem(item: NavItem) {
    const active = item.live && item.href ? isActive(item.href) : false;
    const base = "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
    const Icon = item.Icon;

    if (item.live && item.href) {
      return (
        <Link
          key={item.label}
          href={item.href}
          onClick={() => setOpen(false)}
          data-testid={`nav-${item.href === "/" ? "dashboard" : item.href.slice(1)}`}
          className={`${base} ${active ? "bg-gold/15 text-gold" : "text-gray-400 hover:bg-white/10 hover:text-gray-200"}`}
        >
          <Icon className="h-5 w-5" />
          {item.label}
        </Link>
      );
    }
    return (
      <span
        key={item.label}
        title="Coming soon"
        className={`${base} cursor-default text-gray-500/50`}
      >
        <Icon className="h-5 w-5" />
        {item.label}
      </span>
    );
  }

  const sidebar = (
    <aside className="flex h-dvh w-64 flex-col bg-navy">
      <div className="border-b border-white/10 px-5 py-5">
        <span className="font-heading text-lg font-semibold tracking-[0.18em] text-gold">
          {brandName.toUpperCase()}
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {renderItem({ href: "/", label: "Dashboard", Icon: LayoutDashboard, live: true })}
        {role === "super_admin" ? (
          <span className="flex cursor-default items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-400/70" title="Coming soon">
            <Shield className="h-5 w-5" />
            Super Admin
          </span>
        ) : null}
        {ociaLinks(role).map(renderItem)}
      </nav>

      <div className="border-t border-white/10 p-3">
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-white/10 hover:text-gray-200"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen">
      <div className="hidden lg:block">{sidebar}</div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative h-full w-64">{sidebar}</div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-gray-200 bg-parchment px-4 py-2.5">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="rounded-md p-1 text-navy hover:bg-gray-100 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-heading text-base font-semibold tracking-wider text-burgundy lg:hidden">
            {brandName}
          </span>
          <div className="flex-1" />
          <span className="text-sm font-medium text-gray-600">{displayName}</span>
        </div>
        <main className="flex-1 overflow-auto bg-parchment p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
