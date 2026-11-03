# Chimi design system

**`@chimichurricode/design-system`** — the single source of truth for colors, typography, recipes, shared Astro chrome and SEO used across the Chimichurri Code surfaces (talks, blog, brand book and the ecosystem webs).

Tokens are authored as JSON, built with [Style Dictionary v4](https://styledictionary.com/), and shipped as CSS custom properties. On top of them the package ships a web-scale stylesheet (`web.css`), the brand fonts, Astro components (header, footer, theme toggle, brand marks, SEO head) and framework-agnostic SEO helpers.

![The six color recipes, each rendered with its own surface, ink, em, accent and warn roles](docs/images/recipes.png)

![Primitive palette, the five type families and the web.css buttons and tags](docs/images/foundations.png)

## Contents

- [Quick start](#quick-start)
- [What's included](#whats-included)
- [Architecture](#architecture)
- [Recipes](#recipes)
- [Typography and naming](#typography-and-naming)
- [Theming (dark + light)](#theming-dark--light)
- [Responsive](#responsive)
- [Ecosystem chrome and SEO](#ecosystem-chrome-and-seo)
- [Local development](#local-development)
- [Changing tokens](#changing-tokens)
- [Releasing](#releasing)
- [Status and known gaps](#status-and-known-gaps)

---

## Quick start

```bash
npm install @chimichurricode/design-system
```

### Astro web (what `cv-blog` does)

1. **CSS** — one import pulls in tokens, breakpoints, fonts, reset and utilities:

   ```css
   /* src/styles/global.css */
   @import "@chimichurricode/design-system/web.css";
   ```

2. **Fonts** — `fonts.css` points at `/fonts/*`, so copy the binaries from `node_modules/@chimichurricode/design-system/assets/fonts` into `public/fonts/` before building (the consumers do it with a small `scripts/sync-fonts.mjs`).

3. **Breakpoints** — if your own CSS writes `@media (--md)`, inline the custom media at build time:

   ```js
   // postcss.config.mjs
   import { dsCustomMedia } from "@chimichurricode/design-system/postcss";
   export default { plugins: [...dsCustomMedia()] };
   ```

4. **Layout** — pick a recipe on `<body>`, bootstrap the theme in `<head>`, and use the shared chrome:

   ```astro
   ---
   import ThemeBootstrap from "@chimichurricode/design-system/ThemeBootstrap.astro";
   import SiteHeader from "@chimichurricode/design-system/SiteHeader.astro";
   import SiteFooter from "@chimichurricode/design-system/SiteFooter.astro";
   import SEOHead from "@chimichurricode/design-system/SEOHead.astro";
   ---
   <html lang="es">
     <head>
       <meta charset="utf-8" />
       <ThemeBootstrap />
       <SEOHead site="blog" title="My post" description="…" pathname={Astro.url.pathname} />
     </head>
     <body data-recipe="canvas-quiet">
       <SiteHeader brand={{ label: "Chimichurri Code", mark: "chimi", emText: "Code", href: "/" }} />
       <main>…</main>
       <SiteFooter />
     </body>
   </html>
   ```

   Component CSS then reads only `--recipe-*`:

   ```css
   .cta { background: var(--recipe-accent); color: var(--recipe-surface); }
   ```

### Slides (what `cv-talks` does)

Use the raw tokens without the web layer — `cv-talks` passthrough-copies `node_modules/@chimichurricode/design-system/dist` to `/design-system/` and links `tokens.css`. Each slide declares `recipe: <id>` in frontmatter and its layout reads `--recipe-*` plus the slide-scale `--chimi-type-*` composites. For the SEO head outside Astro, call `renderSEOHeadHTML(props)` from `@chimichurricode/design-system/seo/render-head`.

---

## What's included

| Import path | What it is |
|---|---|
| `web.css` | Everything a web needs: imports `dist/tokens.css`, `dist/breakpoints.css` and `fonts.css`, then adds a reset, web-scale type composites (`--web-display-xl`, `--web-body-md`, …), role tokens (`--muted`, `--hairline`, …) and utilities (`.container`, `.stack-{sm,md,lg}`, `.hide-on-mobile/-desktop`, `.display-*`, `.editorial-*`, `.eyebrow`, `.btn`, `.btn-primary`, `.tag`, …). |
| `tokens.css` → `dist/tokens.css` | Generated token variables + `[data-recipe]` selectors + the `:root[data-theme="light"]` overrides. No imports. |
| `dist/breakpoints.css` | Generated `--bp-{sm,md,lg,xl}` properties and matching `@custom-media` queries. |
| `fonts.css` | Hand-written `@font-face` for CHANEY, At Aero, Scilla Narrow, Thunder and Nudica Mono (binaries in `assets/fonts/`). |
| `postcss` | `dsCustomMedia()` — PostCSS plugins that inline `@media (--md)` etc. |
| `recipes` | `getTypeRecipes()` / `getTypeRecipeSummaries()` — type-family whitelist per recipe (from `tokens/type.recipe.json`). |
| `*.astro` | `SiteHeader`, `SiteFooter`, `SocialIcons`, `ThemeBootstrap`, `ThemeIcons`, `SEOHead`, `BrandMark`, `BrandFavicon`, `BrandLogoWordmark`, `BrandLogoCircle`. Astro ≥ 5 is an optional peer dependency. |
| `ecosystem` | `ECOSYSTEM_SITES` (sites shown in the cross-web chrome), `DEFAULT_SOCIALS`, `ecosystemLinksExcluding()`. |
| `site-registry`, `site-registry-runtime` | The canonical list of sites (`getSite`, `findSite`, `sitesWithRole("chrome" \| "seo")`) and its generated runtime copy. |
| `seo`, `seo/*` | `buildJsonLd`, `defaultsForSite`, `renderSEOHeadHTML`, sitemap / robots / manifest renderers. See [`seo/README.md`](seo/README.md). |
| `assets/logos/*`, `assets/icons/*`, `assets/og/*` | Brand logos, the icon set and per-site OG images. |
| `scripts/check-slop.mjs` | Reports "template look" patterns in a built site: `node node_modules/@chimichurricode/design-system/scripts/check-slop.mjs dist`. See [`docs/anti-patterns.md`](docs/anti-patterns.md). |

The full map is the `exports` field in [`package.json`](package.json).

---

## Architecture

Three layers, consumed top-down. Each layer may only reference the one above it.

```
1. PRIMITIVES  tokens/*.primitive.json — raw hex, font stacks, sizes, breakpoints.
               Not consumed by surfaces, except --bp-* / @media (--md) and a
               documented --chimi-primitives-color-* escape hatch for fixed
               local palettes (duotone logos, brand marks).
2. RECIPES     tokens/color.recipe.json — 6 closed surface+ink+em+accent+warn
               combos, with per-theme overrides. THE layer slides and webs consume,
               via data-recipe="<id>" → --recipe-{surface,ink,em,accent,warn}.
3. UTILITIES   web.css — web-scale type composites + layout/utility classes.
               Webs only; slides keep their own slide-scale typography.
```

Why: before this package, colors and fonts were duplicated across brand and talks, and the *meaning* of a value (what is `--lemon` for?) lived in people's heads. Now every value lives in one JSON file and every role has a name — changing the dark canvas is one edit in `color.recipe.json`, no layout CSS changes.

Escape-hatch uses of primitives carry an inline `/* primitive escape hatch — <reason> */` comment.

```
tokens/   color.primitive · color.recipe · font.primitive · font.semantic ·
          size.primitive · breakpoint.primitive · type-style.semantic ·
          type.recipe (metadata only, not emitted to CSS)
dist/     tokens.css · breakpoints.css            (generated, git-ignored)
components/  Astro components + ecosystem.ts
seo/      SEO helpers + seo/README.md
docs/     recipes · theming · responsive · ecosystem-chrome · anti-patterns · gaps
openspec/ archived change proposals (openspec/changes/archive/)
config.mjs   Style Dictionary build
```

---

## Recipes

A recipe is a closed combination of five color roles plus a typography whitelist. A surface declares one — `<body data-recipe="paper">` or slide frontmatter `recipe: paper` — and reads only `--recipe-*`. There are exactly six ways to color a Chimi surface:

| Recipe | Use |
|---|---|
| `canvas-quiet` | Default editorial — long reads, blog, docs, dense slides. |
| `canvas-signal` | Data — KPI walls, big stats, dashboards. |
| `paper` | Editorial ivory — quotes, prompts, technical info. |
| `energy-loud` | Announcements, posters, event CTAs. Lemon leads; rule of one per page. |
| `cool-fresh` | Change — dividers, launches, feature banners. |
| `critical` | Plasma surface. On top of another recipe, use `.critical-fg-{stat,quote,eyebrow,marker,display-word}` to plasma a single role. |

Field guide: [`docs/recipes.md`](docs/recipes.md). What every surface avoids: [`docs/anti-patterns.md`](docs/anti-patterns.md).

---

## Typography and naming

Five families (`font.semantic.json`): **display** CHANEY · **body** At Aero · **editorial** Scilla Narrow · **data** Thunder · **code** Nudica Mono.

CSS variables follow `--chimi-{category}-{role}-{variant}`:

| JSON path | CSS variable |
|---|---|
| `color.recipe.canvas-quiet.surface` | `--chimi-color-recipe-canvas-quiet-surface` |
| `color.primitive.charcoal.100` | `--chimi-primitives-color-charcoal-100` |
| `font.family.display` | `--chimi-font-family-display` |
| `type.display.md.fontSize` | `--chimi-type-display-md-fontSize` |
| *(shorthand)* `type.display.md` | `--chimi-type-display-md` |
| *(consumer-facing)* | `--recipe-{surface,ink,em,accent,warn}` |

The `font:` shorthand composites are the most useful; letter-spacing and text-transform aren't part of `font:`, so apply them alongside:

```css
.s-my-slide h2 {
  font: var(--chimi-type-display-md);
  letter-spacing: var(--chimi-type-display-md-letterSpacing);
}
```

`--chimi-type-*` is slide-scale (1920×1080). Webs use the `--web-*` composites or the `.display-*` / `.editorial-*` / `.body-lg` classes from `web.css`.

---

## Theming (dark + light)

The token cascade's default is **dark**; `<html data-theme="light">` applies the light overrides (today only `surface`, `ink` and `em` of `canvas-quiet` and `canvas-signal` flip). `<ThemeBootstrap />` makes **light the effective default on webs**: it applies the saved `chimi-theme` choice, otherwise follows `prefers-color-scheme`, and writes `data-theme="light"` unless the user wants dark. Talks and brand don't include it and stay dark. `<SiteHeader />` renders the toggle (`themeToggle` prop).

Full contract: [`docs/theming.md`](docs/theming.md).

---

## Responsive

Mobile-first against four breakpoints — `--bp-sm` 480, `--bp-md` 768, `--bp-lg` 1024, `--bp-xl` 1280 — each also a `@custom-media` query:

```css
.feed { display: grid; grid-template-columns: 1fr; gap: var(--stack-sm); }
@media (--md) {
  .feed { grid-template-columns: repeat(3, 1fr); gap: var(--stack-md); }
}
```

Consumer CSS needs the `dsCustomMedia()` PostCSS helper (see [Quick start](#quick-start)); `web.css` and the components ship literal queries and need no tooling. The only `max-width` rule allowed is the `(max-width: 767.98px)` floor that pins buttons and nav links to 44×44 tap targets. Details: [`docs/responsive.md`](docs/responsive.md).

---

## Ecosystem chrome and SEO

`SiteHeader` (brand mark, nav, theme toggle, socials) and `SiteFooter` (`rich` / `minimal`) stitch the ecosystem webs together; the list of linked sites comes from `site-registry.ts` (`ECOSYSTEM_SITES` = sites with `chrome: true`, currently 9; SEO covers 11 including `talks` and `brand`). Field guide: [`docs/ecosystem-chrome.md`](docs/ecosystem-chrome.md).

`SEOHead` (Astro) and `renderSEOHeadHTML()` (anything else) emit the whole head block — title, description, canonical, OG, Twitter, favicons, manifest, theme color, ecosystem alternates and JSON-LD — from the per-site defaults in [`seo/defaults.mjs`](seo/defaults.mjs). See [`seo/README.md`](seo/README.md).

---

## Local development

Requires [Bun](https://bun.sh/) (the build scripts run with `bun`).

```bash
bun install
bun run build        # emit seo/site-registry-runtime.generated.mjs, then dist/tokens.css + dist/breakpoints.css
bun run check:slop   # node scripts/check-slop.mjs [dir] — scans ./dist by default; point it at a consumer's build
```

`dist/` is git-ignored, so run `bun run build` after cloning — `web.css` and the `postcss` helper import from it.

To try changes in a consumer before publishing, link the package (`bun link` / `npm link`) or point the consumer's dependency at a local path.

> The other scripts in `scripts/` (`check-recipes`, `check-ecosystem-chrome`, `check-seo`, `check-docs-linter-coherence`, …) were carried over from the original monorepo. They are not wired into `package.json` and currently fail when run from this repo (they expect the monorepo layout).

---

## Changing tokens

1. Edit the JSON in `tokens/`.
2. `bun run build` and check `dist/tokens.css`.
3. Commit the JSON (not `dist/`).

Before adding a role, ask: is it really new, or a variant of an existing one? Will more than one surface use it? One-off values belong in the layout. Don't add primitives unless a genuinely new brand color enters the system — and never invent a seventh recipe ad hoc.

---

## Releasing

Published to npm as [`@chimichurricode/design-system`](https://www.npmjs.com/package/@chimichurricode/design-system) (semver, `0.x`). Only the paths in `package.json` → `files` are shipped — notably not `scripts/` except `check-slop.mjs`.

```bash
# bump "version" in package.json, then
bun run build        # dist/ must exist: it's in the tarball but not in git
npm publish          # registry from .npmrc; 2FA OTP required
```

Consumers pin a caret range (`cv-blog` `^0.8.0`, `cv-brand` `^0.7.5`, `cv-talks` `^0.7.6`), so bump them after a minor release.

---

## Status and known gaps

- Spacing isn't tokenized yet (`--stack-*` lives in `web.css`, raw px elsewhere) — see [`docs/gaps.md`](docs/gaps.md).
- The talks mobile viewer uses viewport units rather than DS breakpoints, so `dist/breakpoints.css` is webs-only today.

## License

No license is declared yet (no `LICENSE` file and no `license` field in `package.json`). The typefaces in `assets/fonts/` are third-party fonts; check their own licenses before reusing them elsewhere.
