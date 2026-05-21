## 1. Recipe-level theme overrides (additive, no consumer breakage)

- [x] 1.1 Add `$extensions.chimi.theme.light` blocks to `packages/design-system/tokens/color.recipe.json`:
  - `canvas-quiet.surface` → `{primitives.color.ivory.base}`
  - `canvas-quiet.ink` → `{primitives.color.charcoal.100}`
  - `canvas-quiet.em` → `{primitives.color.red.base}`
  - `canvas-signal.surface` → `{primitives.color.ivory.base}`
  - `canvas-signal.ink` → `{primitives.color.charcoal.100}`
  - `canvas-signal.em` → `{primitives.color.red.base}`
- [x] 1.2 Update `packages/design-system/config.mjs`: rename `SEMANTIC_SOURCES` → `THEME_SOURCES`, add `tokens/color.recipe.json` to it (keep `color.semantic.json` for now). Verify the `collectThemeOverrides()` walker still finds both file's leaves correctly (no logic change required; the walker is generic).
- [x] 1.3 Run `npm run tokens:build`. Verify `dist/tokens.css` now contains a `:root[data-theme="light"]` block with at least the six new `--chimi-color-recipe-canvas-{quiet,signal}-{surface,ink,em}` overrides AND the existing semantic overrides. Both should coexist at this stage.
- [x] 1.4 Spot-check: open `packages/design-system/web.css` in a browser context (any web's local dev server) with `data-theme="light"` and verify canvas-quiet pages now show charcoal text on ivory surface AND red `<em>` (not lemon). Visual diff against the pre-change behaviour: `em` flips lemon → red; everything else identical.

## 2. Consumer migration: design-system components

- [x] 2.1 Migrate `packages/design-system/components/SiteHeader.astro` (28 refs):
  - Replace `--chimi-color-text-on-canvas` → `var(--recipe-ink)`.
  - Replace `--chimi-color-surface-canvas` → `var(--recipe-surface)`; `--chimi-color-surface-canvas-raised` → `color-mix(in srgb, var(--recipe-ink) 6%, transparent)` or use `--surface-raised` from web.css.
  - Replace `--chimi-color-accent-primary` → `var(--recipe-accent)`.
  - Replace `--chimi-color-accent-energy` → `var(--chimi-primitives-color-lemon-base)` with inline comment `/* primitive escape hatch — energy CTA stays lemon in both themes */`.
  - Replace `--chimi-color-accent-emphasis` → `var(--chimi-primitives-color-red-base)` with inline comment `/* primitive escape hatch — emphasis CTA stays red in both themes */`.
  - Replace fallbacks `var(--chimi-color-text-on-accent-energy, …)` and `var(--chimi-color-text-on-accent-warm, …)` → `var(--chimi-primitives-color-charcoal-100)` (charcoal copy on lemon/red CTAs, fixed in both themes).
- [x] 2.2 Migrate `packages/design-system/components/SiteFooter.astro` (9 refs): same mapping as 2.1 — `text-on-canvas` → `--recipe-ink`, `surface-canvas-raised` → `--surface-raised` derived utility, `accent-primary` → `--recipe-accent`.
- [x] 2.3 Update `packages/design-system/components/BrandMark.astro` JSDoc comment (1 ref): change `var(--chimi-color-accent-primary)` → `var(--recipe-accent)` in the comment example. No code change.
- [x] 2.4 Run `npm run build` for blog and techconf (both consume SiteHeader/Footer); confirm `check-recipes.mjs` no longer reports those packages as warning (they shouldn't have been warning anyway since the DS components weren't scanned, but verify).
- [x] 2.5 Manual smoke: open one DS-component-heavy page (e.g., blog home) in dark and light themes, verify nav links / footer ecosystem links / CTAs render correctly in both modes.

## 3. Consumer migration: techconf

- [x] 3.1 Migrate `packages/techconf/src/components/EventRow.astro` (7 refs in light-theme block, lines 156–168):
  - `var(--chimi-color-accent-emphasis)` → `var(--recipe-em)` (which is now red on canvas-quiet light, the same hex it was reading via `--chimi-color-accent-emphasis`).
  - `var(--chimi-color-surface-canvas)` → `var(--recipe-surface)` (which is now ivory on canvas-quiet light).
  - Drop the `:global(:root[data-theme="light"]) .cfp-chip` and `…a.cfp-chip:hover` selectors entirely — the CFP chip's existing light-mode CSS ALREADY uses `--recipe-em` via the canvas-quiet light override, so the dedicated light-block becomes redundant.
  - Verify the dark-mode rendering is unchanged (no light-block consultation in dark mode).
- [x] 3.2 Update or remove the inline TODO comments in `EventRow.astro` (lines ~146–150) referring to "TODO: migrar a recipes light overrides cuando exista (mismo TODO que web.css)" — that work is now done.
- [x] 3.3 Run `npm run build:techconf`. Verify `check-recipes.mjs` reports `webs/techconf: clean — 0 direct --chimi-color-* references` (down from 7).

## 4. Consumer migration: talks gallery

- [x] 4.1 Migrate `packages/talks/index.njk` (11 refs):
  - `var(--chimi-color-text-on-canvas)` → `var(--recipe-ink)`.
  - `var(--chimi-color-accent-primary)` → `var(--recipe-accent)`.
  - `var(--chimi-color-surface-canvas)` → `var(--recipe-surface)`.
  - The `--hairline`/`--muted`/`--row-bg` derived utilities at lines 31–35 already mirror `web.css`'s recipe-driven utilities; consider replacing them with `@import "@chimi/design-system/web.css"` instead of redeclaring (out of scope if it would expand the visual surface; otherwise prefer it).
- [x] 4.2 Migrate `packages/talks/template-gallery.njk` (17 refs): same mapping as 4.1, plus:
  - `var(--chimi-color-accent-emphasis)` → `var(--recipe-em)` (line 172, "recipe-fg" example coloring).
- [x] 4.3 Run `npm run build:talks` (or the equivalent). Verify the gallery pages render without broken refs.
- [x] 4.4 Confirm the gallery pages render identically in dark mode (the default for talks); in light mode they pick up canvas-quiet light values automatically.

## 5. Consumer migration: brand HTML showcase

- [x] 5.1 Migrate `packages/brand/components.html` (8 refs): swap each `var(--chimi-color-*)` for the equivalent `var(--recipe-*)` short var or `var(--chimi-primitives-color-*)` escape hatch. Inline-comment any escape-hatch use.
- [x] 5.2 Migrate `packages/brand/graphics.html` (1 ref) and `packages/brand/social.html` (1 ref): same approach.
- [x] 5.3 Rewrite `packages/brand/color.html` (36 refs) to document the post-migration color story:
  - The page's purpose changes from "showcase semantic tokens" to "showcase the primitive → recipe → consumer-var pipeline".
  - Add a section explaining that the semantic layer was removed and why.
  - Replace the per-token swatches that referenced `--chimi-color-text-*`, `--chimi-color-surface-*`, etc. with swatches showing the seven recipes (canvas-quiet/signal in both themes; the four paper/accent recipes once each) and a section on primitives.
  - Keep the primitive-color swatches (those still exist via `--chimi-primitives-color-*`).
- [x] 5.4 Visual verify: open `packages/brand/color.html` directly in a browser and confirm the new content renders correctly (no broken refs, colors match the expected primitives/recipes).

## 6. Drop the web.css recipe-remap hack and the semantic JSON layer

- [x] 6.1 Delete lines 125–130 of `packages/design-system/web.css` (the `:root[data-theme="light"]:not([data-recipe]), :root[data-theme="light"] [data-recipe="canvas-quiet"], …` block). Update the comment block above it (lines 111–124) to reflect that recipes now own the per-theme story natively.
- [x] 6.2 Migrate the remaining 3 refs in `web.css` (line 246, 250, 251) for `.tag.critical`: `var(--chimi-color-accent-critical)` → `var(--chimi-primitives-color-plasma-base)` with inline comment `/* primitive escape hatch — .tag.critical stays plasma regardless of carrying recipe */`.
- [x] 6.3 Verify nothing else in the repo consumes `--chimi-color-{text,surface,accent,emphasis,marker}-*`. Run `rg "var\(--chimi-color-(text|surface|accent|emphasis|marker)" packages/` and confirm zero hits outside `dist/tokens.css`, `CHANGELOG.md`, `README.md`, and `docs/*.md` (these are docs that will be updated next).
- [x] 6.4 Delete `packages/design-system/tokens/color.semantic.json`.
- [x] 6.5 Update `packages/design-system/config.mjs`: drop `tokens/color.semantic.json` from the `source` list; the `THEME_SOURCES` constant only has `tokens/color.recipe.json` now.
- [x] 6.6 Run `npm run tokens:build`. Verify `dist/tokens.css`:
  - Contains the six recipe-light overrides under `:root[data-theme="light"]`.
  - Does NOT contain any `--chimi-color-{text,surface,accent,emphasis,marker}-*` tokens.
  - Total size is smaller than pre-change (semantic block + per-theme semantic block both gone; gain offsets the 6 new recipe overrides).

## 7. Linter + tests + docs

- [x] 7.1 Update `packages/design-system/scripts/check-recipes.mjs`:
  - Drop the EventRow exception logic. The linter should produce errors only (no warning class).
  - Update the message wording to reflect the post-semantic state (e.g., "X webs/Y direct semantic-token references" → "X direct deprecated-namespace references").
- [x] 7.2 Update `packages/design-system/scripts/__tests__/check-recipes.test.mjs`:
  - Drop the test case (or fixture) that asserts EventRow.astro was a warning, not an error. Replace with a positive test asserting the linter errors on any `--chimi-color-{text,surface,accent,emphasis,marker}-*` ref.
- [x] 7.3 Update `packages/design-system/docs/theming.md`:
  - Drop the semantic-layer narrative.
  - Document the new theme-override mechanism: per-recipe `$extensions.chimi.theme.light` blocks in `color.recipe.json`.
  - Update the "roles that flip" table to list recipe roles (canvas-quiet/signal `surface,ink,em`) instead of semantic roles.
- [x] 7.4 Update `packages/design-system/docs/gaps.md`: drop the EventRow.astro debt item and the "drop semantic.json" gap. Add a brief "post-semantic-layer" note documenting that gaps in this area should now appear as new recipe-token additions.
- [x] 7.5 Update `packages/design-system/README.md`: drop or rewrite any `--chimi-color-{text,surface,accent,emphasis,marker}-*` references; ensure the component-API section uses `--recipe-*` examples.
- [x] 7.6 Update `packages/design-system/CHANGELOG.md`: add an entry under the next version describing the BREAKING removal of `--chimi-color-{text,surface,accent,emphasis,marker}-*` and the migration path. Reference the proposal directly.

## 8. Spec sync + archive close-out

- [x] 8.1 Run `openspec validate recipes-light-theme-support --strict` and verify it passes (deltas already authored in `specs/closed-recipe-model/spec.md` and `specs/theming/spec.md`).
- [x] 8.2 Run `openspec validate --specs --strict` to confirm all 15 active specs remain valid against the deltas (recipe-light-theme-support archive will trigger a sync of the deltas at archive time).
- [x] 8.3 Build every web sequentially: `npm run build:blog`, `:techconf`, `:recall-for-papers`, `:simple-pdf-converter`, `:simple-scrum-poker`, `:simple-json-diff`. Each invocation runs `check-recipes.mjs` via `prebuild`. Confirm: zero warnings, zero errors. The summary line for `webs total` should read "0 pending --chimi-color-* reference(s) across 0 web(s)".
- [x] 8.4 Run `npm test` at root + `npm run test:rules` in SSP. Confirm no regressions.
- [x] 8.5 Update `openspec/changes/archive/2026-04-30-migrate-webs-to-recipes/proposal.md`: flip tasks 7.2, 7.3, 7.4 from `[ ]` to `[x]` with closure notes pointing to this change (`recipes-light-theme-support`).
- [x] 8.6 Update `openspec/PENDING-WORK.md`:
  - Move RECIPES-001 and RECIPES-LIGHT-001 from §C to §A (note them as resolved by `recipes-light-theme-support` archive).
  - Bump §A subtotal 23 → 27 (4 new closures: 7.2, 7.3, 7.4, plus the EventRow refs collapsed under RECIPES-001 in the same archive).
  - Update §B.2 list and subtotal: `migrate-webs-to-recipes 7.2/7.3/7.4` were not in §B.2 (they were in §C); §B.2 stays at 21 items. The three migrate items previously in §C move to §A.
  - Bump "Last updated" to today's date and "Working tree" status.
- [x] 8.7 Archive the change: `openspec archive recipes-light-theme-support --target-date <YYYY-MM-DD>` (the skill's archive flow handles the rename to `openspec/changes/archive/<date>-recipes-light-theme-support/`). Confirm the spec deltas synced into `openspec/specs/{closed-recipe-model,theming}/spec.md`.
- [x] 8.8 Commit the work in 1–3 logical commits (token+config; consumer-migrations; archive+docs+specs sync). Push to origin.
