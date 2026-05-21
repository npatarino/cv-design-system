#!/usr/bin/env node
/**
 * @file `seo-prebuild` — drop every per-web SEO asset into a consumer
 * site's public root.
 *
 * Each web invokes this from its `prebuild` step so the rendered
 * `<SEOHead>` references resolve at runtime:
 *
 *   - `/favicon.svg`               (DS canonical mark, copied — overridden
 *                                   by `assets/logos/<siteId>/favicon.svg`
 *                                   if the consumer site has its own mark)
 *   - `/favicon-32x32.png`         (DS, copied)
 *   - `/apple-touch-icon.png`      (DS, copied)
 *   - `/mask-icon.svg`             (DS, copied)
 *   - `/icon-192.png`              (DS, copied)
 *   - `/icon-512.png`              (DS, copied)
 *   - `/og/<siteId>.png`           (DS, copied)
 *   - `/logos/<id>/{logo,favicon}.svg` (DS, copied for every site that has
 *                                       per-site logos under `assets/logos/<id>/`,
 *                                       so the SiteFooter ecosystem strip
 *                                       can render any sibling's mark)
 *   - `/manifest.webmanifest`      (rendered from siteId)
 *   - `/robots.txt`                (rendered from siteId, with optional `--disallow` paths)
 *
 * Usage:
 *   node seo-prebuild.mjs --site blog --public public
 *   node seo-prebuild.mjs --site simple-scrum-poker --public public --disallow /r/ --disallow /preview/
 *
 * `--public` is resolved relative to `process.cwd()` (the consumer
 * package). The script also accepts `--no-icons`, `--no-og`,
 * `--no-manifest`, `--no-robots` for piecemeal overrides.
 */

