## Context

Today the monorepo has two coexisting catalogs of "sites":

```
packages/design-system/components/ecosystem.ts
   ECOSYSTEM_SITES: EcosystemSite[]   ← 7 entries, TypeScript
                                         (id, name, url, description, logoSrc?)

packages/design-system/seo/defaults.mjs
   SEO_SITE_CATALOG: Record<SiteId, SEOSiteCatalogEntry>   ← 9 entries, JSDoc-typed
                                         (id, name, url, description)
   SITE_THEMES: Record<SiteId, { themeColor, backgroundColor, maskIconColor }>
```

The two catalogs share id/name/url/description for the 7 chrome-eligible sites. The SEO catalog adds 2 more (`talks`, `brand`), and a parallel `SITE_THEMES` constant carries manifest colors keyed by the same id.

The catalogs are kept consistent today by:

1. Convention (a developer reading both files).
2. The `check-ecosystem-chrome.mjs` linter that asserts the chrome catalog is exactly 7 entries with the canonical id set.
3. The `check-seo` linter that validates the resulting SEO output.

Both linters catch problems *after* a developer makes the wrong edit. They don't *prevent* the data from being declared in two places.

The proposal is to flip the relationship: one richly-typed `SITE_REGISTRY` is the source, and `ECOSYSTEM_SITES` / `SEO_SITE_CATALOG` / `SITE_THEMES` become **derivations** (small functions that filter and project the registry).

## Goals / Non-Goals

**Goals:**

- One file (`packages/design-system/site-registry.ts`) is the source of truth for site identity.
- Existing `ECOSYSTEM_SITES`, `SEO_SITE_CATALOG`, `SITE_THEMES` exports continue to exist and are byte-equivalent to today's, but are now derived from the registry.
- New consumers can `import { siteRegistry, getSite, sitesWithRole } from "@chimi/design-system/site-registry"` and get rich-typed access.
- Adding a new web becomes a single edit (one entry in the registry) instead of three.
- A linter prevents future drift between the registry and the derived views.

**Non-Goals:**

- Removing the legacy export names (`ECOSYSTEM_SITES`, `SEO_SITE_CATALOG`, `SITE_THEMES`) — they stay forever as derivation aliases.
- Changing any consumer's import. All existing imports continue to work.
- Reshaping the chrome vs SEO distinction — the underlying behaviour is unchanged. The chrome catalog still has 7 entries, the SEO catalog still has 9.
- Renaming any site or changing any URL. This is a refactor of the storage shape only.

## Decisions

### D1. `SITE_REGISTRY` is a TypeScript array, the canonical surface is the `siteRegistry()` accessor

The registry lives in `packages/design-system/site-registry.ts` as:

```ts
export interface SiteEntry {
  readonly id: SiteId;
  readonly name: string;
  readonly url: string;          // canonical https URL, no trailing slash
  readonly description: string;  // ≤ 80 chars for tooltips
  readonly chrome: boolean;      // include in cross-web chrome (header/footer)?
  readonly seo: boolean;         // has its own SEO surface (sitemap, manifest, OG, alternates)?
  readonly themeColor: string;   // hex, used by manifest theme_color + Safari pinned tab
  readonly backgroundColor: string;
  readonly maskIconColor: string;
  readonly logoSrc?: { logo: string; logoDark?: string; favicon: string };
}

export type SiteId =
  | "blog"
  | "techconf"
  | "recall-for-papers"
  | "simple-pdf-converter"
  | "simple-scrum-poker"
  | "simple-json-diff"
  | "simple-web-validator"
  | "talks"
  | "brand";

const SITE_REGISTRY: readonly SiteEntry[] = Object.freeze([
  { id: "blog", name: "Chimichurri Code", url: "https://chimi.pro", description: "Blog, podcast y charlas", chrome: true, seo: true, themeColor: "#1B1B1B", backgroundColor: "#1B1B1B", maskIconColor: "#02B5B9" },
  // … 8 more …
]);

export function siteRegistry(): readonly SiteEntry[] { return SITE_REGISTRY; }
export function getSite(id: SiteId): SiteEntry { … }                         // throws if not found
export function findSite(id: string): SiteEntry | undefined { … }            // safe
export function sitesWithRole(role: "chrome" | "seo"): SiteEntry[] { … }
```

