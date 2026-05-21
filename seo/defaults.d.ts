/**
 * @file TypeScript companion for `defaults.mjs`.
 *
 * The runtime catalog stays in `defaults.mjs` so plain Node consumers
 * (Eleventy `eleventy.js`, brand `inject-seo-head.mjs`, design-system
 * `.mjs` SEO helpers) can `import` it without a TS toolchain.
 *
 * This file mirrors the runtime shape with real TypeScript types so
 * Astro/Vite/TS consumers get a structural `SiteId` union (instead of
 * `@ts-expect-error` on every `<SEOHead site="…">` callsite). The two
 * files are kept in sync by `scripts/check-site-id-union.mjs`, which
 * fails the design-system build on drift.
 *
 * Adding a new site ⇒ edit BOTH:
 *   1. The frozen object in `defaults.mjs` (runtime).
 *   2. The `SiteId` union below + the matching key in `SEO_SITE_CATALOG`.
 */

/**
 * Closed catalog of every web property the monorepo publishes (9 ids).
 *
 * The 7 consumer-facing sites plus `talks` (the slide deck builder) and
 * `brand` (the brand book) — every site that has its own canonical URL,
 * sitemap, manifest, and OG image. The chrome catalog `ECOSYSTEM_SITES`
 * (`components/ecosystem.ts`) is a strict subset that excludes `talks`
 * and `brand` because they are not productive end-user destinations.
 */
export type SiteId =
  | "blog"
  | "techconf"
  | "recall-for-papers"
  | "simple-pdf-converter"
  | "simple-scrum-poker"
  | "simple-json-diff"
  | "simple-web-validator"
  | "simple-radar-skills"
  | "simple-font-tester"
  | "talks"
  | "brand";

export interface SEOSiteCatalogEntry {
  id: SiteId;
  /** Display name (used in og:site_name). */
  name: string;
  /** Production canonical URL (no trailing slash). */
  url: string;
  description: string;
}

export interface SEODefaults {
  siteId: SiteId;
  siteName: string;
  /** Production absolute base URL, no trailing slash. */
  canonicalBase: string;
  defaultDescription: string;
  /** Path under each web's public root, e.g. "/og/blog.webp". */
  defaultOgImage: string;
  defaultOgImageAlt: string;
  /** Hex string used by manifest theme_color and Safari pinned tab tint. */
  themeColor: string;
  /** Hex string used by manifest background_color. */
  backgroundColor: string;
  /** OG locale, e.g. "es_AR". */
  locale: string;
  /** <html lang> attribute, e.g. "es". */
  lang: string;
  /** Twitter handle (with leading @) for twitter:site. */
  twitterSite: string;
  /** Twitter handle (with leading @) for twitter:creator. */
  twitterCreator: string;
  /** Hex string used by Safari mask-icon link. */
  maskIconColor: string;
}

/**
 * Full ecosystem catalog (9 entries) — the SEO source of truth.
 *
 * Frozen at module load time. Mirrors the runtime export from
 * `defaults.mjs`; the linter `check-site-id-union.mjs` asserts the key
 * sets agree.
 */
export const SEO_SITE_CATALOG: Readonly<Record<SiteId, SEOSiteCatalogEntry>>;

/**
 * Type guard for an arbitrary string.
 *
 * Returns `true` only when `value` is one of the known `SiteId`s. Cheap
 * to call and safe to use as a type-narrowing predicate (`if (isSiteId(x)) { x satisfies SiteId }`).
 */
export function isSiteId(value: string): value is SiteId;

/**
 * Resolve the per-site SEO defaults — name, canonical base, OG image
 * fallback, manifest theme colors, locale, Twitter handles.
 *
 * Throws when `siteId` is not in `SEO_SITE_CATALOG`. Use `isSiteId`
 * first when the input comes from an untrusted source.
 */
export function defaultsForSite(siteId: SiteId): SEODefaults;

/**
 * Resolve a canonical absolute URL given a site and a path.
 *
 * - If `path` is already absolute (`http://` or `https://`), it is
 *   returned unchanged.
 * - The empty path or `"/"` resolves to the bare canonical base with a
 *   trailing slash.
 * - Multi-segment relative paths are joined with the canonical base
 *   verbatim (no normalisation of trailing slashes).
 */
export function resolveCanonical(siteId: SiteId, path: string): string;

/**
 * Resolve a (possibly relative) image path against a site's canonical
 * base, returning an absolute URL suitable for `og:image`.
 *
 * Same absolute-path passthrough as `resolveCanonical`; missing leading
 * slash is added.
 */
export function resolveAbsoluteUrl(siteId: SiteId, pathOrUrl: string): string;

/**
 * The full ecosystem catalog as an array, in the canonical declaration
 * order. Used by sitemap-index renderers and ecosystem-alternates
 * builders.
 */
export function listEcosystemSites(): SEOSiteCatalogEntry[];
