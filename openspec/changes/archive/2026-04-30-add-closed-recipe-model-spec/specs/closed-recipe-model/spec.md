## ADDED Requirements

### Requirement: Closed catalog of seven recipes

The `@chimi/design-system` package SHALL define exactly **seven** color recipes in `tokens/color.recipe.json`. Each recipe is a closed combination of five roles — `surface`, `ink`, `em`, `accent`, `warn` — drawn from the primitives layer. The catalog is closed: introducing an eighth recipe (or removing one) requires a change proposal that modifies this specification.

The seven recipes are:

| Recipe | Surface | Ink | Em | Accent | Warn | Editorial purpose |
|---|---|---|---|---|---|---|
| `canvas-quiet` | charcoal | ivory | lemon | patagonia | red | Default editorial; long-form reading; dark canvases |
| `canvas-signal` | charcoal | ivory | lemon | patagonia | red | Data dashboards, KPI walls; same palette as quiet, different typographic emphasis |
| `paper` | ivory | charcoal | red | charcoal | red | Warm editorial; quotes, prompts, tickets, prints |
| `paper` | ivory | charcoal | patagonia | charcoal | red | Reflective editorial with weight; technical testimonials, FAQ |
| `energy-loud` | lemon | charcoal | red | charcoal | red | Announcements, posters, event CTAs |
| `cool-fresh` | patagonia | charcoal | ivory | lemon | charcoal | Feature launches, dividers, "what's new" banners |
| `critical` | plasma | ivory | charcoal | charcoal | charcoal | Bicara: as a full recipe (bg), or as `.critical-fg-<role>` modifiers over a host recipe |

#### Scenario: A new visual case is introduced that doesn't match any of the seven recipes

- **WHEN** a designer or implementer encounters a layout that none of the seven recipes captures cleanly
- **THEN** they SHALL pick the closest recipe and document the gap with `// FIXME(recipes): <motive>` in the code, **rather than** introducing a new entry in `tokens/color.recipe.json`
- **AND** the FIXME is tracked as input for a future `extend-recipe-catalog` change proposal if the gap proves systemic

#### Scenario: A change proposal modifies the catalog

- **WHEN** a change proposal adds, removes, or renames a recipe in `tokens/color.recipe.json`
- **THEN** the proposal SHALL include a delta that modifies this specification's "Closed catalog of seven recipes" requirement table accordingly
- **AND** archive of that change SHALL update `packages/design-system/docs/recipes.md` to reflect the new catalog

### Requirement: `data-recipe` is the single declaration point

A recipe SHALL be declared by setting `data-recipe="<id>"` exactly once per top-level visual unit:

- In Astro web layouts (`@chimi/blog`, `@chimi/techconf`, `@chimi/recall-for-papers`, `@chimi/simple-pdf-converter`, `@chimi/simple-scrum-poker`), the attribute SHALL be set on `<body>` (typically via the `recipe` prop of the shared `Base.astro` layout).
- In Eleventy slides (`@chimi/talks`), the attribute SHALL be set on `<section class="slide">` (each slide owns its own recipe).

A nested wrapper element MAY redeclare a different `data-recipe` to scope a sub-region (the cascade re-resolves `--recipe-*` for descendants), but this is treated as an exception and SHOULD be documented inline.

#### Scenario: A web page uses the default recipe

- **WHEN** an Astro page does not pass a `recipe` prop to `Base.astro`
- **THEN** `<body>` is rendered with `data-recipe="canvas-quiet"` (the default), and `--recipe-*` resolve to the canvas-quiet palette

#### Scenario: A web page uses a non-default recipe

- **WHEN** an Astro page sets `recipe="paper"` on its `Base.astro` invocation
- **THEN** `<body>` is rendered with `data-recipe="paper"`, and every descendant element consuming `var(--recipe-*)` resolves to the paper palette without further configuration

#### Scenario: A `<body>` declares no `data-recipe` and no default is wired

- **WHEN** a page renders a `<body>` element without any `data-recipe` attribute
- **THEN** the global `:root:not([data-recipe])` rule in `web.css` SHALL apply the canvas-quiet values to `--recipe-*`, ensuring zero visual regression for legacy or unmigrated pages

#### Scenario: A nested wrapper redeclares the recipe

