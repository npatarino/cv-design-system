# Chimi design system

Single source of truth for colors, typography, and recipes used across Chimi talks (slides and, eventually, brand surfaces).

Tokens are authored as JSON, built with [Style Dictionary v4](https://styledictionary.com/), and emitted as CSS custom properties that layouts consume.

---

## Why a design system

Before this library existed, colors and fonts were duplicated in two places (`brand/shared/styles.css` and `talks/theme/styles/tokens.css`), and their meaning was implicit — you had to read every layout's CSS to know what `--lemon` was "for." Which font went with which color on which surface lived only in people's heads.

The design system fixes that by forcing every value to live in exactly one place, and by giving every *role* a name. If you want to change the deck's dark canvas from charcoal to navy, you edit one entry in `color.recipe.json` — no layout CSS changes.

---

## Architecture

Three layers (color) plus a font/type layer, consumed top-down. Each color layer may only reference the layer above it.

```
┌────────────────────────────────────────────────────────────────┐
│  1. PRIMITIVES   — raw brand values (hex, px, font stacks,     │
│                    breakpoint widths)                          │
│     color.primitive, font.primitive, size.primitive,           │
│     breakpoint.primitive                                       │
│     → Never consumed by surfaces. Internal only — except       │
│       --bp-* (breakpoints), which are emitted as both custom   │
│       properties and @custom-media queries that webs use       │
│       directly via @media (--md) { … }, and a documented       │
│       --chimi-primitives-color-* escape hatch for artefacts    │
│       with a fixed local palette (duotone logos, brand marks). │
├────────────────────────────────────────────────────────────────┤
│  2. RECIPES      — closed surface+ink+em+accent+warn combos    │
│     6 ids: canvas-quiet, canvas-signal, paper,                 │
│     energy-loud, cool-fresh, critical                         │
│     → THE consumed layer for both slides and webs.             │
│     → Carries per-theme overrides via                          │
│       $extensions.chimi.theme.<name> on each role; today       │
│       canvas-quiet/signal flip surface/ink/em in light mode,   │
│       the paper/accent recipes stay theme-agnostic.            │
│     → Surfaces declare data-recipe="<id>" and read             │
│       --recipe-{surface,ink,em,accent,warn} only.              │
├────────────────────────────────────────────────────────────────┤
│  3. UTILITIES    — web-scale type composites + layout utils    │
│     web.css: --web-display-xl, --web-body-md, .btn, .tag,      │
│              .container, .stack-md, .hide-on-mobile, …         │
│     → For Astro webs only. Slides have their own slide-scale.  │
└────────────────────────────────────────────────────────────────┘
```

### Why three layers?

- **Primitives** are the raw ingredients. Calling `--chimi-primitives-color-lemon-base` from a surface is normally a leak — but for artefacts with a fixed local palette (duotone logos, brand marks, the `.tag.critical` plasma), it's the documented escape hatch with an inline `/* primitive escape hatch — <reason> */` comment. Breakpoints are the other primitive family that leaks through — `@media (--md)` is the canonical authoring style and reads through to `--bp-md`.
- **Recipes** are the **only layer surfaces consume** for color. Each one bundles a surface + ink + em + accent + warn into a closed unit selected via `data-recipe="<id>"`. This stops new combinations from being invented ad-hoc: there are exactly 6 ways to color a Chimi surface. Per-theme overrides live here too — `canvas-quiet.surface` declares its dark `$value` and a `light` override under `$extensions.chimi.theme.light`.
- **Utilities** sit on top of recipes for the Astro webs — web-scale typography composites, layout helpers (`.container`, `.stack-*`, `.hide-on-mobile`, `.hide-on-desktop`), and classes like `.btn`, `.tag`, `.eyebrow` that read `--recipe-*` so they restyle automatically when a recipe changes.

> Pre-2026-05 there was a fourth "semantic" layer (`tokens/color.semantic.json`) that mediated between primitives and recipes. It was deleted by the `recipes-light-theme-support` change once recipes became theme-aware natively. The `--chimi-color-{text,surface,accent,emphasis,marker}-*` namespace it used to emit is now a hard error in `check:recipes`.

---

## Directory

```
design-system/
├── tokens/
│   ├── color.primitive.json        # raw palette
│   ├── color.recipe.json           # 7 closed surface+ink+em+accent+warn combos + per-theme overrides
│   ├── font.primitive.json         # typeface stacks
│   ├── font.semantic.json          # display / body / editorial / data / code
│   ├── size.primitive.json         # font-size / line-height / letter-spacing scales
│   ├── breakpoint.primitive.json   # 4 stops: --bp-sm, --bp-md, --bp-lg, --bp-xl
│   ├── type-style.semantic.json    # composed styles (display.md, editorial.xl, …)
│   └── type.recipe.json            # type whitelist + named exceptions per recipe
├── dist/
│   ├── tokens.css                  # generated — don't edit
│   └── breakpoints.css             # generated — --bp-* + @custom-media decls
├── docs/
│   ├── recipes.md                  # field guide for the recipe model
│   ├── ecosystem-chrome.md         # field guide for the chrome catalog + components
│   ├── theming.md                  # data-theme cascade
│   └── gaps.md                     # open questions / missing tokens
├── scripts/
│   ├── check-recipes.mjs           # `npm run check:recipes` — recipe leak detector
│   ├── check-ecosystem-chrome.mjs  # `npm run check:ecosystem-chrome` — catalog drift
│   ├── check-seo.mjs               # `npm run check:seo` — per-web SEO linter
│   └── __tests__/                  # unit tests for the linters above
├── config.mjs                      # Style Dictionary build script
├── fonts.css                       # @font-face declarations for the 5 brand families
├── web.css                         # web-scale type composites + layout utils
├── responsive.md                   # breakpoints, mobile-first rule, layout utils
└── README.md                       # this file
```

### Distribution files

Four stylesheets ship at the package root, each with a different role:

| File | Generated? | Purpose |
|---|---|---|
| `dist/tokens.css` | ✅ by `config.mjs` | Token vars + recipe selectors. Single source of truth for slides and webs. Imports nothing — pure variable definitions. |
| `dist/breakpoints.css` | ✅ by `config.mjs` | The four `--bp-*` custom properties plus matching `@custom-media` queries (`--sm`, `--md`, `--lg`, `--xl`). PostCSS inlines the queries to literal `min-width` rules at build time; see `responsive.md` for the contract. |
| `fonts.css` | ❌ hand-written | `@font-face` declarations for CHANEY, At Aero, Scilla, Thunder, JetBrains Mono. Maps font-family names to actual `.otf`/`.ttf` files (consumers must sync the binaries to their `/fonts/` path). |
| `web.css` | ❌ hand-written | Web-scale typography composites (`--web-display-xl`, `--web-body-lg`, etc. with `clamp()`) + layout utilities (`.container`, `.stack-*`, `.hide-on-mobile/-desktop`) + utility classes (`.btn`, `.tag`, `.eyebrow`) for the Astro sites. Imports `dist/tokens.css`, `dist/breakpoints.css`, and `fonts.css` at the top, so a consumer needs only `@import "@chimi/design-system/web.css"` to get everything wired. |

Slides use `dist/tokens.css` directly (they have their own slide-scale typography in `talks/theme/styles/`); the mobile viewer mode in talks renders with viewport-relative units (`vw`/`svh`/`clamp()`) rather than DS breakpoints, so `dist/breakpoints.css` is webs-only today. Webs use `web.css`.

---

## Recipes

Recipes are the **consumption layer** for everything Chimi paints — slide templates and Astro webs alike. A recipe is a closed combination of five color roles + a typography whitelist that surfaces select via `data-recipe="<id>"`. The build emits `:where([data-recipe="<id>"])` blocks that populate `--recipe-{surface,ink,em,accent,warn}` short variables; surface CSS consumes only those.

Each surface declares one recipe — slide frontmatter (`recipe: canvas-quiet`) or `<body data-recipe="canvas-quiet">` for webs — and the rest derives. Recipes don't replace primitives or semantic — they sit above and select among them.

See [docs/anti-patterns.md](docs/anti-patterns.md) for the list of patterns every Chimi surface avoids (template tells) and the `check-slop` script that scans a built site for them. See [docs/recipes.md](docs/recipes.md) for the full field guide and `openspec/specs/closed-recipe-model/spec.md` for the normative contract — the closed catalog of seven recipes, the `data-recipe` declaration point, the `--recipe-*` consumption rule, the `critical` bicara pattern, and the rule-of-one for `energy-loud`.

```bash
npm run check:recipes   # linter that reports webs/slides consuming --chimi-color-* directly
```

---

## Ecosystem chrome

Two components and one catalog stitch the five aplicación webs of the Chimichurri ecosystem into a single experience:

- `ECOSYSTEM_SITES` — closed five-entry catalog exported from `@chimi/design-system/ecosystem`.
- `SiteHeader.astro` — topbar (brand mark + nav + theme toggle + socials).
- `SiteFooter.astro` — `rich` and `minimal` variants with a Chimiverse cross-link strip and the powered-by byline.

The catalog has 5 entries (consumer-facing webs); the SEO catalog `SEO_SITE_CATALOG` has 7 (the same 5 plus `talks` and `brand`). The distinction is intentional — see [docs/ecosystem-chrome.md](docs/ecosystem-chrome.md) for the field guide and `openspec/specs/ecosystem-chrome/spec.md` for the normative contract.

```bash
npm run check:ecosystem-chrome   # catalog drift detector — fails on count, ids, fields, URL shape
```

---

## Responsive

Webs author CSS mobile-first against four canonical breakpoints (`--bp-sm` 480, `--bp-md` 768, `--bp-lg` 1024, `--bp-xl` 1280). Each one ships as a custom property plus a matching `@custom-media` query (`--sm`, `--md`, `--lg`, `--xl`) emitted into `dist/breakpoints.css`.

```css
.feed {
  display: grid;
  grid-template-columns: 1fr;   /* mobile default */
  gap: var(--stack-sm);
}
@media (--md) {
  .feed {
    grid-template-columns: repeat(3, 1fr);   /* tablet+ */
    gap: var(--stack-md);
  }
}
```

Consumer CSS that writes `@media (--md)` must inline it at build time with the helper exported as `@chimichurricode/design-system/postcss` (see [docs/responsive.md](docs/responsive.md)). `web.css` and the components ship literal queries and need no tooling.

`web.css` ships layout helpers built on these breakpoints — `.container`, `.stack-{sm,md,lg}`, `.hide-on-mobile` / `.hide-on-desktop`, plus a `(max-width: 767.98px)` floor that pins `.btn` / `[role="button"]` / `nav a` to a 44×44 tap target on phones (the only `max-width` rule the system allows).

Full contract — breakpoint table, mobile-first authoring rule, mobile usability checklist, and the screenshot-harness invocations — lives in [`responsive.md`](./responsive.md).

---

## Naming convention

CSS custom properties follow `--chimi-{category}-{role}-{variant}`:

| JSON path                          | Emitted CSS variable                                |
| ---------------------------------- | --------------------------------------------------- |
| `color.recipe.canvas-quiet.surface`| `--chimi-color-recipe-canvas-quiet-surface`         |
| `color.recipe.canvas-quiet.ink`    | `--chimi-color-recipe-canvas-quiet-ink`             |
| `color.primitive.charcoal.100`     | `--chimi-primitives-color-charcoal-100`             |
| `font.family.display`              | `--chimi-font-family-display`                       |
| `type.display.md.fontSize`         | `--chimi-type-display-md-fontSize`                  |
| *(shorthand)* `type.display.md`    | `--chimi-type-display-md`                           |
| *(consumer-facing)*                | `--recipe-{surface,ink,em,accent,warn}` (read these)|

The `--chimi-type-<role>-<size>` **shorthand** is the most useful. Instead of wiring four variables by hand:

```css
/* ❌ old way */
font-family: var(--font-display);
font-size: 120px;
line-height: 0.95;
letter-spacing: -0.015em;

/* ✅ new way */
font: var(--chimi-type-display-md);
letter-spacing: var(--chimi-type-display-md-letterSpacing); /* shorthand doesn't cover it */
```

> Letter-spacing and text-transform aren't part of the CSS `font:` shorthand, so they stay as separate variables. Apply them alongside the shorthand when needed.

---

## How to use

### In a slide layout

The slide declares a recipe in its frontmatter; the layout reads `--recipe-*` only:

```css
section.slide.s-my-slide {
  background: var(--recipe-surface);
  color:      var(--recipe-ink);
}
.s-my-slide h2 {
  font: var(--chimi-type-display-md);
  letter-spacing: var(--chimi-type-display-md-letterSpacing);
}
.s-my-slide .kicker {
  font: var(--chimi-type-eyebrow-md);
  letter-spacing: var(--chimi-type-eyebrow-md-letterSpacing);
  text-transform: uppercase;
  color: var(--recipe-accent);
}
.s-my-slide em {
  color: var(--recipe-em);
}
```

Type-style tokens (`--chimi-type-*`) are still consumed directly because typography is independent of the recipe — only colors flip. If a layout needs a color outside the five recipe roles, escape to `--chimi-primitives-*` (the linter accepts it) rather than reaching into the semantic layer.

### In an Astro web

The layout sets `data-recipe` on `<body>` and pages opt into a different recipe via the layout's `recipe` prop:

```astro
---
import Base from "../layouts/Base.astro";
---
<Base recipe="paper" title="About">
  <main>…</main>
</Base>
```

Component CSS reads `--recipe-*` only:

```css
.cta {
  background: var(--recipe-accent);
  color: var(--recipe-surface);
}
```

### Changing a value

1. Edit the appropriate JSON file in `tokens/`.
2. Run `npm run tokens:build`.
3. Commit both the JSON change and the regenerated `dist/tokens.css`.

### Adding a new role

Two questions to ask first:

1. **Is this really a new role, or a variant of an existing one?** `surface.canvas-raised` is distinct from `surface.canvas`. `text.on-canvas-bold` is not — it's just `text.on-canvas` with more weight.
2. **Will more than one layout use it?** One-off values belong in the layout. A role earns its place when it's shared.

Add to `*.semantic.json`, rebuild, use it in the layout. Don't add primitives unless a genuinely new brand color enters the system.

---

## Current scope

The 5 Astro webs (blog, techconf, recall-for-papers, simple-pdf-converter, simple-scrum-poker), the brand book, and the 40 slide templates all consume recipes only — `--recipe-*` is the contract. The linter `check:recipes` enforces that webs don't reach back to `--chimi-color-*` directly.

The 5 webs and the DS-owned `SiteHeader` / `SiteFooter` are also fully mobile-first against the breakpoint primitives. The talks deck has both a presentation mode (fixed 1920×1080 canvas) and a mobile viewer (vertical scroll-snap with web-scale clamps); both are auto-detected at load time.

What's **not** done yet:

- Spacing isn't tokenized yet (`96px`, `140px`, `40px` are sprinkled throughout) — see `docs/gaps.md`.
- Brand book pages got an in-place migration to recipes / primitive escape hatches in v0.7.0 so they keep rendering, but a richer redesign of `color.html` (now a hybrid showcase of primitives + recipes) is still open as a polish task.
- **Slide content for the mobile viewer**: dense slides that lean on absolute-positioned choreography (variant-hud-heavy templates) work via the global mobile overrides but would benefit from per-template mobile passes.

---

## Build

```bash
npm run tokens:build   # regenerate dist/tokens.css and dist/breakpoints.css
npm run build          # regenerates tokens and then runs eleventy
```

The main `build` script runs `tokens:build` first, so CI and deploys pick up token changes automatically.

---

## SEO

The design system owns the cross-web SEO surface for all 7 webs in
the monorepo. Each consumer renders `<SEOHead site="…" />` (Astro)
or calls `renderSEOHeadHTML(props)` (Eleventy/static HTML) and gets
the full head block — title, description, canonical, OG, Twitter,
favicons, manifest, theme color, ecosystem alternates and JSON-LD —
from a single import. Defaults per site live in
[`seo/defaults.mjs`](./seo/defaults.mjs); helpers, the `check:seo`
linter, and the favicon / OG asset pipeline are documented in
[`seo/README.md`](./seo/README.md).

Pages can opt out of the linter via
`<meta name="chimi-seo-skip">`. Pages flagged `noindex` skip the
JSON-LD requirement (rich results don't apply to unindexable URLs).

```astro
---
import { SEOHead } from "@chimi/design-system";
---
<SEOHead
  site="blog"
  title="My post"
  description="…"
  pathname="/posts/my-post"
  og={{ type: "article", image: "/og/posts/my-post.png" }}
  jsonLd={postJsonLd}
/>
```

---

## Theming (dark + light)

Dark is the default. Light is opt-in via `<html data-theme="light">`. The semantic layer authors per-theme overrides via `$extensions.chimi.theme.<name>`, and the build emits a `:root[data-theme="light"]` block in `dist/tokens.css` containing only the roles that differ.

Consumer sites embed `<ThemeBootstrap />` in `<head>` to apply the saved theme before first paint, and get a footer toggle for free via `<SiteFooter />`. See [`docs/theming.md`](./docs/theming.md) for the full contract, the flipped-vs-constant role table, and the rules consumers must follow.
