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
- The mobile hamburger (below `--lg`) toggles `aria-expanded` and its label ("Abrir menú" / "Cerrar menú") on the trigger and the `.open` class on the nav. The closed menu is `visibility: hidden`, so its links are out of the tab order and the accessibility tree. Escape closes it and returns focus to the trigger; following a link closes it. Without JavaScript the nav renders in flow under the brand. With `mobileMenu={false}` there is no hamburger and the nav stays hidden below `--lg` (out of the tab order too), as in 0.8.x. From `--lg` up the layout switches to inline.
- Submenus open on hover/focus at `--lg`+ and on click below `--lg` (chevron is its own button with `aria-expanded`).
- **`aria-current`**: the link to the current page gets `aria-current="page"` (exact match); a parent section of the current page gets `aria-current="true"`. The active link also keeps the `.active` class for styling. Sites no longer need a script to add it.
- Theme toggle is mounted by default; pass `themeToggle={false}` to omit. The button is the contract surface required by the `theme-toggle` capability.
- Touch targets: below 1024px the menu button, theme toggle, socials, `actions` children and nav links are at least 44×44.

### Slot `actions`

Icon actions next to the theme toggle (search, a language switch…). Direct `<a>`/`<button>` children get the toggle's box: icon centered, muted color, `--recipe-accent-text` on hover, focus ring, 32×32 on desktop and 44×44 below 1024px. Give each one an accessible name. Being real markup, they render without JavaScript and cause no layout shift.

```astro
<SiteHeader brand={brand} links={links}>
  <a slot="actions" href="/buscar" aria-label="Buscar"><SearchIcon /></a>
</SiteHeader>
```

### Prop `labels`

Every built-in string, for sites that are not in Spanish. All optional; defaults in parentheses:

| Key | Default | Where |
|---|---|---|
| `openMenu` / `closeMenu` | "Abrir menú" / "Cerrar menú" | hamburger `aria-label` |
| `nav` | "Principal" | `<nav aria-label>` |
| `home` | "Inicio" | brand link `aria-label` (`${brand.label} — ${home}`) |
| `submenu` | "Mostrar submenú de {label}" | mobile submenu button |
| `themeToLight` / `themeToDark` | "Activar modo claro" / "Activar modo oscuro" | toggle `aria-label` |
| `themeTitle` | "Cambiar tema" | toggle tooltip |

```astro
<SiteHeader brand={brand} links={links} labels={{ openMenu: "Open menu", closeMenu: "Close menu", nav: "Main" }} />
```

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

Three variants. Pick `minimal` for productivity webs (default), `rich` for a landing with link columns (TechConf), and `person` for a personal site (the blog). `rich` and `minimal` are unchanged by `person`.

All three take `labels` (all optional): `socials` ("Redes sociales"), `ecosystem` ("Chimiverse"), `poweredWith` ("Powered with"), `poweredBy` ("by"), `rights` ("Nicolás Patarino. Todos los derechos reservados.", the default copyright after "© <year>") and `nav` ("Pie de página", the `person` variant's `<nav>`).

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

1. A "Chimiverse" inline list of the **other chrome sites** (auto-reference filtered via `siteId`).
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

### Person variant

The footer of a personal site: one identity line, a newsletter sentence, the site's links in groups, socials and a legal line. No columns and no Chimiverse strip (see the "footer corporativo" rule in [anti-patterns.md](anti-patterns.md)).

```astro
<SiteFooter
  variant="person"
  identity="Nico Patarino · Staff+ Mobile Engineer, speaker y asador del software. Madrid."
  newsletter={{ text: "Una historia por semana que te hace pensar la carrera.", label: "Suscribite a La Chimichurrería", href: NEWSLETTER_URL }}
  navGroups={[
    [{ href: "/historias", label: "Historias" }, { href: "/charlas", label: "Charlas" }, /* … */],
    [{ href: "/archivo", label: "Archivo" }, { href: "/temas", label: "Temas" }, { href: "/conceptos", label: "Glosario" }],
  ]}
  socials={DEFAULT_SOCIALS}
  feed={{ href: "/rss.xml" }}
  copyright={`© ${year} Nicolás Patarino · Hecho con Astro en Madrid`}
  labels={{ socials: "Redes" }}
>
  <Fragment slot="socials">{/* extra <li><a aria-label=…><svg/></a></li> items */}</Fragment>
</SiteFooter>
```

| Prop / slot | What it renders |
|---|---|
| `identity` / slot `identity` | The first line, in the display face. |
| `newsletter` (`{ text, label, href, external? }`) / slot `newsletter` | The sentence under it with an underlined link (new tab unless `external: false`). |
| `navGroups` (`MetaLink[][]`) | One `<ul>` per group inside a single `<nav aria-label={labels.nav}>`; groups after the first get a hairline above. Links are 44px tall. The link whose `href` equals the current path gets `aria-current="page"` (path from `Astro.url`, or `currentPath`). |
| `socials` + slot `socials` + `feed` | Icon links (44×44) in a list labelled `labels.socials`; the slot appends your own `<li>` items (icons the package does not ship); `feed` adds a text link ("RSS" by default) at the end. |
| `copyright` / slot `legal` | The last line (default `© <year> ${labels.rights}`). |

Layout: one column on mobile; from `--md`, identity + newsletter on the left (`1.2fr`) and links + socials on the right (`1fr`), legal line full width.

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

- `theme-toggle` — the toggle button mounted inside `SiteHeader`. Contract: `openspec/specs/theme-toggle/spec.md`.
- `theming` — `[data-theme]` cascade that the toggle drives; both `SiteHeader` and `SiteFooter` consume `--recipe-*` tokens that respect that cascade. Contract: `openspec/specs/theming/spec.md`.
- `cross-web-seo` — SEO catalog distinction (chrome vs SEO) and the cross-web meta/alternates surface. Contract: `openspec/specs/cross-web-seo/spec.md`.
- `closed-recipe-model` — the recipe-driven color contract that the chrome's CSS rides on top of. Contract: `openspec/specs/closed-recipe-model/spec.md`.
