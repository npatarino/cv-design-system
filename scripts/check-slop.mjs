#!/usr/bin/env node
/**
 * check-slop: deterministic reminder pass over a built site for the "AI design
 * slop" tells listed in docs/anti-patterns.md. It reports, it does not fail.
 *
 * Usage (from a consumer site, after its build):
 *   node node_modules/@chimichurricode/design-system/scripts/check-slop.mjs dist
 *
 * Checks (per the patterns in developersdigest.tech "AI design slop and how
 * to spot it"): gradients, backdrop-filter/glassmorphism, coloured box
 * shadows, coloured left/top borders, emoji used as icons, identical icon
 * cards, stat rows, and all-caps density.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST = process.argv[2] ?? "dist";
const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

const files = walk(DIST);
const css = files.filter((f) => f.endsWith(".css") && !f.includes("/pagefind/"));
const html = files.filter((f) => f.endsWith("index.html") && !f.includes("/pagefind/"));

const count = (text, re) => (text.match(re) || []).length;
const report = [];

// ── CSS tells ─────────────────────────────────────────────────────────────
let gradients = 0, blur = 0, colorShadow = 0, sideBorders = 0, upper = 0;
for (const f of css) {
  const t = readFileSync(f, "utf8");
  gradients += count(t, /(linear|radial|conic)-gradient\(/g);
  blur += count(t, /backdrop-filter\s*:\s*(?!none)/g);
  colorShadow += count(t, /box-shadow\s*:[^;]*(rgba?\(|#[0-9a-f]{3,8}|var\(--recipe-(accent|em|warn)\))/gi);
  sideBorders += count(t, /border-(left|top)\s*:\s*[2-9]px\s+solid\s+var\(--recipe-(accent|em|warn)\)/g);
  upper += count(t, /text-transform\s*:\s*uppercase/g);
}
report.push(["gradients in CSS", gradients, 2, "docs/anti-patterns.md: sin degradados"]);
report.push(["backdrop-filter (glass)", blur, 1, "sin cristal esmerilado"]);
report.push(["coloured box-shadows", colorShadow, 1, ""]);
report.push(["coloured left/top borders", sideBorders, 0, ""]);
report.push(["text-transform: uppercase rules", upper, 40, "eyebrows, botones y meta: aceptable; vigilar crecimiento"]);

// ── HTML tells ────────────────────────────────────────────────────────────
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]|[◉◇★▶📑]/gu;
let emoji = 0, statRows = 0, iconCards = 0, h1dup = 0;
for (const f of html) {
  const t = readFileSync(f, "utf8").replace(/<script[\s\S]*?<\/script>/g, "");
  const body = t.split("<main")[1] ?? t;
  emoji += count(body.replace(/<(audio|video|iframe)[\s\S]*?>/g, ""), EMOJI);
  // stat rows: 3+ siblings whose text is a short number
  statRows += count(body, /(<(dd|strong|span)[^>]*>\s*(\+\d{1,4}|\d{1,3}[%+]?)\s*<\/\2>\s*){3,}/g); // 4-digit years (timeline axis) are not stats
  // identical icon cards: 3+ sibling blocks starting with an svg then a heading
  iconCards += count(body, /(<(div|a|article|li)[^>]*>\s*<(span|div)[^>]*>\s*<svg[\s\S]{0,400}?<h[2-4][\s\S]{0,400}?<\/\2>\s*){3,}/g);
  if (count(t, /<h1[\s>]/g) > 1) h1dup++;
}
report.push(["emoji/glyph icons in HTML", emoji, 0, "las historias y posts pueden traer emojis en prosa: revisar a mano si > 0"]);
report.push(["stat rows (3+ bare numbers)", statRows, 0, ""]);
report.push(["icon-card grids", iconCards, 0, ""]);
report.push(["pages with more than one <h1>", h1dup, 0, ""]);

// ── print ─────────────────────────────────────────────────────────────────
let warn = 0;
for (const [label, n, max, note] of report) {
  const flag = n > max ? "⚠" : "·";
  if (n > max) warn++;
  console.log(`${flag} ${label}: ${n}${n > max ? ` (umbral ${max})` : ""}${note && n > max ? ` — ${note}` : ""}`);
}
console.log(`check-slop: ${html.length} páginas, ${css.length} hojas CSS, ${warn} avisos`);
