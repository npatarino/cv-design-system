## Why

The `<SEOHead>` Astro component (`packages/design-system/components/SEOHead.astro`) declares its `site` prop as a hand-typed string union of **7 ids**, but the canonical `SEO_SITE_CATALOG` (`packages/design-system/seo/defaults.mjs`) and the chrome catalog `ECOSYSTEM_SITES` (`packages/design-system/components/ecosystem.ts`) already list **9 sites** (the 7 originals plus `simple-json-diff` and `simple-web-validator`). The two new webs compile today only because Astro does not enforce the prop union strictly when the component is consumed from a `.astro` file; turning on stricter TypeScript checks (a planned follow-up) would break their `Base.astro` files immediately.

The contract is silently broken and will keep drifting every time a new web is added. The fix is to derive the `site` prop type from the catalog itself, so adding a new entry updates the type in lockstep — and a build-time check that fails fast if the two ever drift again.

## What Changes

- **`SEOHead.astro`**: replace the hand-typed `site` union with the `SiteId` type derived from `SEO_SITE_CATALOG` (single source of truth). Equivalent change in `seo/render-head.mjs` JSDoc typedef so it stays consistent.
- **`SEO_SITE_CATALOG`**: re-export a `SiteId` TypeScript type alongside the existing JSDoc `@typedef` so Astro/TS consumers can `import type { SiteId } from "@chimi/design-system/seo/defaults"` without `@ts-expect-error`.
- **`check-ecosystem-chrome.mjs`** (or a new sibling linter `check-seo-head-site-union.mjs`): detect at build time when the `site` union in `SEOHead.astro` (or any consumer) does not exactly match `Object.keys(SEO_SITE_CATALOG)`. Fails the design-system build on drift.
- **`@chimi/design-system` package exports**: expose the `SiteId` type via the `./seo/defaults` subpath so consumer Astro layouts can stop using `@ts-expect-error` when wrapping `SEOHead`.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `cross-web-seo`: tighten the SEO Head requirement to require that the `site` prop type is structurally equal to `keyof SEO_SITE_CATALOG` (no hand-typed union). Add a build-time guard rail.

## Impact

- **Code**: `packages/design-system/components/SEOHead.astro`, `packages/design-system/seo/defaults.mjs` (export `SiteId`), `packages/design-system/seo/render-head.mjs` (JSDoc), one new linter under `packages/design-system/scripts/`, design-system `package.json` scripts.
- **APIs**: no breaking change. The `site` prop accepts the same set of strings (it just now comes from a single declaration).
- **Builds**: the design-system `prebuild` gains a new linter step; consumer webs are unchanged.
- **Risk**: very low. The only behavioural difference is that `simple-json-diff` and `simple-web-validator` finally type-check correctly under stricter TS settings.
