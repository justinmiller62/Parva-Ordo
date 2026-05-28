import Link from "next/link";
import { getLessons, getMinistries, getParishById } from "@parvaordo/core";
import { ROLE_LABELS } from "@parvaordo/shared";
import { getViewer } from "@/src/lib/viewer";

const SCOPE_BADGE: Record<string, string> = {
  global: "bg-gold/20 text-gold-dark",
  diocese: "bg-navy/10 text-navy",
  parish: "bg-rose/15 text-rose",
};

export default async function HomePage() {
  const viewer = await getViewer();
  if (!viewer) return null; // layout guards; this narrows types

  const { authed, identity } = viewer;
  const parishId = identity?.parishId ?? null;

  const [parish, ministries, lessons] = await Promise.all([
    parishId ? getParishById(parishId) : Promise.resolve(null),
    parishId ? getMinistries(parishId) : Promise.resolve([]),
    parishId ? getLessons(parishId) : Promise.resolve([]),
  ]);

  const displayName = identity?.displayName || authed.name || authed.email;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl text-navy">Welcome, {displayName}.</h1>
      <p className="mt-1 text-gray-500">Many small things, rightly ordered.</p>

      {!parishId ? (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          You&apos;re signed in as <strong>{authed.email}</strong>, but no parish is assigned to this
          account yet.
        </div>
      ) : (
        <>
          <dl className="mt-6 grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-white p-5 text-sm sm:grid-cols-3">
            <div>
              <dt className="font-semibold text-gray-400">Role</dt>
              <dd className="mt-0.5 text-navy">{identity?.role ? ROLE_LABELS[identity.role] : "—"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-400">Parish</dt>
              <dd className="mt-0.5 text-navy">{parish?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-400">Email</dt>
              <dd className="mt-0.5 truncate text-navy">{authed.email}</dd>
            </div>
          </dl>

          <section className="mt-6">
            <h2 className="text-sm font-semibold text-gray-400">
              Ministries &amp; councils ({ministries.length})
            </h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {ministries.map((m) => (
                <li
                  key={m.id}
                  className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-sm text-navy"
                >
                  {m.name}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-6">
            <h2 className="mb-2 text-sm font-semibold text-gray-400">
              Lessons available to you ({lessons.length})
            </h2>
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
              {lessons.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/lessons/${l.id}`}
                    className="flex items-center justify-between px-4 py-3 text-sm transition hover:bg-parchment"
                  >
                    <span className="text-navy">{l.title}</span>
                    <span
                      className={`ml-3 rounded-full px-2 py-0.5 text-xs font-medium ${SCOPE_BADGE[l.scope] ?? ""}`}
                    >
                      {l.scope}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
