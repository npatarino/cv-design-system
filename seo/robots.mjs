/**
 * @file robots.txt template.
 *
 * Default policy: allow everything, point to sitemap.xml. Each web's
 * build copies the rendered string to `public/robots.txt` (Astro) or
 * the equivalent root for talks/brand.
 *
 * Use `disallow` to opt-out specific paths (e.g. `/r/` for the scrum
 * poker rooms, or `/preview/` if a web ships staging routes).
 *
 * Set `noindex: true` only for non-production environments where the
 * full origin must be excluded from indexing — for production, prefer
 * per-page `<meta name="robots">` controls.
 */

import { defaultsForSite } from "./defaults.mjs";

/**
 * @typedef RobotsOptions
 * @property {string[]} [disallow]   - Paths to disallow (e.g. ["/r/", "/preview/"]).
 * @property {boolean}  [noindex]    - When true, emits `Disallow: /` for all user agents.
 * @property {string}   [sitemapUrl] - Override the default sitemap URL (defaults to `<canonicalBase>/sitemap.xml`).
 * @property {string}   [extraRules] - Free-form rules appended verbatim before the Sitemap line.
 */

/**
 * @param {import("./defaults.mjs").SiteId} siteId
 * @param {RobotsOptions} [options]
 * @returns {string}
 */
export function renderRobotsTxt(siteId, options = {}) {
  const d = defaultsForSite(siteId);
  const sitemapUrl = options.sitemapUrl ?? `${d.canonicalBase}/sitemap.xml`;

  const lines = ["User-agent: *"];
  if (options.noindex) {
    lines.push("Disallow: /");
  } else {
    lines.push("Allow: /");
    if (Array.isArray(options.disallow)) {
      for (const path of options.disallow) {
        lines.push(`Disallow: ${path}`);
      }
    }
  }
  if (options.extraRules) {
    lines.push("");
    lines.push(options.extraRules.trim());
  }
  lines.push("");
  lines.push(`Sitemap: ${sitemapUrl}`);
  lines.push("");
  return lines.join("\n");
}