import { mkdir, copyFile, writeFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

import { renderRobotsTxt } from "../seo/robots.mjs";
import { renderManifestJson } from "../seo/manifest.mjs";
import { isSiteId } from "../seo/defaults.mjs";

const __filename = fileURLToPath(import.meta.url);
const DS_ROOT = resolve(dirname(__filename), "..");
const ICONS_DIR = resolve(DS_ROOT, "assets/icons");
const OG_DIR = resolve(DS_ROOT, "assets/og");
const LOGOS_DIR = resolve(DS_ROOT, "assets/logos");

function parseArgs(argv) {
  /** @type {{ site?: string; publicDir: string; disallow: string[]; noindex: boolean; sitemapName: string; skip: { icons: boolean; og: boolean; manifest: boolean; robots: boolean }; help: boolean }} */
  const out = {
    publicDir: "public",
    disallow: [],
    noindex: false,
    // Astro's @astrojs/sitemap emits `sitemap-index.xml`; talks and
    // brand emit `sitemap.xml` directly. Override via `--sitemap` if
    // your build differs.
    sitemapName: "sitemap-index.xml",
    skip: { icons: false, og: false, manifest: false, robots: false },
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--site") out.site = argv[++i];
    else if (a === "--public") out.publicDir = argv[++i];
    else if (a === "--disallow") out.disallow.push(argv[++i]);
    else if (a === "--noindex") out.noindex = true;
    else if (a === "--sitemap") out.sitemapName = argv[++i];
    else if (a === "--no-icons") out.skip.icons = true;
    else if (a === "--no-og") out.skip.og = true;
    else if (a === "--no-manifest") out.skip.manifest = true;
    else if (a === "--no-robots") out.skip.robots = true;
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(
    [
      "Usage: seo-prebuild --site <id> [--public <dir>] [--disallow <path>] [--noindex] [--no-icons] [--no-og] [--no-manifest] [--no-robots]",
      "",
      "Drops SEO assets into a web's public/ directory.",
    ].join("\n"),
  );
  process.exit(0);
}

if (!args.site || !isSiteId(args.site)) {
  console.error(
    `[seo-prebuild] --site is required and must be one of: blog, techconf, recall-for-papers, simple-pdf-converter, simple-scrum-poker, simple-json-diff, simple-web-validator, talks, brand. Got "${args.site ?? ""}".`,
  );
  process.exit(2);
}

const publicAbs = resolve(process.cwd(), args.publicDir);
await mkdir(publicAbs, { recursive: true });

const ICON_FILES = [
  "favicon.svg",
  "favicon-32x32.png",
  "apple-touch-icon.png",
  "mask-icon.svg",
  "icon-192.png",
  "icon-512.png",
];

if (!args.skip.icons) {
  for (const f of ICON_FILES) {
    await copyFile(resolve(ICONS_DIR, f), resolve(publicAbs, f));
  }
  console.log(`[seo-prebuild] icons → ${args.publicDir}/`);

  // Per-site favicon override: if the consumer site has its own favicon
  // declared under `assets/logos/<siteId>/favicon.svg`, use it instead of
  // the canonical DS mark. Runs after the canonical copy so it overwrites.
  const siteFaviconOverride = resolve(LOGOS_DIR, args.site, "favicon.svg");
  if (existsSync(siteFaviconOverride)) {
    await copyFile(siteFaviconOverride, resolve(publicAbs, "favicon.svg"));
    console.log(`[seo-prebuild] favicon override → ${args.publicDir}/favicon.svg (from logos/${args.site}/)`);
  }

  // Ecosystem logos: every site that has a logos/<id>/ directory in the DS
  // gets *all* of its .svg files mirrored to `public/logos/<id>/`. This lets
  // `SiteFooter` reference `/logos/<sibling>/logo.svg` (and optional
  // `logo-dark.svg`, etc) confidently — every consumer ships every
  // sibling's mark variants, regardless of which site is being built. The
  // bundle cost is small (each SVG is a few KB).
  const ecosystemLogos = await listEcosystemLogoDirs();
  if (ecosystemLogos.length > 0) {
    const logosOut = resolve(publicAbs, "logos");
    for (const id of ecosystemLogos) {
      const srcDir = resolve(LOGOS_DIR, id);
      const dest = resolve(logosOut, id);
      await mkdir(dest, { recursive: true });
      const files = await readdir(srcDir);
      for (const file of files) {
        if (!file.endsWith(".svg")) continue;
        await copyFile(resolve(srcDir, file), resolve(dest, file));
      }
    }
    console.log(`[seo-prebuild] ecosystem logos → ${args.publicDir}/logos/ (${ecosystemLogos.join(", ")})`);
  }
}

if (!args.skip.og) {
  const ogDir = resolve(publicAbs, "og");
  await mkdir(ogDir, { recursive: true });
  // Prefer .webp source; fall back to .png for backwards compatibility.
  const webpSrc = resolve(OG_DIR, `${args.site}.webp`);
  const pngSrc  = resolve(OG_DIR, `${args.site}.png`);
  if (existsSync(webpSrc)) {
    await copyFile(webpSrc, resolve(ogDir, `${args.site}.webp`));
    console.log(`[seo-prebuild] og/${args.site}.webp → ${args.publicDir}/og/`);
  } else {
    await copyFile(pngSrc, resolve(ogDir, `${args.site}.png`));
    console.log(`[seo-prebuild] og/${args.site}.png → ${args.publicDir}/og/`);
  }
}

if (!args.skip.manifest) {
  const manifestPath = resolve(publicAbs, "manifest.webmanifest");
  await writeFile(manifestPath, renderManifestJson(args.site));
  console.log(`[seo-prebuild] manifest.webmanifest → ${args.publicDir}/`);
}

if (!args.skip.robots) {
  const robotsPath = resolve(publicAbs, "robots.txt");
  // The robots template defaults the sitemap URL to <base>/sitemap.xml.
  // Astro webs emit sitemap-index.xml; non-Astro stay on sitemap.xml.
  const { defaultsForSite } = await import("../seo/defaults.mjs");
  const d = defaultsForSite(args.site);
  await writeFile(
    robotsPath,
    renderRobotsTxt(args.site, {
      disallow: args.disallow,
      noindex: args.noindex,
      sitemapUrl: `${d.canonicalBase}/${args.sitemapName.replace(/^\/+/, "")}`,
    }),
  );
  console.log(`[seo-prebuild] robots.txt → ${args.publicDir}/ (sitemap: ${args.sitemapName})`);
}

console.log(`[seo-prebuild] done for site=${args.site}`);

/**
 * Return the list of site ids that have a per-site logo directory under
 * `assets/logos/<id>/`. The set is discovered from disk (no coupling to
 * `ECOSYSTEM_SITES`, which lives in TypeScript and isn't directly importable
 * from this `.mjs` script). Sibling logos at the root of `assets/logos/`
 * (`favicon.svg`, `logo-character.svg`, `logo-circle.svg`, `logo-code.svg`)
 * are ignored — they're DS-canonical, not per-site.
 *
 * @returns {Promise<string[]>}
 */
async function listEcosystemLogoDirs() {
  if (!existsSync(LOGOS_DIR)) return [];
  const entries = await readdir(LOGOS_DIR, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
}
