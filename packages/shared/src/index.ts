// Framework-agnostic types shared across the monorepo. No React, no Next.

/**
 * Per-parish roles. Mirrors the locked architecture (Architecture §8) and the
 * legacy Narthex membership roles. Roles are scoped to a parish, not global.
 */
export type Role = "super_admin" | "admin" | "teacher" | "student" | "parish_member";

/**
 * Brand tokens resolved per request. The cascade is
 * default Parva Ordo -> diocese -> parish (most specific wins).
 * See the branding requirement: per-parish AND per-diocese theming.
 */
export interface BrandTokens {
  /** Display name shown in the UI (e.g. "Parva Ordo", "St. Mary Parish"). */
  name: string;
  /** Public path to the logo asset. */
  logoSrc: string;
  /** Short tagline / mission line. */
  tagline: string;
  colors: {
    burgundy: string;
    gold: string;
    navy: string;
    cream: string;
    parchment: string;
    rose: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
}
