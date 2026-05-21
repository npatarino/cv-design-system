## ADDED Requirements

### Requirement: Single source of truth for site identity

The design-system package SHALL ship a unified registry `SITE_REGISTRY` in `packages/design-system/site-registry.ts` as the **single source of truth** for the identity of every Chimi web property. Each entry SHALL have the shape:

```ts
interface SiteEntry {
  readonly id: SiteId;
  readonly name: string;
  readonly url: string;          // canonical https URL, no trailing slash
  readonly description: string;  // ≤ 80 chars
  readonly chrome: boolean;      // include in cross-web chrome (header/footer)?
  readonly seo: boolean;         // has its own SEO surface?
  readonly themeColor: string;
  readonly backgroundColor: string;
  readonly maskIconColor: string;
  readonly logoSrc?: { logo: string; logoDark?: string; favicon: string };
}
```

The registry SHALL contain exactly **9 entries** with the canonical id set: `blog`, `techconf`, `recall-for-papers`, `simple-pdf-converter`, `simple-scrum-poker`, `simple-json-diff`, `simple-web-validator`, `talks`, `brand`. Adding, removing, or renaming a site requires an OpenSpec change that modifies this requirement and the dependent `cross-web-seo` and `ecosystem-chrome` requirements together.

#### Scenario: Consumer reads the registry

- **WHEN** any package imports `siteRegistry()` from `@chimi/design-system/site-registry`
- **THEN** the function SHALL return a frozen array of exactly 9 entries
- **AND** the set of ids SHALL equal `{"blog", "techconf", "recall-for-papers", "simple-pdf-converter", "simple-scrum-poker", "simple-json-diff", "simple-web-validator", "talks", "brand"}`

#### Scenario: Consumer reads the SiteId type

- **WHEN** a TypeScript consumer writes `import type { SiteId } from "@chimi/design-system/site-registry"`
- **THEN** the resolved type SHALL be a string literal union containing exactly the 9 canonical ids

### Requirement: Role flags drive derivation of legacy catalogs

The legacy `ECOSYSTEM_SITES` catalog (chrome) SHALL be **derived** from `siteRegistry().filter(s => s.chrome)`, not redeclared by hand. The legacy `SEO_SITE_CATALOG` (SEO) SHALL be **derived** from `siteRegistry().filter(s => s.seo)`. The legacy `SITE_THEMES` constant SHALL be **derived** by projecting the registry's color fields.

The derivation SHALL preserve the legacy export shapes byte-equivalently (after JSON normalisation) so existing consumers' imports continue to work without modification.

#### Scenario: ECOSYSTEM_SITES is a chrome-filtered view

- **WHEN** a consumer imports `ECOSYSTEM_SITES` from `@chimi/design-system/ecosystem`
- **THEN** the array SHALL contain exactly the entries where `siteRegistry()[i].chrome === true`
- **AND** the entry shape SHALL match the legacy `EcosystemSite` interface (`{ id, name, url, description, logoSrc? }`)

#### Scenario: SEO_SITE_CATALOG is an SEO-filtered view

- **WHEN** a consumer imports `SEO_SITE_CATALOG` from `@chimi/design-system/seo/defaults`
- **THEN** the object SHALL contain exactly the entries where `siteRegistry()[i].seo === true`
- **AND** each value SHALL match the legacy `SEOSiteCatalogEntry` interface (`{ id, name, url, description }`)

### Requirement: Public API for new consumers

The package SHALL expose, in addition to `siteRegistry()`, the following helpers from `@chimi/design-system/site-registry`:

- `getSite(id: SiteId): SiteEntry` — returns the entry for the given id; throws if not found.
- `findSite(id: string): SiteEntry | undefined` — safe lookup; returns undefined for unknown ids.
- `sitesWithRole(role: "chrome" | "seo"): SiteEntry[]` — filtered view by role.
- `isSiteId(value: string): value is SiteId` — type guard, equivalent to the existing `isSiteId` in `seo/defaults.mjs`.

#### Scenario: Consumer fetches a single site

- **WHEN** a consumer writes `getSite("blog")`
- **THEN** the function SHALL return the `SiteEntry` with `id === "blog"`
- **AND** the returned entry SHALL include `chrome: true` and `seo: true`

#### Scenario: Consumer queries by role

- **WHEN** a consumer writes `sitesWithRole("chrome")`
- **THEN** the returned array SHALL contain only the entries with `chrome: true`
- **AND** the array length SHALL equal the number of chrome-eligible sites declared in the registry

### Requirement: Drift linter

The repository SHALL ship `packages/design-system/scripts/check-site-registry-drift.mjs` (or equivalent) that runs as part of the design-system `prebuild` step and verifies:

1. The `.ts` source's id literal set equals the `.d.ts` `SiteId` union literal set.
2. The runtime `.mjs` mirror's id set equals the `.ts` source's id set.
3. Every site marked `chrome: true` is exposed via the derived `ECOSYSTEM_SITES`.
4. Every site marked `seo: true` is exposed via the derived `SEO_SITE_CATALOG`.
5. Every entry has non-empty `themeColor`, `backgroundColor`, `maskIconColor`.
6. Every URL starts with `https://` and does not end with `/`.

The linter SHALL exit non-zero on any failure and SHALL print the offending field, file, and remediation hint.

#### Scenario: Clean build runs

- **WHEN** the design-system build runs against a current, conformant version of the package
- **THEN** `check-site-registry-drift.mjs` reports OK and the build succeeds

#### Scenario: A developer adds an entry to the registry without regenerating the runtime mirror

- **WHEN** a developer appends a new entry to `SITE_REGISTRY` in `site-registry.ts`
- **AND** does not run the runtime mirror generator
- **THEN** `check-site-registry-drift.mjs` fails with a message naming the missing id and instructing to run the generator

### Requirement: Runtime mirror generation

The repository SHALL ship `packages/design-system/scripts/emit-site-registry-runtime.mjs` (or equivalent) that reads `site-registry.ts`, evaluates the registry literal as pure data, and writes the runtime `.mjs` mirror that the `.mjs` SEO helpers consume. The script SHALL run as part of `npm run build:tokens` (which already runs in every consumer's `prebuild`).

#### Scenario: tokens:build emits the runtime mirror

- **WHEN** `npm run build:tokens` runs
- **THEN** `packages/design-system/scripts/site-registry-runtime.generated.mjs` SHALL be regenerated
- **AND** its contents SHALL be deterministic (re-running with no source change produces an identical file)
