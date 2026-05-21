## 1. Type plumbing

- [x] 1.1 Create `packages/design-system/seo/defaults.d.ts` declaring `SiteId`, the typed shape of `SEO_SITE_CATALOG`, `SEODefaults`, and the helper signatures (`defaultsForSite`, `resolveCanonical`, `resolveAbsoluteUrl`, `listEcosystemSites`, `isSiteId`).
- [x] 1.2 Verify the `.d.ts` resolves correctly under Astro's default `Bundler` moduleResolution by importing `SiteId` from a temporary scratch `.ts` file.
- [x] 1.3 Confirm `packages/design-system/package.json` `exports["./seo/defaults"]` map works for both runtime (`.mjs`) and types (`.d.ts`) — add a `types` condition if needed.

## 2. SEOHead and renderer use the derived type

- [x] 2.1 Replace the hand-typed `site:` union in `packages/design-system/components/SEOHead.astro` with `import type { SiteId } from "../seo/defaults"` and reuse `SiteId` directly.
- [x] 2.2 Replace the JSDoc `@typedef` for `SiteId` in `packages/design-system/seo/render-head.mjs` with `@typedef {import("./defaults").SiteId} SiteId`.
- [x] 2.3 Audit the rest of `packages/design-system/seo/*.mjs` for any other places that re-declare the union; replace with the imported typedef. (Also fixed 3 tests with hard-coded id arrays missing `simple-web-validator` — now derived from `SEO_SITE_CATALOG`.)

## 3. Build-time linter

- [x] 3.1 Create `packages/design-system/scripts/check-site-id-union.mjs` per design D3:
  - Loads `SEO_SITE_CATALOG` and computes the canonical id set.
  - Scans `components/SEOHead.astro`, `seo/render-head.mjs`, `seo/defaults.d.ts` for SiteId-like unions.
  - Asserts equality; reports the offending file + diff on mismatch; exits non-zero.
- [x] 3.2 Add unit tests under `packages/design-system/scripts/__tests__/check-site-id-union.test.mjs` covering: clean run, missing id in `.d.ts`, hand-typed regression in `SEOHead.astro`, hand-typed regression in `render-head.mjs` JSDoc. (10 tests, all green.)
- [x] 3.3 Add `check:site-id-union` script to `packages/design-system/package.json` and chain it into the package's `prebuild`/build.
- [x] 3.4 Wire it into the root `package.json` `check:*` umbrella so it runs in CI alongside `check:seo`, `check:recipes`, `check:ecosystem-chrome`. (Also chained into `tokens:build` so every per-web build picks it up automatically.)

## 4. Consumer cleanup

- [x] 4.1 Audit all `Base.astro` files (`blog`, `techconf`, `recall-for-papers`, `simple-pdf-converter`, `simple-scrum-poker`, `simple-json-diff`, `simple-web-validator`) and remove any local re-declaration of `Recipe`/`SEOOverrides` types that mention site ids — keep them, but add a TODO referring to C2 (`extract-web-app-kit`) for the broader extraction. (Audit found no site-id mentions in any consumer's `Recipe`/`SEOOverrides`. Added a C2 TODO comment to all 7 `Base.astro` files documenting the duplication and the planned extraction.)
- [x] 4.2 Verify `packages/talks/scripts/build-seo.mjs` and `packages/brand/scripts/inject-seo-head.mjs` still resolve `SiteId` correctly after the typedef change. (Both scripts import `defaults.mjs` directly and do not depend on the `.d.ts` companion. Smoke-ran both: green.)

## 5. Verification and documentation

- [x] 5.1 Run `npm run build:tokens` and `npm --workspace @chimi/design-system run test` — all existing tests pass. (95/95 — 43 SEO + 52 scripts.)
- [x] 5.2 Run `npm run build` (full monorepo) — every per-web build succeeds, including `simple-json-diff` and `simple-web-validator`. (~33s, exit 0.)
- [x] 5.3 Run `npm run check:seo` — passes. (`pageErrors=0 webErrors=0`.)
- [x] 5.4 Run the new `npm run check:site-id-union` standalone — passes. (`9 canonical ids, 11 files scanned, clean`.)
- [x] 5.5 Add a CHANGELOG entry under `packages/design-system/CHANGELOG.md` (`v0.7.x — SiteId is now structurally derived, prevents drift`). (Added v0.7.1; also bumped package.json version 0.6.0 → 0.7.1.)
- [x] 5.6 Validate the OpenSpec change: `npm run openspec -- validate fix-seo-head-site-union --strict`.
