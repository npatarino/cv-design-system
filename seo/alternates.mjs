/**
 * @file Cross-ecosystem alternate links.
 *
 * The home page of every web emits one `<link rel="alternate"
 * data-chimi-ecosystem="true">` per sibling site, so crawlers and
 * power users can discover the ecosystem from any of its surfaces. The
 * `data-chimi-ecosystem` marker lets the `check:seo` linter verify
 * coverage without false positives from unrelated `<link rel="alternate">`
 * tags (e.g. RSS, hreflang, etc.).
 */

import { SEO_SITE_CATALOG } from "./defaults.mjs";

/**
 * @typedef AlternateLink
 * @property {string} rel
 * @property {string} href
 * @property {string} title
 * @property {true} chimiEcosystem  - Truthy marker; rendered as `data-chimi-ecosystem="true"`.
 */

/**
 * Build the cross-ecosystem alternate links for a given site (returns
 * every other entry in `SEO_SITE_CATALOG` — never the current site).
 *
 * @param {import("./defaults").SiteId} currentSiteId
 * @returns {AlternateLink[]}
 */
export function buildAlternates(currentSiteId) {
  return Object.values(SEO_SITE_CATALOG)
    .filter((entry) => entry.id !== currentSiteId)
    .map((entry) => ({
      rel: "alternate",
      href: `${entry.url.replace(/\/+$/, "")}/`,
      title: entry.name,
      chimiEcosystem: /** @type {true} */ (true),
    }));
}

/**
 * Build hreflang alternates given an explicit list. Used when a page
 * exists in multiple languages; the linter accepts either an empty
 * array or a list including an `x-default` entry.
 *
 * @param {Array<{ hreflang: string; href: string }>} entries
 * @returns {Array<{ rel: "alternate"; hreflang: string; href: string }>}
 */
export function buildHreflangAlternates(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.map((entry) => ({
    rel: "alternate",
    hreflang: entry.hreflang,
    href: entry.href,
  }));
}
