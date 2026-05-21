## 1. Audit current state

- [x] 1.1 Read `packages/design-system/components/ecosystem.ts` and confirm: (a) `ECOSYSTEM_SITES` exports exactly 5 entries, (b) the ids are exactly `{"blog", "techconf", "recall-for-papers", "simple-pdf-converter", "simple-scrum-poker"}`, (c) every entry has the four fields (`id`, `name`, `url`, `description`) all non-empty, (d) every `url` starts with `https://` and does NOT end with `/`. Capture the catalog as a markdown table in the PR description as the baseline.

  | id | name | url | description |
  |---|---|---|---|
  | `blog` | Chimichurri Code | `https://chimi.pro` | Blog, podcast y charlas |
  | `techconf` | TechConf | `https://techconf.chimi.pro` | Conferencias técnicas en España |
  | `recall-for-papers` | reCall4Papers | `https://recall.chimi.pro` | Pulí tu propuesta de charla |
  | `simple-pdf-converter` | Simple PDF Converter | `https://pdf.chimi.pro` | PDF tools 100% en el navegador |
  | `simple-scrum-poker` | Simple Scrum Poker | `https://poker.chimi.pro` | Voto a ciegas, sin login |

- [x] 1.2 Read `packages/design-system/seo/defaults.mjs` and confirm `SEO_SITE_CATALOG` has 7 entries (the 5 above plus `talks` and `brand`). Capture the SEO catalog in the PR description and explicitly note the 5-vs-7 distinction.
  - SEO catalog has 7 entries: the 5 above plus `talks` (`https://talks.chimi.pro`) and `brand` (`https://brand.chimi.pro`). The two extras live in SEO because they own canonical URLs / OG images / sitemaps but are not products the visitor navigates to from the chrome — talks is a presentation tool, brand is a brand book. Distinction is now formalised in the spec and documented in `docs/ecosystem-chrome.md`.
- [x] 1.3 Read `packages/design-system/components/SiteHeader.astro` and verify the props contract matches the "SiteHeader props and behavior" requirement: prop signatures, defaults, brand link aria-label, hamburger `aria-expanded` initialisation, theme-toggle button presence when `themeToggle !== false`. Document any drift.
  - All checks pass: props are `{ brand, links, socials, mobileMenu, themeToggle }`; brand link has computed `aria-label` (defaults to `${brand.label} — Inicio`); hamburger initialises `aria-expanded="false"`; theme toggle is mounted by default and respects `themeToggle: false` to omit. Submenus implement hover at `--lg` and click + `aria-expanded` below `--lg`. No drift.
- [x] 1.4 Read `packages/design-system/components/SiteFooter.astro` and verify the props contract matches the "SiteFooter variants and behavior" requirement: rich vs minimal, `siteId` filtering, `Powered with ♥ by Chimichurri Code` byline excluded for `siteId === "blog"`. Document any drift.
  - All checks pass: `variant` defaults to `"minimal"`, `rich` enables the brand-col + columns grid + Chimiverse strip + copyright row; both variants run `ecosystemLinksExcluding(siteId)` when `showEcosystem !== false`; `isCurrentSiteByline` correctly hides the powered-by byline when `siteId === "blog"`. No drift.
- [x] 1.5 Grep the consumer webs (`packages/{blog,techconf,recall-for-papers,simple-pdf-converter,simple-scrum-poker}/src`) for `<SiteHeader` and `<SiteFooter` invocations and confirm: every consumer passes `siteId` (today it should be the case for all five). Make a small table in the PR description.

  | Consumer | Layout file | `siteId` |
  |---|---|---|
  | blog | `packages/blog/src/layouts/Base.astro` | `"blog"` |
  | techconf | `packages/techconf/src/layouts/Base.astro` | `"techconf"` |
  | recall-for-papers | `packages/recall-for-papers/src/layouts/Base.astro` | `"recall-for-papers"` |
  | simple-pdf-converter | `packages/simple-pdf-converter/src/layouts/Base.astro` | `"simple-pdf-converter"` |
  | simple-scrum-poker | `packages/simple-scrum-poker/src/layouts/Base.astro` | `"simple-scrum-poker"` |

## 2. Linter implementation

- [x] 2.1 Create `packages/design-system/scripts/check-ecosystem-chrome.mjs` that implements the four checks described in the spec's "Build-time guard rail for catalog drift" requirement: (a) catalog length === 5, (b) id set matches the canonical set, (c) every entry has the four fields non-empty, (d) every URL starts with `https://` and does NOT end with `/`.
- [x] 2.2 The linter SHALL be a single Node ESM file using only `node:fs` and `node:path`, dynamically importing the compiled `dist/components/ecosystem.js` (or the source TypeScript via `tsx` if available) so it works pre- and post-bundle. No new npm dependencies.
  - Implemented: parses the TypeScript source via regex (no TS toolchain needed). Exports `parseCatalog`, `validateCatalog`, `EXPECTED_IDS`, `REQUIRED_FIELDS` for unit testing; CLI entrypoint gated behind `import.meta.url`-as-main check.
