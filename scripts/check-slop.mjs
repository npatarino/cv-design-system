#!/usr/bin/env node
/**
 * check-slop: deterministic pass over a built site for the "template look"
 * patterns listed in docs/anti-patterns.md.
 *
 * Usage (from a consumer site, after its build):
 *   npx chimi-check-slop dist                 report only, always exits 0
 *   npx chimi-check-slop dist --strict        exit 1 when an enforced rule is over its limit
 *   npx chimi-check-slop dist --strict=all    advisory rules fail the run too
 *   npx chimi-check-slop dist --max gradients=4 --max uppercase=60
 *   npx chimi-check-slop dist --all           print every location (default: first 5 per rule)
 *   npx chimi-check-slop dist --json          machine-readable report
 *
 * What it reads: every `.css` file, every `<style>` block and every `style=""`
 * attribute of every `.html` file under the directory (pagefind output is
 * skipped).
 *
 * Enforced rules (fail under --strict): gradients, glass, color-shadows,
 * side-borders, banned-fonts, stat-rows, icon-cards, multi-h1.
 * Advisory rules (fail only under --strict=all, because they need a human
 * read): uppercase, emoji, multi-primary, copy.
 *
 * Programmatic use:
 *   import { checkSlop } from "@chimichurricode/design-system/check-slop";
 *   const { rules, failed } = checkSlop("dist", { strict: true });
 */
import { readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/** id → [label, default limit, advisory, hint] */
export const RULES = {
  gradients: ["degradados", 2, false, "color plano de la receta"],
  glass: ["backdrop-filter (cristal esmerilado)", 1, false, "superficie sólida (--recipe-surface)"],
  "color-shadows": ["sombras de color", 1, false, "sin glows ni sombras teñidas"],
  "side-borders": ["bordes de color a la izquierda o arriba", 0, false, "hairline neutra, sangría o cita en Scilla"],
  "banned-fonts": ["fuentes por defecto de plantilla", 0, false, "las del sistema (font.semantic.json)"],
  "stat-rows": ["filas de estadísticas (3 o más números sueltos)", 0, false, "el número dentro de una frase, solo si es real"],
  "icon-cards": ["grids de tarjetas con icono", 0, false, "lista de filas con hairline"],
  "multi-h1": ["páginas con más de un <h1>", 0, false, "un h1 por página"],
  uppercase: ["reglas text-transform: uppercase", 40, true, "eyebrows, botones y meta: aceptable; vigilar que no crezca"],
  emoji: ["emojis o glifos en el HTML", 0, true, "en prosa pueden ser legítimos: revisar a mano"],
  "multi-primary": ["páginas con más de un botón primario", 0, true, "uno primario por pantalla; el resto, enlaces o .btn-ghost"],
  copy: ["copy genérico", 0, true, "datos reales y voz propia"],
};

const BANNED_FONTS = /(["']?)\b(Inter|Geist(?: Sans| Mono)?|Space Grotesk|Instrument Serif)\b\1/i;
const COPY = /\b(potenci(?:ar|amos|á) (?:tu|su|el|la) |soluciones (?:innovadoras|integrales|a medida)|apasionad[oa]s? (?:por|de)|de clase mundial|líder(?:es)? (?:en|del) (?:sector|mercado)|de vanguardia|(?:al|el) siguiente nivel)/gi;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]|[◉◇★▶]/gu;
const ACCENT_VAR = /var\(\s*--(?:recipe-(?:accent|em|warn)|accent|em|status-|chimi-primitives-(?!charcoal|ivory))/i;

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    if (name === "pagefind" || name === "node_modules") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

/** A hex / rgb() / hsl() colour that is not a grey. */
function isChromatic(value) {
  const hex = value.match(/#([0-9a-f]{3,8})\b/i);
  if (hex) {
    let h = hex[1];
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    return Math.max(r, g, b) - Math.min(r, g, b) > 24;
  }
  const rgb = value.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (rgb) {
    const [r, g, b] = rgb.slice(1, 4).map(Number);
    return Math.max(r, g, b) - Math.min(r, g, b) > 24;
  }
  const hsl = value.match(/hsla?\(\s*[\d.]+(?:deg)?[\s,]+([\d.]+)%/i);
  if (hsl) return Number(hsl[1]) > 12;
  return false;
}
const isColoured = (value) => ACCENT_VAR.test(value) || isChromatic(value);

function lineCol(text, index) {
  let line = 1, last = -1;
  for (let i = text.indexOf("\n"); i !== -1 && i < index; i = text.indexOf("\n", i + 1)) { line++; last = i; }
  return [line, index - last];
}

/**
 * @param {string} dir built site directory
 * @param {{ strict?: boolean | "all", max?: Record<string, number> }} [opts]
 */
export function checkSlop(dir, opts = {}) {
  const files = walk(dir);
  const hits = Object.fromEntries(Object.keys(RULES).map((id) => [id, []]));
  const add = (id, file, text, index, excerpt, offset = 0) => {
    const [line, col] = lineCol(text, index + offset);
    hits[id].push({ file: relative(dir, file), line, col, excerpt: excerpt.replace(/\s+/g, " ").trim().slice(0, 120) });
  };

  /** Scan one chunk of CSS. `source` is the whole file, `offset` where the chunk starts in it. */
  const scanCss = (file, css, source, offset) => {
    const each = (re, fn) => { for (const m of css.matchAll(re)) fn(m); };
    // Minified CSS is one line, so the selector is what makes a location findable.
    const selector = (index) => {
      const open = css.lastIndexOf("{", index);
      if (open === -1) return "";
      const from = Math.max(css.lastIndexOf("}", open), css.lastIndexOf(";", open), css.lastIndexOf("{", open - 1)) + 1;
      const sel = css.slice(from, open).replace(/\[data-astro-cid-[^\]]*\]/g, "").trim();
      return sel ? `${sel.slice(-60)} { ` : "";
    };
    const hit = (id, m) => add(id, file, source, m.index, selector(m.index) + m[0], offset);

    each(/(?:repeating-)?(?:linear|radial|conic)-gradient\(/g, (m) => add("gradients", file, source, m.index, selector(m.index) + css.slice(m.index, m.index + 60), offset));
    each(/backdrop-filter\s*:\s*(?!none|initial|unset)[^;}]+/g, (m) => hit("glass", m));
    each(/box-shadow\s*:\s*([^;}]+)/g, (m) => { if (isColoured(m[1])) hit("color-shadows", m); });
    each(/text-transform\s*:\s*uppercase/g, (m) => hit("uppercase", m));
    // Shorthand: `border-left: 3px solid <colour>` (also border-inline-start / border-block-start).
    each(/border-(?:left|top|inline-start|block-start)\s*:\s*([^;}]+)/g, (m) => {
      const px = m[1].match(/(\d*\.?\d+)px/);
      const thick = px ? Number(px[1]) >= 2 : /\b(medium|thick)\b/.test(m[1]);
      if (thick && isColoured(m[1])) hit("side-borders", m);
    });
    // Longhand: `border-left-color: <colour>`; the width lives elsewhere, so any colour counts.
    each(/border-(?:left|top|inline-start|block-start)-color\s*:\s*([^;}]+)/g, (m) => { if (isColoured(m[1])) hit("side-borders", m); });
    each(/(?:font-family|font)\s*:\s*([^;}]+)/g, (m) => { if (BANNED_FONTS.test(m[1])) hit("banned-fonts", m); });
  };

  for (const file of files) {
    if (file.endsWith(".css")) {
      const css = readFileSync(file, "utf8");
      scanCss(file, css, css, 0);
      continue;
    }
    if (!file.endsWith(".html")) continue;

    const html = readFileSync(file, "utf8");
    for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) scanCss(file, m[1], html, m.index + m[0].indexOf(m[1]));
    for (const m of html.matchAll(/\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
      const css = m[1] ?? m[2];
      scanCss(file, css, html, m.index + m[0].indexOf(css));
    }
    for (const m of html.matchAll(/<link\b[^>]*href=["'][^"']*fonts\.googleapis\.com[^"']*["'][^>]*>/gi)) {
      if (BANNED_FONTS.test(decodeURIComponent(m[0]).replace(/\+/g, " "))) add("banned-fonts", file, html, m.index, m[0]);
    }

    // Markup rules look at <main> only (chrome is the system's), minus scripts, styles and embeds.
    const blank = (s) => s.replace(/[^\n]/g, " ");
    const clean = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, blank).replace(/<(audio|video|iframe)\b[\s\S]*?>/gi, blank);
    const start = Math.max(0, clean.search(/<main\b/i));
    const end = clean.search(/<\/main>/i);
    const body = clean.slice(start, end === -1 ? undefined : end);
    const inBody = (id, m) => add(id, file, html, m.index, m[0], start);

    for (const m of body.matchAll(/(?:<(dd|strong|span)\b[^>]*>\s*(?:\+\d{1,4}|\d{1,3}[%+]?)\s*<\/\1>\s*){3,}/g)) inBody("stat-rows", m); // 4-digit years (a timeline axis) are not stats
    for (const m of body.matchAll(/(?:<(div|a|article|li)\b[^>]*>\s*<(?:span|div)\b[^>]*>\s*<svg[\s\S]{0,400}?<h[2-4][\s\S]{0,400}?<\/\1>\s*){3,}/g)) inBody("icon-cards", m);
    const text = body.replace(/<[^>]*>/g, blank);
    for (const m of text.matchAll(EMOJI)) add("emoji", file, html, m.index, text.slice(Math.max(0, m.index - 30), m.index + 30), start);
    for (const m of text.matchAll(COPY)) add("copy", file, html, m.index, text.slice(Math.max(0, m.index - 30), m.index + 50), start);

    const h1 = [...clean.matchAll(/<h1[\s>]/gi)];
    if (h1.length > 1) add("multi-h1", file, html, h1[1].index, `${h1.length} <h1> en la página`);
    const primary = [...body.matchAll(/<(?:a|button)\b[^>]*\bclass\s*=\s*["']([^"']*)["']/gi)].filter((m) => {
      const c = m[1].split(/\s+/);
      return c.includes("btn--primary") || c.includes("btn-primary") || (c.includes("btn") && c.includes("primary"));
    });
    if (primary.length > 1) add("multi-primary", file, html, primary[1].index, `${primary.length} botones primarios en la página`, start);
  }

  const strict = opts.strict ?? false;
  const rules = Object.entries(RULES).map(([id, [label, limit, advisory, hint]]) => {
    const max = opts.max?.[id] ?? limit;
    const count = hits[id].length;
    const over = count > max;
    return { id, label, count, max, advisory, hint, over, fails: over && (strict === "all" || (strict === true && !advisory)), locations: hits[id] };
  });
  return {
    rules,
    pages: files.filter((f) => f.endsWith(".html")).length,
    stylesheets: files.filter((f) => f.endsWith(".css")).length,
    warnings: rules.filter((r) => r.over).length,
    failed: rules.some((r) => r.fails),
  };
}

function main(argv) {
  const opts = { max: {} };
  let dir = "dist", all = false, json = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--strict") opts.strict = true;
    else if (a === "--strict=all") opts.strict = "all";
    else if (a === "--all") all = true;
    else if (a === "--json") json = true;
    else if (a === "--max" || a.startsWith("--max=")) {
      const [id, n] = (a === "--max" ? argv[++i] ?? "" : a.slice(6)).split("=");
      if (!(id in RULES) || !/^\d+$/.test(n ?? "")) {
        console.error(`check-slop: --max espera regla=número. Reglas: ${Object.keys(RULES).join(", ")}`);
        return 2;
      }
      opts.max[id] = Number(n);
    } else if (a.startsWith("--")) {
      console.error(`check-slop: opción desconocida ${a}`);
      return 2;
    } else dir = a;
  }

  let result;
  try {
    result = checkSlop(dir, opts);
  } catch (err) {
    console.error(`check-slop: no se pudo leer ${dir} (${err.code ?? err.message})`);
    return 2;
  }
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return result.failed ? 1 : 0;
  }
  for (const r of result.rules) {
    const flag = r.fails ? "✗" : r.over ? "⚠" : "·";
    console.log(`${flag} ${r.id}: ${r.count}${r.over ? ` (límite ${r.max})` : ""} · ${r.label}${r.over ? `. En su lugar: ${r.hint}` : ""}`);
    if (!r.over) continue;
    const shown = all ? r.locations : r.locations.slice(0, 5);
    for (const l of shown) console.log(`    ${l.file}:${l.line}:${l.col}  ${l.excerpt}`);
    if (shown.length < r.locations.length) console.log(`    … y ${r.locations.length - shown.length} más (--all para verlas)`);
  }
  console.log(`check-slop: ${result.pages} páginas, ${result.stylesheets} hojas de estilo, ${result.warnings} avisos${opts.strict ? (result.failed ? ", falla" : ", pasa") : ""}`);
  return result.failed ? 1 : 0;
}

// npm links the bin from node_modules/.bin, so argv[1] is a symlink: resolve it before comparing.
function isEntryPoint() {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}
if (isEntryPoint()) process.exitCode = main(process.argv.slice(2));