**Why TypeScript and not `.mjs`**: `.ts` gives us `readonly` arrays, satisfaction checks, and `SiteId` typing for free. The `.mjs` consumers (Eleventy `eleventy.js`, brand `inject-seo-head.mjs`) keep working because we ship a `.mjs` adapter (D3) that re-exports the legacy shapes.

### D2. Derived legacy exports

The existing files become thin re-exports:

**`packages/design-system/components/ecosystem.ts`** (after migration):
```ts
import { sitesWithRole, type SiteEntry } from "../site-registry";
import type { SocialLink } from "./types";

export interface EcosystemSite {
  id: string;
  name: string;
  url: string;
  description: string;
  logoSrc?: SiteEntry["logoSrc"];
}

/** @deprecated use `sitesWithRole("chrome")` from `@chimi/design-system/site-registry`. */
export const ECOSYSTEM_SITES: EcosystemSite[] = sitesWithRole("chrome").map((s) => ({
  id: s.id,
  name: s.name,
  url: s.url,
  description: s.description,
  logoSrc: s.logoSrc,
}));

export const DEFAULT_SOCIALS: SocialLink[] = [ /* unchanged */ ];

export function ecosystemLinksExcluding(currentId: string): EcosystemSite[] {
  return ECOSYSTEM_SITES.filter((s) => s.id !== currentId);
}
```

**`packages/design-system/seo/defaults.mjs`** (after migration):
```js
// .mjs adapter — re-exports from the .ts registry via a generated bridge file.
// The bridge is regenerated on `npm run build:tokens` (or alongside it).
import { SITE_REGISTRY_RUNTIME } from "./site-registry-runtime.generated.mjs";
// SITE_REGISTRY_RUNTIME is the freezeable plain-JS mirror of the .ts registry,
// emitted by a tiny build step so .mjs callers don't need a TS toolchain.

export const SEO_SITE_CATALOG = Object.freeze(
  Object.fromEntries(
    SITE_REGISTRY_RUNTIME.filter((s) => s.seo).map((s) => [s.id, {
      id: s.id, name: s.name, url: s.url, description: s.description,
    }]),
  ),
);

const SITE_THEMES = Object.freeze(
  Object.fromEntries(SITE_REGISTRY_RUNTIME.map((s) => [s.id, {
    themeColor: s.themeColor, backgroundColor: s.backgroundColor, maskIconColor: s.maskIconColor,
  }])),
);

// rest of defaults.mjs (defaultsForSite, resolveCanonical, etc.) unchanged.
```

The `site-registry-runtime.generated.mjs` is emitted by a tiny build step (`packages/design-system/scripts/emit-site-registry-runtime.mjs`) that reads the `.ts` source, evaluates the registry literal (it's a pure data structure — no runtime deps), and writes a mirror `.mjs` file. The build step runs as part of `tokens:build` (which already runs in every consumer's `prebuild`), so the runtime mirror is always fresh.

**Alternative considered**: ship the registry as a generated `.json` file. Rejected because:
- Loses the TypeScript discriminated-union ergonomics for the `chrome`/`seo` flags.
- Requires a JSON-schema-aware editor for autocomplete.
- The `emit-site-registry-runtime.mjs` adapter is ~30 lines; the cost is trivial.

### D3. Drift linter

A new linter `packages/design-system/scripts/check-site-registry-drift.mjs` SHALL verify, on every design-system build:

1. The `.ts` source's id literal set equals the `.d.ts` `SiteId` union.
2. The `.mjs` runtime mirror's id set equals the `.ts` source's id set.
3. Every site marked `chrome: true` is exposed via the derived `ECOSYSTEM_SITES`.
4. Every site marked `seo: true` is exposed via the derived `SEO_SITE_CATALOG`.
5. Every site has non-empty `themeColor`, `backgroundColor`, `maskIconColor`.
6. Every URL starts with `https://` and does not end with `/` (carried over from `check-ecosystem-chrome.mjs`).

