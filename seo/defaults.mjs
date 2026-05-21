/**
 * @file SEO defaults per ecosystem site.
 *
 * Derived from the unified site registry.
 */

import { SITE_REGISTRY_RUNTIME } from "./site-registry-runtime.generated.mjs";

/**
 * @typedef {"blog"|"techconf"|"recall-for-papers"|"simple-pdf-converter"|"simple-scrum-poker"|"simple-json-diff"|"simple-web-validator"|"simple-radar-skills"|"simple-font-tester"|"talks"|"brand"} SiteId
 */

/**
 * @typedef SEOSiteCatalogEntry
 * @property {SiteId} id
 * @property {string} name
 * @property {string} url
 * @property {string} description
 * @property {boolean} chrome
 */

/**
 * @typedef SEODefaults
 * @property {SiteId} siteId
 * @property {string} siteName
 * @property {string} canonicalBase
 * @property {string} defaultDescription
 * @property {string} defaultOgImage
 * @property {string} defaultOgImageAlt
 * @property {string} themeColor
 * @property {string} backgroundColor
 * @property {string} locale
 * @property {string} lang
 * @property {string} twitterSite
 * @property {string} twitterCreator
 * @property {string} maskIconColor
 */

/**
 * Full ecosystem catalog (9 entries).
 * Derived from the site registry.
 *
 * @type {Readonly<Record<SiteId, SEOSiteCatalogEntry>>}
 */
export const SEO_SITE_CATALOG = Object.freeze(
  Object.fromEntries(
    SITE_REGISTRY_RUNTIME.filter((s) => s.seo).map((s) => [
      s.id,
      { id: s.id, name: s.name, url: s.url, description: s.description, chrome: s.chrome },
    ]),
  ),
);

/**
 * Theme color presets per site.
 * Derived from the site registry.
 *
 * @type {Readonly<Record<SiteId, { themeColor: string; backgroundColor: string; maskIconColor: string }>>}
 */
const SITE_THEMES = Object.freeze(
  Object.fromEntries(
    SITE_REGISTRY_RUNTIME.map((s) => [
      s.id,
      { themeColor: s.themeColor, backgroundColor: s.backgroundColor, maskIconColor: s.maskIconColor },
    ]),
  ),
);

const ALLOWED_SITE_IDS = Object.keys(SEO_SITE_CATALOG);

/** @param {string} value @returns {value is SiteId} */
export function isSiteId(value) {
  return ALLOWED_SITE_IDS.includes(value);
}

/**
 * Resolve site-level SEO defaults for a given ecosystem site id.
 *
 * @param {SiteId} siteId
 * @returns {SEODefaults}
 */
export function defaultsForSite(siteId) {
  const entry = SEO_SITE_CATALOG[siteId];
  if (!entry) {
    throw new Error(
      `[chimi/seo] Unknown siteId "${siteId}". Allowed: ${ALLOWED_SITE_IDS.join(", ")}.`,
    );
  }
  const theme = SITE_THEMES[siteId];

  return {
    siteId,
    siteName: entry.name,
    canonicalBase: entry.url.replace(/\/+$/, ""),
    defaultDescription: entry.description,
    defaultOgImage: `/og/${siteId}.webp`,
    defaultOgImageAlt: `${entry.name} — ${entry.description}`,
    themeColor: theme.themeColor,
    backgroundColor: theme.backgroundColor,
    locale: "es_AR",
    lang: "es",
    twitterSite: "@npatarino",
    twitterCreator: "@npatarino",
    maskIconColor: theme.maskIconColor,
  };
}

/**
 * Resolve a canonical absolute URL given a site and a path.
 *
 * @param {SiteId} siteId
 * @param {string} path
 * @returns {string}
 */
export function resolveCanonical(siteId, path) {
  if (/^https?:\/\//i.test(path)) return path;
  const { canonicalBase } = defaultsForSite(siteId);
  if (!path || path === "/") return `${canonicalBase}/`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${canonicalBase}${normalized}`;
}

/**
 * Resolve a (possibly relative) image path against a site's canonical
 * base, returning an absolute URL suitable for `og:image`.
 *
 * @param {SiteId} siteId
 * @param {string} pathOrUrl
 * @returns {string}
 */
export function resolveAbsoluteUrl(siteId, pathOrUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const { canonicalBase } = defaultsForSite(siteId);
  const normalized = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${canonicalBase}${normalized}`;
}

/**
 * The full ecosystem catalog (all 8 sites) as an array.
 *
 * @returns {SEOSiteCatalogEntry[]}
 */
export function listEcosystemSites() {
  return ALLOWED_SITE_IDS.map((id) => SEO_SITE_CATALOG[id]);
}
