# Ecosystem chrome

> **Canonical contract**: `openspec/specs/ecosystem-chrome/spec.md`. This page is the field guide; the spec is the normative document. If they ever drift, the spec wins and this page must be updated to match.

The shared chrome that stitches the Chimichurri Code webs into a single ecosystem: the cross-web catalog (`ECOSYSTEM_SITES`), the topbar (`SiteHeader`), and the footer (`SiteFooter`).

---

## The catalog

`ECOSYSTEM_SITES` (exported from `@chimichurricode/design-system/ecosystem`) is derived from [`site-registry.ts`](../site-registry.ts): every registry entry with `chrome: true`, in registry order — 9 sites today (`blog`, `techconf`, `recall-for-papers`, `simple-pdf-converter`, `simple-scrum-poker`, `simple-json-diff`, `simple-web-validator`, `simple-radar-skills`, `simple-font-tester`). Every entry has non-empty `id`, `name`, `url` and `description`, an `https://` URL with **no** trailing slash, and optionally `logoSrc`.

To add or change a site, edit the registry and run `bun run check` (which regenerates the runtime mirror and runs `check-ecosystem-chrome`).

### Logos

`logoSrc` paths look like `/logos/<id>/<file>.svg` and must point at a file shipped in `assets/logos/<id>/`. `SiteFooter` resolves them to those files and Vite bundles them into the consumer's build, so consumers don't copy anything into `public/`. Sites without `logoSrc` render as a text label.

### Chrome catalog vs SEO catalog

There are two ecosystem catalogs in the design system, and the difference is intentional:

| Catalog | Module | Entries | Audience |
|---|---|---|---|
| `ECOSYSTEM_SITES` | `components/ecosystem.ts` | `chrome: true` (**9**) | end-user UI chrome (footer switcher) |
| `SEO_SITE_CATALOG` | `seo/defaults.mjs` | `seo: true` (**11**) | meta tags, alternates, sitemaps |

The SEO catalog has two extra ids — `talks` and `brand` — that do **not** appear in the chrome because they are not products the visitor is meant to navigate to from the footer. `talks` is a live-presentation tool; `brand` is a brand book. Both have SEO surfaces (canonical URLs, OG images, JSON-LD) so they live in the SEO catalog. The cross-web SEO contract is defined in `openspec/specs/cross-web-seo/spec.md`.

---

## `SiteHeader`

```astro
---
import SiteHeader from "@chimichurricode/design-system/SiteHeader.astro";
---

<SiteHeader
  brand={{ label: "Simple PDF", emText: "PDF", mark: "chimi" }}
  links={[
    { href: "/", label: "Home" },
    { href: "/about", label: "Cómo funciona" },
  ]}
  socials={[/* SocialLink[] from "@chimichurricode/design-system/ecosystem" */]}
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
import SiteFooter from "@chimichurricode/design-system/SiteFooter.astro";
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
import { ecosystemLinksExcluding } from "@chimichurricode/design-system/ecosystem";

const others = ecosystemLinksExcluding("simple-pdf-converter");
// → every chrome site except simple-pdf-converter
```

If you forget to pass `siteId`, the full list is rendered (including the current site). Always pass `siteId` from the consuming web.

---

## Linter

- `bun run check:ecosystem-chrome` — drift detector. Imports `ECOSYSTEM_SITES` and the registry (Bun runs the TypeScript directly) and fails if they disagree, an entry drops a field, a URL isn't `https://` or has a trailing slash, or a `logoSrc` file is missing from `assets/logos/<id>/`.
- `bun run check` runs it together with the registry and site-id drift checks.

---

## Related capabilities

- `theme-toggle` — the toggle button mounted inside `SiteHeader` and (optionally) `SiteFooter`. Contract: `openspec/specs/theme-toggle/spec.md`.
- `theming` — `[data-theme]` cascade that the toggle drives; both `SiteHeader` and `SiteFooter` consume `--recipe-*` tokens that respect that cascade. Contract: `openspec/specs/theming/spec.md`.
- `cross-web-seo` — SEO catalog distinction (chrome vs SEO) and the cross-web meta/alternates surface. Contract: `openspec/specs/cross-web-seo/spec.md`.
- `closed-recipe-model` — the recipe-driven color contract that the chrome's CSS rides on top of. Contract: `openspec/specs/closed-recipe-model/spec.md`.
