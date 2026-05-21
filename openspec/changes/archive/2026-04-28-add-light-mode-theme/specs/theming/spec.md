## ADDED Requirements

### Requirement: Default theme is dark

The design system SHALL render in dark mode whenever no theme has been explicitly selected, preserving the brand's existing visual identity for first-time visitors and for documents that never set a theme attribute.

#### Scenario: Page loads with no `data-theme` attribute set

- **WHEN** a consumer renders an HTML document that imports `@chimi/design-system/web.css` (or `tokens.css`) and does not set `data-theme` on `<html>`
- **THEN** every `--chimi-color-*` semantic variable resolves to its dark-theme primitive (`surface.canvas` = charcoal.100, `text.on-canvas` = ivory.base, etc.)

#### Scenario: `data-theme` is set to an unknown value

- **WHEN** `<html data-theme="oceanic">` is rendered (any value other than `"light"` or `"dark"`)
- **THEN** the document SHALL fall back to the dark theme without throwing an error or loading additional resources

### Requirement: Light theme opt-in via `data-theme="light"`

The design system SHALL expose a light theme that activates exclusively when the `<html>` element carries `data-theme="light"`, scoped under a `:root[data-theme="light"]` block in the generated CSS so the cascade can flip without re-importing stylesheets.

#### Scenario: Switching to light at runtime

- **WHEN** a script sets `document.documentElement.dataset.theme = "light"` after page load
- **THEN** every semantic `--chimi-color-*` variable that has a light override re-resolves to its light-theme primitive within the same paint, and the visible background flips from charcoal to ivory without a page reload

#### Scenario: Switching back to dark at runtime

- **WHEN** a script removes the attribute (`delete document.documentElement.dataset.theme`) or sets it to `"dark"`
- **THEN** every semantic variable returns to its dark-theme value

### Requirement: Light-theme semantic mappings

The design system SHALL provide light-theme values for the following semantic roles. Roles not listed below SHALL inherit their dark value unchanged.

| Semantic role | Dark value | Light value |
|---|---|---|
| `surface.canvas` | charcoal.100 | ivory.base |
| `surface.canvas-raised` | charcoal.90 | a primitive or `color-mix()` alias one step darker than ivory.base |
| `surface.card` | charcoal.100 | ivory.base (or its raised variant) |
| `text.on-canvas` | ivory.base | charcoal.100 |
| `text.on-canvas-muted` | ivory @ opacity | charcoal.70 |
| `text.display` | ivory.base | charcoal.100 |
| `marker.caret` | lemon.base | red.base |
| `emphasis.on-canvas` | lemon.base | red.base |

Accent canvases (`accent-cool`, `accent-warm`, `accent-energy`, `accent-critical`) and their `text.on-accent-*` pairs SHALL keep their dark values across both themes — they are intentionally fluorescent-on-fluorescent and do not depend on canvas lightness.

#### Scenario: Light surface and text contrast

- **WHEN** the light theme is active and a paragraph using `color: var(--chimi-color-text-on-canvas)` sits on `background: var(--chimi-color-surface-canvas)`
- **THEN** the foreground/background pair SHALL meet WCAG AA contrast (≥ 4.5:1 for body text)

#### Scenario: Marker caret on light canvas

- **WHEN** the light theme is active and a streaming-text caret is painted with `color: var(--chimi-color-marker-caret)` on `background: var(--chimi-color-surface-canvas)`
- **THEN** the caret SHALL render as red (`primitives.color.red.base`), not lemon, so it stays visible on ivory

### Requirement: Tokens build emits a single CSS file with both themes

The Style Dictionary build SHALL emit `dist/tokens.css` containing both a default `:root { … }` block (dark values) and a `:root[data-theme="light"] { … }` block (light overrides), with no other artifacts required to enable the light theme.

#### Scenario: Built CSS structure

- **WHEN** `npm run tokens:build` completes
- **THEN** `packages/design-system/dist/tokens.css` SHALL contain at least one `:root {` selector and at least one `:root[data-theme="light"] {` selector, and the light block SHALL include only the roles whose values differ between themes

#### Scenario: Importing a single stylesheet enables both themes

- **WHEN** a consumer site imports `@chimi/design-system/web.css` (which transitively imports `tokens.css`)
- **THEN** both dark (default) and light (under `data-theme="light"`) resolve correctly with no additional `@import` or `<link>` tag

### Requirement: Single source of truth for theme values

Theme values SHALL be authored once per role in the semantic token JSON files (`packages/design-system/tokens/color.semantic.json` and any related semantic files). Consumer sites SHALL NOT redefine `--chimi-color-*` variables locally to introduce theme-specific values.

#### Scenario: Adding a new semantic role with both themes

- **WHEN** a designer adds a new role (e.g., `text.code`) to `color.semantic.json` and provides both a default (dark) value and a light override
- **THEN** the build SHALL emit `--chimi-color-text-code` in both `:root` and `:root[data-theme="light"]` blocks without any other file change

#### Scenario: Site-specific color need

- **WHEN** a consumer site needs a color that does not exist as a semantic role
- **THEN** the site SHALL define a new role-token in its own `global.css` layer composed from existing `--chimi-color-*` primitives (e.g., via `color-mix()`), rather than overriding a `--chimi-color-*` variable directly

### Requirement: Theming documentation

The design system SHALL ship a `docs/theming.md` (or equivalent README section) that documents the `data-theme` contract, the list of roles that flip per theme vs. those that stay constant, the rule against per-site `--chimi-color-*` overrides, and the inline-bootstrap-script pattern for FOUC prevention.

#### Scenario: Consumer site adopts the light theme

- **WHEN** a developer working on a consumer site reads `packages/design-system/docs/theming.md`
- **THEN** the document SHALL provide enough information to opt the site in (or out) of light mode without reading source code, including: how to set `data-theme`, how to embed the bootstrap script, and which roles are theme-dependent vs. constant

### Requirement: Slides keep dark forced

The `talks` package (slide canvas) SHALL render in dark regardless of any theme toggle elsewhere on `chimi.pro`, so projection rendering remains predictable.

#### Scenario: Slides served on a device with `chimi-theme=light` in localStorage

- **WHEN** a slide deck is opened in a browser whose `localStorage["chimi-theme"]` equals `"light"`
- **THEN** the slide deck SHALL still render with dark canvas, either by not including the theme bootstrap script or by explicitly forcing `data-theme="dark"` on `<html>`
