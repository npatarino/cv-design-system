/**
 * @file Public entrypoint for `@chimi/design-system/seo`.
 *
 * Re-exports the helpers consumers need to wire SEO into a web. The
 * individual modules are also addressable by deep import (e.g.
 * `@chimi/design-system/seo/json-ld`) but most callers should pull
 * everything from this barrel.
 */

export {
  SEO_SITE_CATALOG,
  defaultsForSite,
  resolveCanonical,
  resolveAbsoluteUrl,
  listEcosystemSites,
  isSiteId,
} from "./defaults.mjs";

export { buildJsonLd, ensureArray as ensureJsonLdArray } from "./json-ld.mjs";

export { buildAlternates, buildHreflangAlternates } from "./alternates.mjs";

export {
  buildSitemapEntries,
  renderSitemapXml,
  renderSitemapForSite,
} from "./sitemap.mjs";

export { renderRobotsTxt } from "./robots.mjs";

export { renderManifest, renderManifestJson } from "./manifest.mjs";

export {
  renderSEOHeadHTML,
  SEO_HEAD_DEFAULT_FONT_URLS,
  SEO_HEAD_DEFAULT_ICONS,
} from "./render-head.mjs";
