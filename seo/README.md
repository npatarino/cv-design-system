# `@chimichurricode/design-system/seo`

Cross-web SEO foundations for the Chimichurri Code sites. Single
source of truth for the head SEO contract that every web in the
ecosystem honours.

## What this module provides

- **`renderSEOHeadHTML(props)`** — string renderer used by talks
  (Eleventy) and brand (static HTML) build scripts.
- **`<SEOHead>`** Astro component (re-exported as
  `@chimichurricode/design-system/SEOHead.astro`) — Astro consumers wrap this in
  their `Base.astro`. Bit-for-bit identical output to the string
  renderer; both go through the same code path.
- **`buildJsonLd({ kind, siteId, data })`** — typed dispatcher
  generating valid schema.org JSON-LD per page kind. Supports `home`,
  `article`, `breadcrumb`, `person`, `event`, `scholarly-article`,
  `software-application`, `presentation`, `webpage`.
- **`buildAlternates(siteId)`** — the cross-ecosystem alternate links
  each home page emits (one per other SEO site in the registry).
- **`buildSitemapEntries(siteId, inputs)` / `renderSitemapXml`** —
  sitemaps.org-compliant XML generation for talks/brand. The Astro
  webs use `@astrojs/sitemap` instead.
- **`renderRobotsTxt(siteId, options)`** — `robots.txt` template.
- **`renderManifest(siteId)`** / **`renderManifestJson(siteId)`** —
  `manifest.webmanifest` per site, derived from each web's primary
  recipe.
- **`SEO_SITE_CATALOG`** — full ecosystem catalog (11 sites, generated
  from `site-registry.ts`) used by all helpers. The consumer-facing
  `ECOSYSTEM_SITES` (in `components/ecosystem.ts`) lists only the
  `chrome: true` sites (9) for the `SiteFooter` — SEO also covers
  `talks` and `brand`.

## Why `.mjs` instead of `.ts`

Talks (Eleventy) and brand (static-HTML build scripts) run plain Node
without an Astro/Vite pipeline. Plain Node cannot resolve `.ts`
imports without flags; ESM `.mjs` files Just Work in every consumer
(Astro, Vite, Eleventy, Node scripts). JSDoc + `@typedef` blocks give
TypeScript users full type inference where they want it.

## Linter `check:seo`

`scripts/check-seo.mjs` validates one site's built HTML against the
spec defined in
`openspec/specs/cross-web-seo/spec.md`. Run it from the consumer site
after its build:

```bash
CHECK=node_modules/@chimichurricode/design-system/scripts/check-seo.mjs
node $CHECK --site blog                    # checks ./dist (or ./dist/client)
node $CHECK --site blog --dir build --sitemap sitemap.xml --verbose
```

Exit code `0` on success, `1` on any error, `2` on argv error.

### Per-page checks

- `<title>` present and ≤ 70 chars.
- `<meta name="description">` 60–160 chars.
- `<link rel="canonical">` with absolute https URL.
- `<html lang>` attribute.
- `<meta name="robots">` present.
- OG: `og:type`, `og:title`, `og:description`, `og:url`, `og:image`,
  `og:site_name`, `og:locale`.
- Twitter: `twitter:card`, `twitter:site`, `twitter:creator`.
- At least one valid `<script type="application/ld+json">` with
  `@context` and `@type`.
- `<link rel="manifest">` and `<link rel="icon">`.

### Per-site checks

- `sitemap.xml` (or `sitemap-index.xml` for Astro webs) exists and is
  valid sitemaps.org XML.
- `robots.txt` exists with `User-agent: *` and a `Sitemap:` line.
- Home page emits one ecosystem alternate link per other SEO site in
  the registry (10 today), carrying the `data-chimi-ecosystem="true"`
  marker.

### Escape hatch

Pages can opt out by including `<meta name="chimi-seo-skip">` in their
head. Use sparingly — typically only legacy redirect pages or
auto-generated 404s.

## Generating assets

```bash
bun run generate:icons   # favicon set from assets/logos/favicon.svg
```

The icon set lands in `assets/icons/`. OG images (`assets/og/<site>.webp`)
are curated files, not generated. A consumer copies its icons, OG image,
manifest and robots.txt into `public/` with:

```bash
node node_modules/@chimichurricode/design-system/scripts/seo-prebuild.mjs --site <id> --public public
```

## Tests

There is no test suite in this repo yet (the monorepo's `node:test`
suites were not carried over). `bun run check` runs the registry,
site-id and ecosystem drift checks.
