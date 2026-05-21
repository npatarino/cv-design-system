# `@chimi/design-system/seo`

Cross-web SEO foundations for the Chimichurri Code monorepo. Single
source of truth for the head SEO contract that every web in the
ecosystem honours.

## What this module provides

- **`renderSEOHeadHTML(props)`** — string renderer used by talks
  (Eleventy) and brand (static HTML) build scripts.
- **`<SEOHead>`** Astro component (re-exported as
  `@chimi/design-system/SEOHead.astro`) — Astro consumers wrap this in
  their `Base.astro`. Bit-for-bit identical output to the string
  renderer; both go through the same code path.
- **`buildJsonLd({ kind, siteId, data })`** — typed dispatcher
  generating valid schema.org JSON-LD per page kind. Supports `home`,
  `article`, `breadcrumb`, `person`, `event`, `scholarly-article`,
  `software-application`, `presentation`, `webpage`.
- **`buildAlternates(siteId)`** — the 6 cross-ecosystem alternate
  links each home page emits.
- **`buildSitemapEntries(siteId, inputs)` / `renderSitemapXml`** —
  sitemaps.org-compliant XML generation for talks/brand. The 5 Astro
  webs use `@astrojs/sitemap` instead.
- **`renderRobotsTxt(siteId, options)`** — `robots.txt` template.
- **`renderManifest(siteId)`** / **`renderManifestJson(siteId)`** —
  `manifest.webmanifest` per site, derived from each web's primary
  recipe.
- **`SEO_SITE_CATALOG`** — full 7-site ecosystem catalog used by all
  helpers. The consumer-facing `ECOSYSTEM_SITES` (in
  `components/ecosystem.ts`) intentionally lists only 5 sites for the
  `SiteFooter` chrome — SEO sees more.

## Why `.mjs` instead of `.ts`

Talks (Eleventy) and brand (static-HTML build scripts) run plain Node
without an Astro/Vite pipeline. Plain Node cannot resolve `.ts`
imports without flags; ESM `.mjs` files Just Work in every consumer
(Astro, Vite, Eleventy, Node scripts). JSDoc + `@typedef` blocks give
TypeScript users full type inference where they want it.

## Linter `check:seo`

`scripts/check-seo.mjs` validates each web's built HTML against the
spec defined in
`openspec/specs/cross-web-seo/spec.md`.

```bash
npm run check:seo                 # all webs
npm run check:seo -- --web blog   # one web
npm run check:seo -- --skip-missing --verbose
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

### Per-web checks

- `sitemap.xml` (or `sitemap-index.xml` for Astro webs) exists and is
  valid sitemaps.org XML.
- `robots.txt` exists with `User-agent: *` and a `Sitemap:` line.
- Home page emits exactly 6 ecosystem alternate links carrying the
  `data-chimi-ecosystem="true"` marker.

### Escape hatch

Pages can opt out by including `<meta name="chimi-seo-skip">` in their
head. Use sparingly — typically only legacy redirect pages or
auto-generated 404s.

## Generating assets

```bash
npm --workspace @chimi/design-system run icons   # favicon set
npm --workspace @chimi/design-system run og      # OG fallback images per site
```

The icon set lands in `packages/design-system/assets/icons/`; OG
images in `packages/design-system/assets/og/`. Each web's build syncs
the relevant files into its `public/` (or equivalent).

## Tests

```bash
npm run test:seo
```

Runs `node:test` (built-in, no extra deps) over the helpers and the
linter validators.
