## MODIFIED Requirements

### Requirement: SEOHead component and helpers contract

The design system SHALL expose:

- A subpath export `@chimi/design-system/SEOHead.astro` for an Astro component that renders the entire SEO head from typed props (see design.md D2 for the prop shape). The component's `site` prop SHALL be typed as `SiteId`, where `SiteId` is **derived structurally** from `Object.keys(SEO_SITE_CATALOG)` and SHALL NOT be redeclared as a hand-typed string union in the component file. Equivalent constraint applies to the JSDoc `@typedef` of `SiteId` in `seo/render-head.mjs`.
- A subpath export `@chimi/design-system/seo` with these helpers (TypeScript ESM, no Astro runtime):
  - `defaultsForSite(siteId): SEODefaults` — returns the default `og`, `twitter`, `canonical` base, `manifest` shape for a given ecosystem site.
  - `buildJsonLd({ kind, data }): SchemaOrgThing` — typed dispatcher for JSON-LD generation per page kind.
  - `buildAlternates(siteId): AlternateLink[]` — returns the cross-ecosystem alternate links.
  - `buildSitemapEntries(pages): SitemapEntry[]` — used by talks/brand build scripts.
  - `renderSEOHeadHTML(props): string` — used by talks/brand build scripts to emit the head as a string in non-Astro contexts.
- A subpath export `@chimi/design-system/seo/defaults` that exports both the runtime catalog (`SEO_SITE_CATALOG`, `defaultsForSite`, `resolveCanonical`, `resolveAbsoluteUrl`, `listEcosystemSites`, `isSiteId`) AND a TypeScript `SiteId` type, so consumer Astro layouts can `import type { SiteId } from "@chimi/design-system/seo/defaults"` without `@ts-expect-error` or `@ts-ignore`.
- A subpath export `@chimi/design-system/assets/og/<siteId>.png` for the 1200×630 OG fallback image of every site.
- A subpath export `@chimi/design-system/assets/icons/` for the favicon + apple-touch-icon + mask-icon + manifest assets.

#### Scenario: Astro web imports the component

- **WHEN** an Astro web's `Base.astro` writes `import SEOHead from "@chimi/design-system/SEOHead.astro"`
- **THEN** the import SHALL resolve via the `exports` map of `@chimi/design-system/package.json`
- **AND** the component SHALL accept the props described in design.md D2 with TypeScript inference

#### Scenario: SEOHead site prop accepts every catalog entry

- **WHEN** any Astro consumer renders `<SEOHead site="simple-json-diff" … />` or `<SEOHead site="simple-web-validator" … />`
- **THEN** the call SHALL type-check without `@ts-expect-error` or `@ts-ignore`
- **AND** the rendered head SHALL be functionally identical to a call with any of the seven prior site ids

#### Scenario: Consumer imports SiteId type from defaults

- **WHEN** a consumer writes `import type { SiteId } from "@chimi/design-system/seo/defaults"`
- **THEN** the import SHALL resolve under `Bundler` / `NodeNext` module resolution
- **AND** the resolved type SHALL be a string literal union of every key of `SEO_SITE_CATALOG`

#### Scenario: Non-Astro context calls renderSEOHeadHTML

- **WHEN** the `packages/talks/scripts/build-seo.mjs` calls `renderSEOHeadHTML({ site: "talks", title, description, jsonLd })`
- **THEN** the function SHALL return a string of valid HTML
- **AND** the string SHALL include `<title>`, `<meta name="description">`, `<link rel="canonical">`, OG tags, Twitter tags, JSON-LD, manifest link, favicon links

#### Scenario: defaultsForSite returns the expected shape

- **WHEN** `defaultsForSite("blog")` is called
- **THEN** it SHALL return an object with `siteName: "Chimichurri Code"`, `canonicalBase: "https://chimi.pro"`, `defaultOgImage: "/og/blog.png"`, `themeColor: <recipe-derived hex>`

## ADDED Requirements

### Requirement: Build-time guard against SiteId union drift

The design-system package build pipeline SHALL run a linter (`packages/design-system/scripts/check-site-id-union.mjs`, or equivalent) that verifies no consumer of the `site` prop or `SiteId` type within the design system itself redeclares the union as a hand-typed string list that differs from `Object.keys(SEO_SITE_CATALOG)`. The linter SHALL inspect at minimum: `components/SEOHead.astro`, `seo/render-head.mjs`, and the `.d.ts` companion of `seo/defaults.mjs`.

The linter SHALL be invoked from the design-system's `prebuild` (or equivalent) so it runs on every per-web build that depends on `@chimi/design-system`. Failure SHALL print the offending file, the canonical id set, and the diff, and SHALL exit non-zero.

#### Scenario: Clean build runs

- **WHEN** the design-system build runs against a current, conformant version of the package
- **THEN** `check-site-id-union.mjs` reports OK and the build succeeds

#### Scenario: A new site is added to SEO_SITE_CATALOG without updating the .d.ts

- **WHEN** a developer appends a new entry to `SEO_SITE_CATALOG` in `seo/defaults.mjs`
- **AND** does not update the corresponding `SiteId` declaration in `seo/defaults.d.ts`
- **THEN** `check-site-id-union.mjs` fails with a message naming the missing id and the file that needs updating
- **AND** the build of any consumer web fails

#### Scenario: A regression hand-types the SEOHead site prop

- **WHEN** a developer reverts `SEOHead.astro` to a hand-typed string union for the `site` prop
- **THEN** `check-site-id-union.mjs` fails with a message instructing to import `SiteId` from `seo/defaults`
- **AND** the build of any consumer web fails
