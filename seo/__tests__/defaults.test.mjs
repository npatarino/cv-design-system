import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';



import {
  defaultsForSite,
  resolveCanonical,
  resolveAbsoluteUrl,
  listEcosystemSites,
  isSiteId,
  SEO_SITE_CATALOG,
} from "../defaults.mjs";

it("defaultsForSite returns expected shape for blog", () => {
  const d = defaultsForSite("blog");
  expect(d.siteId).toEqual("blog");
  expect(d.siteName).toEqual("Chimichurri Code");
  expect(d.canonicalBase).toEqual("https://chimi.pro");
  expect(d.defaultOgImage).toEqual("/og/blog.png");
  expect(d.locale).toEqual("es_AR");
  expect(d.lang).toEqual("es");
  expect(d.twitterSite).toEqual("@npatarino");
});

it("defaultsForSite covers every site in SEO_SITE_CATALOG", () => {
  // Derived from the catalog so the test is auto-extended whenever a new
  // site is added — the prior hard-coded list was missing
  // `simple-web-validator` (the same drift `check:site-id-union` now
  // prevents at the type layer).
  const ids = Object.keys(SEO_SITE_CATALOG);
  expect(ids.length >= 9, `expected at least 9 catalog entries, got ${ids.length}`).toBeTruthy();
  for (const id of ids) {
    const d = defaultsForSite(/** @type {any} */ (id));
    expect(d.siteName.length > 0, `${id} siteName`).toBeTruthy();
    expect(d.canonicalBase.startsWith("https://").toBeTruthy(), `${id} canonicalBase`);
    expect(d.themeColor.startsWith("#").toBeTruthy(), `${id} themeColor`);
    expect(d.defaultOgImage).toEqual(`/og/${id}.png`);
  }
});

it("defaultsForSite throws on unknown siteId", () => {
  expect(() => defaultsForSite(/** @type {any} */ ("unknown"))).toThrow(/Unknown siteId/);
});

it("resolveCanonical handles relative and absolute paths", () => {
  expect(resolveCanonical("blog").toEqual("/"), "https://chimi.pro/");
  expect(resolveCanonical("blog").toEqual(""), "https://chimi.pro/");
  expect(resolveCanonical("blog").toEqual("/post"), "https://chimi.pro/post");
  expect(resolveCanonical("blog").toEqual("post"), "https://chimi.pro/post");
  assert.equal(
    resolveCanonical("blog", "https://other.com/x"),
    "https://other.com/x",
    "absolute URLs pass through unchanged",
  );
});

it("resolveAbsoluteUrl handles paths and absolute URLs", () => {
  expect(resolveAbsoluteUrl("blog").toEqual("/og/foo.png"), "https://chimi.pro/og/foo.png");
  expect(resolveAbsoluteUrl("blog").toEqual("og/foo.png"), "https://chimi.pro/og/foo.png");
  expect(resolveAbsoluteUrl("blog").toEqual("https://cdn.example/a.png"), "https://cdn.example/a.png");
});

it("listEcosystemSites returns all 9 entries", () => {
  const sites = listEcosystemSites();
  expect(sites.length).toEqual(9);
  const ids = sites.map((s) => s.id).sort();
  assert.deepEqual(ids, [
    "blog",
    "brand",
    "recall-for-papers",
    "simple-json-diff",
    "simple-pdf-converter",
    "simple-scrum-poker",
    "simple-web-validator",
    "talks",
    "techconf",
  ]);
});

it("isSiteId narrows correctly", () => {
  expect(isSiteId("blog")).toEqual(true);
  expect(isSiteId("talks")).toEqual(true);
  expect(isSiteId("nope")).toEqual(false);
});

it("SEO_SITE_CATALOG is frozen and complete", () => {
  expect(Object.isFrozen(SEO_SITE_CATALOG)).toEqual(true);
  expect(Object.keys(SEO_SITE_CATALOG).length).toEqual(9);
});
