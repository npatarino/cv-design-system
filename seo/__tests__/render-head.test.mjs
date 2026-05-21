import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';



import { renderSEOHeadHTML } from "../render-head.mjs";
import { buildJsonLd } from "../json-ld.mjs";
import { SEO_SITE_CATALOG } from "../defaults.mjs";

const longDescription =
  "Una descripción cualquiera de prueba que tiene la longitud adecuada para el linter SEO porque mide más de sesenta caracteres y menos de ciento sesenta.";

function render(extra = {}) {
  return renderSEOHeadHTML({
    site: "blog",
    title: "Hola",
    description: longDescription,
    pathname: "/blog/hola",
    ...extra,
  });
}

it("emits required core tags", () => {
  const html = render();
  expect(html).toMatch(/<title>Hola · Chimichurri Code<\/title>/);
  expect(html).toMatch(/<meta name="description" content=".+">/);
  expect(html).toMatch(/<link rel="canonical" href="https:\/\/chimi\.pro\/blog\/hola">/);
  expect(html).toMatch(/<meta name="robots" content="index, follow">/);
});

it("emits OG and Twitter tags with defaults", () => {
  const html = render();
  expect(html).toMatch(/<meta property="og:type" content="website">/);
  expect(html).toMatch(/<meta property="og:title" content="Hola">/);
  expect(html).toMatch(/<meta property="og:image" content="https:\/\/chimi\.pro\/og\/blog\.png">/);
  expect(html).toMatch(/<meta property="og:locale" content="es_AR">/);
  expect(html).toMatch(/<meta name="twitter:card" content="summary_large_image">/);
  expect(html).toMatch(/<meta name="twitter:site" content="@npatarino">/);
});

it("article type emits article:* tags", () => {
  const html = render({
    og: {
      type: "article",
      publishedTime: "2025-01-15T00:00:00Z",
      author: "Nicolás Patarino",
      tags: ["liderazgo", "engineering"],
    },
  });
  expect(html).toMatch(/<meta property="og:type" content="article">/);
  expect(html).toMatch(/<meta property="article:published_time" content="2025-01-15T00:00:00Z">/);
  expect(html).toMatch(/<meta property="article:author" content="Nicolás Patarino">/);
  expect(html).toMatch(/<meta property="article:tag" content="liderazgo">/);
  expect(html).toMatch(/<meta property="article:tag" content="engineering">/);
});

it("noindex inverts robots", () => {
  const html = render({ noindex: true });
  expect(html).toMatch(/<meta name="robots" content="noindex, nofollow">/);
});

it("isHome renders the bare site name", () => {
  const html = render({ title: "Chimichurri Code", pathname: "/", isHome: true });
  expect(html).toMatch(/<title>Chimichurri Code<\/title>/);
});

it("ecosystem alternates render with marker", () => {
  const html = render({ pathname: "/", isHome: true, includeEcosystemAlternates: true });
  const matches = html.match(/data-chimi-ecosystem="true"/g) ?? [];
  expect(matches.length).toEqual(8);
  expect(html).toMatch(/href="https:\/\/techconf\.chimi\.pro\/"/);
});

it("renders manifest, favicons, theme-color", () => {
  const html = render();
  expect(html).toMatch(/<link rel="manifest" href="\/manifest\.webmanifest">/);
  expect(html).toMatch(/<link rel="icon" type="image\/svg\+xml"/);
  expect(html).toMatch(/<link rel="apple-touch-icon"/);
  expect(html).toMatch(/<link rel="mask-icon" href="\/mask-icon\.svg" color="#02B5B9">/);
  expect(html).toMatch(/<meta name="theme-color" content="#1B1B1B">/);
});

it("preloads default fonts unless disabled", () => {
  const html = render();
  expect(html.includes('rel="preload" as="font"').toBeTruthy());
  const off = render({ preloadFonts: false });
  expect(!off.includes('rel="preload" as="font"').toBeTruthy());
});

it("preloads hero image when provided", () => {
  const html = render({ preloadImage: "/img/hero.webp" });
  expect(html).toMatch(/<link rel="preload" as="image" href="https:\/\/chimi\.pro\/img\/hero\.webp" fetchpriority="high">/);
});

it("renders JSON-LD blocks", () => {
  const home = buildJsonLd({ kind: "home", siteId: "blog", data: {} });
  const html = render({ jsonLd: home });
  const ldMatches = html.match(/<script type="application\/ld\+json">/g) ?? [];
  expect(ldMatches.length).toEqual(2);
  expect(html).toMatch(/"@type":"WebSite"/);
});

it("escapes < inside JSON-LD payload (XSS guard)", () => {
  const html = render({
    jsonLd: { "@context": "https://schema.org", "@type": "WebSite", name: "</script>fake" },
  });
  // The breakout character is "<"; once that is unicode-escaped, the
  // remaining text cannot break out of the <script> block.
  expect(!html.includes("</script>fake").toBeTruthy(), "must not contain the unescaped close tag");
  expect(html).toMatch(/\\u003c\/script>fake/);
});

it("escapes attribute-quoted text", () => {
  const html = render({
    title: 'Has "quotes" & <tag>',
    description: 'Description with "quotes" & <tag> long enough to satisfy the linter requirement of at least sixty characters.',
  });
  expect(html).toMatch(/content="Has &quot;quotes&quot; &amp; &lt;tag&gt;"/);
});

it("hreflang alternates render", () => {
  const html = render({
    hreflangAlternates: [
      { hreflang: "es", href: "https://chimi.pro/" },
      { hreflang: "en", href: "https://chimi.pro/en" },
      { hreflang: "x-default", href: "https://chimi.pro/" },
    ],
  });
  expect(html).toMatch(/<link rel="alternate" hreflang="es" href="https:\/\/chimi\.pro\/">/);
  expect(html).toMatch(/<link rel="alternate" hreflang="x-default"/);
});

it("snapshot per site (smoke)", () => {
  // Derived from the catalog so every site is auto-covered. The prior
  // hand-typed list was missing `simple-web-validator` (the same drift
  // the new `check:site-id-union` linter prevents at the type layer).
  const ids = Object.keys(SEO_SITE_CATALOG);
  expect(ids.length >= 9, `expected at least 9 catalog entries, got ${ids.length}`).toBeTruthy();
  for (const id of ids) {
    const html = renderSEOHeadHTML({
      site: /** @type {any} */ (id),
      title: "Página",
      description: longDescription,
      pathname: "/",
      isHome: true,
    });
    expect(html.length > 500, `${id} renders >500 chars`).toBeTruthy();
    expect(html.includes("og:image").toBeTruthy(), `${id} OG image present`);
    expect(html.includes("manifest").toBeTruthy(), `${id} manifest present`);
  }
});
