import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
/**
 * @file Unit tests for the site-id union drift detector.
 *
 * The contract under test (`cross-web-seo`):
 *   - `seo/defaults.mjs` JSDoc + `seo/defaults.d.ts` MUST declare a
 *     SiteId union that exactly equals `Object.keys(SEO_SITE_CATALOG)`.
 *   - Other files in the design-system that mention sites
 *     (`SEOHead.astro`, `seo/render-head.mjs`, etc.) MUST import the
 *     SiteId type rather than redeclare it as a hand-typed literal
 *     union — that's the original drift that left simple-json-diff and
 *     simple-web-validator off the SEOHead prop type.
 *
 * Cases pinned here:
 *   1. Clean source on disk → linter is green.
 *   2. Synthetic fixtures: missing id, hand-typed regression in a
 *      "must-not-declare-union" file, and a "must-declare-canonical"
 *      file with a stale union.
 *   3. The detector skips unrelated unions (≥ 3-id catalog overlap rule).
 */



import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SCOPED_FILES,
  canonicalIds,
  findUnionLiterals,
  validateFile,
} from "../check-site-id-union.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DS_ROOT = resolve(HERE, "../..");

it("canonical id set has at least 9 entries", () => {
  const ids = canonicalIds();
  expect(ids.length >= 9, `expected ≥ 9 ids, got ${ids.length}`).toBeTruthy();
  // sanity: known ids from the SEO_SITE_CATALOG history
  expect(ids.includes("blog").toBeTruthy());
  expect(ids.includes("simple-json-diff").toBeTruthy());
  expect(ids.includes("simple-web-validator").toBeTruthy());
  expect(ids.includes("talks").toBeTruthy());
});

it("live design-system source is clean against the linter", async () => {
  const canonical = canonicalIds();
  const errors = [];
  for (const entry of SCOPED_FILES) {
    const text = await readFile(resolve(DS_ROOT, entry.relPath), "utf8");
    errors.push(...validateFile(entry, text, canonical));
  }
  expect(errors).toEqual([], `expected zero errors; got:\n${errors.join("\n")}`);
});

it("findUnionLiterals picks up a TS union", () => {
  const canonical = canonicalIds();
  const text = `type X = "blog" | "techconf" | "talks" | "brand";`;
  const found = findUnionLiterals(text, canonical);
  expect(found.length).toEqual(1);
  expect(found[0].ids).toEqual(["blog", "brand", "talks", "techconf"]);
});

it("findUnionLiterals picks up a JSDoc typedef union", () => {
  const canonical = canonicalIds();
  const text = `/** @typedef {"blog"|"techconf"|"talks"|"brand"} X */`;
  const found = findUnionLiterals(text, canonical);
  expect(found.length).toEqual(1);
});

it("findUnionLiterals ignores unions without ≥ 3 catalog ids", () => {
  const canonical = canonicalIds();
  // "foo" | "bar" | "blog" — only 1 catalog hit, ignored
  const text = `type X = "foo" | "bar" | "blog";`;
  const found = findUnionLiterals(text, canonical);
  expect(found.length).toEqual(0);
});

it('validateFile flags hand-typed union in a "must-not-declare-union" file', () => {
  const canonical = canonicalIds();
  const entry = { relPath: "components/SEOHead.astro", mode: "must-not-declare-union" };
  const text = `interface Props { site: "blog" | "techconf" | "talks" | "brand"; }`;
  const errors = validateFile(entry, text, canonical);
  expect(errors.length).toEqual(1);
  expect(errors[0]).toMatch(/hand-typed SiteId union detected/);
  expect(errors[0]).toMatch(/import type \{ SiteId \}/);
});

it('validateFile passes a "must-not-declare-union" file with no union', () => {
  const canonical = canonicalIds();
  const entry = { relPath: "components/SEOHead.astro", mode: "must-not-declare-union" };
  const text = `import type { SiteId } from "../seo/defaults";\ninterface Props { site: SiteId; }`;
  const errors = validateFile(entry, text, canonical);
  expect(errors).toEqual([]);
});

it('validateFile flags missing id in a "must-declare-canonical" file', () => {
  const canonical = canonicalIds();
  const entry = { relPath: "seo/defaults.d.ts", mode: "must-declare-canonical" };
  // Drop one canonical id from the union to simulate stale .d.ts
  const stale = canonical.filter((id) => id !== "simple-json-diff");
  const text = `export type SiteId = ${stale.map((id) => `"${id}"`).join(" | ")};`;
  const errors = validateFile(entry, text, canonical);
  expect(errors.length).toEqual(1);
  expect(errors[0]).toMatch(/SiteId union does not match SEO_SITE_CATALOG/);
  expect(errors[0]).toMatch(/missing:\s+\[simple-json-diff\]/);
});

it('validateFile flags an extra id in a "must-declare-canonical" file', () => {
  const canonical = canonicalIds();
  const entry = { relPath: "seo/defaults.d.ts", mode: "must-declare-canonical" };
  const bogus = [...canonical, "phantom-tool"];
  const text = `export type SiteId = ${bogus.map((id) => `"${id}"`).join(" | ")};`;
  const errors = validateFile(entry, text, canonical);
  expect(errors.length).toEqual(1);
  expect(errors[0]).toMatch(/extra:\s+\[phantom-tool\]/);
});

it('validateFile flags absence of any union in a "must-declare-canonical" file', () => {
  const canonical = canonicalIds();
  const entry = { relPath: "seo/defaults.d.ts", mode: "must-declare-canonical" };
  const text = `export type SiteId = string;`;
  const errors = validateFile(entry, text, canonical);
  expect(errors.length).toEqual(1);
  expect(errors[0]).toMatch(/expected a SiteId union literal/);
});
