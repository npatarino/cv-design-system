## MODIFIED Requirements

### Requirement: `ECOSYSTEM_SITES` is a closed catalog of seven entries

The `@chimi/design-system` package SHALL export `ECOSYSTEM_SITES` from `components/ecosystem.ts` as an array of exactly **seven** entries with the following ids: `blog`, `techconf`, `recall-for-papers`, `simple-pdf-converter`, `simple-scrum-poker`, `simple-json-diff`, `simple-web-validator`.

The `ECOSYSTEM_SITES` array SHALL be **derived** from the unified `SITE_REGISTRY` (`packages/design-system/site-registry.ts`) by filtering on `chrome === true`. It SHALL NOT be hand-declared as a separate frozen object literal. The legacy export name and shape (`EcosystemSite[]`) SHALL be preserved for back-compat with existing consumers.

Each entry SHALL conform to the type:

```ts
interface EcosystemSite {
  id: string;        // stable kebab-case handle, never changes after creation
  name: string;      // display name shown in chrome (may differ from id)
  url: string;       // canonical https URL of the site, no trailing slash
  description: string; // short tagline (≤ 80 chars) for tooltips/lists
  logoSrc?: { logo: string; logoDark?: string; favicon: string };
}
```

Adding, removing, or renaming a site requires an OpenSpec change that modifies this requirement, the `cross-web-seo` catalog requirement, and the `site-registry` requirement together.

#### Scenario: A consumer reads the catalog

- **WHEN** any package imports `ECOSYSTEM_SITES` from `@chimi/design-system/ecosystem`
- **THEN** the array contains exactly 7 entries
- **AND** the set of ids equals `{"blog", "techconf", "recall-for-papers", "simple-pdf-converter", "simple-scrum-poker", "simple-json-diff", "simple-web-validator"}`
- **AND** every entry's id corresponds to a registry entry with `chrome === true`

#### Scenario: A linter audit runs

- **WHEN** the design-system build runs `check-site-registry-drift.mjs` (which subsumes the legacy `check-ecosystem-chrome.mjs`)
- **THEN** the linter verifies the chrome view derived from the registry has exactly 7 entries with the canonical id set
- **AND** the linter verifies every entry has all four legacy fields (`id`, `name`, `url`, `description`) non-empty
- **AND** the linter verifies every `url` starts with `https://` and does NOT end with `/`
- **AND** the linter verifies `ECOSYSTEM_SITES` is the derived view (not a hand-declared duplicate)
- **AND** the build fails if any check fails

#### Scenario: A PR adds an eighth site to the chrome catalog without updating the registry

- **WHEN** a developer pushes a PR that flips a registry entry's `chrome` from `false` to `true` (or appends a new entry with `chrome: true`) without an accompanying OpenSpec change
- **THEN** `check-site-registry-drift.mjs` fails the design-system build because the chrome count is no longer 7
- **AND** the PR is rejected until an accompanying OpenSpec change updates this requirement together with `cross-web-seo`'s catalog requirement and the `site-registry` requirement

#### Scenario: A PR hand-declares ECOSYSTEM_SITES separately from the registry

- **WHEN** a developer reverts `components/ecosystem.ts` to a hand-typed `Object.freeze([…])` literal independent of `SITE_REGISTRY`
- **THEN** `check-site-registry-drift.mjs` fails with a message instructing to derive the export from `sitesWithRole("chrome")`
