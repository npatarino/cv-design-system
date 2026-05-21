## Context

`@chimi/design-system` exposes two layers of color tokens:

1. **Primitives** (`color.primitive.json`): brand inks — `charcoal.100`, `ivory.base`, `patagonia.base`, `lemon.base`, `red.base`, `plasma.base`, plus a couple of variants. Six hues total.
2. **Semantic** (`color.semantic.json`): role aliases — `surface.canvas`, `text.on-canvas`, `accent.primary`, `marker.highlight`, etc. Each role points to a single primitive.

Style Dictionary builds both into `dist/tokens.css` (a flat `:root { --chimi-color-…: #hex; }`) and `dist/tokens.js`. Consumer sites import `@chimi/design-system/web.css`, which in turn imports `dist/tokens.css` and adds web-scale derived role tokens (`--hairline`, `--muted`, `--row-bg-hover`) computed via `color-mix()` against `--chimi-color-text-on-canvas` and `--chimi-color-accent-primary`.

Today the canvas is charcoal and the text is ivory — a single dark theme is hard-coded into the semantic layer. There is no `prefers-color-scheme` handling, no `data-theme` attribute, no toggle UI.

The shared `SiteFooter.astro` lives in the design system and is consumed by `blog` (and intended for the rest). Its current visual styling already uses semantic tokens plus the web-scale derived tokens, so swapping the underlying primitives should propagate automatically — provided the derived tokens still resolve to legible contrast on a light background.

User wants: dark stays default; light is opt-in via a footer toggle on each web; the choice persists across visits and applies before the first paint to avoid a flash.

## Goals / Non-Goals

**Goals:**
- Add a second theme (light) at the **semantic** token layer, not by re-tokenizing every component.
- Keep dark as the default when no theme is chosen and no toggle has fired.
- Provide a single shared theme-toggle component (in DS) that every web can drop into its footer.
- Persist the user's choice across sessions on the same origin.
- Apply the chosen theme before first paint (no FOUC).
- Keep slides (`talks`) immune from theme switching — projection is dark.

**Non-Goals:**
- System (`prefers-color-scheme`) auto-detection is out of scope for v1. Default is dark; user must opt in. We may add `auto` as a third option in a follow-up.
- Per-page or per-route theme overrides. The toggle is global per-origin.
- Re-skinning slides for light projection.
- Migrating sites that don't yet use `SiteFooter` — those need a separate adoption pass.
- Syncing the choice across devices or origins (no cookie, no backend).
- A fully tokenized spacing scale or web-scale type namespace — orthogonal concerns.

## Decisions

### Decision 1 — Theme switching mechanism: `data-theme` attribute on `<html>`

CSS will scope light overrides under `:root[data-theme="light"]`. Dark variables live on plain `:root`, so removing the attribute (or setting it to anything else) falls back to dark.

**Why:** Attribute selectors are zero-runtime, work without JS once the attribute is set, can be inlined in `<head>` to beat first paint, and don't require touching every component. CSS custom properties cascade to all descendants automatically.

**Alternatives considered:**
- **CSS class on `<html>` (`html.theme-light`)**: equivalent in power; `data-*` is preferred because it conventionally signals "state to read" rather than "style hook" and pairs cleanly with JS reading/writing `dataset.theme`.
- **Two separate stylesheets, swapped via `<link>`**: causes FOUC and an extra request; rejected.
- **`prefers-color-scheme` only**: doesn't satisfy the explicit-toggle requirement. Could be layered later as the "auto" option.

### Decision 2 — Token authoring: per-theme value sets in `color.semantic.json`

Extend the semantic JSON schema so each role can declare both a default (dark) and a `light` value. Style Dictionary configuration generates two CSS blocks: one for `:root` and one for `:root[data-theme="light"]`.

Concretely, semantic entries grow from:

```json
"canvas": { "$value": "{primitives.color.charcoal.100}", "$type": "color" }
```

to a Style-Dictionary-friendly form (final shape decided during impl), e.g.:

```json
"canvas": {
  "$type": "color",
  "$value": "{primitives.color.charcoal.100}",
  "$extensions": {
    "chimi.theme": {
      "light": "{primitives.color.ivory.base}"
    }
  }
}
```

