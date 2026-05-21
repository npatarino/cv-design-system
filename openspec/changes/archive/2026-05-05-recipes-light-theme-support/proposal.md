## Why

The recipes migration (`2026-04-30-migrate-webs-to-recipes`) shipped W1–W6 (every web migrated to consume `--recipe-*` instead of `--chimi-color-*`) but left tasks 7.2–7.4 deferred (drop `tokens/color.semantic.json`, update `config.mjs`, regenerate `dist/tokens.css`). The blocker was real: light theme on every web depends on `$extensions.chimi.theme.light` overrides, and those overrides only existed on semantic tokens. Dropping `color.semantic.json` would have broken the dark/light toggle.

Two distinct PENDING-WORK §C items remain because of that gap:

- **RECIPES-LIGHT-001** (medium) — migrate the light-theme story onto recipes so the semantic layer can finally be retired.
- **RECIPES-001** (low) — `packages/techconf/src/components/EventRow.astro` keeps 7 direct `var(--chimi-color-*)` refs in its `:root[data-theme="light"]` block; it's the last documented light-theme debt and the one warning still emitted by `check-recipes.mjs --web techconf`.

This change closes both items in one batch (per the doc's recommendation: "RECIPES-001 likely batched with RECIPES-LIGHT-001 since both touch the light-theme story") and finalises the migration by closing 7.2/7.3/7.4 in the migrate-webs archive.

## What Changes

- Add `$extensions.chimi.theme.light` overrides to the four recipes that need them in `tokens/color.recipe.json`:
  - `canvas-quiet` and `canvas-signal`: `surface` (charcoal → ivory.base), `ink` (ivory.base → charcoal.100), `em` (lemon → red — lemon-on-ivory is unreadable).
  - `paper` and `paper`: no overrides needed (already ivory/charcoal in dark, identical in light).
  - `energy-loud`, `cool-fresh`, `critical`: no overrides — these are accent recipes whose chromatic identity is intentional in both themes.
- Update `packages/design-system/config.mjs`:
  - Add `tokens/color.recipe.json` to the theme-override source list (currently only `color.semantic.json` is scanned).
  - Make the theme block emit `--chimi-color-recipe-<id>-<role>` overrides for the recipes that declare light variants.
  - Drop `tokens/color.semantic.json` from `source` once consumers are migrated.
- Migrate the remaining `var(--chimi-color-{text,accent,emphasis,marker,surface}-*)` consumers to `--recipe-*` (or to documented `--chimi-primitives-color-*` escape hatches):
  - `packages/techconf/src/components/EventRow.astro` (7 refs in light-theme block) — closes RECIPES-001.
  - `packages/design-system/components/SiteHeader.astro` (28 refs).
  - `packages/design-system/components/SiteFooter.astro` (9 refs).
  - `packages/design-system/components/BrandMark.astro` (1 ref in JSDoc — comment update).
  - `packages/talks/index.njk` (11 refs) and `packages/talks/template-gallery.njk` (17 refs) — talks gallery pages.
  - `packages/design-system/web.css` (3 refs to `--chimi-color-accent-critical`) — keep as documented primitive escape hatch (`--chimi-primitives-color-plasma-base`) since `accent-critical` has no light override and isn't a recipe role.
  - `packages/brand/color.html` (36 refs), `components.html` (8), `graphics.html` (1), `social.html` (1) — brand-book preview pages: rewrite to document the post-migration reality (recipes + primitives only, no semantic layer).
- **BREAKING**: Delete `packages/design-system/tokens/color.semantic.json`. Any external consumer that referenced `--chimi-color-{text,surface,accent,emphasis,marker}-*` directly will break — internally none remain after the migration above.
- Regenerate `packages/design-system/dist/tokens.css` (smaller; no semantic block; recipe block grows with the light-theme overrides).
- Update `packages/design-system/scripts/check-recipes.mjs` linter and `__tests__/check-recipes.test.mjs`: remove the documented `EventRow.astro` exception, keep the linter behaviour unchanged otherwise.
- Update `packages/design-system/CHANGELOG.md` to note the breaking change.
- Close in their own archives:
  - `2026-04-27-add-simple-scrum-poker` is **not** affected (SSP already on recipes).
  - `2026-04-30-migrate-webs-to-recipes` proposal §7 tasks 7.2, 7.3, 7.4 → flip to `[x]` with closure note pointing here.
- Update `openspec/PENDING-WORK.md`:
  - §C: remove RECIPES-001 + RECIPES-LIGHT-001 entries; bump §A subtotal 23 → 27 (4 new closures).
  - §B.2 subtotal 21 → 18 (3 migrate items moved to §A).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `closed-recipe-model`: drop the documented `EventRow.astro` light-theme debt clause and the warning carve-out from the linter requirement (Requirement: "Layouts and components consume `--recipe-*`, not `--chimi-color-*`" + Requirement: "Linter as the recipe-model guard rail"); make the spec describe the post-semantic state where `--chimi-color-*` outside the `recipe-*` and `primitives-color-*` namespaces is a hard error.
- `theming`: drop the semantic-layer narrative; describe the new theme story where recipes own per-theme overrides via `$extensions.chimi.theme.light` and `config.mjs` emits `:root[data-theme="<name>"]` blocks for differing recipe roles only.

## Impact

- **Code**: ~120 `--chimi-color-*` references migrated across 9 files in 4 packages (`design-system`, `techconf`, `talks`, `brand`). One JSON tokens file deleted. One generated CSS regenerated.
- **API**: removes the `--chimi-color-{text,surface,accent,emphasis,marker}-*` CSS custom-property namespace from the design system's public surface. The remaining public color API is `--chimi-primitives-color-*` (escape hatch) + `--recipe-*` (consumer-facing) + `--chimi-color-recipe-*` (long-form alias of recipe vars).
- **Build**: `npm run tokens:build` regenerates a smaller `dist/tokens.css` (semantic block gone, light-theme block now contains only recipe overrides).
- **Linter**: `check-recipes.mjs` becomes a hard guard with no exceptions; the warning carve-out for `EventRow.astro` is removed.
- **Tests**: 1 unit test fixture in `__tests__/check-recipes.test.mjs` updated to drop the EventRow exception case.
- **Specs**: 2 modified (`closed-recipe-model`, `theming`).
- **PENDING-WORK closures**: 4 items (§C RECIPES-001, §C RECIPES-LIGHT-001, migrate-webs-to-recipes 7.2/7.3/7.4).
- **No runtime/UX regression expected**: visual output is identical because the light-theme overrides on recipe tokens reproduce exactly the same hex values that semantic tokens were resolving to. CI build (`npm run check:recipes` per web) goes from "1 warning" to "0 warnings".
