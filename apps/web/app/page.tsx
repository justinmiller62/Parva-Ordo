import Image from "next/image";
import { redirect } from "next/navigation";
import { signOut, withAuth } from "@workos-inc/authkit-nextjs";
import { getLessons, getMinistries, getParishById, lookupAppUser } from "@parvaordo/core";
import { getBrand } from "@/src/lib/brand";

export default async function HomePage() {
  const { user } = await withAuth();
  if (!user) redirect("/login");

  const brand = await getBrand();
  const identity = await lookupAppUser(user.email);

  const parishId = identity?.parishId ?? null;
  const parish = parishId ? await getParishById(parishId) : null;
  const ministries = parishId ? await getMinistries(parishId) : [];
  const lessons = parishId ? await getLessons(parishId) : [];

  const displayName =
    identity?.displayName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email;

  async function handleSignOut() {
    "use server";
    await signOut();
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <header className="flex items-center justify-between border-b border-navy/10 pb-5">
        <div className="flex items-center gap-3">
          <Image src={brand.logoSrc} alt={brand.name} width={40} height={59} className="h-10 w-auto rounded" />
          <span className="font-heading text-lg text-burgundy">{brand.name}</span>
        </div>
        <form action={handleSignOut}>
          <button
            type="submit"
            className="rounded-md border border-navy/20 px-3 py-1.5 text-sm font-medium text-navy transition hover:bg-navy/5"
          >
            Sign out
          </button>
        </form>
      </header>

      <section className="mt-10">
        <h1 className="text-2xl text-navy">Welcome, {displayName}.</h1>
        <p className="mt-2 text-navy/70">{brand.tagline}</p>

        {identity?.parishId ? (
          <>
            <dl className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-navy/10 bg-cream/40 p-5 text-sm">
              <div>
                <dt className="font-semibold text-navy/60">Role</dt>
                <dd className="mt-0.5 text-navy">{identity.role ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-navy/60">Parish</dt>
                <dd className="mt-0.5 text-navy">{parish?.name ?? "—"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="font-semibold text-navy/60">Email</dt>
                <dd className="mt-0.5 text-navy">{user.email}</dd>
              </div>
            </dl>

            <section className="mt-6">
              <h2 className="text-sm font-semibold text-navy/60">
                Ministries &amp; councils ({ministries.length})
              </h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {ministries.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-full border border-gold/50 bg-gold/10 px-3 py-1 text-sm text-navy"
                  >
                    {m.name}
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-6">
              <h2 className="text-sm font-semibold text-navy/60">
                Lessons available to you ({lessons.length})
              </h2>
              <ul className="mt-2 divide-y divide-navy/10 rounded-xl border border-navy/10 bg-cream/40">
                {lessons.map((l) => (
                  <li key={l.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-navy">{l.title}</span>
                    <span
                      className={
                        "ml-3 rounded-full px-2 py-0.5 text-xs font-medium " +
                        (l.scope === "global"
                          ? "bg-gold/20 text-burgundy"
                          : l.scope === "diocese"
                            ? "bg-navy/10 text-navy"
                            : "bg-rose/15 text-rose")
                      }
                    >
                      {l.scope}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : (
          <p className="mt-6 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm text-navy/70">
            You&apos;re signed in as <strong>{user.email}</strong>, but no parish is
            assigned to this account yet.
          </p>
        )}

        <p className="mt-8 text-sm text-navy/50">
          Authenticated via WorkOS · parish data live from Postgres (RLS-scoped).
        </p>
      </section>
    </main>
  );
}
