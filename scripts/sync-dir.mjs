#!/usr/bin/env node
/**
 * Sync (copy) a directory of DS assets into a consumer site's tree.
 *
 * Why this exists:
 *   Companion to `copy-asset.mjs` (which copies a single file). When a site
 *   needs a whole asset directory mirrored — e.g. brand needs every font
 *   file next to its styles.css — declare a prebuild like:
 *
 *     "sync:fonts": "node ../design-system/scripts/sync-dir.mjs fonts shared/fonts"
 *
 *   Result: the DS owns the asset directory; the site mirrors it on every
 *   build. Output files are *generated*, don't hand-edit.
 *
 * Usage:
 *   node sync-dir.mjs <ds-asset-subdir> <target-dir>
 *   e.g. node sync-dir.mjs fonts shared/fonts
 */
import { copyFile, mkdir, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS_ROOT = resolve(HERE, "..", "assets");

const [, , src, dst] = process.argv;
if (!src || !dst) {
  console.error("Usage: sync-dir.mjs <ds-asset-subdir> <target-dir>");
  console.error("Example: sync-dir.mjs fonts shared/fonts");
  process.exit(1);
}

const fromAbs = resolve(ASSETS_ROOT, src);
const toAbs = resolve(process.cwd(), dst);

await mkdir(toAbs, { recursive: true });
const entries = await readdir(fromAbs, { withFileTypes: true });
let copied = 0;
for (const entry of entries) {
  if (!entry.isFile()) continue;
  await copyFile(resolve(fromAbs, entry.name), resolve(toAbs, entry.name));
  copied++;
}
console.log(`✓ synced ${copied} files from assets/${src} → ${dst}`);
