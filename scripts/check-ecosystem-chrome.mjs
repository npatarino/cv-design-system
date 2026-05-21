#!/usr/bin/env node
/**
 * Catalog drift detector for `ECOSYSTEM_SITES` in
 * packages/design-system/components/ecosystem.ts.
 *
 * Enforces the contract codified by the `ecosystem-chrome` capability:
 *  - Exactly 7 entries.
 *  - id set === { blog, techconf, recall-for-papers,
 *                  simple-pdf-converter, simple-scrum-poker,
 *                  simple-json-diff, simple-web-validator }.
 *  - Every entry has the four fields { id, name, url, description },
 *    all non-empty.
 *  - Every url starts with `https://` and does NOT end with `/`.
 *
 * The entries are parsed from the TypeScript source via regex so the
 * check works pre-build without a TS toolchain. Drift in cosmetic
 * formatting (e.g. moving from object literals to a different shape)
 * is surfaced too, because the parser will fail to find entries — and
 * that is the desired behaviour: any catalog change must be paired with
 * a spec update plus a re-run of this linter.
 *
 * Run: npm --workspace @chimi/design-system run check:ecosystem-chrome
 *
 * Exits 0 on clean, 1 on drift.
 */

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(HERE, "../components/ecosystem.ts");

export const EXPECTED_IDS = Object.freeze([
  "blog",
  "techconf",
  "recall-for-papers",
  "simple-pdf-converter",
  "simple-scrum-poker",
  "simple-json-diff",
  "simple-web-validator",
  "simple-radar-skills",
]);

export const REQUIRED_FIELDS = Object.freeze(["id", "name", "url", "description"]);

/**
 * Parse the `ECOSYSTEM_SITES` literal out of a raw `ecosystem.ts` source.
 * Returns an array of plain objects with the four required fields.
 *
 * @param {string} text
 * @returns {Array<{id?: string; name?: string; url?: string; description?: string}>}
 */
export function parseCatalog(text) {
  const start = text.indexOf("export const ECOSYSTEM_SITES");
  if (start === -1) {
    throw new Error("Could not locate `ECOSYSTEM_SITES` export in source.");
  }
  // Skip past the `=` sign before scanning for the array literal — the
  // type annotation `EcosystemSite[]` contains a literal `[]` that would
  // otherwise be matched first and the parser would walk into the wrong
  // brackets.
  const eq = text.indexOf("=", start);
  if (eq === -1) throw new Error("Could not locate `=` after ECOSYSTEM_SITES export.");
  const arrayStart = text.indexOf("[", eq);
  if (arrayStart === -1) throw new Error("Catalog array literal not found.");
  // Walk the brackets so we don't get fooled by `[]` inside string values.
  let bracketDepth = 0;
  let arrayEnd = -1;
  for (let i = arrayStart; i < text.length; i++) {
    const ch = text[i];
    if (ch === "[") bracketDepth++;
    else if (ch === "]") {
      bracketDepth--;
      if (bracketDepth === 0) {
        arrayEnd = i;
        break;
      }
    }
  }
  if (arrayEnd === -1) throw new Error("Catalog array literal end not found.");
  const body = text.slice(arrayStart + 1, arrayEnd);

  const entries = [];
  // Walk the array body brace-by-brace, picking only TOP-LEVEL objects
  // (depth 1 inside the array). Nested objects (e.g. `logoSrc: { … }`
  // added by the 2026-05-01 SSP branding migration) bump depth to 2 and
  // are skipped — their content becomes part of the parent entry's
  // inner text, so the field regex below still finds id/name/url/etc.
  let braceDepth = 0;
  let entryStart = -1;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "{") {
      if (braceDepth === 0) entryStart = i + 1;
      braceDepth++;
    } else if (ch === "}") {
      braceDepth--;
      if (braceDepth === 0 && entryStart >= 0) {
        const inner = body.slice(entryStart, i);
        const obj = {};
        for (const field of REQUIRED_FIELDS) {
          // Match only top-level fields — `key: "value"` where the
          // brace-depth at the match position is 0 within the inner
          // text. Since nested objects are also bracketed, we do a
          // depth-aware scan rather than a naive regex.
          const value = matchTopLevelField(inner, field);
          if (value !== null) obj[field] = value;
        }
        entries.push(obj);
        entryStart = -1;
      }
    }
  }
  return entries;
}

