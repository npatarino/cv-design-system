import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';



import { buildSitemapEntries, renderSitemapXml, renderSitemapForSite } from "../sitemap.mjs";
import { renderRobotsTxt } from "../robots.mjs";
import { renderManifest, renderManifestJson } from "../manifest.mjs";
import { buildAlternates, buildHreflangAlternates } from "../alternates.mjs";
import { SEO_SITE_CATALOG } from "../defaults.mjs";

it("buildSitemapEntries resolves relative paths", () => {
  const entries = buildSitemapEntries("blog", [
    { path: "/", lastmod: "2025-01-01" },
    { path: "/blog", changefreq: "weekly", priority: 0.8 },
    { path: "https://chimi.pro/external" },
  ]);
  expect(entries[0].loc).toEqual("https://chimi.pro/");
  expect(entries[1].loc).toEqual("https://chimi.pro/blog");
  expect(entries[1].priority).toEqual(0.8);
  expect(entries[2].loc).toEqual("https://chimi.pro/external");
});

it("renderSitemapXml emits valid sitemaps.org XML", () => {
  const xml = renderSitemapForSite("blog", [
    { path: "/", lastmod: "2025-01-01" },
    { path: "/blog/x", lastmod: new Date("2025-02-01T00:00:00Z") },
  ]);
  expect(xml.startsWith("<?xml").toBeTruthy());
  expect(xml).toMatch(/<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  expect(xml).toMatch(/<loc>https:\/\/chimi\.pro\/<\/loc>/);
  expect(xml).toMatch(/<lastmod>2025-02-01T00:00:00.000Z<\/lastmod>/);
});

it("renderRobotsTxt: defaults", () => {
  const txt = renderRobotsTxt("blog");
  expect(txt).toMatch(/^User-agent: \*$/m);
  expect(txt).toMatch(/^Allow: \/$/m);
  expect(txt).toMatch(/^Sitemap: https:\/\/chimi\.pro\/sitemap\.xml$/m);
});

it("renderRobotsTxt: disallow paths", () => {
  const txt = renderRobotsTxt("simple-scrum-poker", {
    disallow: ["/r/", "/preview/"],
  });
  expect(txt).toMatch(/^Disallow: \/r\/$/m);
  expect(txt).toMatch(/^Disallow: \/preview\/$/m);
});

it("renderRobotsTxt: noindex everywhere", () => {
  const txt = renderRobotsTxt("blog", { noindex: true });
  expect(txt).toMatch(/^Disallow: \/$/m);
  expect(!txt.includes("Allow: /").toBeTruthy());
});

it("renderManifest: required fields per W3C spec", () => {
  const m = renderManifest("blog");
  expect(m.name).toEqual("Chimichurri Code");
  expect(m.short_name.length > 0).toBeTruthy();
  expect(m.start_url).toEqual("/");
  expect(m.display).toEqual("standalone");
  expect(m.theme_color).toEqual("#1B1B1B");
  expect(m.background_color).toEqual("#1B1B1B");
  expect(m.lang).toEqual("es");
  expect(Array.isArray(m.icons).toBeTruthy());
  expect(m.icons.length >= 2).toBeTruthy();
  const sizes = m.icons.map((i) => i.sizes);
  expect(sizes.includes("192x192").toBeTruthy());
  expect(sizes.includes("512x512").toBeTruthy());
});

it("renderManifestJson is parseable JSON", () => {
  const json = renderManifestJson("blog");
  assert.doesNotThrow(() => JSON.parse(json));
});

it("buildAlternates returns every catalog entry except current", () => {
  // Derive the expected count from the catalog so adding a new site
  // auto-extends this assertion (the prior hard-coded `8` masked the
  // same drift `check:site-id-union` now prevents at the type layer).
  const expectedCount = Object.keys(SEO_SITE_CATALOG).length - 1;
  const alts = buildAlternates("blog");
  expect(alts.length).toEqual(expectedCount);
  expect(!alts.some((a).toBeTruthy() => a.href.includes("chimi.pro/") && !a.href.includes(".chimi.pro/")));
});

it("buildHreflangAlternates passes through", () => {
  const alts = buildHreflangAlternates([
    { hreflang: "es", href: "https://x/" },
    { hreflang: "en", href: "https://x/en" },
  ]);
  expect(alts.length).toEqual(2);
  expect(alts[0].rel).toEqual("alternate");
  expect(alts[1].hreflang).toEqual("en");
});
