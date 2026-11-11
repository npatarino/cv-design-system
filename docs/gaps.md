# Open gaps in the design system

Things the current system does **not** yet formalize. Each open entry says what's missing, why it wasn't added yet, and what it would take to close. Closed entries stay at the end with what closed them.

Paths: this repo is `cv-design-system`. The slides live in the `cv-talks` repo and the brand book in `cv-brand`; the old monorepo folders (`talks/…`, `brand/shared/…`) no longer exist.

---

## Open

### Shadow / elevation

**Status**: absent. The package has one shadow (the desktop submenu of `SiteHeader`, `0 12px 32px -8px` black at 40%); the sites draw their own.

**Why not yet**: the anti-patterns rule out decorative and colored shadows, so the legitimate uses are few (floating menus, maybe dialogs). Two or three named elevations would be enough, but there aren't enough uses to pick the values.

**To close**: when a second floating surface appears, add `--chimi-shadow-{float,…}` to `tokens/foundation.semantic.json` (offset + soft blur, ink-based, never a colored halo) and move the submenu to it.

### Web type scale as tokens

**Status**: the web sizes are `--web-*` composites written by hand in `web.css` (`clamp()` per step), and `.prose` adds its own relative sizes. They are not in `tokens/`. The sites add their own on top (the October audit counted 53 distinct `font-size` values in the blog and 92 in the brand book).

**Why not yet**: the slide scale (`--chimi-type-*`, 1920×1080) is tokenized, but a web scale needs a decision on steps and fluid ranges first.

**To close**: decide 6–8 web steps (with their `clamp()` ranges), emit them from `tokens/` as `--chimi-web-type-*`, alias the `--web-*` composites to them and migrate the sites' one-off sizes.

### Type-scale rationalization (slides)

**Status**: slide font sizes are named by T-shirt (`xs`, `sm`, `md`, …), but the scale isn't mathematical — it follows the sizes currently in use, which were picked by eye. Ratios between steps vary.

**Why not yet**: forcing the scale onto a modular ratio (e.g. 1.25x) would change the look of every slide. That's a design decision, not a tooling one.

**To close**: a design pass that decides whether to regularize the scale. If yes, edit `size.primitive.json` and accept visual changes across the deck.

### Slide spacing and motion

**Status**: the web foundations are tokens now (see Closed), but the slides in `cv-talks` still use raw px for padding and gaps, and their keyframes (streaming-text reveal, slide enter/exit) live in the talks theme.

**Why not yet**: the slide values don't form a consistent rhythm, and moving them would touch every layout.

**To close**: audit the slide CSS in `cv-talks`, map the values that match onto `--chimi-space-*` / `--chimi-duration-*`, and add slide-only steps only where none fits.

### Recipes that ignore the theme

**Status**: only `canvas-quiet` and `canvas-signal` change with the theme; `paper`, `energy-loud`, `cool-fresh` and `critical` look the same in both. Open decision, see [theming.md](theming.md#open-decision-recipes-that-ignore-the-theme).

### Brand book palette

**Status**: `cv-brand` still carries page-level CSS with its own values (about 3.7k lines inside the pages at the last audit) next to the shared tokens.

**To close**: in `cv-brand`, replace local colors with `--recipe-*` and the foundations, and the inline recipe styles with `.recipe-scope`.

### Emphasis depends on text color, not just surface

**Status**: `em` is one color per recipe. Its readability depends on both the surface and the default text color on it.

**Concrete case**: on `cool-fresh` `em` is ivory, correct when the text is charcoal (the divider slide). On a slide that sets ivory text on the patagonia surface, ivory `em` disappears; the talks theme overrides it locally (big-list bullets).

**Why not yet**: modeling emphasis per (surface, text color) pair doubles the matrix, for two known collisions.

**To close**: if a third case appears, add an `em` variant per text color to the recipes, or a contrast-aware resolution step in the build.

### Dark / light mode per slide

**Status**: every slide picks its own recipe. There's no deck-wide "mode".

**Why not yet**: slides aren't apps; moments are chosen, not toggled.

**To close**: not planned. Document the decision if it comes up again.

---

## Closed

### Spacing scale (web) — closed in Unreleased

`--chimi-space-1…9` (4, 8, 12, 16, 24, 32, 48, 96, 144 px) in `tokens/foundation.semantic.json`. `--stack-*` in `web.css` are aliases of them. Line measure too: `--chimi-measure-{narrow,lede,prose}` (30, 56, 70ch).

### Radius and border — closed in Unreleased

`--chimi-radius-{sm,md,lg,xl,pill}` (2, 4, 8, 12, 999 px) and `--chimi-border-{1,2}` (1, 2 px). The package's components and `web.css` use them; values match the literals they replaced, so nothing moved. Shadow is still open (above).

### Motion and stacking (web) — closed in Unreleased

`--chimi-duration-{fast,base,slow}` (120, 150, 200 ms), `--chimi-ease-standard`, `--chimi-z-{header,dropdown,skip}` (10, 20, 100). `web.css` honours `prefers-reduced-motion`. The header's 180 ms menu fade and the 80 ms press nudge have no token yet and stay literal.

### Brand logo + font assets — closed

- Canonical SVG logos (`logo-character`, `logo-circle`, `logo-code`, `favicon`) live in `assets/logos/`.
- The licensed font files (CHANEY, At Aero, Scilla Narrow, Thunder, Nudica Mono) live in the private repo `npatarino/cv-fonts` (since 0.8.1). Sites fetch them at build time with `chimi-fetch-fonts` (see "Fonts" in the README).

Consumer pattern:

- **Astro sites**: the brand components — `BrandMark`, `BrandFavicon`, `BrandLogoWordmark`, `BrandLogoCircle` — inline the SVG with theme-aware colors via `currentColor` or props.
- **Static sites that need the asset on disk**: `scripts/copy-asset.mjs <package-path> <target>` for one file, `scripts/sync-dir.mjs <subdir> <target-dir>` for a directory, `chimi-fetch-fonts public/fonts` for the fonts. Synced output is git-ignored and regenerated at build time.

### Light theme over recipes — closed (2026-05-01)

Closed by the `recipes-light-theme-support` change: `tokens/color.recipe.json` carries `$extensions.chimi.theme.light` overrides on the canvas recipes (`surface`, `ink`, `em`, `accent`, and since Unreleased the derived `accent-text`, `on-accent` and `status-*`); the semantic color layer (`tokens/color.semantic.json`) was deleted and its consumers moved to `--recipe-*`.

### Text-safe accent and AA muted text — closed in Unreleased

`--recipe-accent-text`, `--recipe-on-accent` and `--status-*` per recipe and theme; `--muted` ≥4.5:1 everywhere; `test/contrast.test.mjs` guards every pair.

### Shared web components — closed in Unreleased

`web.css` ships `.prose`, form fields, `.list-rows`, `.recipe-scope`, button modifiers and `.skip-link`; `SiteFooter` has a `person` variant. Still site-owned on purpose: cards, the feed's thumbnail grid, video embeds, the numbered display list.
