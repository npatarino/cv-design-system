## Context

`SEO_SITE_CATALOG` is the canonical 9-entry registry of every web property the monorepo publishes (`blog`, `techconf`, `recall-for-papers`, `simple-pdf-converter`, `simple-scrum-poker`, `simple-json-diff`, `simple-web-validator`, `talks`, `brand`). It lives in `packages/design-system/seo/defaults.mjs` as a `Object.freeze({ … })` with a JSDoc `SiteId` typedef enumerating the same 9 ids by hand.

`<SEOHead>` (`packages/design-system/components/SEOHead.astro`) accepts a `site: SiteId` prop and dispatches to `renderSEOHeadHTML(props)` which validates against the same catalog at runtime. Its TypeScript interface re-declares the union by hand, listing only **7 ids**. The two newer webs (`simple-json-diff`, `simple-web-validator`) compile only because Astro's prop type-check on `.astro` consumers is permissive — turn on `strict` mode at the consumer or replace the `<SEOHead>` callsite with a hand-typed wrapper, and TS will reject those calls.

This change closes the gap once and prevents it from re-opening.

## Goals / Non-Goals

**Goals:**
- The `site` prop type on `SEOHead` is **derived** from `SEO_SITE_CATALOG`, never hand-typed.
- A build-time linter fails when the prop union of `SEOHead` (or any future component that types `site`) drifts from the catalog.
- Consumers can `import type { SiteId } from "@chimi/design-system/seo/defaults"` without `@ts-expect-error`.

**Non-Goals:**
- Unifying `SEO_SITE_CATALOG` and `ECOSYSTEM_SITES` into a single registry — that is the C4 (`unify-site-registry`) change. This change does *not* touch the chrome catalog.
- Migrating consumer `Base.astro` files to a shared layout — that is C2 (`extract-web-app-kit`).
- Changing the runtime behaviour of `<SEOHead>` or any of its outputs.

## Decisions

### D1. Export `SiteId` as a TypeScript type from a `.d.ts` companion file

`seo/defaults.mjs` is a plain `.mjs` file (Eleventy / brand build scripts consume it from CommonJS-ish Node contexts; renaming to `.ts` would break those callers). To expose a real TypeScript `SiteId` type, ship a sibling `seo/defaults.d.ts` with:

```ts
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

export const SEO_SITE_CATALOG: Readonly<Record<SiteId, {
  id: SiteId;
  name: string;
  url: string;
  description: string;
}>>;

// + matching declarations for the helpers (defaultsForSite, listEcosystemSites, …)
```

The runtime catalog stays a `.mjs` `Object.freeze`. The new `.d.ts` is the structural mirror that TS consumers see.

**Why not rename to `.ts`**: Eleventy (CommonJS `require`-based Eleventy 3 config), the brand `inject-seo-head.mjs` script, and the design-system's own `seo/__tests__/*.test.mjs` all import this file from plain Node. Adding a `.d.ts` is the no-rewrite path that satisfies both worlds.

**Why not generate the `.d.ts` from the `.mjs`**: the catalog has 9 entries. The duplication is real but tiny, and the linter (D3) will keep the two in sync. We can revisit code-generation if a 3rd surface needs the same shape.

### D2. `SEOHead.astro` imports `SiteId` and uses it directly

Change:

```astro
- interface Props {
-   site:
-     | "blog"
-     | "techconf"
-     | …7 more…;
-   …
- }
+ import type { SiteId } from "../seo/defaults";
+ interface Props {
+   site: SiteId;
+   …
+ }
```

Same change in `seo/render-head.mjs` JSDoc:

```js
- /** @typedef {"blog"|"techconf"|…7 more…} SiteId */
+ /** @typedef {import("./defaults").SiteId} SiteId */
```

### D3. New linter `check-site-id-union.mjs`

Located at `packages/design-system/scripts/check-site-id-union.mjs`. It:

1. Loads `SEO_SITE_CATALOG` from `seo/defaults.mjs` and computes the canonical id set: `Object.keys(SEO_SITE_CATALOG).sort()`.
2. Walks the design-system source (`components/`, `seo/`) for any TypeScript / JSDoc union literal that mentions any catalog id (regex `"blog"|"techconf"|…` or `@typedef {…}`).
3. For each matching union, asserts the literal set equals the canonical set. Reports the offending file + line + diff on mismatch.
4. Exits non-zero on any mismatch.

The linter is wired into the design-system's `prebuild` step (or alongside `check:ecosystem-chrome` in the package's build script) so it runs on every per-web build that touches DS.

### D4. Re-export `SiteId` via package exports

`packages/design-system/package.json` already exports `./seo/defaults`. The `.d.ts` sits next to the `.mjs`, so TypeScript moduleResolution `Node16`/`NodeNext`/`Bundler` will pick it up automatically (Astro uses `Bundler` by default). No new entry is required, but the existing entry must continue to work for both runtime (`.mjs`) and types (`.d.ts`).

## Risks / Trade-offs

- **[Risk] `.d.ts` and `.mjs` drift**: same as today (the JSDoc typedef and the frozen object can drift). → **Mitigation**: D3 linter catches it on every DS build, and the surface is small (9 ids, 4 fields each).
- **[Risk] Astro prop type checking is permissive**: even after the fix, a `.astro` consumer can pass an invalid string and Astro won't always catch it. → **Mitigation**: out of scope here. Future C4 (`unify-site-registry`) and C7 (`establish-app-architecture-conv`) introduce stricter consumption patterns.
- **[Trade-off] Linter is regex-based, not AST-based**: a developer could obfuscate a hand-typed union (e.g. computed-types, indirection) and bypass the check. → Acceptable trade-off for a 30-line script. If we ever introduce a 4th union of `SiteId`, we promote to an AST walk (TypeScript compiler API).

## Migration Plan

1. Land the `.d.ts` and the linter behind a default-on flag.
2. Update `SEOHead.astro` and `render-head.mjs` to use the imported `SiteId`.
3. Run the design-system build → linter is green.
4. Run `npm run build` (full monorepo) → all 7 webs still build.
5. Update `packages/design-system/CHANGELOG.md`.

Rollback: revert the import in `SEOHead.astro`. The `.d.ts` and linter can stay (no-op effect).

## Open Questions

- (none)
