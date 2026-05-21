#!/usr/bin/env node
/**
 * Site-id union drift detector.
 *
 * Enforces the contract codified by the `cross-web-seo` capability that
 * the `site` prop union of `<SEOHead>` and the JSDoc `SiteId` typedef in
 * `seo/render-head.mjs` are derived from `SEO_SITE_CATALOG` rather than
 * redeclared by hand. Also asserts that the runtime catalog
 * (`seo/defaults.mjs` JSDoc) and the TS companion (`seo/defaults.d.ts`)
 * agree on the same canonical id set.
 *
 * Why this matters: a hand-typed union silently goes stale when a new
 * site is added (the original instance of this drift was the
 * `simple-json-diff` and `simple-web-validator` ids missing from the
 * `<SEOHead>` prop union). The fix is to derive the type structurally
 * AND fail the build if any consumer ever re-introduces a hand-typed
 * union that doesn't match the catalog.
 *
 * Run: npm --workspace @chimi/design-system run check:site-id-union
 *
 * Exits 0 on clean, 1 on drift, 2 on infrastructure error.
 */

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SEO_SITE_CATALOG } from "../seo/defaults.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DS_ROOT = resolve(HERE, "..");

/**
 * Files that participate in the SiteId contract.
 *
 * Each entry's `mode` controls what the linter expects:
 *   - "must-declare-canonical": the file must contain a SiteId union
 *     literal that exactly matches the canonical id set
 *     (`defaults.mjs` JSDoc and `defaults.d.ts` are the source-side
 *     pair; they MUST declare the union explicitly).
 *   - "must-not-declare-union": the file must NOT contain any union
 *     literal that mentions ≥ 3 catalog ids — it must import `SiteId`
 *     from `seo/defaults` instead. Detects any regression that
 *     reintroduces a hand-typed union (the original bug).
 *
 * @type {Array<{ relPath: string; mode: "must-declare-canonical" | "must-not-declare-union" }>}
 */
export const SCOPED_FILES = [
  { relPath: "seo/defaults.mjs", mode: "must-declare-canonical" },
  { relPath: "seo/defaults.d.ts", mode: "must-declare-canonical" },
  { relPath: "components/SEOHead.astro", mode: "must-not-declare-union" },
  { relPath: "seo/render-head.mjs", mode: "must-not-declare-union" },
  { relPath: "seo/alternates.mjs", mode: "must-not-declare-union" },
  { relPath: "seo/json-ld.mjs", mode: "must-not-declare-union" },
  { relPath: "seo/sitemap.mjs", mode: "must-not-declare-union" },
  { relPath: "seo/robots.mjs", mode: "must-not-declare-union" },
  { relPath: "seo/manifest.mjs", mode: "must-not-declare-union" },
  { relPath: "seo/lint.mjs", mode: "must-not-declare-union" },
  { relPath: "seo/index.mjs", mode: "must-not-declare-union" },
];

/** Canonical id set, sorted for deterministic comparisons / messages. */
export function canonicalIds() {
  return Object.keys(SEO_SITE_CATALOG).slice().sort();
}

/**
 * Find every union-literal of catalog ids in a source text and return
 * the sorted id sets discovered. A "union literal" is a sequence of
 * `"id1"|"id2"|…` (with optional whitespace), TypeScript or JSDoc-style.
 *
 * Only sequences mentioning at least 3 catalog ids are returned — this
 * cuts noise from unrelated `"a" | "b"` unions that happen to share an
 * id with a site (rare in practice, but defensive).
 *
 * @param {string} text
 * @param {ReadonlyArray<string>} catalog  - Canonical id set, sorted.
 * @returns {Array<{ ids: string[]; index: number; line: number }>}
 */
