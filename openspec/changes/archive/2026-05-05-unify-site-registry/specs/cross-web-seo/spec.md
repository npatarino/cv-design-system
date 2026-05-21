## ADDED Requirements

### Requirement: SEO_SITE_CATALOG is derived from the unified site registry

The `SEO_SITE_CATALOG` exported from `packages/design-system/seo/defaults.mjs` SHALL be **derived** from the unified `SITE_REGISTRY` (`packages/design-system/site-registry.ts`) by filtering on `seo === true` and projecting the entries onto the legacy `SEOSiteCatalogEntry` shape (`{ id, name, url, description }`). It SHALL NOT be hand-declared as a separate frozen object literal.

The legacy export name and shape SHALL be preserved for back-compat with existing `.mjs` consumers (Eleventy, brand build scripts, design-system internal helpers). The derivation SHALL produce a byte-equivalent object after JSON normalisation.

The companion `SITE_THEMES` constant in `defaults.mjs` SHALL be derived in the same way, projecting `themeColor`, `backgroundColor`, and `maskIconColor` from each registry entry.

#### Scenario: SEO_SITE_CATALOG is the seo-filtered view

- **WHEN** a consumer imports `SEO_SITE_CATALOG` from `@chimi/design-system/seo/defaults`
- **THEN** the object SHALL contain exactly the entries where the corresponding `siteRegistry()` entry has `seo === true`
- **AND** the count of keys SHALL equal the count of registry entries with `seo === true`
- **AND** each value's shape SHALL match the legacy `SEOSiteCatalogEntry` interface

#### Scenario: defaultsForSite resolves manifest theme colors via the registry

- **WHEN** `defaultsForSite("blog")` is called
- **THEN** the returned object's `themeColor`, `backgroundColor`, and `maskIconColor` SHALL match the registry entry for `blog` exactly

#### Scenario: A PR hand-declares SEO_SITE_CATALOG separately from the registry

- **WHEN** a developer reverts `seo/defaults.mjs` to a hand-typed `Object.freeze({…})` literal independent of `SITE_REGISTRY`
- **THEN** `check-site-registry-drift.mjs` fails with a message instructing to derive the export from the registry runtime mirror

### Requirement: Cross-language registry bridge

A runtime `.mjs` mirror of the `.ts` registry SHALL be generated at build time so non-TypeScript consumers (Eleventy `.eleventy.js`, brand `inject-seo-head.mjs`, design-system's own `.mjs` SEO helpers) can read the registry without a TypeScript toolchain. The generator SHALL run as part of `npm run build:tokens` (which already runs in every consumer's `prebuild`).

The generated file SHALL be:

- Deterministic (re-running with no source change produces an identical file).
- Side-effect-free (it only exports a frozen array literal).
- Tracked in version control (committed alongside the source `.ts` file) so consumers don't need to run the generator before reading the file.

#### Scenario: The runtime mirror is up to date

- **WHEN** `npm run build:tokens` is invoked
- **THEN** the generator SHALL re-emit the runtime mirror
- **AND** the resulting file SHALL contain the same id set, in the same order, as the `.ts` source

#### Scenario: A stale runtime mirror is detected

- **WHEN** a developer edits `site-registry.ts` and commits without re-running the generator
- **AND** another developer pulls the change and runs `npm run check:site-registry-drift`
- **THEN** the linter SHALL fail with a message identifying which fields are stale and instructing to run `npm run build:tokens`
