## ADDED Requirements

### Requirement: `ECOSYSTEM_SITES` is a closed catalog of five entries

The `@chimi/design-system` package SHALL export `ECOSYSTEM_SITES` from `components/ecosystem.ts` as an array of exactly **five** entries with the following ids: `blog`, `techconf`, `recall-for-papers`, `simple-pdf-converter`, `simple-scrum-poker`.

Each entry SHALL conform to the type:

```ts
interface EcosystemSite {
  id: string;        // stable kebab-case handle, never changes after creation
  name: string;      // display name shown in chrome (may differ from id)
  url: string;       // canonical https URL of the site, no trailing slash
  description: string; // short tagline (≤ 80 chars) for tooltips/lists
}
```

Adding, removing, or renaming a site requires an OpenSpec change that modifies this requirement.

#### Scenario: A consumer reads the catalog

- **WHEN** any package imports `ECOSYSTEM_SITES` from `@chimi/design-system/components/ecosystem`
- **THEN** the array contains exactly 5 entries
- **AND** the set of ids equals `{"blog", "techconf", "recall-for-papers", "simple-pdf-converter", "simple-scrum-poker"}`

#### Scenario: A linter audit runs

- **WHEN** the design-system build runs `check-ecosystem-chrome.mjs`
- **THEN** the linter verifies the catalog has exactly 5 entries with the canonical id set
- **AND** the linter verifies every entry has all four fields (`id`, `name`, `url`, `description`) non-empty
- **AND** the linter verifies every `url` starts with `https://` and does NOT end with `/`
- **AND** the build fails if any check fails

#### Scenario: A PR adds a sixth site to the catalog without an OpenSpec change

- **WHEN** a developer pushes a PR that appends a new entry to `ECOSYSTEM_SITES`
- **THEN** `check-ecosystem-chrome.mjs` fails the design-system build because the count is no longer 5 (or the id set no longer matches)
- **AND** the PR is rejected until an accompanying OpenSpec change updates this requirement

### Requirement: Distinction between chrome catalog and SEO catalog

The `ECOSYSTEM_SITES` catalog (this requirement, 5 sites) SHALL be distinct from the `SEO_SITE_CATALOG` defined in `packages/design-system/seo/defaults.mjs` (covered by the `cross-web-seo` capability, 7 sites). The two catalogs serve different purposes:

- `ECOSYSTEM_SITES` (5 sites): sites surfaced to end users as navigable destinations in chrome (header switcher, footer "Chimiverse" strip).
- `SEO_SITE_CATALOG` (7 sites): all web properties indexed by search engines and cross-linked via SEO alternates (sitemap-index, `<link rel="alternate">`).

The two extra sites in `SEO_SITE_CATALOG` — `talks` (technical slides tool) and `brand` (brand book) — SHALL NOT appear in `ECOSYSTEM_SITES` because they are not productive destinations for the end user.

#### Scenario: A change adds a new web property

- **WHEN** a new web property is added to the monorepo
- **THEN** the proposing change SHALL evaluate whether the new web is a productive end-user destination (→ add to `ECOSYSTEM_SITES`) or only a tool / reference site (→ add to `SEO_SITE_CATALOG` only)
- **AND** if the new web qualifies for chrome, both this requirement and `cross-web-seo`'s catalog requirement SHALL be modified together

### Requirement: Auto-reference filtering via `siteId`

The helper `ecosystemLinksExcluding(currentId)` SHALL filter the catalog to omit the entry whose `id` matches `currentId`. `SiteFooter` and any future ecosystem-aware component SHALL accept a `siteId` prop and SHALL apply this filter automatically when the prop is present.

When `siteId` is not provided, components MAY render the full catalog (acceptable for shared/standalone preview contexts but not recommended in production sites).

#### Scenario: A web's footer renders the Chimiverse switcher

- **WHEN** a page in `@chimi/blog` renders `<SiteFooter siteId="blog" showEcosystem={true} />`
- **THEN** the footer's "Chimiverse" section lists the 4 other sites (techconf, recall-for-papers, simple-pdf-converter, simple-scrum-poker) in the catalog order
- **AND** "Chimichurri Code" (the blog itself) is omitted

#### Scenario: A standalone preview renders without `siteId`