export function findUnionLiterals(text, catalog) {
  const catalogSet = new Set(catalog);
  // Match a run of `"id"` separated by `|`, allowing whitespace and
  // optional opening `(` for parenthesised unions. Greedy match captures
  // every consecutive `"…"` term.
  const re = /(?:"[a-z][a-z0-9-]*"\s*\|\s*){2,}"[a-z][a-z0-9-]*"/g;
  const found = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    const literal = match[0];
    const ids = [...literal.matchAll(/"([a-z][a-z0-9-]*)"/g)].map((m) => m[1]);
    // Filter out unions that don't look like site-id sets — they must
    // overlap meaningfully with the canonical catalog (≥ 3 hits).
    const hits = ids.filter((id) => catalogSet.has(id));
    if (hits.length < 3) continue;
    found.push({
      ids: ids.slice().sort(),
      index: match.index,
      line: lineOf(text, match.index),
    });
  }
  return found;
}

/** @param {string} text @param {number} index */
function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === "\n") line++;
  }
  return line;
}

/**
 * Validate one source file against its declared mode. Returns an array
 * of human-readable error messages (empty = clean).
 *
 * @param {{ relPath: string; mode: "must-declare-canonical" | "must-not-declare-union" }} entry
 * @param {string} text
 * @param {ReadonlyArray<string>} canonical
 * @returns {string[]}
 */
export function validateFile(entry, text, canonical) {
  const errors = [];
  const literals = findUnionLiterals(text, canonical);
  const canonicalKey = canonical.join(",");

  if (entry.mode === "must-declare-canonical") {
    if (literals.length === 0) {
      errors.push(
        `${entry.relPath}: expected a SiteId union literal listing the ${canonical.length} canonical ids; found none.`,
      );
      return errors;
    }
    for (const lit of literals) {
      if (lit.ids.join(",") !== canonicalKey) {
        const missing = canonical.filter((id) => !lit.ids.includes(id));
        const extra = lit.ids.filter((id) => !canonical.includes(id));
        errors.push(
          `${entry.relPath}:${lit.line}: SiteId union does not match SEO_SITE_CATALOG.\n` +
            `    canonical: [${canonical.join(", ")}]\n` +
            `    found:     [${lit.ids.join(", ")}]\n` +
            (missing.length ? `    missing:   [${missing.join(", ")}]\n` : "") +
            (extra.length ? `    extra:     [${extra.join(", ")}]\n` : "") +
            `    → update the union in this file to match SEO_SITE_CATALOG.`,
        );
      }
    }
  } else if (entry.mode === "must-not-declare-union") {
    for (const lit of literals) {
      errors.push(
        `${entry.relPath}:${lit.line}: hand-typed SiteId union detected (${lit.ids.length} ids).\n` +
          `    Replace with: import type { SiteId } from "../seo/defaults"\n` +
          `    (or @typedef {import("./defaults").SiteId} SiteId in JSDoc).\n` +
          `    Source of truth: packages/design-system/seo/defaults.{mjs,d.ts}`,
      );
    }
  }

  return errors;
}

const isMain = (() => {
  try {
    return import.meta.url === new URL(`file://${process.argv[1]}`).href;
  } catch {
    return false;
  }
})();

if (isMain) {
  await main();
}

async function main() {
  const canonical = canonicalIds();
  const allErrors = [];

  for (const entry of SCOPED_FILES) {
    const abs = resolve(DS_ROOT, entry.relPath);
    let text;
    try {
      text = await readFile(abs, "utf8");
    } catch (err) {
      console.error(`✗ check:site-id-union — could not read ${entry.relPath}: ${err.message}`);
      process.exit(2);
    }
    allErrors.push(...validateFile(entry, text, canonical));
  }

  if (allErrors.length === 0) {
    console.log(
      `✓ check:site-id-union — ${canonical.length} canonical ids, ${SCOPED_FILES.length} files scanned, clean.`,
    );
    return;
  }
  for (const e of allErrors) console.error(`✗ ${e}`);
  console.error(`\nSummary: ${allErrors.length} site-id drift error(s).`);
  process.exit(1);
}