- **WHEN** a developer wraps a sub-region in `<div data-recipe="paper">` inside a `<body data-recipe="canvas-quiet">`
- **THEN** descendants of the wrapper consume the paper palette via the cascade, and the rest of the page keeps canvas-quiet
- **AND** the wrapper SHALL include a code comment justifying the local override (e.g., `<!-- nested recipe: testimonial card uses paper for editorial weight -->`)

### Requirement: Layouts and components consume `--recipe-*`, not `--chimi-color-*`

Layouts and components in the application packages (`@chimi/blog`, `@chimi/techconf`, `@chimi/recall-for-papers`, `@chimi/simple-pdf-converter`, `@chimi/simple-scrum-poker`, `@chimi/talks`) SHALL consume color values via `var(--recipe-{surface,ink,em,accent,warn})` and the `web.css` derived utilities (`--hairline`, `--muted`, `.btn`, `.btn.primary`, `.tag.*`).

Direct consumption of `var(--chimi-color-*)` (the semantic layer) SHALL NOT appear in application code.

The exception is **primitive escape hatches**: `var(--chimi-primitives-color-*)` MAY be used for artefacts that have a fixed local palette unrelated to the active recipe (e.g., duotone logos, brand marks with hardcoded brand colors). Each occurrence SHALL be documented with an inline comment such as `/* primitive escape hatch — duotone avatar */`.

#### Scenario: A layout consumes color through the recipe

- **WHEN** a CSS rule in any application package needs an accent color
- **THEN** it SHALL declare `color: var(--recipe-accent);` (or the equivalent role from `--recipe-{surface,ink,em,warn}`)

#### Scenario: A layout consumes color through the semantic layer

- **WHEN** a CSS rule in an application package declares `color: var(--chimi-color-accent-primary);`
- **THEN** the `check-recipes.mjs` linter reports the occurrence as an error during the build of that package
- **AND** the build SHALL fail (or surface the warning prominently in the case of the documented `EventRow.astro` light-theme debt) until the rule is migrated to `--recipe-*` or replaced with a documented primitive escape hatch

#### Scenario: A logo uses a primitive escape hatch

- **WHEN** a duotone logo component needs to render in a fixed plasma + ivory palette regardless of the carrying recipe
- **THEN** it MAY declare `fill: var(--chimi-primitives-color-plasma-base);` directly, accompanied by an inline comment such as `/* primitive escape hatch — duotone logo */`
- **AND** the linter SHALL ignore this consumption (only `--chimi-color-*` is reported, never `--chimi-primitives-color-*`)

### Requirement: Bicara behavior of the `critical` recipe

The `critical` recipe SHALL behave as two distinct constructs depending on how it is applied:

**As a full recipe** (`data-recipe="critical"` on `<body>` or `<section class="slide">`):
- Renders with surface = plasma, ink = ivory, em = charcoal, accent = charcoal, warn = charcoal.
- Reserved for error pages, critical disclaimers, hard-stop messages.
- Use sparingly: at most 1–2 critical recipes per deck (talks) or per page tree (webs).

**As foreground modifiers** (`.critical-fg-<role>` class on an element nested inside another recipe):
- Available roles: `stat`, `quote`, `eyebrow`, `marker`, `display-word`.
- Each modifier overrides exactly one `--recipe-*` property of the carrying recipe with `var(--chimi-primitives-color-plasma-base)` for the subtree it scopes.
- Specifically: `critical-fg-stat`, `critical-fg-quote`, `critical-fg-eyebrow`, `critical-fg-display-word` override `--recipe-em`; `critical-fg-marker` overrides `--recipe-warn`.
- Use sparingly: at most 1 critical-fg-* modifier per slide or per page (a numeral OR a quote OR an eyebrow, not all three).
- Forbidden hosts: `energy-loud`, `cool-fresh`, `critical`. Plasma over high-chroma surfaces vibrates and loses legibility; plasma over plasma is meaningless.

#### Scenario: A page renders an error 500 message

- **WHEN** a developer needs a full critical canvas
- **THEN** they declare `<body data-recipe="critical">` and the entire page renders with the plasma palette

#### Scenario: A dashboard highlights a single critical KPI

- **WHEN** a developer wants one numeral on a `canvas-signal` dashboard to read as "critical"
- **THEN** they wrap the numeral element with the `critical-fg-stat` class, leaving the surrounding `data-recipe="canvas-signal"` intact
- **AND** only that numeral subtree resolves `--recipe-em` to plasma; the rest of the dashboard keeps lemon

