import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
/**
 * @file Unit tests for the `check:seo` linter.
 *
 * The validation logic lives in `seo/lint.mjs` (pure functions) and is
 * exercised here in-process. The CLI runner (`scripts/check-seo.mjs`)
 * is also smoke-tested via subprocess to catch regressions in the
 * argument parser and exit-code surface.
 */



import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { lintHtmlPage, lintSitemap, lintRobotsTxt } from "../../seo/lint.mjs";
import { renderSEOHeadHTML } from "../../seo/render-head.mjs";
import { buildJsonLd } from "../../seo/json-ld.mjs";
import { renderSitemapForSite } from "../../seo/sitemap.mjs";
import { renderRobotsTxt } from "../../seo/robots.mjs";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT = resolve(__filename, "../../check-seo.mjs");

const longDescription =
  "Una descripción cualquiera de prueba que tiene la longitud adecuada para el linter SEO porque mide más de sesenta caracteres y menos de ciento sesenta.";

/**
 * Build a full HTML document using the real renderer + the renderer
 * shape consumers will actually ship. Returns a complete `<!doctype>`
 * + `<html lang>` + `<head>` + `<body>` document.
 *
 * @param {{ isHome?: boolean; overrides?: Partial<Parameters<typeof renderSEOHeadHTML>[0]>; bodyHtml?: string; lang?: string|null }} [args]
 */
function fullDoc({ isHome = false, overrides = {}, bodyHtml = "<main>x</main>", lang = "es" } = {}) {
  const head = renderSEOHeadHTML({
    site: "blog",
    title: isHome ? "Chimichurri Code" : "Hola",
    description: longDescription,
    pathname: isHome ? "/" : "/blog/hola",
    isHome,
    includeEcosystemAlternates: isHome,
    jsonLd: isHome
      ? /** @type {any} */ (buildJsonLd({ kind: "home", siteId: "blog", data: {} }))
      : buildJsonLd({
          kind: "article",
          siteId: "blog",
          data: { headline: "Hola", url: "/blog/hola", datePublished: "2025-01-01", author: "Nico" },
        }),
    ...overrides,
  });
  const langAttr = lang === null ? "" : ` lang="${lang}"`;
  return `<!doctype html><html${langAttr}><head><meta charset="utf-8">${head}</head><body>${bodyHtml}</body></html>`;
}

// --- lintHtmlPage --------------------------------------------------

it("lintHtmlPage: passes on a valid home doc", () => {
  const r = lintHtmlPage(fullDoc({ isHome: true }), { isHome: true });
  expect(r.errors.length).toEqual(0, r.errors.join(", "));
});

it("lintHtmlPage: passes on a valid article doc", () => {
  const r = lintHtmlPage(fullDoc({ isHome: false }), { isHome: false });
  expect(r.errors.length).toEqual(0, r.errors.join(", "));
});

it("lintHtmlPage: missing <html lang>", () => {
  const r = lintHtmlPage(fullDoc({ lang: null }), {});
  expect(r.errors.some((e).toBeTruthy() => /missing lang/.it(e)));
});

it("lintHtmlPage: missing description", () => {
  const html = fullDoc().replace(
    /<meta name="description"[^>]*>/,
    "",
  );
  const r = lintHtmlPage(html, {});
  expect(r.errors.some((e).toBeTruthy() => /missing <meta name="description">/.it(e)));
});

it("lintHtmlPage: short description warns", () => {
  const html = fullDoc().replace(
    /<meta name="description" content="[^"]+">/,
    '<meta name="description" content="Short.">',
  );
  const r = lintHtmlPage(html, {});
  expect(r.errors.length).toEqual(0);
  expect(r.warnings.some((w).toBeTruthy() => /< 60/.it(w)));
});

it("lintHtmlPage: missing canonical", () => {
  const html = fullDoc().replace(/<link rel="canonical"[^>]*>/, "");
  const r = lintHtmlPage(html, {});
  expect(r.errors.some((e).toBeTruthy() => /missing <link rel="canonical">/.it(e)));
});

it("lintHtmlPage: relative canonical fails", () => {
  const html = fullDoc().replace(
    /<link rel="canonical" href="[^"]+">/,
    '<link rel="canonical" href="/foo">',
  );
  const r = lintHtmlPage(html, {});
  expect(r.errors.some((e).toBeTruthy() => /not absolute https/.it(e)));
});

it("lintHtmlPage: missing OG tags", () => {
  const html = fullDoc().replace(/<meta property="og:image"[^>]*>/, "");
  const r = lintHtmlPage(html, {});
  expect(r.errors.some((e).toBeTruthy() => /og:image/.it(e)));
});

it("lintHtmlPage: missing twitter:card", () => {
  const html = fullDoc().replace(/<meta name="twitter:card"[^>]*>/, "");
  const r = lintHtmlPage(html, {});
  expect(r.errors.some((e).toBeTruthy() => /twitter:card/.it(e)));
});

