# Theming

The design system ships **two themes**: `light` and `dark`. Visitors land in light unless their OS (or a saved choice) asks for dark; the CSS cascade itself defaults to dark (see the contract). They share every primitive — only the recipe role mappings flip. As of `recipes-light-theme-support` (2026-05-01), the per-theme overrides live on **recipe tokens** (`tokens/color.recipe.json`), not on a separate semantic layer. The semantic JSON layer was retired in that change.

## Contract

- **No attribute = dark.** When `<html>` has no `data-theme` attribute, every recipe resolves to its token `$value`, which is the **dark** value for canvas-quiet/canvas-signal. This is what a page renders without `ThemeBootstrap` and without JavaScript.
- **`data-theme="light"` = light.** It is the only value anything writes. `ThemeBootstrap.astro` writes it before first paint unless the visitor wants dark: a saved `localStorage["chimi-theme"] = "dark"`, or no saved choice and `prefers-color-scheme: dark`. In those two cases it *removes* the attribute. The header toggle does the same (`light` → set the attribute, `dark` → remove it).
- **`data-theme="dark"` is never written.** Nothing in the package sets it and no token block targets it; if a site hardcodes it, the cascade treats it like no attribute (dark). A few component rules match it defensively (the footer's ecosystem logo swap), which is harmless.
- **Light overrides live on recipe tokens.** A second CSS block `:root[data-theme="light"] { … }` in `dist/tokens.css` overrides only the `--chimi-color-recipe-<id>-<role>` long-form vars whose values differ between themes; today that's `canvas-quiet.{surface,ink,em,accent}` and `canvas-signal.{surface,ink,em,accent}`, eight entries.
- **Unknown values fall back to default.** Anything other than `"light"` (e.g., `data-theme="oceanic"`) is treated as no attribute, i.e. dark.
- **`color-scheme` follows the theme.** `web.css` sets `:root { color-scheme: dark }` and `:root[data-theme="light"] { color-scheme: light }`, so scrollbars, native form controls and the default canvas match the theme.
- **`theme-color` comes as a pair.** `renderSEOHeadHTML({ themeColor: { light, dark } })` (and the `SEOHead` component) emits two `<meta name="theme-color">` tags with `media="(prefers-color-scheme: light|dark)"`. A plain string still emits the single tag. The pair follows the OS preference, not the toggle (browsers only read the media query). See `seo/README.md`.

## What flips

| Recipe | Role | Dark | Light |
|---|---|---|---|
| `canvas-quiet` | `surface` | charcoal.100 | ivory.base |
| `canvas-quiet` | `ink` | ivory.base | charcoal.100 |
| `canvas-quiet` | `em` | lemon.base | red.base |
| `canvas-signal` | `surface` | charcoal.100 | ivory.base |
| `canvas-signal` | `ink` | ivory.base | charcoal.100 |
| `canvas-signal` | `em` | lemon.base | red.base |
| `canvas-quiet` | `accent` | patagonia.base | patagonia.deep |
| `canvas-signal` | `accent` | patagonia.base | patagonia.deep |
| `canvas-quiet` / `canvas-signal` | `accent-text` | patagonia.base | patagonia.deep |
| `canvas-quiet` / `canvas-signal` | `on-accent` | charcoal.100 | ivory.base |
| `canvas-quiet` / `canvas-signal` | `status-ok` | status.green.soft | status.green.base |
| `canvas-quiet` / `canvas-signal` | `status-bad` | status.red.soft | red.base |
| `canvas-quiet` / `canvas-signal` | `status-caution` | lemon.base | status.amber.deep |

Rationale per role:

- **`surface` and `ink`** flip together to keep AA contrast inverted (charcoal-on-ivory is the same eye-safe pair as ivory-on-charcoal).
- **`em`** flips lemon → red because lemon-on-ivory falls below 1.5:1 (unreadable italic emphasis); red-on-ivory clears AA non-text.
- **`accent`** flips patagonia.base → patagonia.deep because patagonia.base on ivory is 2.42:1 (fails even the 3:1 UI threshold); deep on ivory is 5.48:1.
- **`warn` (red)** keeps its value. On ivory it is 5.87:1, but on charcoal it is only **2.78:1**: in dark mode `warn` is for markers, strokes and large display words, never for body-size text.

`paper` follows the theme **when it is the recipe of the page** (`<body data-recipe="paper">` or `<html data-recipe="paper">`). This is a web-only rule in `web.css`, not a token override, because slides on paper must stay ivory:

| Role on a `paper` page | Dark | Light |
|---|---|---|
| `surface` | charcoal.100 | ivory.base |
| `ink` | ivory.base | charcoal.100 |
| `em` | patagonia.base | patagonia.base |
| `accent`, `accent-text` | patagonia.base | patagonia.deep |
| `on-accent` | charcoal.100 | ivory.base |
| `status-ok` / `status-bad` / `status-caution` | green.soft / red.soft / lemon.base | green.base / red.base / amber.deep |

What stays `paper` in the dark is the voice: the editorial type roles (Scilla) are untouched, and `em` is patagonia where the canvas recipes use lemon. Going from a canvas page to an article no longer flips the screen to ivory.

- **A nested `paper` block does not flip.** `<div data-recipe="paper" class="recipe-scope">` is a deliberate sheet of ivory on the page and stays ivory in both themes. Without `.recipe-scope` it paints nothing and inherits the page's surface, so always pair the two.
- **Slides do not flip.** They do not load `web.css`, and the `paper` token values are still the ivory ones.
- **Running text is softened in the dark.** `.prose` body text is set at 88% of the ink (12.6:1 instead of 16.3:1); headings, `strong` and quotes keep the full ink.

The campaign recipes (`energy-loud`, `cool-fresh`, `critical`) declare **no theme overrides**: lemon, patagonia and plasma surfaces are fluorescent on both themes, that is their identity. A page on one of them looks the same whatever the toggle says; they are meant for landing blocks and announcements, not for long reads.

In `web.css`, the derived role tokens (`--hairline`, `--muted`, `--surface-raised`, `--row-bg-hover`, `--field-border`, etc.) are tuned per theme via a `:root[data-theme="light"]` block: charcoal ink on ivory reads heavier than ivory ink on charcoal at the same alpha, so the percentages drop ~30–40%. The recipes whose surface does not flip pin their own values in both themes (the campaign recipes' muted text), so contrast holds whatever the theme. Every role is checked for every recipe in both themes by `test/contrast.test.mjs`.

## Light theme contrast (WCAG 2.1)

Ratios on canvas-quiet light:

| Pair | Contrast | Meets AA normal (≥ 4.5:1) |
| --- | ---: | :---: |
| `--recipe-ink` (charcoal.100 `#1C1C1C`) on `--recipe-surface` (ivory.base `#FAFAF8`) | **16.31:1** | Yes |
| `--recipe-em` (red.base `#A64132`) on `--recipe-surface` | **5.87:1** | Yes |
| `--recipe-accent` (patagonia.deep `#017275`) on `--recipe-surface` | **5.48:1** | Yes |

Accent-colored text uses `--recipe-accent-text` (patagonia.deep on light canvas, 5.48:1); text on an accent fill uses `--recipe-on-accent` (ivory on patagonia.deep, 5.48:1). `.prose a` uses `--recipe-accent-text` plus an underline. The full table for every recipe and theme is in [recipes.md](recipes.md#contrast-wcag-21).

## Authoring per-theme tokens

Add a `$extensions.chimi.theme.<theme>` reference next to a recipe role's `$value`:

```json
"canvas-quiet": {
  "surface": {
    "$value": "{primitives.color.charcoal.100}",
    "$type": "color",
    "$extensions": {
      "chimi.theme": { "light": "{primitives.color.ivory.base}" }
    }
  }
}
```

The build (`config.mjs`) reads these extensions and emits a per-theme override block. Roles whose theme value resolves to the same primitive as the default are dropped, so the override block only contains real differences.

To add a third theme (e.g., `high-contrast`), append a sibling key under `chimi.theme`:

```json
"$extensions": {
  "chimi.theme": {
    "light": "{primitives.color.ivory.base}",
    "high-contrast": "{primitives.color.ivory.cream}"
  }
}
```

The walker in `config.mjs::collectThemeOverrides()` is generic — it picks up every theme name found across `THEME_SOURCES` (`tokens/color.recipe.json`).

## Consumer setup

### 1. Embed the bootstrap script in `<head>`

Before any stylesheet that depends on `data-theme`, render `<ThemeBootstrap />`. It's a synchronous inline script that reads `localStorage["chimi-theme"]` and sets the attribute before the first paint, preventing FOUC.

```astro
---
import ThemeBootstrap from "@chimichurricode/design-system/ThemeBootstrap.astro";
---
<html lang="es">
  <head>
    <ThemeBootstrap />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>...</body>
</html>
```

If the bootstrap is missing, the page still works — it just defaults to dark on first paint (the recipe `$value`s) and switches to the saved choice once the toggle's mount script runs (briefly visible flash).

### 2. Use `SiteHeader` (toggle is on by default)

```astro
<SiteHeader brand={{...}} links={[...]} socials={[...]} />
```

The toggle button appears as a sun/moon icon next to the social links in the header, separated by a vertical hairline divider. Disable it with `themeToggle={false}` if your site needs forced dark or has its own switcher.

### 3. Listen for theme changes (optional)

```js
window.addEventListener("themechange", (e) => {
  console.log("now:", e.detail.theme); // "light" | "dark"
});
```

The toggle dispatches this event on every flip. Use it to refresh canvas colors in iframes, react in analytics islands, etc.

## Persistence

- Storage: `localStorage["chimi-theme"]` (`"light"` or `"dark"`).
- Scope: per origin. No cross-device sync.
- Self-healing: invalid values are clobbered on next load.
- JS disabled: dark (no attribute is ever written), and the toggle shows a `<noscript>` fallback note.

## Don't do this

**Don't override `--chimi-color-recipe-*` or `--recipe-*` variables in your site's `global.css`.** They are the design system's contract. If you need a site-specific color, define a new role in your own layer composed from existing tokens (e.g., `--my-row-bg: color-mix(in srgb, var(--recipe-ink) 5%, transparent);`) — this stays correct across themes for free.

The `--chimi-color-{text,surface,accent,emphasis,marker}-*` semantic-layer namespace was **removed** by the `recipes-light-theme-support` change (2026-05-01). Nothing emits those variables any more, so a reference to them resolves to nothing. The recipe linter that used to flag them (`check-recipes.mjs`) was removed when the monorepo split; this is enforced in review.

## Opt-out (slides, single-theme contexts)

The `talks` package renders slides and intentionally stays dark for projection. It doesn't import `@chimichurricode/design-system/web.css` (it has its own slide-scoped CSS) and doesn't include `<ThemeBootstrap />` in slide layouts, so the toggle never appears and `data-theme` never gets set.

If a future surface needs to force a single theme:

- **Force dark**: omit `<ThemeBootstrap />` and don't render the header toggle (`<SiteHeader themeToggle={false} ... />`).
- **Force light**: hardcode `<html data-theme="light">` and don't render the toggle.

## Future work

- A third `auto` toggle option that follows OS preference live (currently the bootstrap reads `prefers-color-scheme` once at first visit; subsequent flips are explicit).
- A `high-contrast` theme — the build already supports `$extensions.chimi.theme.<name>` for any theme name on any recipe role.
- Light overrides for `paper`'s patagonia em (currently it's the same patagonia in both themes; a slightly darker variant could reach AA non-text on ivory).