The existing `check-ecosystem-chrome.mjs` becomes a thin wrapper that delegates to `check-site-registry-drift.mjs`'s chrome-specific assertions (and we eventually retire it as a separate command, kept as an alias).

The new `check-site-id-union.mjs` from C1 becomes part of this linter too — by then the union is derived from the registry, not declared by hand, so the check is "the `.d.ts` and the `.mjs` runtime mirror agree on the id set" rather than "the SEOHead union agrees with the catalog".

### D4. Migration strategy: zero-downtime, byte-equivalent

The migration is structured to preserve byte equivalence at every step:

1. **Add the registry** without changing any consumer. `ECOSYSTEM_SITES` and `SEO_SITE_CATALOG` are still hand-declared. The new `siteRegistry()` is also exported but unused.
2. **Add a parity test** that asserts `siteRegistry().filter(chrome).map(stripToEcosystem)` deep-equals the existing `ECOSYSTEM_SITES`, and same for SEO.
3. **Flip the consumers** to derive from the registry. The hand-declared `ECOSYSTEM_SITES` becomes the derived expression. Parity test still passes (it now tautologically equals itself).
4. **Delete the parity test** (after the migration is one PR), or keep it as a cheap regression catcher.
5. **Land the linter** that prevents anyone from going back.

No consumer's import or usage changes during this migration.

### D5. Package exports

`packages/design-system/package.json` adds:

```json
{
  "exports": {
    "./site-registry": "./site-registry.ts",
    "./site-registry-runtime": "./scripts/site-registry-runtime.generated.mjs"
  }
}
```

(`./site-registry-runtime` is internal — only the SEO `.mjs` and the linter use it. We document it as such.)

## Risks / Trade-offs

- **[Risk] The `.ts` ↔ `.mjs` bridge is a new build step**: → **Mitigation**: it's invoked by `npm run build:tokens` which already runs on every per-web `prebuild`. The script is ~30 lines, deterministic, and idempotent. The drift linter (D3) catches the case where the bridge is stale.
- **[Risk] Subtle behavioural changes in the derived `ECOSYSTEM_SITES`**: → **Mitigation**: D4 parity test runs in the same PR that flips the consumer.
- **[Risk] Eleventy and brand build scripts use `defaults.mjs` synchronously at config-eval time**: → confirmed compatible; the runtime mirror is a plain `.mjs` `export const`, no async. Verified by running `npm run build:talks` and `npm run build:brand` before/after.
- **[Trade-off] Two flavours of the registry (`.ts` source, `.mjs` mirror)**: yes, but the cost is one auto-generated file. The win is one editing surface.

## Migration Plan

1. Add `site-registry.ts` and `emit-site-registry-runtime.mjs`. Run the emit script. Commit both `site-registry.ts` and the generated `site-registry-runtime.generated.mjs`.
2. Add the parity test (`packages/design-system/scripts/__tests__/site-registry-derivation.test.mjs`).
3. Update `components/ecosystem.ts` to derive `ECOSYSTEM_SITES` from the registry. Run the test → green.
4. Update `seo/defaults.mjs` to derive `SEO_SITE_CATALOG` and `SITE_THEMES` from the runtime mirror. Run the test → green.
5. Delete the inline frozen objects in both files.
6. Add `check-site-registry-drift.mjs` and wire into design-system `prebuild`.
7. Run `npm run build` (full monorepo) → all 7 webs build, no behavioural diff.
8. Update `packages/design-system/CHANGELOG.md`.

Rollback per step: each step is its own commit. Reverting any step restores the prior state (the registry is purely additive until step 3).

## Open Questions

- **Should the registry expose nav links for chrome consumers?** Today `SiteHeader` consumers (each web's `Base.astro`) hand-write their `navLinks` array. Promoting these to the registry would let the chrome render an "auto-nav" mode. Out of scope here; revisit in C7 (`establish-app-architecture-conventions`).
- **Should `talks` and `brand` get a `chrome: true` flag in some future release?** Decision: **no**, the spec rationale (they're not productive end-user destinations) still holds. Revisit only if product requirements change.