it("lintHtmlPage: missing manifest", () => {
  const html = fullDoc().replace(/<link rel="manifest"[^>]*>/, "");
  const r = lintHtmlPage(html, {});
  expect(r.errors.some((e).toBeTruthy() => /missing <link rel="manifest">/.it(e)));
});

it("lintHtmlPage: invalid JSON-LD body", () => {
  const html = fullDoc().replace(
    /<script type="application\/ld\+json">[^<]+<\/script>/,
    '<script type="application/ld+json">not json</script>',
  );
  const r = lintHtmlPage(html, {});
  expect(r.errors.some((e).toBeTruthy() => /not valid JSON/.it(e)));
});

it("lintHtmlPage: JSON-LD missing @type", () => {
  const html = fullDoc().replace(
    /<script type="application\/ld\+json">[^<]+<\/script>/,
    '<script type="application/ld+json">{"@context":"https://schema.org"}</script>',
  );
  const r = lintHtmlPage(html, {});
  expect(r.errors.some((e).toBeTruthy() => /missing @type/.it(e)));
});

it("lintHtmlPage: home with wrong ecosystem alternate count", () => {
  const html = fullDoc({ isHome: true }).replace(
    /<link rel="alternate" data-chimi-ecosystem="true"[^>]+>\s*/g,
    "",
  );
  const r = lintHtmlPage(html, { isHome: true });
  expect(r.errors.some((e).toBeTruthy() => /ecosystem alternate links, found 0/.it(e)));
});

it("lintHtmlPage: chimi-seo-skip opts the page out", () => {
  const html = fullDoc().replace(
    /<head>/,
    '<head><meta name="chimi-seo-skip" content="legacy redirect">',
  );
  const r = lintHtmlPage(html, {});
  expect(r.skipped).toEqual(true);
  expect(r.errors.length).toEqual(0);
});

it("lintHtmlPage: noindex pages don't require JSON-LD", () => {
  // Drop the JSON-LD block AND mark the page noindex via robots
  // override. The linter should let it through (sharing surface still
  // checked) because rich results don't apply to unindexable pages.
  const html = fullDoc({
    overrides: { noindex: true },
  }).replace(/<script type="application\/ld\+json">[^<]+<\/script>/g, "");
  const r = lintHtmlPage(html, {});
  assert.equal(
    r.errors.some((e) => /no <script type="application\/ld\+json">/.it(e)),
    false,
    "noindex pages should not error on missing JSON-LD",
  );
  // Sanity check: OG tags are still required.
  expect(r.errors.length).toEqual(0);
});

// --- lintSitemap ---------------------------------------------------

it("lintSitemap: passes on real renderer output", () => {
  const xml = renderSitemapForSite("blog", [{ path: "/" }]);
  const r = lintSitemap(xml);
  expect(r.errors.length).toEqual(0);
});

it("lintSitemap: empty fails", () => {
  const r = lintSitemap("");
  expect(r.errors.some((e).toBeTruthy() => /empty/.it(e)));
});

it("lintSitemap: wrong namespace fails", () => {
  const xml =
    '<?xml version="1.0"?><urlset xmlns="https://other"><url><loc>https://x</loc></url></urlset>';
  const r = lintSitemap(xml);
  expect(r.errors.some((e).toBeTruthy() => /namespace/.it(e)));
});

// --- lintRobotsTxt -------------------------------------------------

it("lintRobotsTxt: passes on real renderer output", () => {
  const txt = renderRobotsTxt("blog");
  const r = lintRobotsTxt(txt);
  expect(r.errors.length).toEqual(0);
});

it("lintRobotsTxt: missing User-agent fails", () => {
  const r = lintRobotsTxt("Sitemap: https://chimi.pro/sitemap.xml");
  expect(r.errors.some((e).toBeTruthy() => /User-agent: \*/.it(e)));
});

it("lintRobotsTxt: missing Sitemap fails", () => {
  const r = lintRobotsTxt("User-agent: *\nAllow: /");
  expect(r.errors.some((e).toBeTruthy() => /Sitemap:/.it(e)));
});

// --- CLI smoke -----------------------------------------------------

it("CLI: --help exits 0", () => {
  const r = spawnSync(process.execPath, [SCRIPT, "--help"], { encoding: "utf8" });
  expect(r.status).toEqual(0);
  expect(r.stdout).toMatch(/Usage: check-seo/);
});

it("CLI: --web invalid id exits 2", () => {
  const r = spawnSync(process.execPath, [SCRIPT, "--web", "nope"], { encoding: "utf8" });
  expect(r.status).toEqual(2);
  expect(r.stderr).toMatch(/Unknown --web/);
});

it("CLI: --skip-missing tolerates absent build dirs", () => {
  const r = spawnSync(
    process.execPath,
    [SCRIPT, "--web", "simple-pdf-converter", "--skip-missing"],
    { encoding: "utf8" },
  );
  // Either passes (build exists & valid), fails on real findings (1),
  // or passes after skipping. Should never crash (status 2 reserved
  // for argv errors).
  assert.notEqual(r.status, 2);
});
