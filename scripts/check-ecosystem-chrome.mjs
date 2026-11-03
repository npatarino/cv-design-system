#!/usr/bin/env bun
/**
 * Catalog drift detector for `ECOSYSTEM_SITES` (components/ecosystem.ts).
 *
 * The site registry (`site-registry.ts`) is the single source of truth, so
 * nothing here is hard-coded: the expected set is every registry entry with
 * `chrome: true`. The check asserts that:
 *  - `ECOSYSTEM_SITES` lists exactly the chrome sites, in registry order.
 *  - Every entry has non-empty `id`, `name`, `url` and `description`.
 *  - Every url starts with `https://` and does NOT end with `/`.
 *  - Every `logoSrc` path has the shape `/logos/<id>/<file>.svg` and the
 *    file exists under `assets/logos/<id>/` (SiteFooter bundles these files;
 *    a missing one renders as a broken image on every site).
 *
 * Needs Bun (it imports the TypeScript sources directly).
 * Run: bun run check:ecosystem-chrome
 *
 * Exits 0 on clean, 1 on drift.
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ECOSYSTEM_SITES } from "../components/ecosystem.ts";
import { siteRegistry } from "../site-registry.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const LOGOS_DIR = resolve(HERE, "../assets/logos");
const REQUIRED_FIELDS = ["id", "name", "url", "description"];

/**
 * @param {ReadonlyArray<Record<string, unknown>>} entries
 * @param {ReadonlyArray<{ id: string; chrome: boolean }>} registry
 * @returns {string[]}
 */
export function validateCatalog(entries, registry) {
  const errors = [];
  const expected = registry.filter((s) => s.chrome).map((s) => s.id);
  const actual = entries.map((e) => e.id);

  if (expected.join(",") !== actual.join(",")) {
    errors.push(
      `ECOSYSTEM_SITES ids [${actual.join(", ")}] do not match the registry's chrome sites [${expected.join(", ")}].`,
    );
  }

  entries.forEach((entry, i) => {
    const tag = entry.id ? `"${entry.id}"` : `#${i}`;
    for (const field of REQUIRED_FIELDS) {
      const value = entry[field];
      if (typeof value !== "string" || value.length === 0) {
        errors.push(`entry ${tag}: missing or empty "${field}".`);
      }
    }
    const url = entry.url;
    if (typeof url === "string" && url.length > 0) {
      if (!url.startsWith("https://")) errors.push(`entry ${tag}: url must start with "https://" (got "${url}").`);
      if (url.endsWith("/")) errors.push(`entry ${tag}: url must not end with "/" (got "${url}").`);
    }
    const logoSrc = /** @type {Record<string, string> | undefined} */ (entry.logoSrc);
    for (const [key, path] of Object.entries(logoSrc ?? {})) {
      const m = /^\/logos\/([^/]+)\/([^/]+\.svg)$/.exec(path);
      if (!m || m[1] !== entry.id) {
        errors.push(`entry ${tag}: logoSrc.${key} must look like "/logos/${entry.id}/<file>.svg" (got "${path}").`);
      } else if (!existsSync(resolve(LOGOS_DIR, m[1], m[2]))) {
        errors.push(`entry ${tag}: logoSrc.${key} points to a missing file assets/logos/${m[1]}/${m[2]}.`);
      }
    }
  });

  return errors;
}

const errors = validateCatalog(ECOSYSTEM_SITES, siteRegistry());
if (errors.length === 0) {
  console.log(`✓ check:ecosystem-chrome — ${ECOSYSTEM_SITES.length} chrome sites match the registry; logos resolve.`);
} else {
  for (const e of errors) console.error(`✗ ${e}`);
  console.error(`\nSummary: ${errors.length} catalog drift error(s).`);
  process.exit(1);
}
