# Responsive foundation

How the Chimi design system supports responsive web layouts. This document covers the breakpoints, the authoring rule (mobile-first), and the layout utilities every Chimi web consumes.

The slide layouts in `cv-talks` are out of scope here — they have their own viewer mode (see `mobile-viewer-talks` capability).

## Breakpoints

Four canonical breakpoints, defined once in `tokens/breakpoint.primitive.json` and emitted by Style Dictionary into `dist/breakpoints.css`:

| Token        | Value     | Intent                                                |
| ------------ | --------- | ----------------------------------------------------- |
| `--bp-sm`    | `480px`   | Phone landscape · transition for small layouts        |
| `--bp-md`    | `768px`   | Tablet portrait · primary mobile↔desktop switch       |
| `--bp-lg`    | `1024px`  | Tablet landscape / small desktop                      |
| `--bp-xl`    | `1280px`  | Large desktop · editorial container max               |

Each token also has a matching `@custom-media` query (`--sm`, `--md`, `--lg`, `--xl`) that webs use directly:

```css
@media (--md) {
  /* ≥ 768px */
}
```

`@custom-media` is not supported by any browser: it must be inlined at build time. `web.css` and the DS components already ship literal `min-width` queries, so they work with no tooling. **Consumer CSS that writes `@media (--md)` needs the helper** exported by this package:

```js
// postcss.config.mjs (in the consumer site)
import { dsCustomMedia } from "@chimichurricode/design-system/postcss";
export default { plugins: [...dsCustomMedia()] };
```

`dsCustomMedia()` reads the `@custom-media` definitions from `dist/breakpoints.css`, injects them into every stylesheet and runs `postcss-custom-media`, so `@media (--md)` becomes `@media (min-width: 768px)`. Without it the queries reach the browser verbatim and are ignored: every layout renders as mobile. (This bit the blog after it left the monorepo, 2026-10.)

If you need the breakpoint as a value (e.g. a `min(…, var(--bp-md))` calc), use the `--bp-*` custom property — it lives in `:root` everywhere `web.css` is imported.

## Mobile-first rule

Every web authors CSS mobile-first. The base rule (no media query) targets the smallest viewport (~360px). Media queries always use `min-width` (i.e. `@media (--sm)`, `@media (--md)`, …) — they add styles for larger viewports, never override down to smaller ones.

```css
/* ✅ correct: base is mobile, --md adds the desktop layout */
.feed {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
@media (--md) {
  .feed {
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
}

/* ❌ rejected: max-width is desktop-first */
.feed {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
@media (max-width: 767px) {
  .feed { grid-template-columns: 1fr; gap: 16px; }
}
```