/**
 * Find a top-level `<field>: "<value>"` inside an object body, ignoring
 * matches inside nested objects.
 *
 * @param {string} inner
 * @param {string} field
 * @returns {string|null}
 */
function matchTopLevelField(inner, field) {
  let braceDepth = 0;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === "{") braceDepth++;
    else if (ch === "}") braceDepth--;
    else if (braceDepth === 0 && inner.startsWith(field, i)) {
      // Check that what follows is `: "..."` (with optional whitespace)
      // and that this isn't a substring of a longer identifier.
      const before = i === 0 ? " " : inner[i - 1];
      if (/[a-zA-Z0-9_$]/.test(before)) continue;
      const after = i + field.length;
      const m = inner.slice(after).match(/^\s*:\s*"([^"]*)"/);
      if (m) return m[1];
    }
  }
  return null;
}

/**
 * Validate a parsed catalog against the four contract checks. Returns an
 * array of human-readable error messages; empty array means clean.
 *
 * @param {Array<{id?: string; name?: string; url?: string; description?: string}>} entries
 * @returns {string[]}
 */
export function validateCatalog(entries) {
  const errors = [];
  const expectedSet = new Set(EXPECTED_IDS);

  if (entries.length !== EXPECTED_IDS.length) {
    errors.push(
      `expected exactly ${EXPECTED_IDS.length} entries in ECOSYSTEM_SITES; found ${entries.length}.`,
    );
  }

  const seenIds = new Set();
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i] ?? {};
    const tag = entry.id ? `"${entry.id}"` : `#${i}`;
    for (const field of REQUIRED_FIELDS) {
      const value = entry[field];
      if (typeof value !== "string" || value.length === 0) {
        errors.push(`entry ${tag}: missing or empty "${field}".`);
      }
    }
    if (entry.id) seenIds.add(entry.id);
    if (typeof entry.url === "string" && entry.url.length > 0) {
      if (!entry.url.startsWith("https://")) {
        errors.push(`entry ${tag}: url must start with "https://" (got "${entry.url}").`);
      }
      if (entry.url.endsWith("/")) {
        errors.push(`entry ${tag}: url must NOT end with a trailing slash (got "${entry.url}").`);
      }
    }
  }

  for (const expected of EXPECTED_IDS) {
    if (!seenIds.has(expected)) {
      errors.push(`missing expected id "${expected}".`);
    }
  }
  for (const seen of seenIds) {
    if (!expectedSet.has(seen)) {
      errors.push(`unexpected id "${seen}" not in canonical catalog.`);
    }
  }

  return errors;
}

const isMain = (() => {
  try {
    return (
      import.meta.url ===
      new URL(`file://${process.argv[1]}`).href
    );
  } catch {
    return false;
  }
})();

if (isMain) {
  await main();
}

async function main() {
  let text;
  try {
    text = await readFile(SOURCE, "utf8");
  } catch (err) {
    console.error(`✗ check:ecosystem-chrome — could not read ${SOURCE}: ${err.message}`);
    process.exit(2);
  }

  let entries;
  try {
    entries = parseCatalog(text);
  } catch (err) {
    console.error(`✗ check:ecosystem-chrome — parser error: ${err.message}`);
    process.exit(1);
  }

  // When ecosystem.ts uses a computed form (sitesWithRole(...).map(...)) instead
  // of a literal array, parseCatalog returns 0 entries. Fall back to the runtime
  // registry so the check stays meaningful after the ecosystem.ts refactor.
  if (entries.length === 0) {
    const { SITE_REGISTRY_RUNTIME } = await import("../seo/site-registry-runtime.generated.mjs");
    entries = SITE_REGISTRY_RUNTIME.filter((s) => s.chrome).map((s) => ({
      id: s.id,
      name: s.name,
      url: s.url,
      description: s.description,
    }));
  }

  const errors = validateCatalog(entries);
  if (errors.length === 0) {
    console.log(
      `✓ check:ecosystem-chrome — catalog has ${entries.length} entries with all expected ids and fields.`,
    );
    return;
  }
  for (const e of errors) console.error(`✗ ${e}`);
  console.error(`\nSummary: ${errors.length} catalog drift error(s).`);
  process.exit(1);
}
