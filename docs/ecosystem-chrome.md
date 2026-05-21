# Ecosystem chrome

> **Canonical contract**: `openspec/specs/ecosystem-chrome/spec.md`. This page is the field guide; the spec is the normative document. If they ever drift, the spec wins and this page must be updated to match.

The shared chrome that stitches the five aplicación webs of Chimichurri Code into a single ecosystem: the cross-web catalog (`ECOSYSTEM_SITES`), the topbar (`SiteHeader`), and the footer (`SiteFooter`).

---

## The catalog

`ECOSYSTEM_SITES` is a closed five-entry catalog exported from `@chimi/design-system/ecosystem`. Every entry has the same four fields, all non-empty, with `https://` URLs and **no** trailing slashes.

| id | name | url | description |
|---|---|---|---|
| `blog` | Chimichurri Code | `https://chimi.pro` | Blog, podcast y charlas |
| `techconf` | TechConf | `https://techconf.chimi.pro` | Conferencias técnicas en España |
| `recall-for-papers` | reCall4Papers | `https://recall.chimi.pro` | Pulí tu propuesta de charla |
| `simple-pdf-converter` | Simple PDF Converter | `https://pdf.chimi.pro` | PDF tools 100% en el navegador |
| `simple-scrum-poker` | Simple Scrum Poker | `https://poker.chimi.pro` | Voto a ciegas, sin login |

The list is **closed**: extending it requires a change OpenSpec that modifies the spec; the build-time linter `check-ecosystem-chrome.mjs` rejects drift.

### Five vs seven (chrome catalog vs SEO catalog)

There are two ecosystem catalogs in the design system, and the difference is intentional:

| Catalog | Module | Entries | Audience |
|---|---|---|---|
| `ECOSYSTEM_SITES` | `components/ecosystem.ts` | **5** | end-user UI chrome (footer switcher) |
| `SEO_SITE_CATALOG` | `seo/defaults.mjs` | **7** | meta tags, alternates, sitemaps |

The SEO catalog has two extra ids — `talks` and `brand` — that do **not** appear in the chrome because they are not products the visitor is meant to navigate to from the footer. `talks` is a live-presentation tool; `brand` is a brand book. Both have SEO surfaces (canonical URLs, OG images, JSON-LD) so they live in the SEO catalog. The cross-web SEO contract is defined in `openspec/specs/cross-web-seo/spec.md`.

---

## `SiteHeader`

```astro
---
import SiteHeader from "@chimi/design-system/SiteHeader.astro";
---

<SiteHeader
  brand={{ label: "Simple PDF", emText: "PDF", mark: "chimi" }}
  links={[
    { href: "/", label: "Home" },
    { href: "/about", label: "Cómo funciona" },
  ]}
  socials={[/* SocialLink[] from "@chimi/design-system/ecosystem" */]}
/>
```

Default behaviour:

- Brand link points to `/` of the current site (override via `brand.href`).
- The mobile hamburger toggles `aria-expanded` on the trigger and the `.open` class on the nav (≤ `--lg`); from `--lg` up the layout switches to inline.
- Submenus open on hover at `--lg`+ and on click below `--lg` (chevron is its own button with `aria-expanded`).
- Theme toggle is mounted by default; pass `themeToggle={false}` to omit. The button is the contract surface required by the `theme-toggle` capability.

Logo dual-theme variant:

```astro
<SiteHeader
  brand={{
    label: "Simple PDF Converter",
    logoSrc: { dark: "/logo-dark.svg", light: "/logo-light.svg" },
    logoHeight: 28,
  }}
/>
```

Both `<img>` tags are rendered; CSS swaps them based on `[data-theme]` on `<html>`.

---

## `SiteFooter`

Two variants. Pick `minimal` for productivity webs (default) and `rich` for the blog / TechConf landing.

### Minimal variant

```astro
---
import SiteFooter from "@chimi/design-system/SiteFooter.astro";
---

<SiteFooter
  siteId="simple-pdf-converter"
  metaLinks={[
    { href: "/about", label: "Cómo funciona" },
    { href: "https://chimi.pro", label: "Chimichurri", external: true },
  ]}
/>
```

The minimal variant renders:

1. A "Chimiverse" inline list of the **other 4 sites** (auto-reference filtered via `siteId`).
2. The meta links inline with the current year.
3. A `Powered with ♥ by Chimichurri Code` byline — **omitted automatically when `siteId === "blog"`** to avoid self-promotion.

### Rich variant

```astro
<SiteFooter
  variant="rich"
  siteId="blog"
  brandName="Chimichurri Code"
  brandDescription="Blog, podcast y charlas técnicas en español rioplatense."
  socials={[/* SocialLink[] */]}
  columns={[
    { title: "Sitio", links: [...] },
    { title: "Recursos", links: [...] },
  ]}
/>
```

Extras vs minimal:

- A brand column with name, description and socials (`--lg`+: spans the first 1.6fr; below `--lg`: full-width row).
- Custom `columns` rendered as a CSS grid (`1fr` mobile → `1fr 1fr` at `--md` → `1.6fr repeat(N, minmax(0,1fr))` at `--lg`).
- A horizontal `Chimiverse` strip under the columns (same auto-reference filtering as minimal).
- A copyright row at the bottom.

### Auto-reference filtering

`SiteFooter` filters the Chimiverse list using the helper:

```ts
import { ecosystemLinksExcluding } from "@chimi/design-system/ecosystem";

const others = ecosystemLinksExcluding("simple-pdf-converter");
// → 4 entries: blog, techconf, recall-for-papers, simple-scrum-poker
```

If you forget to pass `siteId`, the full five-entry list is rendered (including the current site). Always pass `siteId` from the consuming web.

---

## Linter & tests

Two scripts live alongside the contract:

- `npm run check:ecosystem-chrome --workspace @chimi/design-system` — drift detector. Fails if the catalog leaves the canonical 5 ids, drops a field, ships a non-`https://` URL, or grows a trailing slash.
- `npm run test:scripts --workspace @chimi/design-system` — unit tests for the linter (covers each contract check + the canonical catalog as the happy path).

The drift detector is a pre-commit-friendly Node ESM script with no external dependencies; it parses `components/ecosystem.ts` via regex and validates the parsed catalog. Cosmetic drift in the source layout will trip the parser, which is the intended behaviour: any catalog edit must be paired with a spec update.

---

## Related capabilities

- `theme-toggle` — the toggle button mounted inside `SiteHeader` and (optionally) `SiteFooter`. Contract: `openspec/specs/theme-toggle/spec.md`.
- `theming` — `[data-theme]` cascade that the toggle drives; both `SiteHeader` and `SiteFooter` consume `--chimi-color-*` semantic tokens that respect that cascade. Contract: `openspec/specs/theming/spec.md`.
- `cross-web-seo` — SEO catalog distinction (5 vs 7) and the cross-web meta/alternates surface. Contract: `openspec/specs/cross-web-seo/spec.md`.
- `closed-recipe-model` — the recipe-driven color contract that the chrome's CSS rides on top of. Contract: `openspec/specs/closed-recipe-model/spec.md`.