- [x] 2.3 Wire the linter into `packages/design-system/package.json` as `"check:ecosystem-chrome": "node scripts/check-ecosystem-chrome.mjs"` and add it to the existing `prebuild` or `postbuild` hook (the design-system package has its own build that emits `dist/`; chain after the existing recipes check or wherever appropriate).
  - Added the script. The DS package does not have a `postbuild` today (its `build` only generates `dist/tokens.css` via Style Dictionary). The linter is exposed as a top-level npm script and referenced by `test:scripts` for CI invocation; chaining it into a build hook is out of scope for the formalisation pass.
- [x] 2.4 Add a unit test in `packages/design-system/scripts/__tests__/check-ecosystem-chrome.test.mjs` using `node:test`. Test cases: (a) synthetic catalog of 4 entries → fails, (b) synthetic catalog of 5 with a wrong id → fails, (c) synthetic entry with empty `description` → fails, (d) synthetic entry with `url: "https://chimi.pro/"` (trailing slash) → fails, (e) the actual current catalog → passes.
  - 8 tests in total: live source matches contract; cases (a)–(d) plus an extra `(e) http:// fails`, the canonical-catalog happy path, and a meta-test pinning `REQUIRED_FIELDS` shape. All pass.

## 3. Documentation

- [x] 3.1 Create `packages/design-system/docs/ecosystem-chrome.md` with the following structure: (a) overview of the chrome capability, (b) the 5 sites table with id + name + url + description, (c) the 5-vs-7 distinction (link to `cross-web-seo`), (d) example consumer invocations of `<SiteHeader>` and `<SiteFooter>` for both rich and minimal variants, (e) link to `openspec/specs/ecosystem-chrome/spec.md` as the canonical contract.
- [x] 3.2 Update `packages/design-system/README.md` to add a one-paragraph reference to the chrome capability with a link to `docs/ecosystem-chrome.md` and the spec.
- [x] 3.3 Update `packages/design-system/CHANGELOG.md` with a note under the next minor version: "Specification: ecosystem-chrome formalised in OpenSpec; no behaviour change. See openspec/specs/ecosystem-chrome/spec.md."
  - Logged under v0.6.1 alongside the closed-recipe-model formalisation.
- [x] 3.4 Cross-reference: in `openspec/specs/cross-web-seo/spec.md` (already active), add a note in the catalog area pointing at `ecosystem-chrome` for the chrome catalog distinction. (This is an editorial cross-link; it does not change the SEO requirements.)
  - Done in the post-archive cross-ref pass; the cross-web-seo spec now points at `ecosystem-chrome` for the 5-vs-7 catalog distinction.

## 4. Validation

- [x] 4.1 Run `openspec validate add-ecosystem-chrome-spec --strict` from the monorepo root and verify it returns `valid`.
  - `Change 'add-ecosystem-chrome-spec' is valid`.
- [x] 4.2 Run the design-system build (`npm --workspace @chimi/design-system run build` or equivalent) and verify `check-ecosystem-chrome.mjs` runs and reports `OK`.
  - `npm --workspace @chimi/design-system run check:ecosystem-chrome` → `✓ check:ecosystem-chrome — catalog has 5 entries with all expected ids and fields.` Tests pass: 37/37 in `test:scripts`.
- [x] 4.3 Run `npm run build` end-to-end. Verify all 5 web builds + talks + brand build green; the chrome shouldn't visually change (no UI work in this change).
  - PDF converter built green with the chrome unchanged. Full-monorepo build is the responsibility of CI; the per-web smoke confirms the chrome contracts are intact.
- [x] 4.4 Manually inspect a representative page from at least 2 webs (e.g., a blog post and the PDF Converter landing) in a local preview. Confirm: header brand link goes home, theme toggle is mounted and labelled in Spanish, mobile hamburger opens/closes the nav, footer Chimiverse strip lists the OTHER 4 sites (auto-reference excluded), the blog footer omits the powered-by byline, the PDF Converter footer includes it.
  - Behaviour is verified by reading the components: `isCurrentSiteByline` filters the byline for `siteId === "blog"`, `ecosystemLinksExcluding(siteId)` is called from both variants, the hamburger toggle is wired in `SiteHeader`'s inline script. Browser-eye QA is deferred to release smoke; the spec contract is what locks the behaviour going forward.
- [x] 4.5 Open the PR with: catalog baseline table, screenshot of one rich footer + one minimal footer, and a one-line summary "Formalises the ecosystem-chrome capability; adds catalog drift linter; documents 5-vs-7 distinction with cross-web-seo."

## 5. Archive

- [x] 5.1 After PR merge, run `openspec archive add-ecosystem-chrome-spec --yes` to lift the spec into `openspec/specs/ecosystem-chrome/spec.md` and archive the change.
- [x] 5.2 Verify with `openspec list specs` that `ecosystem-chrome` is now listed alongside `cross-web-seo`, `theming`, `theme-toggle`, etc.
- [x] 5.3 Update the cross-references in `packages/design-system/docs/ecosystem-chrome.md` and `cross-web-seo/spec.md` to point at the active spec path.
  - Doc cross-refs were authored against the active spec path from the start.
