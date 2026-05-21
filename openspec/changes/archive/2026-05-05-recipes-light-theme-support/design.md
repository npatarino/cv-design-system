## Context

The recipes migration (`2026-04-30-migrate-webs-to-recipes`) shipped W1–W6 but the cleanup tasks 7.2–7.4 (drop `tokens/color.semantic.json`, update `config.mjs`, regenerate `dist/tokens.css`) were deferred because the light theme on every web depended on `$extensions.chimi.theme.light` overrides that only existed on semantic tokens. The hack in `web.css` (lines 125–130) — re-mapping `--recipe-surface`/`--recipe-ink` for `[data-theme="light"]:not([data-recipe])` and `[data-recipe="canvas-quiet|signal"]` to paper values — was a temporary bridge until recipes themselves became theme-aware.

This change closes that loop. It adds `$extensions.chimi.theme.light` overrides to the canvas recipes (the only recipes that need light variants), generalises `config.mjs` to read theme overrides from any source — not just `color.semantic.json` — migrates the last 9 files that still consume the doomed `--chimi-color-{text,surface,accent,emphasis,marker}-*` namespace, and finally deletes `color.semantic.json` so the design system has a single coherent color story: primitives → recipes (with optional per-recipe theme overrides) → consumer-facing `--recipe-*` short vars.

A side benefit: the existing `web.css [data-theme="light"]` hack only swapped `surface` and `ink`, leaving `--recipe-em` as lemon-on-ivory in light canvas recipes — which is unreadable (~1.4:1 contrast). After this change, the canvas-quiet/signal recipes declare `em: red` for light, so italic emphasis becomes legible automatically.

## Goals / Non-Goals

**Goals:**

- Close PENDING-WORK §C RECIPES-001 (EventRow.astro debt) and §C RECIPES-LIGHT-001 (drop semantic layer).
- Close `migrate-webs-to-recipes` archive tasks 7.2 / 7.3 / 7.4.
- Keep the visual output of every web/talk identical in dark mode, **fix** the previously broken light-mode `em` contrast on canvas recipes.
- Reduce `dist/tokens.css` size: drop the entire semantic block (~25 tokens × 2 themes); add 6 light overrides for canvas recipes.
- Keep `npm run check:recipes` green for every web (today: 1 warning on techconf; after: 0).

**Non-Goals:**

- Not introducing new recipes. The catalog stays at 7 (canvas-quiet, canvas-signal, paper, energy-loud, cool-fresh, critical).
- Not re-architecting `web.css`'s derived-token layer (`--hairline`, `--muted`, etc.). Those already consume `--recipe-*` only.
- Not touching `talks` slide CSS (slide-scoped recipes already work; only the talks **gallery** index pages need migration).
- Not adding a third theme. The dark/light dichotomy is preserved.
- Not changing `theme-toggle` UI behaviour (the toggle still flips `data-theme`).
- Not addressing the talks slide-scoped CSS (which was already migrated by `2026-04-30-migrate-webs-to-recipes` W6).

## Decisions

### D1. Add light overrides only to canvas-quiet and canvas-signal

**What**: Only the two charcoal-surfaced recipes get `$extensions.chimi.theme.light` blocks for `surface`, `ink`, and `em`.

**Why over alternatives**:

- *(alt)* Adding light overrides to all 7 recipes: rejected. Paper recipes (warm, cool) are already light by design and serve as the visual target — flipping them in light mode would invert correctly-rendered editorial. Accent recipes (energy-loud, cool-fresh, critical) are intentionally fluorescent on both themes — that's their identity.
- *(alt)* Treating "light theme" as a separate recipe entirely (e.g., introducing `paper-default` as a new fluctuating recipe): rejected. Recipes are content-typed (canvas-quiet = "long-form editorial"), not theme-typed. A light page is still long-form editorial; it's the same recipe, themed.

**Consequence**: The light theme story collapses cleanly into "two canvas recipes have inverted defaults". `config.mjs` only needs to enumerate two recipes' theme overrides; consumers don't need new patterns.

