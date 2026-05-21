## Why

The design system ships only a dark-mode palette today: `surface.canvas` is charcoal, `text.on-canvas` is ivory, and every web (`blog`, `talks`, `brand`, `recall-for-papers`, `simple-pdf-converter`, `simple-scrum-poker`, `techconf`, `analytics`) renders dark by default. We want to offer a light mode so visitors can pick the theme that suits their context (daylight reading, accessibility, preference) without abandoning the brand. Dark stays the default — light is opt-in via a toggle in the footer of each web.

## What Changes

- Add a **light theme** to `@chimi/design-system` alongside the existing dark theme. The semantic token layer will resolve to different primitives based on a `data-theme` attribute on `<html>` (or `:root`). Dark stays the default when no attribute is present.
- Refactor `packages/design-system/tokens/color.semantic.json` so the same semantic role names (`surface.canvas`, `text.on-canvas`, `accent.primary`, …) emit a CSS variable set per theme. Style Dictionary build will produce `:root` (dark, default) and `:root[data-theme="light"]` blocks in `dist/tokens.css`.
- Audit web-scale derived tokens in `packages/design-system/web.css` (`--hairline`, `--muted`, `--row-bg`, …) — they are computed via `color-mix()` on top of `--chimi-color-text-on-canvas`, so they should re-resolve correctly per theme. Verify visually and tune contrast where needed.
- Add a **theme toggle** to the shared `packages/design-system/components/SiteFooter.astro` that:
  - Reads the user's saved choice from `localStorage` (key: `chimi-theme`), falling back to dark.
  - Writes `data-theme="light"` or removes the attribute on `<html>`, plus persists the choice.
  - Applies the saved choice on first paint via a tiny inline script in the document `<head>` to avoid a flash of incorrect theme (FOUC).
  - Surfaces an accessible button labeled in Spanish (e.g., "Modo claro" / "Modo oscuro") with an icon swap.
- Wire the toggle into every web that already consumes `SiteFooter` (`blog` confirmed; verify the rest during implementation). Sites without `SiteFooter` get a follow-up note in tasks.
- Add usage docs to `packages/design-system/README.md` (or a new `docs/theming.md`) explaining the contract: "set `data-theme='light'` on `<html>` to opt in; do not override semantic tokens directly."

## Capabilities

### New Capabilities
- `theming`: Defines how the design system exposes multiple color themes (dark, light) via semantic tokens scoped to a `data-theme` attribute, the default-theme contract, and the rules consumer sites must follow to opt in.
- `theme-toggle`: Defines the user-facing footer control that lets visitors switch between dark and light, persists the choice across visits, and applies it before first paint.

### Modified Capabilities
<!-- None — `openspec/specs/` only contains scrum-poker capabilities; theming is greenfield in this repo. -->

## Impact

- **Tokens & build**: `packages/design-system/tokens/color.semantic.json` schema, `config.mjs` Style Dictionary pipeline, and resulting `dist/tokens.css` / `dist/tokens.js`. Bumps DS minor version.
- **Shared components**: `packages/design-system/components/SiteFooter.astro` gains a toggle slot/section. New small client-side script (inline + island) for theme switching.
- **Web styles**: `packages/design-system/web.css` derived tokens reviewed; per-site `global.css` files audited for hard-coded charcoal/ivory references that bypass tokens.
- **All consumer sites**: `blog`, `talks`, `brand`, `recall-for-papers`, `simple-pdf-converter`, `simple-scrum-poker`, `techconf`, `analytics`. Sites that already use `SiteFooter` get the toggle for free; sites that don't need either to adopt the footer or skip the toggle (out of scope for this change).
- **Slides (`talks`)**: out of scope — the slide canvas is intentionally dark for projection. Talks should keep dark forced regardless of toggle (set `data-theme="dark"` explicitly or skip the toggle).
- **No backend / API impact.** Theme persistence is `localStorage`-only.
