/**
 * @file Generate the canonical favicon / apple-touch-icon / manifest
 * icon set from `assets/logos/favicon.svg`.
 *
 * Outputs (under `packages/design-system/assets/icons/`):
 *   - favicon.svg                (copy of logos/favicon.svg, the canonical mark)
 *   - favicon-32x32.png          (32×32 PNG fallback for browsers that prefer ICO/PNG)
 *   - apple-touch-icon.png       (180×180 PNG for iOS Add-to-Home-Screen)
 *   - mask-icon.svg              (monochrome black-on-transparent for Safari pinned tab)
 *   - icon-192.png               (manifest icon, any/maskable)
 *   - icon-512.png               (manifest icon, any/maskable)
 *
 * Webs sync this directory into their `public/` (or equivalent) during
 * their build step. We do not ship favicons per-web because every site
 * uses the same canonical mark.
 *
 * Run via `npm --workspace @chimi/design-system run icons` (added in
 * task 0.6). Sharp is already a transitive devDependency through
 * Astro, so no extra install is required on developer machines that
 * have run `npm install` for the monorepo.
 */

import { mkdir, readFile, writeFile, copyFile, access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), "..");
const SRC_SVG = resolve(ROOT, "assets/logos/favicon.svg");
const OUT_DIR = resolve(ROOT, "assets/icons");

/**
 * Rasterise the source SVG at the given square size and write a PNG.
 * Padding is applied as a fraction of the output size so the chimi
 * mark renders comfortably under iOS rounded-corner masking.
 *
 * @param {Buffer} svg
 * @param {string} outPath
 * @param {number} size
 * @param {number} padding   - 0..0.4 fraction of output size; 0 means no padding.
 * @param {{ background?: string; squareCanvas?: boolean }} [options]
 */
async function rasterise(svg, outPath, size, padding, options = {}) {
  const inner = Math.round(size * (1 - padding * 2));
  const offset = Math.round((size - inner) / 2);
  const innerPng = await sharp(svg)
    .resize({ width: inner, height: inner, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const background = options.background ?? "transparent";
  const composite = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background:
        background === "transparent"
          ? { r: 0, g: 0, b: 0, alpha: 0 }
          : background,
    },
  }).composite([{ input: innerPng, top: offset, left: offset }]);

  await composite.png({ compressionLevel: 9 }).toFile(outPath);
  return outPath;
}

/**
 * Build the monochrome mask-icon (Safari pinned tab uses it).
 *
 * Strategy: take the canonical SVG and replace every fill with #000.
 * The browser tints it with the `<link rel="mask-icon" color="...">`
 * value at render time, so the source must be flat black.
 *
 * @param {string} sourceSvg
 * @returns {string}
 */
function toMaskIcon(sourceSvg) {
  return sourceSvg
    .replace(/fill="[^"]+"/g, 'fill="#000000"')
    .replace(/<svg/i, '<svg color="#000000"');
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const svg = await readFile(SRC_SVG);
  const svgString = svg.toString("utf8");

  await copyFile(SRC_SVG, resolve(OUT_DIR, "favicon.svg"));
  await writeFile(resolve(OUT_DIR, "mask-icon.svg"), toMaskIcon(svgString));

  await rasterise(svg, resolve(OUT_DIR, "favicon-32x32.png"), 32, 0);
  await rasterise(svg, resolve(OUT_DIR, "apple-touch-icon.png"), 180, 0.06, {
    background: { r: 253, g: 253, b: 253, alpha: 1 },
  });
  await rasterise(svg, resolve(OUT_DIR, "icon-192.png"), 192, 0.05, {
    background: { r: 253, g: 253, b: 253, alpha: 1 },
  });
  await rasterise(svg, resolve(OUT_DIR, "icon-512.png"), 512, 0.05, {
    background: { r: 253, g: 253, b: 253, alpha: 1 },
  });

  const summary = ["favicon.svg", "favicon-32x32.png", "apple-touch-icon.png", "mask-icon.svg", "icon-192.png", "icon-512.png"];
  const present = await Promise.all(
    summary.map(async (name) => `${name}: ${(await exists(resolve(OUT_DIR, name))) ? "ok" : "missing"}`),
  );
  console.log(`[generate-icons] wrote ${OUT_DIR}`);
  console.log(present.map((line) => `  - ${line}`).join("\n"));
}

main().catch((err) => {
  console.error("[generate-icons] failed:", err);
  process.exit(1);
});
