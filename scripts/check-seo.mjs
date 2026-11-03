#!/usr/bin/env node
/**
 * @file `check-seo` — validates a built site against the cross-web SEO
 * contract (`seo/lint.mjs`). Run it from a consumer site after its build:
 *
 *   node node_modules/@chimichurricode/design-system/scripts/check-seo.mjs --site <id> [--dir dist]
 *
 * Options:
 *   --site <id>       Site id from the registry (required).
 *   --dir <path>      Build output, relative to the cwd. Default: `dist/client`
 *                     when it exists (Vercel adapter), otherwise `dist`.
 *   --sitemap <file>  Sitemap filename inside the build dir. Default: `sitemap-index.xml`.
 *   --verbose, -v     Print every page checked, even passes.
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
 * Per-site checks:
 *   - the sitemap exists and parses (XML root <urlset>/<sitemapindex>)
 *   - robots.txt exists and references the sitemap
 *   - Home page emits one ecosystem alternate link (data-chimi-ecosystem)
 *     per other SEO site in the registry
 *
 * Escape hatch:
 *   - Pages can opt out by including <meta name="chimi-seo-skip"> in head.
 *     Use sparingly (e.g. legacy redirect pages).
 *
 * Exit code 0 on success, 1 on any error, 2 on bad usage.
 */

import { readFile, readdir, access } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, relative, join, sep } from "node:path";

import { lintHtmlPage, lintSitemap, lintRobotsTxt } from "../seo/lint.mjs";
import { isSiteId } from "../seo/defaults.mjs";
import { SITE_REGISTRY_RUNTIME } from "../seo/site-registry-runtime.generated.mjs";

const EXPECTED_ECO_LINKS = SITE_REGISTRY_RUNTIME.filter((s) => s.seo).length - 1;
const CWD = process.cwd();

/**
 * @typedef WebTarget
 * @property {import("../seo/defaults.mjs").SiteId} siteId
 * @property {string} buildDir         - Absolute path to the directory holding built HTML.
 * @property {string} sitemapPath      - Relative path within buildDir for the sitemap.
 * @property {string} robotsPath       - Relative path within buildDir for robots.txt.
 * @property {(rel: string) => boolean} [isHomePath] - Returns true if the relative path is the home page.
 * @property {(rel: string) => boolean} [skipFile]   - Returns true if the file should be skipped entirely.
 */

const args = parseArgs(process.argv.slice(2));

function parseArgs(argv) {
  /** @type {{ site?: string; dir?: string; sitemap: string; verbose: boolean; help: boolean }} */
  const out = { sitemap: "sitemap-index.xml", verbose: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--site" || a === "--web") out.site = argv[++i];
    else if (a === "--dir") out.dir = argv[++i];
    else if (a === "--sitemap") out.sitemap = argv[++i];
    else if (a === "--verbose" || a === "-v") out.verbose = true;
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

if (args.help) {
  console.log(
    [
      "Usage: check-seo --site <id> [--dir <build dir>] [--sitemap <file>] [--verbose]",
      "",
      "Validates every built HTML page of one site against the cross-web SEO contract.",
    ].join("\n"),
  );
  process.exit(0);
}

if (!args.site || !isSiteId(args.site)) {
  const ids = SITE_REGISTRY_RUNTIME.map((s) => s.id).join(", ");
  console.error(`[check:seo] --site is required and must be one of: ${ids}. Got "${args.site ?? ""}".`);
  process.exit(2);
}

const defaultDir = existsSync(resolve(CWD, "dist/client")) ? "dist/client" : "dist";

/** @type {WebTarget} */
const target = {
  siteId: args.site,
  buildDir: resolve(CWD, args.dir ?? defaultDir),
  sitemapPath: args.sitemap,
  robotsPath: "robots.txt",
  isHomePath: (rel) => rel === "index.html",
  skipFile: (rel) => rel.startsWith("node_modules/"),
};

/** @type {{ pageErrors: number; pageWarnings: number; webErrors: number }} */
const totals = { pageErrors: 0, pageWarnings: 0, webErrors: 0 };

await checkTarget(target);

const ok = totals.pageErrors === 0 && totals.webErrors === 0;
console.log("");
console.log(
  `[check:seo] ${ok ? "PASS" : "FAIL"} — pageErrors=${totals.pageErrors} pageWarnings=${totals.pageWarnings} webErrors=${totals.webErrors}`,
);
process.exit(ok ? 0 : 1);

async function checkTarget(/** @type {WebTarget} */ target) {
  const exists = await pathExists(target.buildDir);
  if (!exists) {
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
  return relative(CWD, p) || ".";
}
