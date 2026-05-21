import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';



import { buildJsonLd, ensureArray } from "../json-ld.mjs";

it("home returns WebSite + Organization with @context", () => {
  const blocks = /** @type {any[]} */ (buildJsonLd({ kind: "home", siteId: "blog", data: {} }));
  expect(Array.isArray(blocks).toBeTruthy());
  expect(blocks.length).toEqual(2);
  expect(blocks[0]["@context"]).toEqual("https://schema.org");
  expect(blocks[0]["@type"]).toEqual("WebSite");
  expect(blocks[1]["@type"]).toEqual("Organization");
});

it("home picks up sameAs from data.socials", () => {
  const blocks = /** @type {any[]} */ (
    buildJsonLd({
      kind: "home",
      siteId: "blog",
      data: { socials: ["https://twitter.com/x", "https://github.com/x"] },
    })
  );
  expect(blocks[1].sameAs).toEqual(["https://twitter.com/x", "https://github.com/x"]);
});

it("article requires headline, url, datePublished", () => {
  assert.throws(() =>
    buildJsonLd({
      kind: "article",
      siteId: "blog",
      data: { url: "/p/x", datePublished: "2025-01-01" },
    }),
  );
  const article = /** @type {any} */ (
    buildJsonLd({
      kind: "article",
      siteId: "blog",
      data: {
        headline: "Hello",
        url: "/p/hello",
        datePublished: "2025-01-01",
        author: "Nico",
      },
    })
  );
  expect(article["@type"]).toEqual("Article");
  expect(article.headline).toEqual("Hello");
  expect(article.author.name).toEqual("Nico");
  expect(article.mainEntityOfPage["@id"]).toEqual("https://chimi.pro/p/hello");
});

it("breadcrumb requires at least 2 items", () => {
  assert.throws(() =>
    buildJsonLd({
      kind: "breadcrumb",
      siteId: "blog",
      data: { items: [{ name: "Home", url: "/" }] },
    }),
  );
  const bc = /** @type {any} */ (
    buildJsonLd({
      kind: "breadcrumb",
      siteId: "blog",
      data: {
        items: [
          { name: "Home", url: "/" },
          { name: "Blog", url: "/blog" },
          { name: "Hello", url: "/blog/hello" },
        ],
      },
    })
  );
  expect(bc["@type"]).toEqual("BreadcrumbList");
  expect(bc.itemListElement.length).toEqual(3);
  expect(bc.itemListElement[2].position).toEqual(3);
  expect(bc.itemListElement[2].item).toEqual("https://chimi.pro/blog/hello");
});

it("person passes through sameAs", () => {
  const person = /** @type {any} */ (
    buildJsonLd({
      kind: "person",
      siteId: "blog",
      data: {
        name: "Nicolás",
        sameAs: ["https://twitter.com/n", "https://github.com/n"],
      },
    })
  );
  expect(person["@type"]).toEqual("Person");
  expect(person.sameAs).toEqual(["https://twitter.com/n", "https://github.com/n"]);
});

it("event has eventStatus default", () => {
  const event = /** @type {any} */ (
    buildJsonLd({
      kind: "event",
      siteId: "techconf",
      data: { name: "TechConf 2025", startDate: "2025-10-01" },
    })
  );
  expect(event["@type"]).toEqual("Event");
  expect(event.eventStatus).toEqual("https://schema.org/EventScheduled");
});

it("software-application defaults", () => {
  const sw = /** @type {any} */ (
    buildJsonLd({ kind: "software-application", siteId: "simple-scrum-poker", data: {} })
  );
  expect(sw["@type"]).toEqual("SoftwareApplication");
  expect(sw.applicationCategory).toEqual("UtilitiesApplication");
  expect(sw.offers.price).toEqual("0");
});

it("scholarly-article requires headline and url", () => {
  assert.throws(() =>
    buildJsonLd({ kind: "scholarly-article", siteId: "recall-for-papers", data: { headline: "x" } }),
  );
  const sa = /** @type {any} */ (
    buildJsonLd({
      kind: "scholarly-article",
      siteId: "recall-for-papers",
      data: {
        headline: "On the use of OpenSpec",
        url: "/papers/openspec",
        keywords: ["openspec", "design"],
      },
    })
  );
  expect(sa["@type"]).toEqual("ScholarlyArticle");
  expect(sa.keywords).toEqual("openspec, design");
});

it("presentation requires name and url", () => {
  const p = /** @type {any} */ (
    buildJsonLd({
      kind: "presentation",
      siteId: "talks",
      data: { name: "Productividad tóxica", url: "/decks/productividad" },
    })
  );
  expect(p["@type"]).toEqual("PresentationDigitalDocument");
});

it("webpage builds isPartOf", () => {
  const wp = /** @type {any} */ (
    buildJsonLd({
      kind: "webpage",
      siteId: "brand",
      data: { name: "Components", url: "/components" },
    })
  );
  expect(wp["@type"]).toEqual("WebPage");
  expect(wp.isPartOf["@type"]).toEqual("WebSite");
});

it("ensureArray normalises shapes", () => {
  expect(ensureArray(undefined)).toEqual([]);
  expect(ensureArray(null)).toEqual([]);
  expect(ensureArray({ a: 1 })).toEqual([{ a: 1 }]);
  expect(ensureArray([{ a: 1 }).toEqual({ b: 2 }]), [{ a: 1 }, { b: 2 }]);
});

it("unknown kind throws exhaustively", () => {
  assert.throws(() =>
    buildJsonLd({ kind: /** @type {any} */ ("nope"), siteId: "blog", data: {} }),
  );
});
