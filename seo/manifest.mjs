/**
 * @file Web App Manifest builder.
 *
 * Emits a `manifest.webmanifest` JSON object that satisfies the spec:
 *   https://www.w3.org/TR/appmanifest/
 *
 * Browsers consume the manifest at install time (PWA install / Add to
 * Home Screen). We ship a minimal but valid manifest per site,
 * parametrised by the recipe-derived theme colors from `defaults.mjs`.
 */

import { defaultsForSite } from "./defaults.mjs";

/**
 * @typedef ManifestIcon
 * @property {string} src
 * @property {string} sizes
 * @property {string} type
 * @property {"any"|"maskable"|"any maskable"} [purpose]
 */

/**
 * @typedef WebManifest
 * @property {string} name
 * @property {string} short_name
 * @property {string} description
 * @property {string} start_url
 * @property {"standalone"|"fullscreen"|"minimal-ui"|"browser"} display
 * @property {string} background_color
 * @property {string} theme_color
 * @property {string} lang
 * @property {string} dir
 * @property {ManifestIcon[]} icons
 */

/**
 * Build the manifest object for a given ecosystem site.
 *
 * Icons are referenced by path under each web's `public/` (or
 * equivalent) root. Webs sync the actual icon files from the design
 * system's `assets/icons/` during their build step.
 *
 * @param {import("./defaults.mjs").SiteId} siteId
 * @param {{ shortName?: string }} [overrides]
 * @returns {WebManifest}
 */
export function renderManifest(siteId, overrides = {}) {
  const d = defaultsForSite(siteId);
  const shortNameFallback = d.siteName.length > 12 ? "Chimichurri" : d.siteName;
  return {
    name: d.siteName,
    short_name: overrides.shortName ?? shortNameFallback,
    description: d.defaultDescription,
    start_url: "/",
    display: "standalone",
    background_color: d.backgroundColor,
    theme_color: d.themeColor,
    lang: d.lang,
    dir: "ltr",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}

/**
 * Convenience: render the manifest as a JSON string (pretty-printed
 * for readability when written to disk).
 *
 * @param {import("./defaults.mjs").SiteId} siteId
 * @param {Parameters<typeof renderManifest>[1]} [overrides]
 * @returns {string}
 */
export function renderManifestJson(siteId, overrides) {
  return `${JSON.stringify(renderManifest(siteId, overrides), null, 2)}\n`;
}