The build script in `config.mjs` runs Style Dictionary twice (or with two `fileFilter` configs) — once for the dark/default block, once filtered to roles overridden under `chimi.theme.light` — and concatenates the output.

**Why:** Keeps a single source of truth per role, avoids duplicating the whole semantic file per theme, and survives adding more themes (`high-contrast`, etc.) without a structural rewrite.

**Alternatives considered:**
- **Two parallel files (`color.semantic.dark.json` + `color.semantic.light.json`)**: simpler build but doubles the surface area and invites drift when adding a new role.
- **Hand-write the `:root[data-theme="light"]` block in `web.css`**: faster but drops the design system's "tokens are the contract" property.

### Decision 3 — Light palette mapping (initial draft, finalized in spec)

Brand primitives stay the same. Only the semantic mappings change:

| Role | Dark (today) | Light (proposed) |
|---|---|---|
| `surface.canvas` | charcoal.100 | ivory.base |
| `surface.canvas-raised` | charcoal.90 | mix(ivory, charcoal 4%) — needs a new primitive `ivory.raised` or a `color-mix()` alias |
| `surface.paper` | ivory.base | ivory.base (unchanged — already light) |
| `surface.card` | charcoal.100 | ivory.base (or raised variant) |
| `text.on-canvas` | ivory.base | charcoal.100 |
| `text.on-canvas-muted` | ivory @ opacity | charcoal.70 |
| `text.display` | ivory.base | charcoal.100 |
| `accent.primary` | patagonia.base | patagonia.base (unchanged) |
| `marker.caret` | lemon.base | red.base (lemon on ivory has poor contrast) |
| `marker.highlight` | lemon.base | lemon.base (unchanged — fluorescent works on both) |
| `emphasis.on-canvas` | lemon.base | red.base |
| accent canvases (cool/warm/energy/critical) | unchanged | unchanged |
| `text.on-accent-*` | unchanged | unchanged |

The exact light values are finalized in `specs/theming/spec.md`. We may need to add **one** new primitive (`charcoal.raised-on-light` or similar) if `color-mix()` isn't expressive enough — decision deferred to implementation.

**Why this mapping:** The brand is built around the charcoal↔ivory pair, so flipping `canvas` and `text.on-canvas` is the minimum-surprise default. Patagonia teal works on both grounds. Lemon yellow on ivory fails contrast as text/caret, so `marker.caret` and `emphasis.on-canvas` reroute to red, which the brand already uses for emphasis on light surfaces (see `emphasis.on-paper`).

### Decision 4 — Toggle UI: footer button in `SiteFooter.astro`, applies to both `rich` and `minimal` variants

Add an optional `themeToggle?: boolean` (or always-on, with an opt-out) prop to `SiteFooter`. Renders a button next to the meta links (minimal variant) and in the brand column or under copyright (rich variant). Button shows a sun icon in dark mode, moon icon in light mode, with an aria-label that reflects the **target** state ("Activar modo claro" / "Activar modo oscuro").

**Why:** the user explicitly asked for the toggle in the footer, and `SiteFooter` is already the shared cross-site component. Adding it once propagates everywhere.

**Alternatives considered:**
- **Header toggle**: more discoverable but `SiteHeader.astro` is less consistently adopted.
- **Floating action button**: out of brand for a typographic, editorial site.

### Decision 5 — Persistence and FOUC prevention

- **Storage**: `localStorage["chimi-theme"]` holds `"light"` or `"dark"`. Missing key = dark default.
- **First-paint script**: a tiny inline script (`<script>` with no `src`, no `defer`/`async`) injected as early as possible in `<head>` reads `localStorage` and sets `document.documentElement.dataset.theme`. Runs before CSS paints. Lives in the DS as a snippet (e.g., `components/themeBootstrap.html` or exported via `SiteHeader.astro`).
- **Toggle behavior**: on click, flip `dataset.theme`, write to `localStorage`, dispatch a `themechange` `CustomEvent` on `window` so any island can react.
- **CSP**: inline scripts are tolerated today (no strict CSP configured). If/when CSP lands, switch to a hashed inline script.

