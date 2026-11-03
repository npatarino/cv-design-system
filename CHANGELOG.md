# Changelog

All notable changes to `@chimichurricode/design-system` are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project follows [Semantic Versioning](https://semver.org/) (`0.x`).

## [Unreleased]

## [0.8.2]

### Changed

- The optional `astro` peer range is `^5.0.0 || ^6.0.0 || ^7.0.0`. The Astro
  components (`SiteHeader`, `SiteFooter`, `SEOHead`, `ThemeBootstrap`,
  `ThemeIcons`, `SocialIcons` and the `Brand*` logos) compile unchanged with
  Astro 7's Rust compiler and render the same HTML as on Astro 5 (checked
  through `@chimichurricode/web-app-kit` 0.2.0's `BaseLayout`).

## [0.8.1]

### Fixed

- `SiteFooter` bundles the ecosystem logos from `assets/logos` instead of
  requesting `/logos/simple-scrum-poker/favicon{,-dark}.svg` from each
  consumer's `public/` (404 on every site that didn't copy them).
- `check-seo` and `seo-prebuild` work from a consumer's `node_modules`:
  `check-seo --site <id> [--dir dist] [--sitemap file]`, and the site list
  comes from the SEO catalog.
- `check-ecosystem-chrome` derives the site list from the registry.
- Site registry theme/background/mask colors are token colors, and
  `check:registry` enforces it. TechConf's canonical domain is `techconf.es`.
- Stale `@chimi/design-system` and monorepo paths in docs, comments, the
  generated CSS banner and script hints.
- Icon generators (`generate:icons`, `generate:icon-preview`) run and are
  deterministic.

### Added

- `check-seo`, `seo-prebuild`, `sync-dir`, `copy-asset` and `seo/lint.mjs`
  are shipped in the package.
- `node-html-parser` dependency (used by `check-seo`).
- `bun run check` and the `check:*` scripts.
- WCAG contrast table in `docs/recipes.md`.

### Removed

- Scripts that only worked in the old monorepo (`check-recipes`,
  `check-docs-linter-coherence`, `check-workspace-conventions`,
  `process-icons`, `generate-og`).

## [0.8.0] - 2026-10-27

Consumer fixes, `docs/anti-patterns.md` and `check-slop`. Earlier versions
were not tracked in a changelog.

[Unreleased]: https://github.com/npatarino/cv-design-system/compare/v0.8.1...HEAD
[0.8.1]: https://github.com/npatarino/cv-design-system/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/npatarino/cv-design-system/releases/tag/v0.8.0