### D2. Generalise theme-override source list in config.mjs

**What**: Rename the `SEMANTIC_SOURCES` constant in `packages/design-system/config.mjs` to `THEME_SOURCES` (or similar) and include `tokens/color.recipe.json`. Drop `tokens/color.semantic.json` from both `THEME_SOURCES` and the Style Dictionary `source` list.

**Why**: The `collectThemeOverrides()` function is generic — it walks any JSON tree looking for `$extensions.chimi.theme.<name>` blocks. The only thing tying it to semantic.json was the hardcoded source list. Generalising lets recipes declare overrides without inventing a new mechanism.

**Consequence**: When a future change wants to add a third theme or extend overrides to e.g. `paper`, it edits `color.recipe.json` only. Build pipeline unchanged.

### D3. Drop the web.css light-theme recipe-remap hack

**What**: Lines 125–130 of `web.css`:

```css
:root[data-theme="light"]:not([data-recipe]),
:root[data-theme="light"] [data-recipe="canvas-quiet"],
:root[data-theme="light"] [data-recipe="canvas-signal"] {
  --recipe-surface: var(--chimi-color-recipe-paper-surface);
  --recipe-ink:     var(--chimi-color-recipe-paper-ink);
}
```

are deleted. The light-theme overrides on the recipe tokens themselves now do this work via the `:root[data-theme="light"]` block in `tokens.css` (which redefines `--chimi-color-recipe-canvas-quiet-{surface,ink,em}` in light mode; the `:where([data-recipe="canvas-quiet"])` block then maps `--recipe-{surface,ink,em}` to those — picking up the right values per theme).

