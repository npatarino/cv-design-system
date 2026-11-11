/**
 * Contrast guard for every recipe × theme.
 *
 * Reads the compiled tokens (dist/tokens.css, rebuilt here) plus web.css and
 * runs a small custom-property cascade for <html [data-theme]> → <body
 * data-recipe="…">: specificity, source order, inheritance and var()
 * resolution, then resolves color-mix(in srgb, …) and composites translucent
 * colors over the recipe surface. Only top-level rules are read (no @media),
 * and only the selector forms web.css/tokens.css use for roles (:root,
 * attribute selectors, :not(), :where(), descendant combinator).
 *
 * Fails if any of these drops below 4.5:1 (WCAG AA, normal text):
 *   ink, accent-text, muted, muted-strong, status-* on surface;
 *   on-accent on accent and on the hover/active accent fills.
 *
 * Fails if the form-control outline (--field-border) drops below 3:1
 * (WCAG 1.4.11) against the surface or the control's fill.
 *
 * One documented exception: critical.ink (ivory on plasma) is 3.50:1, a
 * brand-identity pair that is only valid for large text (≥24px / 18.66px
 * bold). It is held to the 3:1 large-text floor so it cannot get worse.
 *
 * `CONTRAST_REPORT=1 bun test test/contrast.test.mjs` prints the table.
 */
import { beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RECIPES = ["canvas-quiet", "canvas-signal", "paper", "energy-loud", "cool-fresh", "critical"];
const THEMES = { dark: {}, light: { "data-theme": "light" } };
const AA = 4.5;
const LARGE_TEXT = 3;
const UI = 3; // WCAG 1.4.11 non-text contrast
const LARGE_TEXT_ONLY = new Set(["critical:ink"]);

// ─────────────────────────────────────────────────────────── color math

function parseHex(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const n = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return { r: n[0], g: n[1], b: n[2], a };
}

function splitTopLevel(str, sep) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of str) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (depth === 0 && (sep === " " ? /\s/.test(ch) : ch === sep)) {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Parse a resolved color value: #hex, transparent, or color-mix(in srgb, …). */
function parseColor(value) {
  const v = value.trim().toLowerCase();
  if (v === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  if (v.startsWith("#")) return parseHex(v);
  const m = v.match(/^color-mix\((.*)\)$/s);
  if (!m) throw new Error(`Unsupported color value: ${value}`);
  const [space, a, b] = splitTopLevel(m[1], ",");
  if (space !== "in srgb") throw new Error(`Unsupported color-mix space: ${space}`);
  const side = (arg) => {
    const parts = splitTopLevel(arg, " ");
    const pct = parts.find((p) => /%$/.test(p));
    const color = parts.filter((p) => p !== pct).join(" ");
    return { color: parseColor(color), pct: pct == null ? null : parseFloat(pct) / 100 };
  };
  const A = side(a);
  const B = side(b);
  let p1 = A.pct;
  let p2 = B.pct;
  if (p1 == null && p2 == null) p1 = p2 = 0.5;
  else if (p1 == null) p1 = 1 - p2;
  else if (p2 == null) p2 = 1 - p1;
  const sum = p1 + p2;
  const alphaMult = sum < 1 ? sum : 1;
  p1 /= sum;
  p2 /= sum;
  // Premultiplied interpolation (CSS Color 5 §color-mix).
  const alpha = A.color.a * p1 + B.color.a * p2;
  const ch = (k) => (alpha === 0 ? 0 : (A.color[k] * A.color.a * p1 + B.color[k] * B.color.a * p2) / alpha);
  return { r: ch("r"), g: ch("g"), b: ch("b"), a: alpha * alphaMult };
}

function over(fg, bg) {
  const a = fg.a;
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
}

function luminance({ r, g, b }) {
  const lin = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(fg, bg) {
  const solidBg = bg.a < 1 ? over(bg, { r: 255, g: 255, b: 255, a: 1 }) : bg;
  const solidFg = fg.a < 1 ? over(fg, solidBg) : fg;
  const x = luminance(solidFg);
  const y = luminance(solidBg);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const toHex = ({ r, g, b }) => "#" + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");

// ─────────────────────────────────────────────── tiny custom-property cascade

/** Parse one compound selector into simple selectors with a matcher + specificity. */
function parseCompound(compound) {
  const parts = [];
  let rest = compound;
  while (rest.length) {
    let m;
    if ((m = rest.match(/^:root/))) {
      parts.push({ spec: [0, 1, 0], match: (el) => el.isRoot });
    } else if ((m = rest.match(/^\[([\w-]+)(?:="([^"]*)")?\]/))) {
      const [, attr, val] = m;
      parts.push({ spec: [0, 1, 0], match: (el) => (val == null ? attr in el.attrs : el.attrs[attr] === val) });
    } else if ((m = rest.match(/^:(not|where|is)\(/))) {
      const kind = m[1];
      let depth = 1;
      let i = m[0].length;
      for (; i < rest.length && depth; i++) {
        if (rest[i] === "(") depth++;
        if (rest[i] === ")") depth--;
      }
      const inner = parseSelectorList(rest.slice(m[0].length, i - 1));
      if (!inner) return null;
      const maxSpec = inner.reduce((acc, s) => (cmpSpec(s.spec, acc) > 0 ? s.spec : acc), [0, 0, 0]);
      const matchesAny = (el, chain) => inner.some((s) => s.matches(el, chain));
      if (kind === "not") parts.push({ spec: maxSpec, match: (el, chain) => !matchesAny(el, chain) });
      else parts.push({ spec: kind === "where" ? [0, 0, 0] : maxSpec, match: matchesAny });
      m = [rest.slice(0, i)];
    } else if ((m = rest.match(/^\*/))) {
      parts.push({ spec: [0, 0, 0], match: () => true });
    } else if ((m = rest.match(/^(html|body)/))) {
      const tag = m[1];
      parts.push({ spec: [0, 0, 1], match: (el) => el.tag === tag });
    } else {
      return null; // classes, pseudo-classes, other tags: not a role declaration
    }
    rest = rest.slice(m[0].length);
  }
  const spec = parts.reduce((a, p) => [a[0] + p.spec[0], a[1] + p.spec[1], a[2] + p.spec[2]], [0, 0, 0]);
  return { spec, match: (el, chain) => parts.every((p) => p.match(el, chain)) };
}

function parseComplex(selector) {
  const compounds = splitTopLevel(selector.replace(/\s*>\s*/g, " > "), " ");
  if (compounds.includes(">")) return null;
  const parsed = compounds.map(parseCompound);
  if (parsed.some((p) => p == null)) return null;
  const spec = parsed.reduce((a, p) => [a[0] + p.spec[0], a[1] + p.spec[1], a[2] + p.spec[2]], [0, 0, 0]);
  // chain = ancestors of el, root first.
  const matches = (el, chain) => {
    if (!parsed.at(-1).match(el, chain)) return false;
    let idx = chain.length - 1;
    for (let k = parsed.length - 2; k >= 0; k--) {
      while (idx >= 0 && !parsed[k].match(chain[idx], chain.slice(0, idx))) idx--;
      if (idx < 0) return false;
      idx--;
    }
    return true;
  };
  return { spec, matches };
}

function parseSelectorList(list) {
  const out = [];
  for (const sel of splitTopLevel(list, ",")) {
    const p = parseComplex(sel);
    if (!p) return null;
    out.push(p);
  }
  return out;
}

function cmpSpec(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

/** Collect top-level rules that declare custom properties. */
function loadRules(cssTexts) {
  const rules = [];
  let order = 0;
  for (const css of cssTexts) {
    const root = postcss.parse(css);
    for (const node of root.nodes) {
      if (node.type !== "rule") continue;
      const decls = node.nodes.filter((d) => d.type === "decl" && d.prop.startsWith("--"));
      if (!decls.length) continue;
      for (const sel of node.selectors) {
        const parsed = parseComplex(sel);
        if (!parsed) continue;
        for (const d of decls) rules.push({ ...parsed, prop: d.prop, value: d.value, order: order++ });
      }
    }
  }
  return rules;
}

function resolveVars(value, props, seen = new Set()) {
  let out = "";
  let i = 0;
  while (i < value.length) {
    const start = value.indexOf("var(", i);
    if (start === -1) {
      out += value.slice(i);
      break;
    }
    out += value.slice(i, start);
    let depth = 1;
    let j = start + 4;
    for (; j < value.length && depth; j++) {
      if (value[j] === "(") depth++;
      if (value[j] === ")") depth--;
    }
    const [name, ...fb] = splitTopLevel(value.slice(start + 4, j - 1), ",");
    out += lookup(name.trim(), props, seen) ?? (fb.length ? resolveVars(fb.join(","), props, seen) : "");
    i = j;
  }
  return out;
}

function lookup(name, props, seen) {
  if (!(name in props) || seen.has(name)) return null;
  const next = new Set(seen).add(name);
  return resolveVars(props[name], props, next);
}

function computeElement(el, chain, parentComputed, rules) {
  const winners = {};
  for (const r of rules) {
    if (!r.matches(el, chain)) continue;
    const prev = winners[r.prop];
    if (!prev || cmpSpec(r.spec, prev.spec) > 0 || (cmpSpec(r.spec, prev.spec) === 0 && r.order > prev.order)) {
      winners[r.prop] = r;
    }
  }
  const raw = { ...parentComputed };
  for (const [prop, r] of Object.entries(winners)) raw[prop] = r.value;
  const computed = {};
  for (const prop of Object.keys(raw)) {
    computed[prop] = prop in winners ? resolveVars(raw[prop], raw) : raw[prop];
  }
  return computed;
}

function computeBody(rules, themeAttrs, recipe) {
  const html = { tag: "html", isRoot: true, attrs: { ...themeAttrs } };
  const body = { tag: "body", isRoot: false, attrs: recipe ? { "data-recipe": recipe } : {} };
  const htmlProps = computeElement(html, [], {}, rules);
  return computeElement(body, [html], htmlProps, rules);
}

// ─────────────────────────────────────────────────────────────── the guard

let rules;
const table = [];

beforeAll(() => {
  const build = Bun.spawnSync(["bun", "config.mjs"], { cwd: ROOT, stdout: "pipe", stderr: "pipe" });
  if (build.exitCode !== 0) throw new Error(`token build failed:\n${build.stderr.toString()}`);
  rules = loadRules([
    readFileSync(resolve(ROOT, "dist/tokens.css"), "utf8"),
    readFileSync(resolve(ROOT, "web.css"), "utf8"),
  ]);
});

function pairsFor(props) {
  const c = (name) => {
    const v = props[name];
    if (v == null || v === "") throw new Error(`${name} is not defined`);
    return parseColor(v);
  };
  const surface = c("--recipe-surface");
  const accent = c("--recipe-accent");
  const onAccent = c("--recipe-on-accent");
  return [
    ["ink", c("--recipe-ink"), surface],
    ["accent-text", c("--recipe-accent-text"), surface],
    ["on-accent/accent", onAccent, accent],
    ["on-accent/hover", onAccent, over(c("--accent-fill-hover"), surface)],
    ["on-accent/active", onAccent, over(c("--accent-fill-active"), surface)],
    ["muted", c("--muted"), surface],
    ["muted-strong", c("--muted-strong"), surface],
    ["status-ok", c("--status-ok"), surface],
    ["status-bad", c("--status-bad"), surface],
    ["status-caution", c("--status-caution"), surface],
  ];
}

/**
 * Non-text pairs (WCAG 1.4.11, ≥3:1): the outline of a form control
 * (.input) against the surface around it and against the control's own
 * fill (--surface-raised over the surface).
 */
function uiPairsFor(props) {
  const c = (name) => {
    const v = props[name];
    if (v == null || v === "") throw new Error(`${name} is not defined`);
    return parseColor(v);
  };
  const surface = c("--recipe-surface");
  const fill = over(c("--surface-raised"), surface);
  const border = c("--field-border");
  return [
    ["field-border", over(border, surface), surface],
    ["field-border/fill", over(border, fill), fill],
  ];
}

describe("contrast: every recipe × theme", () => {
  for (const recipe of [...RECIPES, null]) {
    for (const [theme, attrs] of Object.entries(THEMES)) {
      const label = `${recipe ?? "(no data-recipe)"} · ${theme}`;
      test(label, () => {
        const props = computeBody(rules, attrs, recipe);
        const row = { recipe: recipe ?? "(none)", theme };
        const failures = [];
        for (const [pair, fg, bg] of pairsFor(props)) {
          const ratio = contrast(fg, bg);
          row[pair] = Math.floor(ratio * 100) / 100;
          const floor = LARGE_TEXT_ONLY.has(`${recipe}:${pair}`) ? LARGE_TEXT : AA;
          if (ratio < floor) failures.push(`${pair} ${ratio.toFixed(2)}:1 < ${floor}:1 (${toHex(over(fg, bg))} on ${toHex(bg)})`);
        }
        for (const [pair, fg, bg] of uiPairsFor(props)) {
          const ratio = contrast(fg, bg);
          row[pair] = Math.floor(ratio * 100) / 100;
          if (ratio < UI) failures.push(`${pair} ${ratio.toFixed(2)}:1 < ${UI}:1 (${toHex(fg)} on ${toHex(bg)})`);
        }
        table.push(row);
        expect(failures).toEqual([]);
      });
    }
  }

  test("the cascade resolves the values the tokens declare", () => {
    const cqLight = computeBody(rules, THEMES.light, "canvas-quiet");
    expect(cqLight["--recipe-accent-text"]).toBe("#017275");
    expect(cqLight["--recipe-on-accent"]).toBe("#fafaf8");
    const cqDark = computeBody(rules, THEMES.dark, "canvas-quiet");
    expect(cqDark["--recipe-accent-text"]).toBe("#02b5b9");
    expect(cqDark["--recipe-on-accent"]).toBe("#1c1c1c");
    // paper's web remap is theme-independent (paper is ivory in both themes).
    for (const attrs of Object.values(THEMES)) {
      const paper = computeBody(rules, attrs, "paper");
      expect(paper["--recipe-accent"]).toBe("#017275");
      expect(paper["--recipe-on-accent"]).toBe("#fafaf8");
    }
    // muted must stay a mix of ink on the canvas recipes, not a fixed color.
    expect(cqLight["--muted"]).toContain("color-mix(in srgb, #1c1c1c 64%, transparent)");
  });

  test("report", () => {
    if (process.env.CONTRAST_REPORT) console.table(table);
    expect(table.length).toBe((RECIPES.length + 1) * Object.keys(THEMES).length);
  });
});
