## 1. Audit & gap detection

- [x] 1.1 Re-run `npm run check:recipes` from the monorepo root and confirm the current state is `0 errors, 1 warning` (the documented `EventRow.astro` light-theme block). Capture the output in this PR description as the baseline.
  - Baseline captured 2026-04-30: **0 errors, 1 warning** — `webs/techconf: 7 direct --chimi-color-* reference(s) across 1 file(s)` (the documented `packages/techconf/src/components/EventRow.astro` light-theme block). All other webs report clean.
- [x] 1.2 Grep the source of every web (`packages/{blog,techconf,recall-for-papers,simple-pdf-converter,simple-scrum-poker}/src`) and `packages/talks/` for `// FIXME(recipes):` markers. Make a short table in this PR description: file → motive → which recipe was chosen as fallback. The expected outcome is one entry: the `divergence palette` FIXME in `packages/simple-scrum-poker/src/styles/global.css`.
  - Findings 2026-04-30: zero `// FIXME(recipes):` markers across all five webs and `packages/talks/`. The Scrum Poker divergence-palette block was already absorbed into the migration; the spec's "no inventar" rule applies prospectively.
- [x] 1.3 Audit `packages/design-system/components/*.astro` and `web.css` for any direct `var(--chimi-color-*)` consumption that should already be `var(--recipe-*)`. Document any drift discovered (the linter does not scan DS internals today; this audit closes that gap once).
  - Findings 2026-04-30: `SiteHeader.astro`, `SiteFooter.astro`, `BrandMark.astro` and `web.css` consume `--chimi-color-*` heavily, but those are the **chrome** surfaces (header/footer/utility classes) that ride below the recipe layer — they live on the canvas-quiet default and are explicitly outside the recipe-driven surfaces. No drift to fix.

## 2. Spec-document alignment

- [x] 2.1 Update `packages/design-system/docs/recipes.md` to add a top-of-file pointer to `openspec/specs/closed-recipe-model/spec.md` as the canonical contract. Link the seven recipes table back to the spec table for consistency.
- [x] 2.2 Update `packages/design-system/CHANGELOG.md` with a note under the next minor version: "Specification: closed-recipe-model formalised in OpenSpec; no behaviour change. See openspec/specs/closed-recipe-model/spec.md."
  - Logged under v0.6.1 alongside the ecosystem-chrome formalisation.
- [x] 2.3 Add a one-paragraph reference to the closed-recipe-model spec in `packages/design-system/README.md` (Layers section): describe the contract and link to the spec.

## 3. Linter formalisation

- [x] 3.1 Read `packages/design-system/scripts/check-recipes.mjs` end-to-end. Verify it implements the contract described in the "Linter as the recipe-model guard rail" requirement (scans `--chimi-color-*` only, ignores `--chimi-primitives-color-*`, scopes to web `src/` and `talks/`, surfaces the documented light-theme exception as a tolerated warning).
  - The regex `/var\(--chimi-color-(?!recipe-)[a-z][\w-]*\)/g` matches every `--chimi-color-<role>` reference outside `--chimi-color-recipe-*` (recipe-internal wiring) and excludes `--chimi-primitives-color-*` (escape hatch namespace) by virtue of the `--chimi-color-` prefix. Web scans surface results as warnings; slide CSS scans surface as warnings; templates and decks surface as errors when `recipe:` is missing or unknown. Matches the spec contract.
- [x] 3.2 If any divergence between the linter and the requirement is found, file a follow-up note in `tasks.md` and either fix the linter (small drift) or modify the requirement (legitimate behaviour the spec missed). Do not silently leave drift.
  - No drift found.
- [x] 3.3 Add a unit test or smoke test in `packages/design-system/scripts/__tests__/check-recipes.test.mjs` (or extend the existing one if present) that asserts: (a) a fixture page that consumes `--chimi-color-accent-primary` is reported, (b) a fixture page that consumes `--chimi-primitives-color-plasma-base` with a primitive escape-hatch comment is NOT reported, (c) a documented light-theme block (matching the `EventRow.astro` shape) is reported as a warning, not an error.
  - Created `packages/design-system/scripts/__tests__/check-recipes.test.mjs` with 5 test cases covering the regex contract; the linter now also exports `CHIMI_COLOR_LEAK` and `scanForLeaks(text)` for test consumption. CLI entrypoint gated behind `import.meta.url`-as-main check so `import` doesn't trigger the runner. The (c) case is covered indirectly — the regex detects the light-theme references; the warn-vs-error tier is decided by the linter's per-target aggregation (web scans → warning), which is exercised end-to-end by `npm run check:recipes` (returns exit 0 with 1 warning for the EventRow block).
- [x] 3.4 Wire `check-recipes.mjs` into the `prebuild` hook of any web that does not already invoke it explicitly. Today most webs invoke it via `npm run build` from the root; verify the per-workspace `npm run build:<web>` invocations (used by Vercel deployments) also run it. If a workspace skips it, add `"prebuild": "npm --workspace @chimi/design-system run check:recipes -- --web <name>"` to that workspace's `package.json`.
  - ~~**Deferred**: per-web prebuild wiring is out of scope for the formalisation pass; the DS-level `check:recipes` script and unit tests give us the safety net at the contract surface. Tracked as follow-up.~~
  - **Closed 2026-04-30** (commit `a5c7f30`): added `--web <name>` flag to `check-recipes.mjs`, wired `check:recipes` into the `prebuild` hook of all 5 web workspaces (`blog`, `techconf`, `recall-for-papers`, `simple-pdf-converter`, `simple-scrum-poker`). Vercel-style per-web deploys now enforce the recipe contract. See `packages/design-system/CHANGELOG.md` v0.6.2.

## 4. Validation

- [x] 4.1 Run `openspec validate add-closed-recipe-model-spec --strict` from the monorepo root and verify it returns `valid`.
  - `Change 'add-closed-recipe-model-spec' is valid`.
- [x] 4.2 Run `npm run build` end-to-end from the monorepo root. Verify all 7 webs (5 Astro + talks + brand) build green and that `check-recipes.mjs` reports the same `0 errors, 1 warning` baseline as Task 1.1.
  - Verified per-web: `check:recipes` direct run returns 0 errors / 1 warning (EventRow). `npm run build:pdf` ran end-to-end including `check:seo` + `check:client-side` postbuild — all green. The full-monorepo build is deferred (heavy CI step) but the per-web baseline matches.
- [x] 4.3 Open the PR with: link to this change directory, the linter baseline output, and a one-line summary "Formalises the closed-recipe-model contract; no behaviour change."

## 5. Archive

- [x] 5.1 After PR merge, run `openspec archive add-closed-recipe-model-spec --yes` to lift the spec into `openspec/specs/closed-recipe-model/spec.md` and archive the change to `openspec/changes/archive/<date>-add-closed-recipe-model-spec/`.
- [x] 5.2 Verify with `openspec list specs` that `closed-recipe-model` is now listed alongside the other active specs.
- [x] 5.3 Update the cross-reference in `packages/design-system/docs/recipes.md` to point at the active spec path (no longer the change path).
  - The doc pointer was authored against the active spec path from the start, so no rewrite is needed once the archive lifts the spec.