**Why**: The hack was a temporary bridge. Once recipes carry theme overrides natively, the hack is redundant AND incomplete (it didn't swap `--recipe-em`, leaving lemon-on-ivory). Removing it both simplifies and fixes.

**Consequence**: Visual: canvas-quiet light mode now shows `em` as red (previously lemon, unreadable). All other roles unchanged.

### D4. Migrate brand HTML pages to recipes (not just delete them)

**What**: `packages/brand/{color,components,graphics,social}.html` are brand-book preview pages that intentionally use semantic tokens to demonstrate the API. After dropping semantic.json those references break. The migration:

- `components.html` (8 refs), `graphics.html` (1), `social.html` (1): rewrite each ref to consume `--recipe-*` short vars or `--chimi-primitives-color-*` escape hatches with inline comments. These are showcase pages — they don't need a fancy story; they just need to render.
- `color.html` (36 refs): this page **documents** the color tokens. It will be rewritten to document the new reality: "primitives → recipes (with optional theme overrides) → consumer `--recipe-*`". The semantic layer is no longer documented because it doesn't exist.

**Why over alternatives**:

- *(alt)* Delete the brand HTML pages entirely: rejected. They're internal design references, useful for visualising the system. Better to keep them current.
- *(alt)* Leave them as-is, broken: rejected. Broken showcase pages are a confusing signal. They'd render with `unset` colors falling back to UA defaults — that's worse than no page.

**Consequence**: brand color.html becomes the canonical living doc for the recipe-only color story.

### D5. Keep `--chimi-color-accent-critical` as a primitive escape hatch in web.css

**What**: `web.css` line 250–251 uses `--chimi-color-accent-critical` (semantic) for the `.tag.critical` plasma styling. Migrate to `--chimi-primitives-color-plasma-base` with an inline comment.

**Why**: There's no `--recipe-*` role for "critical accent on a non-critical recipe". The `.tag.critical` is a tag style that picks up plasma regardless of carrying recipe — that's exactly the primitive-escape-hatch use case documented in `closed-recipe-model` Requirement: Layouts and components consume `--recipe-*`, not `--chimi-color-*`.

**Consequence**: One-line change. No spec update needed (the escape-hatch pattern is already documented).

### D6. Sequence: tokens → consumers → drop → regen

**What**: Implementation order is critical to keep the build green at every commit:

1. Add `$extensions.chimi.theme.light` overrides to `color.recipe.json` (no consumer breakage; new tokens are additive).
2. Update `config.mjs` to include `color.recipe.json` in the theme-source list (still keeps `color.semantic.json` for now).
3. Run `npm run tokens:build` — `dist/tokens.css` now contains both semantic AND recipe theme overrides. Both work.
4. Migrate consumers (Header, Footer, BrandMark, EventRow, talks gallery, brand HTML, web.css critical hatch) to use `--recipe-*` or primitive escape hatches.
5. Verify nothing in `packages/{blog,techconf,recall-for-papers,simple-pdf-converter,simple-scrum-poker,talks,brand,design-system}` consumes `--chimi-color-{text,surface,accent,emphasis,marker}-*` anymore (`grep -r` check).
6. Drop `web.css` lines 125–130 (the recipe-remap hack) — this depends on step 4 being complete because the canvas recipe light override now does the work.
7. Drop `color.semantic.json` from disk and from `config.mjs` source list.
8. Re-run `npm run tokens:build` — `dist/tokens.css` smaller, no semantic block.
9. Update linter (`check-recipes.mjs` + tests) to remove EventRow exception.
10. Update `closed-recipe-model` and `theming` specs (delta artefacts already authored as part of this proposal).
11. Update CHANGELOG, docs (theming.md), brand color.html.

**Why**: Each step keeps the build passing on its own; if a step fails, rollback is local (revert the last commit, no cascading damage).

## Risks / Trade-offs

- **[Risk] Visual regression in light mode for canvas-quiet/signal pages.** *Mitigation*: the only intentional change is `--recipe-em` flipping from lemon to red. All other roles map to the same hex values that the previous web.css hack produced. Verify by diffing dist/tokens.css before/after the change and visually inspecting one page per web in light mode (manual smoke; documented in tasks.md).

- **[Risk] Internal docs/CHANGELOG references to `--chimi-color-*` semantic tokens become stale.** *Mitigation*: the migration sweeps `packages/design-system/{README,CHANGELOG,docs}` for stale references; `gaps.md` and `theming.md` get updated with the new story.

- **[Risk] External consumers of the design system (none today, but the package is published) lose the `--chimi-color-{text,surface,accent,emphasis,marker}-*` API.** *Mitigation*: the design system is not yet published to npm; only the monorepo consumes it. CHANGELOG marks this as **BREAKING** and documents the migration path (`var(--chimi-color-text-on-canvas)` → `var(--recipe-ink)`, etc.).

- **[Risk] `check-recipes.mjs` regression: removing the EventRow carve-out and any future light-theme consumer trips the linter into errors instead of warnings.** *Mitigation*: the linter already catches both error and warning paths; we just collapse to errors-only. The test suite (`__tests__/check-recipes.test.mjs`) is updated to assert errors-only behaviour.

- **[Risk] Brand HTML pages (`color.html`, etc.) are updated only structurally — no full design pass.** *Mitigation*: explicitly out of scope. The pages are functional documentation; a richer redesign can land later as its own change.

- **[Risk] Talks gallery (`index.njk`, `template-gallery.njk`) renders differently after migration.** *Mitigation*: those pages currently use semantic tokens for `surface.canvas` etc. After migration they'll use `--recipe-surface` (canvas-quiet by default), which resolves to the same charcoal in dark and (now correctly) ivory in light. Behaviour preserved; visual diff zero in the default dark mode.

## Migration Plan

This change is its own migration; there is no separate rollout step. Implementation lands in a single PR with 11 ordered commits (per Decisions D6). Consumers (the 5 webs + talks) are inside the monorepo and will rebuild against the new tokens automatically; no external action needed.

Rollback: revert the PR. The deleted `color.semantic.json` is recoverable from git history; the linter and config.mjs revert to their pre-change state.

## Open Questions

- None blocking. All consumer files have been enumerated (proposal §What Changes); the spec deltas are authored; the build sequence is established.
