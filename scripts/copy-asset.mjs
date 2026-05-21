#!/usr/bin/env node
/**
 * Copy a named DS file into a consumer site's tree.
 *
 * Why this exists:
 *   Astro static sites and HTML packages can't reach outside their workspace
 *   for build outputs. This helper lets a site declare a `prebuild` step
 *   like:
 *     "prebuild": "node ../design-system/scripts/copy-asset.mjs assets/logos/favicon.svg public/favicon.svg"
 *
 *   Result: the DS is the single source of truth for the file, and the
 *   site's tree mirrors it on every build.
 *
 * Path resolution:
 *   The source path is resolved relative to the design-system package root,
 *   so it can target either an asset (assets/logos/favicon.svg) or a
 *   build output (dist/tokens.css). Both are valid uses.
 *
 * Usage:
 *   node copy-asset.mjs <ds-relative-path> <target-relative-to-cwd>
 *   Example: node copy-asset.mjs assets/logos/favicon.svg public/favicon.svg
 *   Example: node copy-asset.mjs dist/tokens.css shared/tokens.css
 */
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DS_ROOT = resolve(HERE, "..");

const [, , src, dst] = process.argv;
if (!src || !dst) {
  console.error("Usage: copy-asset.mjs <ds-relative-path> <target-path>");
  console.error("Example: copy-asset.mjs assets/logos/favicon.svg public/favicon.svg");
  console.error("Example: copy-asset.mjs dist/tokens.css shared/tokens.css");
  process.exit(1);
}

const fromAbs = resolve(DS_ROOT, src);
const toAbs = resolve(process.cwd(), dst);

await mkdir(dirname(toAbs), { recursive: true });
await copyFile(fromAbs, toAbs);
console.log(`✓ copied ${src} → ${dst}`);
