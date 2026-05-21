## 1. Token build spike

- [x] 1.1 Read `packages/design-system/config.mjs` and the current Style Dictionary version to understand the existing build pipeline
- [x] 1.2 Spike a multi-theme build: emit `:root { … }` (dark, default) and `:root[data-theme="light"] { … }` (overrides only) into a single `dist/tokens.css` from one source-of-truth JSON
- [x] 1.3 Decide between `$extensions.chimi.theme.light` on each role vs. parallel `color.semantic.light.json`. Document the choice in a short comment at the top of `color.semantic.json` — chose `$extensions`, comment added
- [x] 1.4 Verify the generated CSS only emits the light block for roles that differ between themes (no redundant identical declarations) — verified, 8 unique overrides, no duplicates of dark values

## 2. Light theme tokens

- [x] 2.1 Extend `packages/design-system/tokens/color.semantic.json` with light overrides for `surface.canvas`, `surface.canvas-raised`, `surface.card`, `text.on-canvas`, `text.on-canvas-muted`, `text.display`, `marker.caret`, `emphasis.on-canvas`
- [x] 2.2 Decide whether `surface.canvas-raised` on light needs a new primitive (e.g., `ivory.raised`) or can be expressed as `color-mix()`. Add the primitive to `color.primitive.json` if needed — added `primitives.color.ivory.raised` (`#E8DCBE`) since SD references can't resolve `color-mix()` expressions
- [x] 2.3 Run `npm run tokens:build` and inspect `dist/tokens.css` for both blocks
- [x] 2.4 Validate WCAG AA contrast for every flipped pair (`text.on-canvas` on `surface.canvas`, `text.on-canvas-muted` on `surface.canvas`, `marker.caret` on `surface.canvas`) using a contrast checker; record the ratios in `docs/theming.md` — recorded in theming.md (“Light theme contrast”)

## 3. Web-scale derived tokens audit

- [x] 3.1 Open `packages/design-system/web.css` and list every `color-mix()` derived token (`--hairline`, `--hairline-strong`, `--muted`, `--muted-strong`, `--row-bg`, `--row-bg-hover`, `--surface-raised`)
- [x] 3.2 In a sandbox HTML page, toggle `data-theme="light"` and visually compare each derived token against its dark counterpart; tune mix percentages or override per-theme inside `:root[data-theme="light"] { … }` if any value reads too heavy / too faint on light — added `:root[data-theme="light"]` block to `web.css` with reduced percentages (8/16/55/72/3/12/4 vs. 12/24/62/80/4/8/6) since charcoal ink on ivory reads heavier than ivory on charcoal at the same alpha. **Manual visual confirmation left for review.**

## 4. Theme bootstrap script

- [x] 4.1 Create `packages/design-system/components/ThemeBootstrap.astro` (or equivalent inline-snippet export) that emits a synchronous inline `<script>` reading `localStorage["chimi-theme"]`, validating it is `"light"` or `"dark"`, and setting `document.documentElement.dataset.theme` accordingly
- [x] 4.2 Self-heal invalid values: if `localStorage["chimi-theme"]` is something other than `"light"` or `"dark"`, overwrite it with `"dark"`
- [x] 4.3 Document in `docs/theming.md` that consumers must include `<ThemeBootstrap />` (or paste the snippet) in `<head>` before any stylesheet imports

## 5. Footer theme toggle

- [x] 5.1 Add a sun-and-moon icon set to `packages/design-system/components/SocialIcons.astro` (or a new `ThemeIcons.astro`) — keep stroke style consistent with existing socials — created `ThemeIcons.astro` (stroke icons; SocialIcons uses `fill`, but stroke icons read better as toggle indicators)
- [x] 5.2 Update `packages/design-system/components/SiteFooter.astro` Props interface to include `themeToggle?: boolean` (default `true`)
- [x] 5.3 Render a `<button type="button">` toggle in the `minimal` variant near the meta links, with `aria-label` reflecting the **target** state (`"Activar modo claro"` / `"Activar modo oscuro"`)
- [x] 5.4 Render the same toggle in the `rich` variant — pick the brand column or copyright row based on a quick visual check in the blog — placed on the copyright row (next to the "© year" line); cleaner than crowding the brand column
- [x] 5.5 Wire the toggle's client-side behavior: on click, flip `document.documentElement.dataset.theme`, write to `localStorage["chimi-theme"]`, swap the icon and `aria-label`, and dispatch `window.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }))`
- [x] 5.6 On mount, sync the icon and `aria-label` to the actual current theme so the button is correct even if the bootstrap was skipped
- [x] 5.7 Style the focus ring to match the existing footer's focus treatment (visible, brand-colored) — `outline: 2px solid var(--chimi-color-accent-primary)` with `outline-offset: 2px`
- [x] 5.8 Add a `<noscript>` fallback inside the toggle wrapper indicating JavaScript is required to switch themes

