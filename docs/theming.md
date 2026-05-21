# Theming

The design system ships **two themes**: `light` (default) and `dark`. They share every primitive — only the recipe role mappings flip. As of `recipes-light-theme-support` (2026-05-01), the per-theme overrides live on **recipe tokens** (`tokens/color.recipe.json`), not on a separate semantic layer. The semantic JSON layer was retired in that change.

## Contract

- **Default is light.** When `<html>` has no `data-theme` attribute, the recipe-default values from `:root { … }` resolve to the **light** values for canvas-quiet/canvas-signal (since `ThemeBootstrap.astro` writes `data-theme="light"` eagerly when no preference is stored).
- **Dark is opt-in via `<html data-theme="dark">`** (or by the OS preference `prefers-color-scheme: dark` triggering the bootstrap to leave the attribute absent — that resolves to dark via the recipe's `$value` defaults).
- **Light overrides live on recipe tokens.** A second CSS block `:root[data-theme="light"] { … }` in `dist/tokens.css` overrides only the `--chimi-color-recipe-<id>-<role>` long-form vars whose values differ between themes; today that's `canvas-quiet.{surface,ink,em}` and `canvas-signal.{surface,ink,em}` — six entries.
- **Unknown values fall back to default.** Anything other than `"light"` or `"dark"` (e.g., `data-theme="oceanic"`) is treated as no attribute.

## What flips

| Recipe | Role | Dark | Light |
|---|---|---|---|
| `canvas-quiet` | `surface` | charcoal.100 | ivory.base |
| `canvas-quiet` | `ink` | ivory.base | charcoal.100 |
| `canvas-quiet` | `em` | lemon.base | red.base |
| `canvas-signal` | `surface` | charcoal.100 | ivory.base |
| `canvas-signal` | `ink` | ivory.base | charcoal.100 |
| `canvas-signal` | `em` | lemon.base | red.base |

Rationale per role:

- **`surface` and `ink`** flip together to keep AA contrast inverted (charcoal-on-ivory is the same eye-safe pair as ivory-on-charcoal).
- **`em`** flips lemon → red because lemon-on-ivory falls below 1.5:1 (unreadable italic emphasis); red-on-ivory clears AA non-text.
- **`accent` (patagonia)** and **`warn` (red)** keep their dark values — patagonia hits ~2.5:1 on ivory (UI/border AA, bordered-link acceptable per `web.css`'s patagonia-accent rule for paper recipes) and red clears AA on both surfaces.

The four other recipes (`paper`, `energy-loud`, `cool-fresh`, `critical`) declare **no `$extensions.chimi.theme.light` overrides**:

- Paper recipes are already light by construction (ivory surface, charcoal ink) and serve as the design's light-mode visual target — flipping them would invert correctly-rendered editorial.
- The accent recipes (lemon, patagonia, plasma surfaces) are intentionally fluorescent on both themes; that's their identity for campaign-mode pages.

In `web.css`, the derived role tokens (`--hairline`, `--muted`, `--surface-raised`, `--row-bg-hover`, etc.) are tuned per theme via a `:root[data-theme="light"]` block: charcoal ink on ivory reads heavier than ivory ink on charcoal at the same alpha, so the percentages drop ~30–40%.

## Light theme contrast (WCAG 2.1)

Ratios on canvas-quiet light:

| Pair | Contrast | Meets AA normal (≥ 4.5:1) |
| --- | ---: | :---: |
| `--recipe-ink` (charcoal.100 `#1C1C1C`) on `--recipe-surface` (ivory.base `#FAFAF8`) | **15.79:1** | Yes |
| `--recipe-em` (red.base `#A64132`) on `--recipe-surface` | **5.15:1** | Yes |
| `--recipe-accent` (patagonia.base `#02B5B9`) on `--recipe-surface` | **2.49:1** | UI/border only (AA non-text 3:1 met for borders ≥ 3px) |

Body links must remain `--recipe-ink` with underline on light canvas (the patagonia-accent web.css override applies only to paper recipes).

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

The build (`packages/design-system/config.mjs`) reads these extensions and emits a per-theme override block. Roles whose theme value resolves to the same primitive as the default are dropped, so the override block only contains real differences.

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
import ThemeBootstrap from "@chimi/design-system/ThemeBootstrap.astro";
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
- JS disabled: light by default, toggle shows a `<noscript>` fallback note.

## Don't do this

**Don't override `--chimi-color-recipe-*` or `--recipe-*` variables in your site's `global.css`.** They are the design system's contract. If you need a site-specific color, define a new role in your own layer composed from existing tokens (e.g., `--my-row-bg: color-mix(in srgb, var(--recipe-ink) 5%, transparent);`) — this stays correct across themes for free.

The `--chimi-color-{text,surface,accent,emphasis,marker}-*` semantic-layer namespace was **removed** by the `recipes-light-theme-support` change (2026-05-01); the build linter (`check:recipes`) errors on any direct consumption.

## Opt-out (slides, single-theme contexts)

The `talks` package renders slides and intentionally stays dark for projection. It doesn't import `@chimi/design-system/web.css` (it has its own slide-scoped CSS) and doesn't include `<ThemeBootstrap />` in slide layouts, so the toggle never appears and `data-theme` never gets set.

If a future surface needs to force a single theme:

- **Force dark**: omit `<ThemeBootstrap />` and don't render the header toggle (`<SiteHeader themeToggle={false} ... />`).
- **Force light**: hardcode `<html data-theme="light">` and don't render the toggle.

## Future work

- A third `auto` toggle option that follows OS preference live (currently the bootstrap reads `prefers-color-scheme` once at first visit; subsequent flips are explicit).
- A `high-contrast` theme — the build already supports `$extensions.chimi.theme.<name>` for any theme name on any recipe role.
- Light overrides for `paper`'s patagonia em (currently it's the same patagonia in both themes; a slightly darker variant could reach AA non-text on ivory).
