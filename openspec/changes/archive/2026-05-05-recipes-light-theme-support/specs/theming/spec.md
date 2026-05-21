## RENAMED Requirements

- FROM: `### Requirement: Light-theme semantic mappings`
- TO: `### Requirement: Light-theme recipe mappings`

## MODIFIED Requirements

### Requirement: Default theme is dark

The design system SHALL render in dark mode whenever no theme has been explicitly selected, preserving the brand's existing visual identity for first-time visitors and for documents that never set a theme attribute. With the semantic layer removed, "dark" means: every `--chimi-color-recipe-<id>-<role>` token resolves to the recipe's default (`$value`) primitive — the same value that ships in the canonical `:root { … }` block of `dist/tokens.css`.

#### Scenario: Page loads with no `data-theme` attribute set

- **WHEN** a consumer renders an HTML document that imports `@chimi/design-system/web.css` (or `tokens.css`) and does not set `data-theme` on `<html>`
- **THEN** every `--chimi-color-recipe-*` token resolves to its dark-theme default (e.g., `canvas-quiet.surface` = charcoal.100, `canvas-quiet.ink` = ivory.base, `canvas-quiet.em` = lemon.base)
- **AND** the consumer's `--recipe-*` short vars (mapped from the long-form via the `:where([data-recipe="<id>"])` block) inherit those dark values automatically

#### Scenario: `data-theme` is set to an unknown value

- **WHEN** `<html data-theme="oceanic">` is rendered (any value other than `"light"` or `"dark"`)
- **THEN** the document SHALL fall back to the dark theme without throwing an error or loading additional resources

### Requirement: Light theme opt-in via `data-theme="light"`

The design system SHALL expose a light theme that activates exclusively when the `<html>` element carries `data-theme="light"`, scoped under a `:root[data-theme="light"]` block in the generated CSS so the cascade can flip without re-importing stylesheets. The block SHALL contain `--chimi-color-recipe-<id>-<role>` overrides for the recipes that declare `$extensions.chimi.theme.light` variants in `tokens/color.recipe.json` (today: `canvas-quiet` and `canvas-signal`; the four paper/accent recipes are theme-agnostic by design).

#### Scenario: Switching to light at runtime

- **WHEN** a script sets `document.documentElement.dataset.theme = "light"` after page load
- **THEN** every `--chimi-color-recipe-*` token that has a light override re-resolves to its light-theme primitive within the same paint, every `--recipe-*` short var that depends on it re-resolves transitively, and the visible background flips from charcoal to ivory without a page reload

#### Scenario: Switching back to dark at runtime

- **WHEN** a script removes the attribute (`delete document.documentElement.dataset.theme`) or sets it to `"dark"`
- **THEN** every recipe variable returns to its dark-theme value

### Requirement: Light-theme recipe mappings

The design system SHALL provide light-theme values for the following recipe roles. Recipes and roles not listed below SHALL inherit their dark value unchanged.

| Recipe | Role | Dark value | Light value |
|---|---|---|---|
| `canvas-quiet` | `surface` | charcoal.100 | ivory.base |
| `canvas-quiet` | `ink` | ivory.base | charcoal.100 |
| `canvas-quiet` | `em` | lemon.base | red.base |
| `canvas-signal` | `surface` | charcoal.100 | ivory.base |
| `canvas-signal` | `ink` | ivory.base | charcoal.100 |
| `canvas-signal` | `em` | lemon.base | red.base |

Rationale per role:

- `surface` and `ink` flip together to keep AA contrast in the inverted direction (charcoal-on-ivory is the same eye-safe pair as ivory-on-charcoal).
- `em` flips from lemon to red because lemon-on-ivory falls below 1.5:1 contrast (unreadable italic emphasis); red-on-ivory clears AA non-text and remains italic-distinct from ink.
- `accent` (patagonia) and `warn` (red) keep their dark values — patagonia-on-ivory hits ~2.5:1 (UI/border AA, bordered links acceptable per `web.css`'s patagonia-accent rule for paper recipes) and red-on-ivory clears AA.
- The `paper`, `paper`, `energy-loud`, `cool-fresh`, and `critical` recipes have no light overrides: paper recipes are already light by construction (ivory surface, charcoal ink), and the three accent recipes (lemon, patagonia, plasma) are intentionally fluorescent on both themes to preserve campaign-mode identity.

#### Scenario: Light surface and text contrast on canvas-quiet

- **WHEN** the light theme is active and a paragraph using `color: var(--recipe-ink)` sits on `background: var(--recipe-surface)` in a `[data-recipe="canvas-quiet"]` page
- **THEN** the foreground/background pair (charcoal-on-ivory) SHALL meet WCAG AA contrast (≥ 4.5:1 for body text)

#### Scenario: Em italic on canvas-quiet light theme

- **WHEN** the light theme is active and an `<em>` is painted with `color: var(--recipe-em)` inside a `[data-recipe="canvas-quiet"]` paragraph
- **THEN** the em SHALL render as red (`primitives.color.red.base`), not lemon, so the italic emphasis stays legible on ivory

#### Scenario: Paper recipes are theme-invariant

- **WHEN** a `[data-recipe="paper"]` block is rendered with either `data-theme="dark"` or `data-theme="light"` on `<html>`
- **THEN** all five `--recipe-*` short vars resolve to the same hex values in both themes (the paper recipe declares no `$extensions.chimi.theme.light` overrides)

### Requirement: Tokens build emits a single CSS file with both themes

The Style Dictionary build SHALL emit `dist/tokens.css` containing both a default `:root { … }` block (dark values) and a `:root[data-theme="light"] { … }` block (light overrides), with no other artifacts required to enable the light theme. The light block SHALL contain only the `--chimi-color-recipe-<id>-<role>` overrides whose values differ between themes; recipe roles without a `$extensions.chimi.theme.light` override are not duplicated in the light block.

#### Scenario: Built CSS structure

- **WHEN** `npm run tokens:build` completes
- **THEN** `packages/design-system/dist/tokens.css` SHALL contain at least one `:root {` selector and at least one `:root[data-theme="light"] {` selector, the light block SHALL include only the recipe roles whose values differ between themes (today: `canvas-quiet.{surface,ink,em}` and `canvas-signal.{surface,ink,em}` — six entries), and SHALL NOT contain any `--chimi-color-{text,surface,accent,emphasis,marker}-*` tokens (the semantic layer was removed)

#### Scenario: Importing a single stylesheet enables both themes

- **WHEN** a consumer site imports `@chimi/design-system/web.css` (which transitively imports `tokens.css`)
- **THEN** both dark (default) and light (under `data-theme="light"`) resolve correctly with no additional `@import` or `<link>` tag

### Requirement: Single source of truth for theme values

Theme values SHALL be authored once per recipe role in `packages/design-system/tokens/color.recipe.json` via the `$extensions.chimi.theme.<name>` mechanism. The semantic-layer JSON (`color.semantic.json`) is removed; recipe tokens are now the only source of theme overrides. Consumer sites SHALL NOT redefine `--chimi-color-recipe-*` or `--recipe-*` variables locally to introduce theme-specific values.

#### Scenario: Adding a new theme override to an existing recipe

- **WHEN** a designer adds a `$extensions.chimi.theme.light` block to an existing recipe role (e.g., `canvas-quiet.warn`) and provides a light override
- **THEN** `npm run tokens:build` SHALL emit the new value in `:root[data-theme="light"]` block as `--chimi-color-recipe-canvas-quiet-warn` without any other file change

#### Scenario: Site-specific color need

- **WHEN** a consumer site needs a color that does not exist as a recipe role
- **THEN** the site SHALL define a derived role-token in its own `global.css` layer composed from existing `--recipe-*` short vars (e.g., via `color-mix()` against `--recipe-ink` or `--recipe-accent`), or use a documented `--chimi-primitives-color-*` escape hatch with an inline comment, rather than overriding a recipe variable directly

### Requirement: Theming documentation

The design system SHALL ship a `docs/theming.md` (or equivalent README section) that documents the `data-theme` contract, the list of recipes that flip per theme vs. those that stay constant, the rule against per-site `--recipe-*` overrides, and the inline-bootstrap-script pattern for FOUC prevention. After this change, the doc SHALL no longer mention the semantic layer (which is removed) and SHALL describe the recipe-rooted theme-override mechanism instead.

#### Scenario: Consumer site adopts the light theme

- **WHEN** a developer working on a consumer site reads `packages/design-system/docs/theming.md`
- **THEN** the document SHALL provide enough information to opt the site in (or out) of light mode without reading source code, including: how to set `data-theme`, how to embed the bootstrap script, and which recipes are theme-dependent (`canvas-quiet`, `canvas-signal`) vs. constant (`paper`, `paper`, `energy-loud`, `cool-fresh`, `critical`)
