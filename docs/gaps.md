# Open gaps in the design system

Things the current system does **not** yet formalize. Each entry says what's missing, why it wasn't added in the first pass, and what it would take to close.

---

## Spacing scale

**Status**: absent. Layouts use raw px values — `96px`, `140px`, `40px`, `24px`, `60px`, …

**Why not yet**: the existing values don't form a consistent rhythm. Adding a made-up scale would impose a structure the product doesn't actually have yet, and would force changes to 28 layouts.

**To close**: audit every spacing value in `talks/theme/styles/slides/*.css`, cluster them into 4–6 steps, give them names (`space.slide-padding`, `space.heading-gap`, `space.block-gap`, …), and migrate one layout at a time.

---

## Radius / border / shadow

**Status**: absent. A handful of layouts use borders (kpi-grid's 4px top border) and one uses a full-circle avatar, but there's no shared vocabulary.

**Why not yet**: not enough uses to generalize. Premature abstraction.

**To close**: revisit once there are 3+ distinct values for any of these in production layouts.

---

## Motion

**Status**: lives in `brand/shared/motion.css` and the keyframes inside `talks/theme/styles/base.css` (streaming-text reveal, slide enter/exit). Not tokenized.

**Why not yet**: the motion system is small and coherent — two durations, one easing. Not worth a token layer until a third use case appears.

**To close**: when the deck grows more animation moments, extract `motion.duration.*` and `motion.easing.*` to primitives.

---

## Type-scale rationalization

**Status**: font sizes are named by T-shirt (`xs`, `sm`, `md`, …), but the scale isn't mathematical — it follows the sizes currently in use, which were picked by eye. Ratios between steps vary.

**Why not yet**: forcing the scale onto a modular ratio (e.g. 1.25x) would change the look of every slide. That's a design decision, not a tooling one.

**To close**: a design pass that decides whether to regularize the scale. If yes, edit `size.primitive.json` and accept visual changes across the deck.

---

## Dark / light mode per slide

**Status**: every slide picks its own surface (canvas, paper, accent-cool, etc.) and matching text colors explicitly. There's no "mode" concept.

**Why not yet**: slides aren't apps. Theming the whole deck based on a single switch doesn't match how talks work — moments are chosen, not toggled.

**To close**: not planned. Document the decision if it comes up again.

---

## Brand tokens

**Status**: `brand/shared/styles.css` still has its own palette, duplicated from the pre-library values. It hasn't been migrated.

**Why not yet**: out of scope of the first PR — the user explicitly said "solo talks, luego migramos lo otro."

**To close**: replace `:root` in `brand/shared/styles.css` with an `@import` of the generated tokens + aliases, same pattern as `talks/theme/styles/tokens.css`. Then drop the aliases from both once every consumer uses `--chimi-*` directly.

---

## Brand logo + font assets — DONE (consolidated into DS)

**Status (resolved)**:
- Canonical SVG logos (`logo-character`, `logo-circle`, `logo-code`, `favicon`) live in `packages/design-system/assets/logos/`.
- Canonical font files (CHANEY, At Aero, Scilla Narrow, Thunder) live in `packages/design-system/assets/fonts/`.

Both used to live duplicated across `talks/`, `brand/shared/` and `brand/uploads/`. They are now single-source-of-truth in DS.

**Consumer pattern**:
- **Astro sites**: use the brand components — `BrandMark`, `BrandFavicon`, `BrandLogoWordmark`, `BrandLogoCircle` — which inline the SVG with theme-aware colors via `currentColor` or via props.
- **Static sites that need the asset on disk** (e.g., `<link rel="icon">`, `@font-face url(...)`, `<img src=...>`):
  - **Single file**: `node packages/design-system/scripts/copy-asset.mjs <ds-path> <target>`. Used by blog for the favicon.
  - **Whole directory**: `node packages/design-system/scripts/sync-dir.mjs <subdir> <target-dir>`. Used by brand for both `logos` and `fonts`, and by talks for `fonts`.
- Synced output paths are listed in `.gitignore` — they're regenerated at build time, not committed.

**What's still pending**: `brand/shared/podcast-{dark,light}.png` are brand-guide-specific covers. They could move to `design-system/assets/podcast/` and be synced the same way, but they're not consumed by other sites today. Low priority.

---

## Light theme over recipes — DONE (2026-05-01)

**Status (resolved)**: closed by the `recipes-light-theme-support` change.

- `tokens/color.recipe.json` now carries `$extensions.chimi.theme.light` overrides on the canvas-quiet and canvas-signal recipes' `surface`, `ink`, and `em` roles (the four paper/accent recipes are theme-agnostic by design).
- `config.mjs::THEME_SOURCES` reads recipe overrides directly; the walker is generic so future theme-aware token files just need to be appended.
- Every consumer that referenced the semantic layer (`SiteHeader`, `SiteFooter`, `BrandMark`, `EventRow`, `talks/index.njk`, `talks/template-gallery.njk`, `web.css`, brand HTML pages) was migrated to `--recipe-*` short vars or `--chimi-primitives-color-*` escape hatches.
- `tokens/color.semantic.json` was deleted.
- `packages/design-system/scripts/check-recipes.mjs` now treats any direct `--chimi-color-{text,surface,accent,emphasis,marker}-*` reference as a build-breaking **error** — the previous warning carve-out for `EventRow.astro` is gone.
- Visible improvement: italic emphasis on canvas-quiet light pages flipped from lemon (1.4:1, unreadable) to red (5.15:1, AA).

**What didn't migrate**: the 4 recipes whose chromatic identity is intentionally constant across themes — `paper`, `energy-loud`, `cool-fresh`, `critical`. They have no `$extensions.chimi.theme.light` blocks and need no consumer changes.

**Future tweaks** (not gaps, just polish):
- A slightly darker `paper.em` (currently patagonia, ~2.5:1 on ivory — borderline for italic body text) could be added as a light override if a use case appears.
- A third theme (`high-contrast`, `auto`) would just need a sibling key under `chimi.theme` on the relevant recipe roles; the build pipeline already supports it.

---

## Emphasis depends on text color, not just surface

**Status**: `color.emphasis.on-*` is keyed only by surface (canvas, paper, accent-cool, …). But emphasis readability depends on *both* the surface and the default text color on it.

**Concrete case**: `color.emphasis.on-accent-cool = ivory`. That's correct when the default text is charcoal (big-concept divider). But on big-list bullets — where default text is ivory — the ivory `em` disappears. We worked around it by overriding to `accent.energy` (lemon) locally in `big-list.css` and noting it in the pairing.

**Why not yet**: a full fix means modeling emphasis per (surface, text-color) pair, which doubles the matrix. At two known collisions it's cheaper to override per layout and record it in the pairing notes.

**To close**: if a third case appears, split `emphasis.on-{surface}` into `emphasis.on-{surface}.light-text` and `.dark-text`, or switch to a contrast-aware token resolution step.