#### Scenario: A developer applies `critical-fg-stat` over `energy-loud`

- **WHEN** an element with `class="critical-fg-stat"` is nested inside a region with `data-recipe="energy-loud"`
- **THEN** the combination is forbidden: it is documented as such in `packages/design-system/docs/recipes.md`, and a code review SHALL reject the PR
- **AND** the recommended remediation is to switch the carrying recipe to `canvas-quiet` or `paper` so `critical-fg-stat` lands on a low-chroma host

### Requirement: Rule-of-one for `energy-loud`

A single rendered viewport (web page) or a single slide (talks) SHALL contain **at most one** `data-recipe="energy-loud"` region. This is a design / code-review rule, not an automated check, because the safety threshold is contextual (a long scrollable page may legitimately have two energy-loud blocks separated by other content).

Code review SHALL reject any PR that introduces two energy-loud regions visible simultaneously without explicit justification.

#### Scenario: A page introduces two energy-loud CTAs

- **WHEN** a PR adds a second `data-recipe="energy-loud"` block within the same fold of a page (visible without scrolling)
- **THEN** code review rejects the PR
- **AND** the recommended remediation is to demote one of the CTAs to a different recipe (typically `cool-fresh` or `paper`) so a single energy-loud retains its intended emphasis

#### Scenario: A long page has two energy-loud blocks separated by other content

- **WHEN** a long-form page has one energy-loud CTA at the top and a second energy-loud CTA at the bottom, separated by 3+ folds of body content
- **THEN** the rule is satisfied (each fold contains at most one energy-loud) and the PR is acceptable

### Requirement: Linter as the recipe-model guard rail

The script `packages/design-system/scripts/check-recipes.mjs` SHALL be the official build-time guard rail enforcing the recipe-model contract. It SHALL:

- Scan `packages/{blog,techconf,recall-for-papers,simple-pdf-converter,simple-scrum-poker}/src` and `packages/talks/` for direct consumption of `var(--chimi-color-*)`.
- Report each occurrence as an error or warning, distinguishing the documented `EventRow.astro` light-theme block (warning, tracked as light-theme debt) from undocumented drift (error).
- Run as part of every package build (via `postbuild` or `prebuild` hooks of each web).
- Maintain its current behaviour of NOT scanning `--chimi-primitives-color-*` (those are legitimate escape hatches per Requirement "Layouts and components consume --recipe-*, not --chimi-color-*").

#### Scenario: A web build runs

- **WHEN** `npm run build:<web>` is executed
- **THEN** `check-recipes.mjs` runs as part of the build
- **AND** the build SHALL fail if any non-documented `var(--chimi-color-*)` is detected outside the known light-theme debt locations

#### Scenario: A new web is added to the monorepo

- **WHEN** a new `packages/<new-web>/` Astro workspace is created
- **THEN** the workspace's build pipeline SHALL invoke `check-recipes.mjs --web <new-web>` (or the equivalent flag) so the new web is covered by the linter from day one

### Requirement: Default carrier when `data-recipe` is absent

When no `data-recipe` attribute is present on `<body>` (web) or on `<section class="slide">` (talks), the active palette SHALL fall back to `canvas-quiet`. This is implemented in `packages/design-system/web.css` via the rule `:root:not([data-recipe]) { --recipe-surface: <canvas-quiet surface>; ... }`.

The fallback exists so that legacy pages, future pages that have not yet opted into a specific recipe, and snippets rendered in isolation (e.g., embedded previews) all render with the same baseline as the rest of the dark editorial canon.

#### Scenario: An unmigrated page renders without `data-recipe`

- **WHEN** a page is rendered with `<body>` lacking the `data-recipe` attribute
- **THEN** `--recipe-*` resolve to the canvas-quiet values via the `:root:not([data-recipe])` rule
- **AND** the page renders identically to a page that explicitly declared `data-recipe="canvas-quiet"`

#### Scenario: An isolated component preview is rendered

- **WHEN** a component is rendered in isolation (e.g., a preview tool) without a wrapping `data-recipe` carrier
- **THEN** the component picks up the canvas-quiet values from the global default and renders with the dark editorial palette
