# Responsive foundation

How the Chimi design system supports responsive web layouts. This document covers the breakpoints, the authoring rule (mobile-first), and the layout utilities every web in the monorepo consumes.

The slide layouts in `packages/talks` are out of scope here — they have their own viewer mode (see `mobile-viewer-talks` capability).

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

`postcss-custom-media` (configured in the monorepo root `postcss.config.mjs`) inlines these to literal `@media (min-width: 768px) { … }` at build time. Browsers without native `@custom-media` support still get a working bundle.

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
- Tap-target sizing on `nav a` / `.btn` (lives in `web.css`, scoped to `(max-width: 767.98px)`); the inline comment explains why min-width was insufficient.

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

/* tap target ≥ 44×44 on mobile only (WCAG 2.5.5 / Apple HIG) */
@media (max-width: 767.98px) {
  .btn, [role="button"], nav a { min-height: 44px; }
}
```

Webs that need a narrower editorial column override `--page-max` in their own `:root` (e.g. blog at `1120px`, pdf at `880px`). They never re-declare `.container` itself — the utility stays canonical.

## Mobile usability checklist

For viewports 768px and below, every web meets:
- Zero horizontal scroll on any page.
- Body text computed font-size ≥ 16px (no iOS zoom-on-focus).
- Tap targets ≥ 44×44 on every interactive primitive.
- Images/media respect `max-width: 100%`.
- Navigation operable without hover (touch-friendly disclosure).

Visual regression captures three viewports per page on every PR: `375×812` (mobile), `768×1024` (tablet), `1920×1080` (desktop). The screenshot harness lives in `packages/talks/scripts/screenshot-templates.mjs` and supports three sources:

| `--source` | What it captures                                              | Default viewports     |
| ---------- | ------------------------------------------------------------- | --------------------- |
| `slides`   | Every template under `packages/talks/templates/*.md`          | `desktop`             |
| `web`      | The five webs (`blog`, `techconf`, `rfp`, `pdf`, `poker`)     | `mobile,tablet,desktop` |
| `<url>`    | Any absolute URL (one page, multiple viewports)               | `mobile,tablet,desktop` |

The webs source assumes each dev server is up on its canonical port — start them with `npm run dev:blog`, `npm run dev:techconf`, etc. before running the harness.

```bash
# Capture every web at all three viewports
npm run screenshots:webs

# Capture a single page at all three viewports
node packages/talks/scripts/screenshot-templates.mjs \
  --source http://localhost:4321/sobre-mi/ \
  --viewports all \
  --target current

# Capture every slide template at the mobile viewport (validates viewer-mobile)
node packages/talks/scripts/screenshot-templates.mjs \
  --source slides --viewports mobile --target current
```

Screenshots write to `packages/talks/tests/snapshots/<target>/<viewport>/<slug>.png`. Baselines live under `<target>=baseline`; the per-PR run writes to `<target>=current` for diffing.

## When to escalate to the DS

If two or more webs reimplement the same responsive pattern, escalate it here:
- A new utility class in `web.css` (centralized, single source of truth).
- A new breakpoint primitive (very rare — adding a fifth bp needs a strong case).
- A new `--web-*` typography composite if the pattern is type-shaped.

Don't centralize prematurely; one web's pattern is its own.
