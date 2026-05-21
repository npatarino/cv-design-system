## Why

The identity of a "Chimi web property" lives in three places today:

| File | Owns | Format | Entries |
|---|---|---|---|
| `packages/design-system/components/ecosystem.ts` (`ECOSYSTEM_SITES`) | Chrome catalog (header/footer cross-links) | TypeScript | 7 |
| `packages/design-system/seo/defaults.mjs` (`SEO_SITE_CATALOG`) | SEO catalog (sitemap, alternates, head defaults) | JSDoc-typed `.mjs` | 9 |
| `packages/design-system/seo/defaults.mjs` (`SITE_THEMES`) | Manifest theme colors | JSDoc-typed `.mjs` | 9 |

The two extra entries in the SEO catalog are `talks` and `brand` — they have SEO surfaces but are not productive destinations the chrome links to. This distinction is **real and well-documented** in `openspec/specs/ecosystem-chrome/spec.md` and `openspec/specs/cross-web-seo/spec.md`. The current solution is two separate catalogs + linters that detect drift after the fact.

The problem with separate catalogs:

- **Drift hazard**: when a new web is added, you have to remember to update both, or you get inconsistencies (today the only inconsistency is `simple-json-diff` and `simple-web-validator` are missing from the `SEOHead.astro` site union — that's C1's quick fix).
- **Cross-language duplication**: ids and URLs duplicated between `.ts` and `.mjs`. Today `simple-json-diff` and `simple-web-validator` appear in 3 separate places with the same fields.
- **Hard to reason about**: "is `recall-for-papers` in the chrome?" → you have to grep two files.
- **Hard to extend**: when we want to add a new dimension (e.g. "this site exposes an API" or "this site supports light mode" or "this site has Firebase"), we need either a third catalog or fields scattered across two.

The fix is **one canonical `SITE_REGISTRY`** in `@chimi/design-system` with rich-typed entries that carry **role flags** (`chrome: bool`, `seo: bool`) and **derive** the legacy `ECOSYSTEM_SITES` and `SEO_SITE_CATALOG` accessors as views over the registry. Existing consumers continue to work; new consumers use the unified registry directly.

## What Changes

- **NEW**: `packages/design-system/site-registry.ts` (TypeScript, single source of truth). Each entry has the shape:
  ```ts
  interface SiteEntry {
    id: SiteId;
    name: string;
    url: string;
    description: string;
    /** Render in the cross-web chrome (SiteHeader / SiteFooter ecosystem strip)? */
    chrome: boolean;
    /** Has its own canonical URL, manifest, sitemap, OG image? (always true for now, kept for forward-compat with any "internal-only" registered subdomains.) */
    seo: boolean;
    /** Manifest theme colors. */
    themeColor: string;
    backgroundColor: string;
    maskIconColor: string;
    /** Optional logo overrides (currently `simple-scrum-poker` only). */
    logoSrc?: { logo: string; logoDark?: string; favicon: string };
  }
  ```
- **NEW**: derived views as functions that filter the registry. Existing names are kept as **aliases** for back-compat:
  - `ECOSYSTEM_SITES` → `siteRegistry().filter(s => s.chrome)` returning the legacy `EcosystemSite` shape (name, id, url, description, logoSrc).
  - `SEO_SITE_CATALOG` → `Object.fromEntries(siteRegistry().filter(s => s.seo).map(s => [s.id, { id, name, url, description }]))`.
  - `SITE_THEMES` → derived from `themeColor` / `backgroundColor` / `maskIconColor` fields.
- **NEW**: companion `.d.ts` exposing `SiteId`, `SiteEntry`, `SiteRole = "chrome" | "seo"`, and helper signatures.
- **MIGRATED**: `packages/design-system/components/ecosystem.ts` becomes a thin re-export of the derived chrome view. `packages/design-system/seo/defaults.mjs` becomes a thin re-export (or an `.mjs` adapter that imports the registry and re-exports the legacy shapes for non-TS callers like Eleventy/brand build scripts).
- **NEW linter**: `check-site-registry-drift.mjs` — verifies the canonical id set across `SITE_REGISTRY`, the derived chrome view, the derived SEO view, the `SiteId` `.d.ts`, and any consumer-side hand-typed unions remains consistent. Fails the build on any drift.
- **NO CHANGE TO**: existing consumer imports. `import { ECOSYSTEM_SITES } from "@chimi/design-system/ecosystem"` and `import { SEO_SITE_CATALOG, defaultsForSite } from "@chimi/design-system/seo/defaults"` continue to work. New code is encouraged to use `import { siteRegistry, getSite } from "@chimi/design-system/site-registry"`.

**BREAKING**: none in v0. The legacy aliases stay as long as any consumer uses them. A future change can deprecate them once `npm run check:deprecations` reports no remaining uses.

## Capabilities

### New Capabilities

- `site-registry`: the contract for the unified site registry — what fields every site entry has, how role flags drive derivation, the consumer API (`siteRegistry()`, `getSite(id)`, `sitesWithRole(role)`), and the back-compat guarantees.

### Modified Capabilities

- `cross-web-seo`: tighten the catalog requirement to require that `SEO_SITE_CATALOG` is **derived** from `SITE_REGISTRY` (not redeclared). Add a derivation invariant to the linter.
- `ecosystem-chrome`: tighten the catalog requirement to require that `ECOSYSTEM_SITES` is **derived** from `SITE_REGISTRY` (filtered by `chrome === true`). Add the same derivation invariant.

## Impact

- **NEW file**: `packages/design-system/site-registry.ts` (~200 LOC including types).
- **TOUCHED files**: `components/ecosystem.ts`, `seo/defaults.mjs`, `seo/defaults.d.ts` (from C1), `package.json` exports map (add `./site-registry`).
- **Build**: design-system gains one more linter step. Consumer webs unchanged at runtime.
- **Risk**: low–medium. We rewrite two catalogs that ~7 webs read at build time. Mitigated by keeping the old export shapes byte-equivalent and by an exhaustive snapshot test that compares pre/post values.
- **Sequencing note**: this change depends on C1 (`fix-seo-head-site-union`) for the `SiteId` `.d.ts` plumbing. If C1 hasn't shipped, C4's task list includes the C1 work as a prerequisite.
