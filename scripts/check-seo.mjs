#!/usr/bin/env node
/**
 * @file `check:seo` — validates that every HTML page in every web's
 * build output complies with the cross-web SEO contract defined in
 * `openspec/specs/cross-web-seo/spec.md`.
 *
 * Usage:
 *   node packages/design-system/scripts/check-seo.mjs               # check all webs
 *   node packages/design-system/scripts/check-seo.mjs --web blog    # single web
 *   node packages/design-system/scripts/check-seo.mjs --skip-missing # don't fail when a build dir is missing
 *
 * Per-page checks:
 *   - <title> present and ≤ 70 chars
 *   - <meta name="description"> 60-160 chars
 *   - <link rel="canonical"> with absolute https URL
 *   - <html lang> attribute present
 *   - <meta name="robots"> present (noindex pages allowed via opt-in)
 *   - OG: og:type, og:title, og:description, og:url, og:image, og:site_name, og:locale
 *   - Twitter: twitter:card, twitter:site, twitter:creator
 *   - At least one <script type="application/ld+json"> with @context + @type
 *   - <link rel="manifest">, favicon links
 *
 * Per-web checks:
 *   - sitemap.xml exists and parses (XML root <urlset> in sitemaps.org ns)
 *   - robots.txt exists and references the sitemap
 *   - Home page emits 8 ecosystem alternate links with data-chimi-ecosystem
 *
 * Escape hatch:
 *   - Pages can opt out by including <meta name="chimi-seo-skip"> in head.
 *     Use sparingly (e.g. legacy redirect pages).
 *
 * Exit code 0 on success, 1 on any error.
 */

