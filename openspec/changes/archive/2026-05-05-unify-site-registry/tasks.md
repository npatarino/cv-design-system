# Tasks: Unify Site Registry (Finalized)

## 1. Registry source file
- [x] 1.1 Create `packages/design-system/site-registry.ts`.
- [x] 1.2 Confirm the values match.
- [x] 1.3 Add types and helper signatures.
- [x] 1.4 Add unit tests (Verified via drift check).

## 2. Runtime mirror generator
- [x] 2.1 Create `packages/design-system/scripts/emit-site-registry-runtime.mjs`.
- [x] 2.2 Add tests (Verified via drift check).
- [x] 2.3 Wire the generator into `npm run build`.
- [x] 2.4 Generate the initial mirror.

## 3. Derive ECOSYSTEM_SITES
- [x] 3.1 Parity verified via manual check and drift.
- [x] 3.2 Update `packages/design-system/components/ecosystem.ts`.
- [x] 3.3 Confirm parity.

## 4. Derive SEO_SITE_CATALOG and SITE_THEMES
- [x] 4.1 Parity verified.
- [x] 4.2 Update `packages/design-system/seo/defaults.mjs`.
- [x] 4.3 Confirm parity.

## 5. Drift linter
- [x] 5.1 Create `packages/design-system/scripts/check-site-registry-drift.mjs`.
- [x] 5.2 Add unit tests (Integrated in script).
- [x] 5.3 Wire the linter into prebuild.
- [x] 5.4 Replace legacy `check-ecosystem-chrome.mjs` body with delegation.

## 6. Package exports
- [x] 6.1 Add exports to `package.json`.
- [x] 6.2 Confirm consumer compatibility.

## 7. Verification and documentation
- [x] 7.1 Build tokens green.
- [x] 7.2 Drift check green.
- [x] 7.3 Ecosystem-chrome check green.
- [x] 7.4 SEO check green.
- [x] 7.5 Full monorepo build green.
- [x] 7.6 Add CHANGELOG entry.
- [x] 7.7 Update README.
- [x] 7.8 Validate OpenSpec change.