**Alternatives considered:**
- **Cookie + SSR**: would let Astro render the right theme server-side and remove the inline script entirely. Worth doing later, but Astro+localStorage is the lowest-risk v1 and matches every site.
- **`prefers-color-scheme` as the bootstrap default**: rejected for v1 per Non-Goals, but the bootstrap script is the natural place to layer it in.

### Decision 6 — Keep `talks` (slides) on forced dark

`talks` consumes `tokens.css` directly, not `web.css`. The slide template will set `data-theme="dark"` explicitly on `<html>` (or never include the toggle bootstrap script). Either way, the toggle UI lives in `SiteFooter` which slides don't render. No regression risk.

### Decision 7 — Documentation contract

Add `packages/design-system/docs/theming.md` describing:
- The `data-theme` contract (default = dark, opt in to light by setting attribute).
- The list of roles that flip per theme vs. those that stay constant (accent canvases).
- The "do not override semantic tokens directly per-site" rule — sites must compose new role tokens in their own layer if they need site-specific colors.

## Risks / Trade-offs

- **[Contrast regressions on light]** Web-scale derived tokens (`--hairline`, `--muted`, `--row-bg`) use `color-mix(... var(--chimi-color-text-on-canvas) X%, transparent)`. When `text.on-canvas` flips from ivory to charcoal, a `12%` mix becomes a much darker hairline on a light background — visually heavier. → **Mitigation**: visually audit `web.css` per theme during impl; tune percentages if needed; consider per-theme overrides for derived tokens in the bootstrap.

- **[FOUC if the inline script fails or is blocked]** A user with JS disabled or a CSP that blocks inline scripts sees dark on first load even if they previously chose light. → **Mitigation**: dark is the default, so the failure mode is "your saved choice didn't apply" rather than "broken". Add a `<noscript>` note inside the toggle wrapper saying JS is required for theme switching.

- **[Token build complexity]** Generating two CSS blocks from one Style Dictionary file is non-trivial. → **Mitigation**: prototype the build first (a 30-line spike) before committing to the JSON schema. If too gnarly, fall back to two separate JSON files (Decision 2 alternative).

- **[Accent palette assumes light-canvas readability]** Most of the brand was designed against charcoal. Patagonia teal on ivory has decent contrast; lemon on ivory does not. → **Mitigation**: the mapping in Decision 3 already reroutes lemon-as-text to red on light. Capture the contrast checks in the spec and `theming.md`.

- **[Slides accidentally inherit a light flip]** If a slide template ever wraps the toggle bootstrap script, projection breaks. → **Mitigation**: the bootstrap script is exported as an opt-in include from DS; slides simply don't include it. Document the rule in `theming.md`.

- **[Per-site `global.css` hard-codes a hue]** Any site that bypasses tokens with a hard-coded `#1c1c1c` will not flip. → **Mitigation**: grep for hard-coded brand hex values in each `packages/*/src/styles/global.css` during impl and route them through tokens.

## Migration Plan

1. Spike the Style Dictionary multi-theme build in a throwaway branch; pick the JSON schema (Decision 2 vs. its alternative).
2. Land the DS changes (tokens + build + bootstrap script + footer toggle + docs) under one PR. Dark output unchanged byte-for-byte from the consumer's perspective except for the new `:root[data-theme="light"]` block, which is inert until `data-theme` is set.
3. Bump `@chimi/design-system` minor version, rebuild dependents.
4. Per-site adoption: enable the footer toggle prop on each site that already uses `SiteFooter`. Verify visually in light. Audit per-site `global.css` for hard-coded hues.
5. Rollback: revert the DS PR; consumers automatically lose the `:root[data-theme="light"]` block on next build, and the toggle disappears with it. Saved `localStorage` keys become inert.

## Open Questions

- Final shape of the per-theme value extension in semantic JSON (`$extensions.chimi.theme.light` vs. a parallel file). Resolve during the build spike.
- Whether `surface.canvas-raised` on light needs a new primitive or can be expressed via `color-mix()` against `surface.canvas`. Resolve when wiring tokens.
- Where exactly the toggle lives in the `rich` footer variant (brand column vs. copyright row). Resolve when implementing the component, with a quick visual check in `blog`.
- Should the toggle dispatch an analytics event (`theme:changed`)? Probably yes for the `analytics` site; defer to a follow-up if it adds scope here.
