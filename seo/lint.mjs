/**
 * @file Pure validation logic for the `check:seo` linter.
 *
 * Kept separate from the CLI runner (`scripts/check-seo.mjs`) so the
 * validation can be unit-tested in-process without spawning Node.
 *
 * Each validator returns `{ errors: string[]; warnings: string[] }`.
 * The runner is responsible for reporting these and computing the
 * exit code.
 */

import { parse as parseHTML } from "node-html-parser";

/**
 * @typedef LintResult
 * @property {string[]} errors
 * @property {string[]} warnings
 * @property {boolean} skipped
 */

const REQUIRED_OG = [
  "og:type",
  "og:title",
  "og:description",
  "og:url",
  "og:image",
  "og:site_name",
  "og:locale",
];

const REQUIRED_TWITTER = ["twitter:card", "twitter:site", "twitter:creator"];

/**
 * Validate a single HTML page against the cross-web-seo spec.
 *
 * @param {string} html
 * @param {{ isHome?: boolean; expectedEcosystemAlternates?: number; minDescription?: number; maxDescription?: number; maxTitle?: number }} [options]
 * @returns {LintResult}
 */
export function lintHtmlPage(html, options = {}) {
  const isHome = options.isHome ?? false;
  const expectedEco = options.expectedEcosystemAlternates ?? 9;
  const minDesc = options.minDescription ?? 60;
  const maxDesc = options.maxDescription ?? 160;
  const maxTitle = options.maxTitle ?? 70;

  /** @type {string[]} */ const errors = [];
  /** @type {string[]} */ const warnings = [];

  const root = parseHTML(html, { lowerCaseTagName: false, comment: true });

  if (root.querySelector('meta[name="chimi-seo-skip"]')) {
    return { errors, warnings, skipped: true };
  }

  const htmlEl = root.querySelector("html");
  if (htmlEl && !htmlEl.getAttribute("lang")) {
    errors.push('<html> missing lang attribute');
  }

  const head = root.querySelector("head");
  if (!head) {
    errors.push("missing <head>");
    return { errors, warnings, skipped: false };
  }

  const titleText = head.querySelector("title")?.text?.trim() ?? "";
  if (!titleText) errors.push("missing <title>");
  else if (titleText.length > maxTitle) warnings.push(`<title> length ${titleText.length} > ${maxTitle}`);

  const description = head.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ?? "";
  if (!description) errors.push('missing <meta name="description">');
  else if (description.length < minDesc) warnings.push(`description length ${description.length} < ${minDesc}`);
  else if (description.length > maxDesc) warnings.push(`description length ${description.length} > ${maxDesc}`);

  const canonical = head.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "";
  if (!canonical) errors.push('missing <link rel="canonical">');
  else if (!/^https:\/\//i.test(canonical)) errors.push(`canonical not absolute https: "${canonical}"`);

  const robots = head.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "";
  if (!robots) warnings.push('missing <meta name="robots">');
  // Pages explicitly marked noindex are unindexable; rich results
  // (JSON-LD) are not required because nothing will be crawled.
  // Sharing surface (OG/Twitter/canonical) is still required so the
  // page renders as a card when linked.
  const isNoindex = /noindex/i.test(robots);

  for (const prop of REQUIRED_OG) {
    const tag = head.querySelector(`meta[property="${prop}"]`);
    if (!tag || !tag.getAttribute("content")) errors.push(`missing <meta property="${prop}">`);
  }

  for (const name of REQUIRED_TWITTER) {
    const tag = head.querySelector(`meta[name="${name}"]`);
    if (!tag || !tag.getAttribute("content")) errors.push(`missing <meta name="${name}">`);
  }

  if (!head.querySelector('link[rel="manifest"]')) errors.push('missing <link rel="manifest">');
  if (!head.querySelector('link[rel="icon"]')) errors.push('missing <link rel="icon">');
  if (!head.querySelector('link[rel="apple-touch-icon"]')) warnings.push('missing <link rel="apple-touch-icon">');

  const ldScripts = head.querySelectorAll('script[type="application/ld+json"]');
  if (!ldScripts.length) {
    if (!isNoindex) {
      errors.push('no <script type="application/ld+json"> blocks');
    }
  } else {
    for (const [idx, ld] of ldScripts.entries()) {
      const raw = ld.text;
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        errors.push(
          `JSON-LD block #${idx + 1} not valid JSON: ${e instanceof Error ? e.message : String(e)}`,
        );
        continue;
      }
      const blocks = Array.isArray(parsed) ? parsed : [parsed];
      for (const [i, b] of blocks.entries()) {
        if (!b || typeof b !== "object") {
          errors.push(`JSON-LD block #${idx + 1}.${i} is not an object`);
          continue;
        }
        if (!("@context" in b)) errors.push(`JSON-LD block #${idx + 1}.${i} missing @context`);
        if (!("@type" in b)) errors.push(`JSON-LD block #${idx + 1}.${i} missing @type`);
      }
    }
  }

  if (isHome) {
    const ecoLinks = head.querySelectorAll('link[rel="alternate"][data-chimi-ecosystem="true"]');
    if (ecoLinks.length !== expectedEco) {
      errors.push(`home expected ${expectedEco} ecosystem alternate links, found ${ecoLinks.length}`);
    }
  }

  return { errors, warnings, skipped: false };
}

/**
 * Validate sitemap.xml content.
 *
 * @param {string} xml
 * @returns {LintResult}
 */
export function lintSitemap(xml) {
  /** @type {string[]} */ const errors = [];
  /** @type {string[]} */ const warnings = [];
  if (!xml || xml.trim() === "") {
    errors.push("sitemap is empty");
    return { errors, warnings, skipped: false };
  }
  if (!xml.includes("<urlset") && !xml.includes("<sitemapindex")) {
    errors.push("sitemap not in sitemaps.org schema (no <urlset> or <sitemapindex>)");
  }
  if (!xml.includes("http://www.sitemaps.org/schemas/sitemap/0.9")) {
    errors.push("sitemap missing sitemaps.org namespace");
  }
  return { errors, warnings, skipped: false };
}

/**
 * Validate robots.txt content.
 *
 * @param {string} txt
 * @returns {LintResult}
 */
export function lintRobotsTxt(txt) {
  /** @type {string[]} */ const errors = [];
  /** @type {string[]} */ const warnings = [];
  if (!/User-agent:\s*\*/i.test(txt)) errors.push('robots missing "User-agent: *"');
  if (!/Sitemap:\s*https?:\/\//i.test(txt)) errors.push('robots missing "Sitemap:" line');
  return { errors, warnings, skipped: false };
}
