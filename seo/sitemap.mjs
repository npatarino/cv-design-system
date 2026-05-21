/**
 * @file Sitemap helpers for non-Astro consumers (talks, brand).
 *
 * The 5 Astro webs let `@astrojs/sitemap` do the heavy lifting at
 * build time. Talks (Eleventy) and brand (static HTML) need to emit
 * their sitemap.xml manually; these helpers build the entries from a
 * declarative input and render the sitemaps.org-compliant XML.
 *
 * Reference: https://www.sitemaps.org/protocol.html
 */

import { defaultsForSite, resolveCanonical } from "./defaults.mjs";

/**
 * @typedef SitemapEntry
 * @property {string} loc                       - Absolute URL.
 * @property {string} [lastmod]                 - ISO 8601 date string (date-only or full timestamp).
 * @property {"always"|"hourly"|"daily"|"weekly"|"monthly"|"yearly"|"never"} [changefreq]
 * @property {number} [priority]                - 0.0 to 1.0 inclusive.
 */

/**
 * @typedef SitemapInput
 * @property {string} path                      - Either an absolute URL or a path that gets resolved against the site's canonical base.
 * @property {string|Date} [lastmod]
 * @property {SitemapEntry["changefreq"]} [changefreq]
 * @property {number} [priority]
 */

/**
 * Coerce a lastmod value to ISO 8601. Strings are returned as-is
 * (assumed valid); Date instances are converted to UTC ISO. Undefined
 * passes through unchanged.
 *
 * @param {string|Date|undefined} value
 * @returns {string|undefined}
 */
function normaliseLastmod(value) {
  if (value === undefined || value === null) return undefined;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/**
 * Build sitemap entries for a site given a list of inputs. Resolves
 * relative paths to absolute URLs using each site's canonical base.
 *
 * @param {import("./defaults.mjs").SiteId} siteId
 * @param {SitemapInput[]} inputs
 * @returns {SitemapEntry[]}
 */
export function buildSitemapEntries(siteId, inputs) {
  if (!Array.isArray(inputs)) {
    throw new Error('[chimi/seo] buildSitemapEntries requires an array of inputs.');
  }
  return inputs.map((input) => {
    /** @type {SitemapEntry} */
    const entry = { loc: resolveCanonical(siteId, input.path) };
    const lastmod = normaliseLastmod(input.lastmod);
    if (lastmod) entry.lastmod = lastmod;
    if (input.changefreq) entry.changefreq = input.changefreq;
    if (typeof input.priority === "number") entry.priority = input.priority;
    return entry;
  });
}

/**
 * XML-encode a string (loc, lastmod, etc.). Per sitemaps.org spec,
 * `&`, `<`, `>`, `"` and `'` must be escaped inside element values.
 *
 * @param {string} value
 * @returns {string}
 */
function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Render the entries as a sitemaps.org-compliant XML document.
 *
 * @param {SitemapEntry[]} entries
 * @returns {string}
 */
export function renderSitemapXml(entries) {
  const urls = entries
    .map((entry) => {
      const parts = [`    <loc>${xmlEscape(entry.loc)}</loc>`];
      if (entry.lastmod) parts.push(`    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>`);
      if (entry.changefreq) parts.push(`    <changefreq>${entry.changefreq}</changefreq>`);
      if (typeof entry.priority === "number") {
        const clamped = Math.max(0, Math.min(1, entry.priority));
        parts.push(`    <priority>${clamped.toFixed(1)}</priority>`);
      }
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/**
 * Convenience wrapper: build entries and render in one call.
 *
 * @param {import("./defaults.mjs").SiteId} siteId
 * @param {SitemapInput[]} inputs
 * @returns {string}
 */
export function renderSitemapForSite(siteId, inputs) {
  // Touch defaults to validate siteId (throws on unknown).
  defaultsForSite(siteId);
  return renderSitemapXml(buildSitemapEntries(siteId, inputs));
}