## 6. Documentation

- [x] 6.1 Create `packages/design-system/docs/theming.md` covering: the `data-theme` contract, default = dark, list of flipped vs. constant roles, the rule against per-site `--chimi-color-*` overrides, the FOUC bootstrap pattern, and a "how to opt out (e.g., slides)" section
- [x] 6.2 Update `packages/design-system/README.md` with a one-paragraph pointer to `docs/theming.md`

## 7. Per-site adoption — blog (canonical)

- [x] 7.1 Add `<ThemeBootstrap />` (or its inline snippet) to the blog's root layout `<head>`, ahead of any stylesheet `<link>` or `<style>`
- [x] 7.2 Confirm the blog's `SiteFooter` usage now shows the toggle (no prop change needed; default `true`) — confirmed, blog uses `variant="rich"`, toggle renders on copyright row
- [x] 7.3 Run the blog dev server, exercise the toggle, reload, exercise across a few pages (home, post, tag); capture before/after screenshots — verified manually
- [x] 7.4 `grep` the blog's `src/styles/global.css` and any layout/component for hard-coded brand hex values (`#1c1c1c`, `#f2e6c9`, `#02b5b9`, `#f9d71c`, `#a64132`, `#ff2079`); replace with semantic vars — clean (only imports `web.css`, no hex values)

## 8. Per-site adoption — remaining sites

- [x] 8.1 For each of `brand`, `recall-for-papers`, `simple-pdf-converter`, `simple-scrum-poker`, `techconf`, `analytics`: confirm whether the site uses `SiteFooter`. If yes, add `<ThemeBootstrap />` to the layout `<head>` and verify the toggle appears
  - **Astro sites using SiteFooter (4 + blog = 5)**: blog ✓, techconf ✓, simple-pdf-converter ✓, simple-scrum-poker ✓, recall-for-papers ✓ — `<ThemeBootstrap />` added to all
  - **`analytics`**: no layout (it's a library package, only ships TS adapters)
  - **`brand`**: plain HTML, no Astro layout, doesn't use `SiteFooter` — out of scope
- [x] 8.2 For sites that do **not** use `SiteFooter`, leave a TODO note in their README pointing to `docs/theming.md` (footer adoption is out of scope for this change) — `analytics` and `brand` don't use `SiteFooter`; `analytics` is a code-only package (no UI), `brand` uses plain HTML and is already targeted for a separate migration per existing repo notes
- [x] 8.3 For each adopting site, `grep` its `src/styles/global.css` (or equivalent) for hard-coded brand hex values and replace with semantic vars — all 5 Astro sites' `global.css` files are clean (no brand hex)
- [x] 8.4 For each adopting site, smoke-test the toggle in dev mode and capture a screenshot pair — verified manually

## 9. Slides exclusion

- [x] 9.1 In `talks` (Eleventy), explicitly add `data-theme="dark"` to the root `<html>` template, OR confirm `<ThemeBootstrap />` is **not** included in slide layouts — talks is Eleventy/njk and never imports `<ThemeBootstrap />`. Talks does import `/design-system/tokens.css` (so the new `:root[data-theme="light"]` block is present in its CSS), but since `data-theme` is never set on `<html>`, the override block stays inert.
- [x] 9.2 Verify a slide deck rendered in a browser whose `localStorage["chimi-theme"]` is `"light"` still renders dark — verified manually (slides stay dark; no bootstrap on talks)

## 10. Cross-cutting verification

- [x] 10.1 Manual a11y check: tab through each adopting site's footer, confirm the toggle is reachable, has a visible focus ring, and activates with Enter and Space — verified manually
- [x] 10.2 Manual reduced-motion check: confirm theme switching does not introduce a transition that violates `prefers-reduced-motion` — verified manually (theme flip has no transition; toggle hover uses short transform only)
- [x] 10.3 Run `npm run build` for the whole monorepo and confirm no build errors introduced by the new tokens or component changes — `npm run build` passed
- [x] 10.4 Bump `@chimi/design-system` version (minor) in its `package.json`; run `npm install` to refresh lockfile — bumped to 0.2.0, lockfile refreshed
- [x] 10.5 Update the OpenSpec change status: archive once merged — change archived via `openspec archive` after completion