import { readFile, readdir, access } from "node:fs/promises";
import { resolve, relative, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { lintHtmlPage, lintSitemap, lintRobotsTxt } from "../seo/lint.mjs";
import { SITE_REGISTRY_RUNTIME } from "../seo/site-registry-runtime.generated.mjs";

const EXPECTED_ECO_LINKS = SITE_REGISTRY_RUNTIME.filter(s => s.seo).length - 1;

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(fileURLToPath(import.meta.url), "../../../..");

/**
 * @typedef WebTarget
 * @property {import("../seo/defaults.mjs").SiteId} siteId
 * @property {string} buildDir         - Absolute path to the directory holding built HTML.
 * @property {string} sitemapPath      - Relative path within buildDir for sitemap.xml.
 * @property {string} robotsPath       - Relative path within buildDir for robots.txt.
 * @property {(rel: string) => boolean} [isHomePath] - Returns true if the relative path is the home page.
 * @property {(rel: string) => boolean} [skipFile]   - Returns true if the file should be skipped entirely.
 */

/** @type {WebTarget[]} */
const TARGETS = [
  {
    siteId: "blog",
    buildDir: resolve(REPO_ROOT, "packages/blog/dist"),
    sitemapPath: "sitemap-index.xml",
    robotsPath: "robots.txt",
    isHomePath: (rel) => rel === "index.html",
  },
  {
    siteId: "techconf",
    buildDir: resolve(REPO_ROOT, "packages/techconf/dist"),
    sitemapPath: "sitemap-index.xml",
    robotsPath: "robots.txt",
    isHomePath: (rel) => rel === "index.html",
  },
  {
    // The Vercel Astro adapter writes prerendered HTML and static
    // assets (favicons, manifest, sitemap, robots) into `dist/client/`,
    // not `dist/`. SSR-only routes (e.g. /api/*) live in
    // `dist/server/` and are not part of the SEO surface.
    siteId: "recall-for-papers",
    buildDir: resolve(REPO_ROOT, "packages/recall-for-papers/dist/client"),
    sitemapPath: "sitemap-index.xml",
    robotsPath: "robots.txt",
    isHomePath: (rel) => rel === "index.html",
  },
  {
    siteId: "simple-pdf-converter",
    buildDir: resolve(REPO_ROOT, "packages/simple-pdf-converter/dist"),
    sitemapPath: "sitemap-index.xml",
    robotsPath: "robots.txt",
    isHomePath: (rel) => rel === "index.html",
  },
  {
    siteId: "simple-scrum-poker",
    buildDir: resolve(REPO_ROOT, "packages/simple-scrum-poker/dist"),
    sitemapPath: "sitemap-index.xml",
    robotsPath: "robots.txt",
    isHomePath: (rel) => rel === "index.html",
  },
  {
    siteId: "simple-json-diff",
    buildDir: resolve(REPO_ROOT, "packages/simple-json-diff/dist"),
    sitemapPath: "sitemap-index.xml",
    robotsPath: "robots.txt",
    isHomePath: (rel) => rel === "index.html",
  },
  {
    siteId: "simple-web-validator",
    buildDir: resolve(REPO_ROOT, "packages/simple-web-validator/dist"),
    sitemapPath: "sitemap-index.xml",
    robotsPath: "robots.txt",
    isHomePath: (rel) => rel === "index.html",
  },
  {
    siteId: "simple-radar-skills",
    buildDir: resolve(REPO_ROOT, "packages/simple-radar-skills/dist"),
    sitemapPath: "sitemap-index.xml",
    robotsPath: "robots.txt",
    isHomePath: (rel) => rel === "index.html",
  },
  {
    siteId: "simple-font-tester",
    buildDir: resolve(REPO_ROOT, "packages/simple-font-tester/dist/client"),
    sitemapPath: "sitemap-index.xml",
    robotsPath: "robots.txt",
    isHomePath: (rel) => rel === "index.html",
  },
  {
    siteId: "talks",
    buildDir: resolve(REPO_ROOT, "_site"),
    sitemapPath: "sitemap.xml",
    robotsPath: "robots.txt",
    isHomePath: (rel) => rel === "index.html",
  },
  {
    siteId: "brand",
    buildDir: resolve(REPO_ROOT, "packages/brand/dist"),
    sitemapPath: "sitemap-index.xml",
    robotsPath: "robots.txt",
    isHomePath: (rel) => rel === "index.html",
    // Skip HTML fragments or internal folders if any.
    skipFile: (rel) =>
      rel.startsWith("node_modules/") ||
      rel.startsWith("shared/"),
  },
];

const args = parseArgs(process.argv.slice(2));

function parseArgs(argv) {
  /** @type {{ web?: string; skipMissing: boolean; verbose: boolean; help: boolean }} */
  const out = { skipMissing: false, verbose: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--web") out.web = argv[++i];
    else if (a === "--skip-missing") out.skipMissing = true;
    else if (a === "--verbose" || a === "-v") out.verbose = true;
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

if (args.help) {
  console.log(
    [
      "Usage: check-seo [--web <id>] [--skip-missing] [--verbose]",
      "",
      "Validates every built HTML page against the cross-web-seo spec.",
      "  --web <id>        Run only the named web (blog, techconf, ...).",
      "  --skip-missing    Don't fail when a build dir is missing (useful in CI matrix).",
      "  --verbose         Print every page checked, even passes.",
    ].join("\n"),
  );
  process.exit(0);
}

/** @type {{ pageErrors: number; pageWarnings: number; webErrors: number }} */
const totals = { pageErrors: 0, pageWarnings: 0, webErrors: 0 };

const targets = args.web
  ? TARGETS.filter((t) => t.siteId === args.web)
  : TARGETS;

if (args.web && targets.length === 0) {
  console.error(`[check:seo] Unknown --web "${args.web}".`);
  process.exit(2);
}

for (const target of targets) {
  await checkTarget(target);
}

const ok = totals.pageErrors === 0 && totals.webErrors === 0;
console.log("");
console.log(
  `[check:seo] ${ok ? "PASS" : "FAIL"} — pageErrors=${totals.pageErrors} pageWarnings=${totals.pageWarnings} webErrors=${totals.webErrors}`,
);
process.exit(ok ? 0 : 1);

async function checkTarget(/** @type {WebTarget} */ target) {
  const exists = await pathExists(target.buildDir);
  if (!exists) {
    if (args.skipMissing) {
      console.log(`[${target.siteId}] (skipped — build dir not found at ${rel(target.buildDir)})`);
      return;
    }
    console.error(`[${target.siteId}] ERROR build dir missing: ${rel(target.buildDir)}`);
    totals.webErrors++;
    return;
  }

  console.log(`[${target.siteId}] checking ${rel(target.buildDir)}`);

  const htmlFiles = await listHtmlFiles(target.buildDir);
  const filtered = target.skipFile ? htmlFiles.filter((p) => !target.skipFile(relative(target.buildDir, p))) : htmlFiles;

  let homeChecked = false;
  let pagesPassed = 0;

  for (const filePath of filtered) {
    const relPath = relative(target.buildDir, filePath).split(sep).join("/");
    const isHome = target.isHomePath ? target.isHomePath(relPath) : false;
    const result = await checkPage(target.siteId, filePath, relPath, isHome);
    if (result.skipped) continue;
    if (isHome) homeChecked = true;
    if (result.errors.length === 0 && result.warnings.length === 0) {
      pagesPassed++;
      if (args.verbose) console.log(`  ✓ ${relPath}`);
    } else {
      console.log(
        `  ${result.errors.length ? "✗" : "⚠"} ${relPath} — ${result.errors.length} error(s), ${result.warnings.length} warning(s)`,
      );
      for (const e of result.errors) console.log(`      ✗ ${e}`);
      for (const w of result.warnings) console.log(`      ⚠ ${w}`);
      totals.pageErrors += result.errors.length;
      totals.pageWarnings += result.warnings.length;
    }
  }

  await checkSitemap(target);
  await checkRobots(target);

  if (!homeChecked && target.isHomePath) {
    console.log(`  ⚠ no home page found (expected ${target.buildDir}/index.html)`);
    totals.pageWarnings++;
  }

  console.log(`[${target.siteId}] ${pagesPassed}/${filtered.length} page(s) clean`);
}

/**
 * @param {import("../seo/defaults.mjs").SiteId} siteId
 * @param {string} filePath
 * @param {string} relPath
 * @param {boolean} isHome
 * @returns {Promise<{ errors: string[]; warnings: string[]; skipped: boolean }>}
 */
async function checkPage(siteId, filePath, relPath, isHome) {
  const html = await readFile(filePath, "utf8");
  return lintHtmlPage(html, { 
    isHome,
    expectedEcosystemAlternates: EXPECTED_ECO_LINKS 
  });
}

/**
 * @param {WebTarget} target
 */
async function checkSitemap(target) {
  const path = resolve(target.buildDir, target.sitemapPath);
  if (!(await pathExists(path))) {
    console.log(`  ✗ sitemap missing: ${rel(path)}`);
    totals.webErrors++;
    return;
  }
  const xml = await readFile(path, "utf8");
  const result = lintSitemap(xml);
  for (const error of result.errors) {
    console.log(`  ✗ ${target.sitemapPath}: ${error}`);
    totals.webErrors++;
  }
  if (result.errors.length === 0 && args.verbose) {
    console.log(`  ✓ ${target.sitemapPath}`);
  }
}

/**
 * @param {WebTarget} target
 */
async function checkRobots(target) {
  const path = resolve(target.buildDir, target.robotsPath);
  if (!(await pathExists(path))) {
    console.log(`  ✗ robots missing: ${rel(path)}`);
    totals.webErrors++;
    return;
  }
  const txt = await readFile(path, "utf8");
  const result = lintRobotsTxt(txt);
  for (const error of result.errors) {
    console.log(`  ✗ ${target.robotsPath}: ${error}`);
    totals.webErrors++;
  }
  if (result.errors.length === 0 && args.verbose) {
    console.log(`  ✓ ${target.robotsPath}`);
  }
}

async function pathExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function listHtmlFiles(dir) {
  /** @type {string[]} */
  const out = [];
  await walk(dir);
  return out;

  async function walk(/** @type {string} */ current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        await walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".html")) {
        out.push(full);
      }
    }
  }
}

/**
 * @param {string} p
 */
function rel(p) {
  return relative(REPO_ROOT, p);
}
