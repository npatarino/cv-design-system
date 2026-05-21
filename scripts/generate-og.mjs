/**
 * @file Generate the OpenGraph fallback image (1200×630) for every web.
 *
 * Strategy: build an SVG per site with site-specific palette + name +
 * description, then rasterise to PNG with sharp. The output lives in
 * `assets/og/<siteId>.png`; each web's `sync` step copies the matching
 * file into its `public/og/<siteId>.png` (or equivalent for talks /
 * brand) so the SEOHead fallback URL (`/og/<site>.png`) resolves.
 *
 * The generated images are intentionally minimal — wordmark, tagline,
 * the recipe accent — so they read clearly at the 1200×630 preview
 * size that LinkedIn / WhatsApp / Slack render. Page-level OG image
 * overrides (e.g. a hand-designed image for a flagship blog post)
 * still take precedence.
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import { SEO_SITE_CATALOG, defaultsForSite } from "../seo/defaults.mjs";

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), "..");
const OUT_DIR = resolve(ROOT, "assets/og");
const FAVICON_SVG = resolve(ROOT, "assets/logos/favicon.svg");

const WIDTH = 1200;
const HEIGHT = 630;

/**
 * Foreground / background palette per site, derived from each web's
 * primary recipe. Foreground is the title color; tagline uses a 70%
 * opacity version of the same; accent renders the corner badge.
 *
 * @type {Readonly<Record<import("../seo/defaults.mjs").SiteId, { bg: string; fg: string; accent: string }>>}
 */
const OG_PALETTES = Object.freeze({
  blog: { bg: "#1B1B1B", fg: "#FAFAF8", accent: "#02B5B9" },
  techconf: { bg: "#02898C", fg: "#FDFDFD", accent: "#D9B038" },
  "recall-for-papers": { bg: "#1B1B1B", fg: "#FAFAF8", accent: "#A64132" },
  "simple-pdf-converter": { bg: "#FAFAF8", fg: "#1C1C1C", accent: "#02898C" },
  "simple-scrum-poker": { bg: "#1B1B1B", fg: "#FDFDFD", accent: "#D9B038" },
  "simple-json-diff": { bg: "#1B1B1B", fg: "#FAFAF8", accent: "#02B5B9" },
  "simple-web-validator": { bg: "#1B1B1B", fg: "#FAFAF8", accent: "#02B5B9" },
  "simple-radar-skills": { bg: "#1B1B1B", fg: "#FAFAF8", accent: "#02B5B9" },
  talks: { bg: "#1B1B1B", fg: "#FAFAF8", accent: "#02B5B9" },
  brand: { bg: "#FAFAF8", fg: "#1C1C1C", accent: "#02898C" },
});

/**
 * XML-escape text destined for an SVG `<text>` content node.
 *
 * @param {string} value
 */
function svgText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Wrap a description into multiple `<tspan>` lines so it fits the
 * canvas without overflowing horizontally. We do not measure font
 * metrics — we approximate by character count, which is good enough
 * for our 1200×630 canvas at ~36px glyph width.
 *
 * @param {string} text
 * @param {number} maxLineChars
 * @returns {string[]}
 */
function wrapLines(text, maxLineChars) {
  const words = text.trim().split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxLineChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3); // Cap at 3 lines.
}

/**
 * Build the SVG markup for a given site.
 *
 * @param {import("../seo/defaults.mjs").SiteId} siteId
 * @param {string} faviconBase64
 * @returns {string}
 */
function buildOgSvg(siteId, faviconBase64) {
  const d = defaultsForSite(siteId);
  const palette = OG_PALETTES[siteId];
  const taglineLines = wrapLines(d.defaultDescription, 56);

  const taglineY = 410;
  const lineHeight = 48;
  const lines = taglineLines
    .map(
      (line, idx) =>
        `<tspan x="80" y="${taglineY + idx * lineHeight}">${svgText(line)}</tspan>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">
  <defs>
    <linearGradient id="accent-fade" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${palette.accent}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="${palette.bg}"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#accent-fade)"/>

  <!-- Accent stripe (left) -->
  <rect x="0" y="0" width="16" height="${HEIGHT}" fill="${palette.accent}"/>

  <!-- Mark (top-right) -->
  <image href="data:image/svg+xml;base64,${faviconBase64}" x="${WIDTH - 196}" y="80" width="116" height="116"/>

  <!-- Site label -->
  <text x="80" y="120" fill="${palette.accent}" font-size="28" font-weight="700" letter-spacing="0.18em" text-transform="uppercase">CHIMICHURRI / ${siteId.toUpperCase().replace(/-/g, " ")}</text>

  <!-- Site name (display) -->
  <text x="80" y="270" fill="${palette.fg}" font-size="96" font-weight="900" letter-spacing="-0.02em">${svgText(d.siteName)}</text>

  <!-- Tagline -->
  <text fill="${palette.fg}" fill-opacity="0.78" font-size="36" font-weight="400" letter-spacing="-0.005em">
    ${lines}
  </text>

  <!-- Footer URL -->
  <text x="80" y="${HEIGHT - 64}" fill="${palette.fg}" fill-opacity="0.6" font-size="24" font-weight="500" letter-spacing="0.04em">${svgText(d.canonicalBase.replace(/^https?:\/\//, ""))}</text>
</svg>`;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const faviconSvg = await readFile(FAVICON_SVG);
  const faviconBase64 = faviconSvg.toString("base64");

  const ids = /** @type {Array<import("../seo/defaults.mjs").SiteId>} */ (
    Object.keys(SEO_SITE_CATALOG)
  );

  for (const id of ids) {
    const svg = buildOgSvg(id, faviconBase64);
    const outPath = resolve(OUT_DIR, `${id}.png`);
    await sharp(Buffer.from(svg))
      .resize({ width: WIDTH, height: HEIGHT, fit: "cover" })
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    console.log(`[generate-og] wrote ${id}.png`);
  }

  const readme = `# OG fallback images

Generated by \`scripts/generate-og.mjs\`. **Do not edit the PNGs by hand** — re-run the
generator (\`npm --workspace @chimi/design-system run og\`) after editing the
script or the SEO catalog.

Each web's \`sync\` step copies the corresponding \`<siteId>.png\` into the web's
\`public/og/\` directory so \`https://<host>/og/<site>.png\` resolves at runtime.
Pages can override per-page by passing \`og.image\` to \`<SEOHead>\`.
`;
  await writeFile(resolve(OUT_DIR, "README.md"), readme);

  console.log(`[generate-og] done. ${ids.length} images in ${OUT_DIR}`);
}

main().catch((err) => {
  console.error("[generate-og] failed:", err);
  process.exit(1);
});