- **WHEN** a tooling preview renders `<SiteFooter showEcosystem={true} />` (no `siteId`)
- **THEN** the footer lists all 5 sites of `ECOSYSTEM_SITES`

### Requirement: `SiteHeader` props and behavior

`@chimi/design-system` SHALL export the `SiteHeader` Astro component with the following props contract:

```ts
interface Props {
  brand: BrandConfig;       // required
  links?: NavLink[];        // optional, default []
  socials?: SocialLink[];   // optional, default []
  mobileMenu?: boolean;     // default true
  themeToggle?: boolean;    // default true
}

interface BrandConfig {
  href?: string;            // default "/"
  label: string;            // required
  mark?: string;            // optional, "chimi" reserved for the brand mark SVG
  emText?: string;          // optional substring of label to render as <em>
  byline?: string;          // optional secondary tagline
  ariaLabel?: string;       // default `${label} — Inicio`
  logoSrc?: { light: string; dark: string }; // optional dual-theme logo
  logoHeight?: number;      // default 28 (px)
}
```

The component SHALL satisfy the following behavioural invariants:

- The brand element SHALL render as an `<a href={brand.href ?? "/"}>` with `aria-label={brand.ariaLabel ?? \`${brand.label} — Inicio\`}`.
- When `brand.logoSrc` is set, both the light and dark variants SHALL be rendered with `alt=""` and `aria-hidden="true"`, and CSS SHALL swap them based on `[data-theme]` on `<html>`.
- The mobile hamburger toggle SHALL have `aria-expanded` initialised to `"false"`, SHALL toggle to `"true"` when opened, and SHALL have a tap target of at least 44×44 px.
- The mobile nav overlay SHALL be hidden by default (slide-in animation when `aria-expanded="true"`) and visually replaced by an inline horizontal nav at viewports `≥ --lg` (1024px).
- When `themeToggle` is `true`, the component SHALL render a button with `[data-theme-toggle]` and Spanish `aria-label` describing the action that will happen on activation (`"Activar modo claro"` when current is dark, `"Activar modo oscuro"` when current is light) — the actual theme-switching behaviour is defined by the `theme-toggle` capability.
- Each external nav link (`link.external === true`) SHALL render with `target="_blank" rel="noopener"`.
- Submenus SHALL open on hover at `≥ --lg` and via an explicit chevron-toggle button (with its own `aria-expanded`) at smaller viewports.

#### Scenario: A web mounts the header with the standard config

- **WHEN** a page renders `<SiteHeader brand={{ label: "Simple PDF Converter", href: "/" }} links={[{ href: "/about", label: "About" }]} themeToggle={true} />`
- **THEN** the rendered header contains the brand link to `/`, one nav link to `/about`, the theme toggle button, and a working mobile hamburger

#### Scenario: A web disables the theme toggle

- **WHEN** a page renders `<SiteHeader brand={...} themeToggle={false} />`
- **THEN** the rendered header does NOT contain a `[data-theme-toggle]` element
- **AND** the page does not break theme switching for the user (other surfaces, such as `SiteFooter`, may still expose the toggle)

#### Scenario: A user opens the mobile menu

- **WHEN** the user taps the hamburger toggle on a viewport `< --lg` (1024px)
- **THEN** the toggle's `aria-expanded` flips to `"true"` and the nav overlay slides in
- **AND** tapping the toggle again closes the overlay and resets `aria-expanded` to `"false"`

### Requirement: `SiteFooter` variants and behavior

`@chimi/design-system` SHALL export the `SiteFooter` Astro component supporting two layout variants chosen via the `variant` prop:

- **`minimal`** (default): a single horizontal row containing meta-links + copyright, an optional `Chimiverse` block, and an optional `Powered with ♥ by …` byline.
- **`rich`**: an editorial grid containing a `brand-col` (logo + description + socials), N custom columns (passed via the `columns` prop), a horizontal `Chimiverse` strip, and a copyright line.

Both variants SHALL satisfy the following invariants:

- When `siteId` is provided and `showEcosystem !== false`, the component SHALL invoke `ecosystemLinksExcluding(siteId)` to derive the Chimiverse list (auto-reference filtering, per the corresponding requirement).
- All ecosystem links SHALL render with `target="_blank" rel="noopener"`.
- Custom columns (`columns` prop, rich variant only) SHALL be rendered in the order received.
- The `Powered with ♥ by Chimichurri Code` byline (link to `https://chimi.pro`) SHALL appear in the minimal variant by default and SHALL be omitted when `siteId === "blog"` (the blog must not auto-promote to itself).
- The copyright text SHALL default to `© <currentYear> Nicolás Patarino. Todos los derechos reservados.` and SHALL be overridable via the `copyright` prop.
- The component SHALL gracefully render with empty/missing optional inputs (e.g., empty `columns`, empty `socials`, empty `metaLinks`) without breaking layout.

#### Scenario: A web mounts the minimal footer with full ecosystem

- **WHEN** a page renders `<SiteFooter variant="minimal" siteId="simple-pdf-converter" showEcosystem={true} metaLinks={[{ href: "/about", label: "Sobre el sitio" }]} />`
- **THEN** the rendered footer shows the Chimiverse strip listing the 4 other sites, the meta-link "Sobre el sitio", the copyright line, AND the "Powered with ♥ by Chimichurri Code" byline (because `siteId !== "blog"`)

#### Scenario: The blog mounts the minimal footer

- **WHEN** a page in `@chimi/blog` renders `<SiteFooter variant="minimal" siteId="blog" showEcosystem={true} />`
- **THEN** the rendered footer shows the Chimiverse strip (4 other sites), the copyright line, but does NOT include the "Powered with ♥ by Chimichurri Code" byline

#### Scenario: A landing mounts the rich footer

- **WHEN** a page renders `<SiteFooter variant="rich" siteId="techconf" brandName="TechConf" brandDescription="..." socials={[...]} columns={[{ title: "Más", links: [...] }, { title: "Legal", links: [...] }]} />`
- **THEN** the rendered footer shows the brand-col (with brand name, description, socials), the two custom columns, the Chimiverse strip, and the copyright line — in a multi-column grid layout at `≥ --lg`, collapsing to single column at `< --md`

### Requirement: Theme toggle is mounted within the chrome

The chrome (`SiteHeader` and, for selected configurations, `SiteFooter`) SHALL be the canonical mounting surface for the theme toggle button (`[data-theme-toggle]`). The actual theme-switching behavior — persistence in `localStorage["chimi-theme"]`, dispatching the `themechange` `CustomEvent`, syncing icons — is defined by the `theme-toggle` capability and SHALL NOT be redefined here.

If the theme toggle is moved out of the chrome (e.g., promoted to a free-floating widget), both this requirement and the `theme-toggle` capability SHALL be modified together via an OpenSpec change.

#### Scenario: A page renders the chrome with the theme toggle enabled

- **WHEN** a page renders `<SiteHeader themeToggle={true} ... />`
- **THEN** the rendered header contains a `<button data-theme-toggle>` whose visual behaviour and `aria-label` follow the contract defined by `theme-toggle`

#### Scenario: A new chrome surface needs a theme toggle

- **WHEN** a future change introduces a new chrome surface (e.g., a sidebar) that should host a theme toggle
- **THEN** the toggle is mounted as `[data-theme-toggle]` and the `theme-toggle` capability's wiring picks it up automatically — no new wiring is needed, only the markup

### Requirement: Build-time guard rail for catalog drift

The script `packages/design-system/scripts/check-ecosystem-chrome.mjs` SHALL run as part of the design-system package build pipeline and SHALL verify:

1. The exported `ECOSYSTEM_SITES` array contains exactly 5 entries.
2. The set of ids equals the canonical set documented in this specification.
3. Every entry has the four fields (`id`, `name`, `url`, `description`) all non-empty.
4. Every `url` starts with `https://` and does not end with `/`.

The linter SHALL be the official guard rail for catalog stability: any drift fails the build of the design-system, which cascades to every consumer.

#### Scenario: A clean build runs

- **WHEN** `npm run build:design-system` (or equivalent) is executed on a current, conformant version of the package
- **THEN** `check-ecosystem-chrome.mjs` reports `OK` and the build succeeds

#### Scenario: A developer accidentally drops a trailing slash on a URL

- **WHEN** a PR changes one entry's `url` from `https://chimi.pro` to `https://chimi.pro/`
- **THEN** `check-ecosystem-chrome.mjs` fails the build with a message naming the offending entry and the violated rule
- **AND** the PR is rejected until the trailing slash is removed
