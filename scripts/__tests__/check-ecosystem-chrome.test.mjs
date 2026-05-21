import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
/**
 * @file Unit tests for the ecosystem-chrome catalog drift detector.
 *
 * The `ecosystem-chrome` capability codifies that `ECOSYSTEM_SITES` is a
 * closed catalog of exactly seven entries with a stable shape (extended
 * from six when `simple-web-validator` joined the chrome — see
 * `add-simple-web-validator` archive 2026-05-05). These tests pin both
 * halves of the linter:
 *
 *   1. `parseCatalog(text)` extracts the array literal from the live
 *      TypeScript source — used here to assert the current source on
 *      disk matches the canonical seven ids.
 *   2. `validateCatalog(entries)` enforces the four contract checks
 *      against synthetic fixtures: count, ids, required fields, URL
 *      shape.
 */



import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  EXPECTED_IDS,
  REQUIRED_FIELDS,
  parseCatalog,
  validateCatalog,
} from "../check-ecosystem-chrome.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(HERE, "../../components/ecosystem.ts");

function makeEntry(overrides = {}) {
  return {
    id: "blog",
    name: "Chimichurri Code",
    url: "https://chimi.pro",
    description: "Blog, podcast y charlas",
    ...overrides,
  };
}

function makeCanonicalCatalog() {
  return [
    makeEntry({ id: "blog", name: "Chimichurri Code", url: "https://chimi.pro" }),
    makeEntry({ id: "techconf", name: "TechConf", url: "https://techconf.chimi.pro" }),
    makeEntry({
      id: "recall-for-papers",
      name: "reCall4Papers",
      url: "https://recall.chimi.pro",
    }),
    makeEntry({
      id: "simple-pdf-converter",
      name: "Simple PDF Converter",
      url: "https://pdf.chimi.pro",
    }),
    makeEntry({
      id: "simple-scrum-poker",
      name: "Simple Scrum Poker",
      url: "https://poker.chimi.pro",
    }),
    makeEntry({
      id: "simple-json-diff",
      name: "Simple JSON Diff",
      url: "https://simple-json-diff.chimi.pro",
    }),
    makeEntry({
      id: "simple-web-validator",
      name: "Simple Web Validator",
      url: "https://simple-web-validator.chimi.pro",
    }),
  ];
}

it("the live ecosystem.ts source matches the canonical seven-entry contract", async () => {
  const text = await readFile(SOURCE, "utf8");
  const entries = parseCatalog(text);
  const errors = validateCatalog(entries);
  expect(entries.length).toEqual(7, "live catalog must have 7 entries");
  expect(errors).toEqual([], `live catalog must be drift-free; got: ${errors.join("; ")}`);
  const liveIds = entries.map((e) => e.id).sort();
  const expectedIds = [...EXPECTED_IDS].sort();
  expect(liveIds).toEqual(expectedIds);
});

it("(a) catalog of 6 entries fails the count check", () => {
  const six = makeCanonicalCatalog().slice(0, 6);
  const errors = validateCatalog(six);
  assert.ok(
    errors.some((e) => e.includes("expected exactly 7")),
    `expected a count error; got: ${errors.join("; ")}`,
  );
});

it("(b) catalog of 7 with a wrong id fails the id-set check", () => {
  const drifted = makeCanonicalCatalog();
  drifted[0] = makeEntry({ id: "not-a-real-site", url: "https://wrong.chimi.pro" });
  const errors = validateCatalog(drifted);
  assert.ok(
    errors.some((e) => e.includes('unexpected id "not-a-real-site"')),
    `expected an unexpected-id error; got: ${errors.join("; ")}`,
  );
  assert.ok(
    errors.some((e) => e.includes('missing expected id "blog"')),
    `expected a missing-id error; got: ${errors.join("; ")}`,
  );
});

it("(c) entry with empty description fails the required-field check", () => {
  const drifted = makeCanonicalCatalog();
  drifted[2] = makeEntry({
    id: "recall-for-papers",
    name: "reCall4Papers",
    url: "https://recall.chimi.pro",
    description: "",
  });
  const errors = validateCatalog(drifted);
  assert.ok(
    errors.some((e) => e.includes('"recall-for-papers"') && e.includes('"description"')),
    `expected a required-field error for description; got: ${errors.join("; ")}`,
  );
});

it('(d) entry with trailing slash on url fails the URL-shape check', () => {
  const drifted = makeCanonicalCatalog();
  drifted[0] = makeEntry({ id: "blog", url: "https://chimi.pro/" });
  const errors = validateCatalog(drifted);
  assert.ok(
    errors.some((e) => e.includes("trailing slash")),
    `expected a trailing-slash error; got: ${errors.join("; ")}`,
  );
});

it("(e) entry with http:// (not https://) fails the URL-scheme check", () => {
  const drifted = makeCanonicalCatalog();
  drifted[0] = makeEntry({ id: "blog", url: "http://chimi.pro" });
  const errors = validateCatalog(drifted);
  assert.ok(
    errors.some((e) => e.includes('start with "https://"')),
    `expected an https-only error; got: ${errors.join("; ")}`,
  );
});

it("(f) the canonical catalog passes all validations", () => {
  const errors = validateCatalog(makeCanonicalCatalog());
  expect(errors).toEqual([]);
});

it("REQUIRED_FIELDS is the four-tuple defined by the spec", () => {
  expect([...REQUIRED_FIELDS]).toEqual(["id", "name", "url", "description"]);
});
