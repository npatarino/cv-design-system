# Changelog

All notable changes to `@chimichurricode/design-system` are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project follows [Semantic Versioning](https://semver.org/) (`0.x`).

## [Unreleased]

### Fixed

- `font.primitive.json` described CHANEY as a condensed face; the face the system ships and renders is the extended one.

## [0.10.0] - 2026-11-12

### Changed

- **`paper` pages follow the theme.** When `paper` is the recipe of the page (`<body>` or `<html>`) and the theme is dark, the colour roles resolve to charcoal surface, ivory ink and patagonia accent; the editorial type roles and the patagonia `em` stay. Before, a dark-theme reader got an ivory article and the toggle did nothing there. Nested `paper` blocks (`.recipe-scope`) and slides stay ivory. Sites that hardcode ivory-only colours under `[data-recipe="paper"]` should move them to the roles (`--recipe-accent-text`, `--recipe-on-accent`, `--status-*`).
- `.prose` running text is set at 88% of the ink in the dark theme (12.6:1); headings, `strong` and quotes keep the full ink.

### Fixed

- `SiteHeader`: the CTA hover label on a dark `paper` page (it would have been ivory on patagonia, 2.42:1).

## [0.9.3] - 2026-11-12

### Fixed

- `chimi-check-slop` and `chimi-check-prose` did nothing and exited 0 when run by their bin name (`npx`, npm scripts), because the entry-point check compared against the `node_modules/.bin` symlink. Running the script by path was not affected.

## [0.9.2] - 2026-11-12

### Added

- `chimi-check-slop` bin and `./check-slop` export (`checkSlop(dir, opts)`).
- `check-slop --strict` exits 1 when an enforced rule is over its limit;
  `--strict=all` includes the advisory rules. `--max rule=n` raises a limit,
  `--all` prints every location and `--json` prints the report.
- New `check-slop` rules: `banned-fonts`, `multi-primary` and `copy`.
- `chimi-check-prose` bin and `./check-prose` export (`checkProse(paths, opts)`,
  `checkText(text)`): the text sibling of `check-slop`. Reads `.md`, `.mdx`
  and `.html`, reports file, line, column and sentence, and exits 1 under
  `--strict`. Six enforced rules (`rayas`, `vocabulario`, `meta-anuncio`,
  `anzuelo`, `borrador`, `emoji-icono`) and ten advisory ones. Documented in
  `docs/prose.md`.

### Changed

- `check-slop` reads `<style>` blocks and `style` attributes of every `.html`
  file, not only `.css` files and `index.html`.
- `check-slop` reports file, line, column and selector for each finding.
- `side-borders` also catches hex and `rgb()` colours, `border-left-color`
  longhand and logical properties; `color-shadows` ignores grey shadows.
- Rule names in the output are now ids (`side-borders`, `multi-h1`…).

## [0.9.1] - 2026-11-12

Restores three 0.8.x behaviours that 0.9.0 changed for sites that had not
opted in. 0.9.0 was staged on npm but never approved; use 0.9.1.

### Fixed

- `.btn-ghost`, `.btn-sm` and `.btn-primary` no longer get the pill box
  without `.btn`. In 0.9.0 a consumer's own `.btn-ghost` class (the font
  tester's toolbar) was restyled and overflowed at 375px.
- The 44px tap-target rule no longer applies to every native `<button>`
  (and no longer sets `min-width`). It covers `.btn` and its aliases,
  `[role="button"]` and nav links, below 1024px. `SiteHeader` and
  `SiteFooter` still size their own icon buttons to 44×44.
- `SiteHeader` with `mobileMenu={false}` keeps the nav hidden below 1024px
  again (0.9.0 rendered it in flow under the brand). It is hidden with
  `visibility`, so its links are also out of the tab order.
- The state colours added in 0.9.0 (`red.soft`, `green.base`, `green.soft`,
  `amber.deep`) move from `primitives.color` to a new `primitives.status`
  group (`--chimi-primitives-status-*`). They are functional colours, not
  brand families: under `color` the brand book listed them as part of the
  palette (eight families instead of six).

## [0.9.0] - 2026-11-12

### Added

- **Text-safe color roles per recipe and theme.** `--recipe-accent-text`
  (the accent as text on the surface), `--recipe-on-accent` (text on an
  accent fill) and `--status-ok`, `--status-bad`, `--status-caution` (state
  text). New primitives `red.soft`, `green.base`, `green.soft`,
  `amber.deep`. See "The color roles" in `docs/recipes.md`.
- **Foundation tokens** (`tokens/foundation.semantic.json`, emitted to
  `dist/tokens.css`): `--chimi-space-1…9`, `--chimi-radius-{sm,md,lg,xl,pill}`,
  `--chimi-duration-{fast,base,slow}`, `--chimi-ease-standard`,
  `--chimi-z-{header,dropdown,skip}`, `--chimi-border-{1,2}`,
  `--chimi-measure-{narrow,lede,prose}`. `--stack-*` are now aliases of the
  space scale (same values).
- **Shared components in `web.css`:**
  - `.prose` — complete long-form typography (paragraphs, h2–h4, lists,
    quotes, inline and block code, `hr`, images, `figure`/`figcaption`,
    `.img-grid`, tables with their own horizontal scroll, underlined links),
    text capped at `--chimi-measure-prose`; `.prose--display` sets the
    headings in CHANEY.
  - Form fields: `.field`, `.label`, `.input` (input, select, textarea),
    `.field-hint`, `.field-error`, with `:focus-visible`,
    `[aria-invalid="true"]` and `:disabled` states and a new
    `--field-border` role (≥3:1 against the surface and the field fill in
    every recipe and theme).
  - `.list-rows` (+ `.list-rows--between`, `.list-rows-link`,
    `.list-rows-title`, `.list-rows-meta`): rows separated by hairlines.
  - `.recipe-scope`: a nested `[data-recipe]` paints its own surface and ink.
  - Button modifiers `.btn--primary`, `.btn--ghost` and `.btn--sm` (the
    canonical names). `.btn.primary`, `.btn-primary`, `.btn-ghost` and
    `.btn-sm` stay as aliases with the same rendering, and the `.btn-*`
    aliases now also work without `.btn` (reverted in 0.9.1).
  - `.skip-link`, a global `:focus-visible` ring, `color-scheme` per theme,
    a `prefers-reduced-motion` block and a `forced-colors` block.
- `SiteHeader`: slot `actions` (icon links/buttons before the theme toggle,
  e.g. search), prop `labels` (every built-in string), `aria-current` on the
  active link (`page` on exact match, `true` on a parent section).
- `SiteFooter`: `variant="person"` (identity line, newsletter sentence,
  link groups with `aria-current`, socials, feed link, legal line; props
  `identity`, `newsletter`, `navGroups`, `feed`, `currentPath`; slots
  `identity`, `newsletter`, `socials`, `legal`) and prop `labels`. `rich`
  and `minimal` are unchanged.
- `renderSEOHeadHTML` / `SEOHead`: `themeColor` accepts `{ light, dark }`
  and emits a `prefers-color-scheme` pair of `theme-color` tags; registry
  entries may declare `themeColorScheme`. A string keeps the old output.
- `test/contrast.test.mjs`: every text role ≥4.5:1 and the field outline
  ≥3:1, in every recipe and both themes (`critical.ink` held to the 3:1
  large-text floor). `CONTRAST_REPORT=1` prints the table.
  `test/render-head.test.mjs` covers the `theme-color` pair.

### Changed

- Accent-colored text reads `--recipe-accent-text` everywhere in the
  package (eyebrow, link and button hovers, `.tag.accent`, header and
  footer kickers, titles, hovers and the header's brand mark glyph). The
  "Code" of the header brand keeps `--recipe-accent` (identity).
- `paper` on webs: the three accent roles move together to patagonia deep
  in both themes (before, the accent followed the canvas accent and flipped
  with the theme).
- `--muted` reaches 4.5:1 in every recipe and theme: light theme mix 55% →
  64%, and `energy-loud`, `cool-fresh` and `critical` pin their own value.
- The 44px tap-target rule now runs below 1024px (was 768px) and covers
  native `<button>` and `[role="button"]` (with `min-width: 44px`; native
  buttons were taken out again in 0.9.1) besides
  `.btn` and nav links.
- `SiteHeader` mobile menu: the closed menu is `visibility: hidden` (out of
  the tab order), Escape closes it and returns focus, the button label
  alternates open/close, following a link closes it, and the nav renders in
  flow without JavaScript. Hamburger, theme toggle, socials and `actions`
  get 44×44 touch areas below 1024px without moving the layout.
- Literal radius, duration, easing, z-index and border values in
  `web.css`, `SiteHeader` and `SiteFooter` are foundation tokens (same
  rendered values).
- Below 480px `.btn` labels wrap and `.display-lg` scales with the viewport
  (`min(48px, 12.5vw)`) instead of overflowing a 320px screen.

### Fixed

- Primary button label contrast: charcoal on patagonia deep was 2.97:1 in
  `paper` light; the label is now `--recipe-on-accent` (≥4.5:1 on the fill
  and on the hover/active fills in every recipe and theme).
- `--muted` on ivory was 3.79:1 in the light theme.
- Mobile menu links were reachable by Tab while the menu was closed.
- `SiteHeader` CTA hover label on `paper` and `cool-fresh` (2.42:1 → 6.75:1).
- `fonts.css` no longer tells consumers to import it after `web.css`
  (`web.css` already imports it).
- Docs aligned with the code: theme contract (no attribute = dark, only
  `data-theme="light"` is written), `cool-fresh` roles, contrast table
  regenerated from the tokens, removed-linter references, visual-regression
  claim, gaps.

### Visible changes for consumers that adopt nothing

- Primary button text: on `paper` (dark and light) it is ivory on patagonia
  deep instead of charcoal on patagonia; on `critical` the label on the
  charcoal fill is ivory instead of plasma; on `cool-fresh` the label on the
  ivory fill is charcoal instead of patagonia. Canvas recipes and
  `energy-loud` keep their label. On hover the fill now darkens toward the
  ink instead of fading toward the surface.
- Accent-colored text on `paper` in the dark theme is patagonia deep
  instead of patagonia base.
- Nav links and `.btn` are at least 44px tall below 1024px (0.9.0 also
  resized every native button; 0.9.1 does not).
- Light-theme muted text is a little darker; a keyboard focus ring appears
  on every focusable element.

### Migration notes

Nothing is required. Once a site depends on this version it can delete its
local patches:

- **Blog (`cv-blog`)**
  - `--accent-text: #036a6d` and every `var(--accent-text, var(--recipe-accent))`:
    use `var(--recipe-accent-text)`. The `.eyebrow`, `.site-header`/
    `.site-footer` color overrides and the `paper` CTA override in
    `global.css` become redundant.
  - The script in `Base.astro` that injects the search link (and the
    `.nav-search` styles): pass `<a slot="actions" href="/buscar"
    aria-label="Buscar">…</a>` to `SiteHeader`. The same script's
    `aria-current` loop is no longer needed.
  - The `theme-color` regex in `Base.astro`: pass
    `themeColor: { light: "#FAFAF8", dark: "#1B1B1B" }` to
    `renderSEOHeadHTML`.
  - Local `.btn` rules: the `.btn:hover:not(.primary)` color, the
    narrow-phone `.btn`/`.display-lg` block (the TODO), the `.btn-sm`
    44px rule, `.btn:active` in reduced motion, the `.skip-link` and global
    `:focus-visible` blocks.
  - `.prose` in `global.css`: the system's `.prose` covers it; keep
    `.prose--episode` show-notes styles, map the `talk`/`episode` variants of
    `Prose.astro` to `.prose--display`, and decide on links (the system
    underlines them in `--recipe-accent-text`; the blog uses ink with a
    50% underline).
  - `SiteFooterPerson.astro`: `<SiteFooter variant="person" …>` renders
    the same footer (pixel-identical); `ExtraSocialIcons` go in the
    `socials` slot.
  - `ContactForm.astro`: `.field`/`.label`/`.input`/`.field-error`
    replace the scoped field styles; the `.form-status`/`.form-error`
    callouts (side rule on a tinted box, banned by `anti-patterns.md`)
    become plain text with `.field-hint`/`.field-error`.
- **Brand book (`cv-brand`)**: its `--accent-text` fallbacks, `.skip-link`
  block and eyebrow color; the inline
  `style="background:var(--chimi-color-recipe-…-surface);color:…"` on
  nested recipes become `class="recipe-scope"`.

## [0.8.2]

### Changed

- The optional `astro` peer range is `^5.0.0 || ^6.0.0 || ^7.0.0`. The Astro
  components (`SiteHeader`, `SiteFooter`, `SEOHead`, `ThemeBootstrap`,
  `ThemeIcons`, `SocialIcons` and the `Brand*` logos) compile unchanged with
  Astro 7's Rust compiler and render the same HTML as on Astro 5 (checked
  through `@chimichurricode/web-app-kit` 0.2.0's `BaseLayout`).

## [0.8.1]

### Changed

- **The licensed font files are no longer in the package or the repo.**
  CHANEY, At Aero, Scilla Narrow, Thunder and Nudica Mono can't be
  redistributed, so `assets/fonts/` is gone (and gitignored) and `files`
  ships only `assets/icons`, `assets/logos` and `assets/og`. The fonts live
  in the private repo `npatarino/cv-fonts`. Sites now run
  `chimi-fetch-fonts public/fonts` (new, see below) instead of
  `sync-dir.mjs fonts public/fonts`, and set `CHIMI_FONTS_TOKEN` in their
  build environment. See "Fonts" in the README.

### Fixed

- `SiteFooter` bundles the ecosystem logos from `assets/logos` instead of
  requesting `/logos/simple-scrum-poker/favicon{,-dark}.svg` from each
  consumer's `public/` (404 on every site that didn't copy them).
- `check-seo` and `seo-prebuild` work from a consumer's `node_modules`:
  `check-seo --site <id> [--dir dist] [--sitemap file]`, and the site list
  comes from the SEO catalog.
- `check-ecosystem-chrome` derives the site list from the registry.
- Site registry theme/background/mask colors are token colors, and
  `check:registry` enforces it. TechConf's canonical domain is `techconf.es`.
- Stale `@chimi/design-system` and monorepo paths in docs, comments, the
  generated CSS banner and script hints.
- Icon generators (`generate:icons`, `generate:icon-preview`) run and are
  deterministic.

### Added

- `scripts/fetch-fonts.mjs` (bin `chimi-fetch-fonts`, import
  `@chimichurricode/design-system/fetch-fonts`): copies the fonts into a
  site from `CHIMI_FONTS_DIR`, or downloads them from `npatarino/cv-fonts`
  with `CHIMI_FONTS_TOKEN` (cached per ref), or falls back to an installed
  ≤ 0.8.0 package; otherwise warns and succeeds (`--require` to fail). No
  dependencies; tested with `bun run test` (also in CI).
- Release workflow stages versions with `npm stage publish` (npm Trusted
  Publishing); a maintainer approves them with 2FA on npmjs.com.
- `check-seo`, `seo-prebuild`, `sync-dir`, `copy-asset` and `seo/lint.mjs`
  are shipped in the package.
- `node-html-parser` dependency (used by `check-seo`).
- `bun run check` and the `check:*` scripts.
- WCAG contrast table in `docs/recipes.md`.

### Removed

- Scripts that only worked in the old monorepo (`check-recipes`,
  `check-docs-linter-coherence`, `check-workspace-conventions`,
  `process-icons`, `generate-og`).

## [0.8.0] - 2026-10-27

Consumer fixes, `docs/anti-patterns.md` and `check-slop`. Earlier versions
were not tracked in a changelog.

[Unreleased]: https://github.com/npatarino/cv-design-system/compare/v0.9.2...HEAD
[0.9.2]: https://github.com/npatarino/cv-design-system/compare/v0.9.1...v0.9.2
[0.9.1]: https://github.com/npatarino/cv-design-system/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/npatarino/cv-design-system/compare/v0.8.0...v0.9.0
[0.8.1]: https://github.com/npatarino/cv-design-system/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/npatarino/cv-design-system/releases/tag/v0.8.0
