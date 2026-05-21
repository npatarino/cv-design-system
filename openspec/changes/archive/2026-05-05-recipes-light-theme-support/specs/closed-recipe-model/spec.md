## MODIFIED Requirements

### Requirement: Layouts and components consume `--recipe-*`, not `--chimi-color-*`

Layouts and components in the application packages (`@chimi/blog`, `@chimi/techconf`, `@chimi/recall-for-papers`, `@chimi/simple-pdf-converter`, `@chimi/simple-scrum-poker`, `@chimi/talks`) SHALL consume color values via `var(--recipe-{surface,ink,em,accent,warn})` and the `web.css` derived utilities (`--hairline`, `--muted`, `.btn`, `.btn.primary`, `.tag.*`).

Direct consumption of `var(--chimi-color-*)` SHALL NOT appear in application code. The only legal `--chimi-color-*` namespaces remaining after the semantic-layer drop are:

- `--chimi-color-recipe-<id>-<role>` — the long-form aliases of the `--recipe-*` short vars; consumed by `web.css` only, never by component CSS.
- `--chimi-primitives-color-*` — the documented escape hatch for artefacts with a fixed local palette unrelated to the active recipe (e.g., duotone logos, brand marks with hardcoded brand colors). Each occurrence SHALL be documented with an inline comment such as `/* primitive escape hatch — duotone avatar */`.

The previously documented `EventRow.astro` light-theme exception is now closed: the file consumes `--recipe-*` like every other component, and the linter no longer carves out a warning class for it.

#### Scenario: A layout consumes color through the recipe

- **WHEN** a CSS rule in any application package needs an accent color
- **THEN** it SHALL declare `color: var(--recipe-accent);` (or the equivalent role from `--recipe-{surface,ink,em,warn}`)

#### Scenario: A layout consumes color through the (deleted) semantic layer

- **WHEN** a CSS rule in an application package declares `color: var(--chimi-color-accent-primary);` (or any other `--chimi-color-{text,surface,accent,emphasis,marker}-*` variable)
- **THEN** the variable resolves to nothing (the semantic JSON layer was deleted in the `recipes-light-theme-support` change), the build linter `check-recipes.mjs` reports the occurrence as an **error** (no warning carve-out), and the build SHALL fail until the rule is migrated to `--recipe-*` or replaced with a documented primitive escape hatch

#### Scenario: A logo uses a primitive escape hatch

- **WHEN** a duotone logo component needs to render in a fixed plasma + ivory palette regardless of the carrying recipe
- **THEN** it MAY declare `fill: var(--chimi-primitives-color-plasma-base);` directly, accompanied by an inline comment such as `/* primitive escape hatch — duotone logo */`
- **AND** the linter SHALL ignore this consumption (only `--chimi-color-*` is reported, never `--chimi-primitives-color-*`)

### Requirement: Linter as the recipe-model guard rail

The script `packages/design-system/scripts/check-recipes.mjs` SHALL be the official build-time guard rail enforcing the recipe-model contract. It SHALL:

- Scan `packages/{blog,techconf,recall-for-papers,simple-pdf-converter,simple-scrum-poker}/src` and `packages/talks/` for direct consumption of `var(--chimi-color-{text,surface,accent,emphasis,marker}-*)`. The `--chimi-color-recipe-*` prefix is NOT scanned (it's the long-form alias of `--recipe-*` and is the system's own internal plumbing).
- Report each occurrence as an **error** — the warning class previously reserved for the documented `EventRow.astro` light-theme block is removed because that file is now migrated.
- Run as part of every package build (via `postbuild` or `prebuild` hooks of each web).
- Maintain its current behaviour of NOT scanning `--chimi-primitives-color-*` (those are legitimate escape hatches per Requirement "Layouts and components consume --recipe-*, not --chimi-color-*").

#### Scenario: A web build runs

- **WHEN** `npm run build:<web>` is executed
- **THEN** `check-recipes.mjs` runs as part of the build
- **AND** the build SHALL fail if any `var(--chimi-color-{text,surface,accent,emphasis,marker}-*)` is detected (no exceptions; the EventRow carve-out is gone)

#### Scenario: A new web is added to the monorepo

- **WHEN** a new `packages/<new-web>/` Astro workspace is created
- **THEN** the workspace's build pipeline SHALL invoke `check-recipes.mjs --web <new-web>` (or the equivalent flag) so the new web is covered by the linter from day one