Code review rejects `@media (max-width: …)` for layout. The only justified exceptions today are:
- Tap-target sizing on buttons and nav links (lives in `web.css`, scoped to `(max-width: 1023.98px)`); see [The 44px rule](#the-44px-rule).
- The narrow-phone rule in `web.css` (`(max-width: 479.98px)`): button labels wrap and `.display-lg` scales with the viewport so nothing overflows a 320px screen.

## Canonical example — blog post header

```css
/* base: mobile (≤ 480px and below) */
.post-header {
  padding-block: var(--stack-lg);
}
.post-title {
  font: var(--web-display-md);
}

/* small phones get a touch more breathing room */
@media (--sm) {
  .post-header {
    padding-block: var(--stack-xl);
  }
}

/* tablet and up: tighter title, two-column meta */
@media (--md) {
  .post-title {
    font: var(--web-display-lg);
  }
  .post-meta {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--stack-md);
  }
}

/* desktop: full editorial container */
@media (--lg) {
  .post-header {
    padding-block: var(--stack-2xl);
  }
}
```

## Layout utilities in `web.css`

```css
/* width-bounded editorial wrapper */
.container {
  width: 100%;
  max-width: var(--page-max);     /* defaults to var(--bp-xl) (1280px) */
  margin-inline: auto;
  padding-inline: var(--page-pad); /* clamp(16px, 4vw, 56px) */
}

/* vertical stacks (gap from --stack-* tokens) */
.stack-sm { gap: var(--stack-sm); }
.stack-md { gap: var(--stack-md); }
.stack-lg { gap: var(--stack-lg); }

/* visibility helpers gated by --md */
.hide-on-mobile  { display: none; }
.hide-on-desktop { display: revert; }
@media (--md) {
  .hide-on-mobile  { display: revert; }
  .hide-on-desktop { display: none; }
}

/* tap targets ≥ 44px wherever the layout is touch-first (WCAG 2.5.5 / Apple HIG) */
@media (max-width: 1023.98px) {
  .btn, .btn-ghost, .btn-primary, .btn-sm,
  button, [role="button"], nav a, .nav a { min-height: 44px; }
  button, [role="button"] { min-width: 44px; }   /* icon-only buttons */
  nav a, .nav a { display: inline-flex; align-items: center; } /* so min-height applies */
}

/* narrow phones: long button labels wrap, .display-lg follows the viewport */
@media (max-width: 479.98px) {
  .btn, .btn-primary, .btn-ghost, .btn-sm { white-space: normal; max-width: 100%; text-align: center; }
  .display-lg { font-size: min(48px, 12.5vw); }
}
```

### The 44px rule

- **Range: below 1024px** (`max-width: 1023.98px`), not only below 768px. The header keeps its hamburger (a touch layout) up to 1024px, and tablets in that range are touch devices.
- **What it covers**: `.btn` and its aliases, every native `<button>`, `[role="button"]`, and links inside `<nav>` (or `.nav`). Buttons also get `min-width: 44px` so icon-only controls (menu, theme toggle) are square targets. Nav links become `inline-flex` because an inline `<a>` ignores `min-height`.
- **What it does not cover**: links inside running text (`.prose`, paragraphs) keep their natural size; WCAG exempts inline links, and inflating them would break the reading rhythm. Form controls (`.input`) are 44px tall at every width.
- **From 1024px up** the rule stops: `.btn` is 38px (`.btn--sm` 30px), above the 24px minimum of WCAG 2.5.8 for pointer layouts.
- **Components** keep their own touch boxes inside the same range: the header's icon buttons and socials are 44×44 with a negative margin that preserves the 32px layout box, `SiteFooter`'s socials are 44×44 in every width.
- **Visible change for consumers**: native `<button>` elements now reach 44px below 1024px even without `.btn` (up to 0.8.x the rule stopped at 768px and did not include `button`).

These two `max-width` queries are the only ones `web.css` uses; everything else is mobile-first `min-width`.

Webs that need a narrower editorial column override `--page-max` in their own `:root` (e.g. blog at `1120px`, pdf at `880px`). They never re-declare `.container` itself — the utility stays canonical.

## Mobile usability checklist

For viewports 768px and below, every web meets:
- Zero horizontal scroll on any page.
- Body text computed font-size ≥ 16px (no iOS zoom-on-focus).
- Tap targets ≥ 44×44 on every interactive primitive.
- Images/media respect `max-width: 100%`.
- Navigation operable without hover (touch-friendly disclosure).

**There is no automated visual regression in CI.** This repo's CI runs `bun run build`, `bun run check` and `bun run test` (contrast, SEO head, font fetcher); nothing captures screenshots on a PR. Visual checks are manual, with the screenshot harness in the `cv-talks` repo at three viewports: `375×812` (mobile), `768×1024` (tablet), `1920×1080` (desktop). The harness lives in `cv-talks` (`scripts/screenshot-templates.mjs`; paths below are relative to that repo) and supports three sources:

| `--source` | What it captures                                              | Default viewports     |
| ---------- | ------------------------------------------------------------- | --------------------- |
| `slides`   | Every template under `templates/*.md`                         | `desktop`             |
| `web`      | The five webs (`blog`, `techconf`, `rfp`, `pdf`, `poker`)     | `mobile,tablet,desktop` |
| `<url>`    | Any absolute URL (one page, multiple viewports)               | `mobile,tablet,desktop` |

The webs source assumes each site's dev server is up on its canonical port before running the harness.

```bash
# Capture a single page at all three viewports
node scripts/screenshot-templates.mjs \
  --source http://localhost:4321/sobre-mi/ \
  --viewports all \
  --target current

# Capture every slide template at the mobile viewport (validates viewer-mobile)
node scripts/screenshot-templates.mjs \
  --source slides --viewports mobile --target current
```

Screenshots write to `tests/snapshots/<target>/<viewport>/<slug>.png`. Baselines live under `<target>=baseline`; a manual run writes to `<target>=current` for diffing.

## When to escalate to the DS

If two or more webs reimplement the same responsive pattern, escalate it here:
- A new utility class in `web.css` (centralized, single source of truth).
- A new breakpoint primitive (very rare — adding a fifth bp needs a strong case).
- A new `--web-*` typography composite if the pattern is type-shaped.

Don't centralize prematurely; one web's pattern is its own.
