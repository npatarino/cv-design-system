#!/usr/bin/env node
/**
 * Recipe linter for talks templates.
 *
 * Validates that:
 *   1. Every templates/*.md declares `recipe: <id>` in frontmatter,
 *      and the id exists in tokens/color.recipe.json.
 *   2. Every theme/styles/slides/*.css consumes only allowed token shapes:
 *        - var(--recipe-*)             — primary contract
 *        - var(--chimi-primitives-*)   — escape hatch for artifacts
 *                                        (qr, browser frame, avatars)
 *        - var(--chimi-type-*)         — typography composites
 *        - var(--chimi-font-family-*)  — font roles
 *        - var(--font-*) and a small whitelist of legacy aliases
 *          (--ivory/--charcoal/--patagonia/--lemon/--red/--charcoal-*)
 *      Direct consumption of --chimi-color-* (semantic colors) outside
 *      the allowed shapes above is reported as a leak — those should
 *      route through a recipe role.
 *   3. If a template declares `criticalFg`, the carrier recipe must not
 *      be one of the disallowed hosts (energy-loud, cool-fresh, critical).
 *
 * Run: npm run check:recipes
 *      (opt-in for now; not wired to build:talks yet)
 *
 * Exit code: 0 = clean, 1 = errors found.
 *
 * Whitelist exceptions for templates that legitimately mix many recipe
 * roles (allowMultipleAccents) live in tokens/type.recipe.json under
 * `_namedExceptions`. They are not enforced here yet; templates that
 * appear there are reported as informational.
 */

import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../../..");
const TEMPLATES_DIR = resolve(REPO_ROOT, "packages/talks/templates");
const DECKS_DIR = resolve(REPO_ROOT, "packages/talks/decks");
const SLIDES_CSS_DIR = resolve(REPO_ROOT, "packages/talks/theme/styles/slides");
const COLOR_RECIPE_JSON = resolve(HERE, "../tokens/color.recipe.json");
const TYPE_RECIPE_JSON = resolve(HERE, "../tokens/type.recipe.json");

// Webs scanned for direct --chimi-color-* leaks. Post-`recipes-light-theme-support`
// (2026-05-01) the semantic JSON layer was deleted: any leak is a build-breaking
// error because the underlying tokens no longer exist in dist/tokens.css. The
// previous warning tier (with the documented EventRow.astro carve-out) is gone.
//
// Exported for tests + the per-workspace prebuild wiring: when a web is
// added to or removed from this list, the per-web `prebuild` hook in
// that workspace must be added or removed in lockstep.
export const WEBS = [
  "blog",
  "techconf",
  "recall-for-papers",
  "simple-pdf-converter",
  "simple-scrum-poker",
  "simple-json-diff",
  "simple-web-validator",
  "simple-radar-skills",
  "preact-ui",
  "brand",
  "simple-font-tester",
];

const WEB_SCAN_EXTS = new Set([".astro", ".css", ".scss", ".tsx", ".ts", ".html"]);

const CRITICAL_FG_FORBIDDEN_HOSTS = new Set(["energy-loud", "cool-fresh", "critical"]);

// `--chimi-color-*` IS a leak in slide CSS, except these specific paths
// that templates legitimately reach for (e.g. critical surface inline).
//
// Exported so the unit test can pin the regex against the contract
// codified by the `closed-recipe-model` capability:
//   - matches `var(--chimi-color-accent-primary)`           ← leak
//   - does NOT match `var(--chimi-primitives-color-*)`      ← escape hatch
//   - does NOT match `var(--chimi-color-recipe-*)`          ← internal recipe wiring
export const CHIMI_COLOR_LEAK = /var\(--chimi-color-(?!recipe-)[a-z][\w-]*\)/g;

/**
 * Pure helper exposed for tests: returns the unique set of leaked
 * `--chimi-color-*` references found in a chunk of source text.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function scanForLeaks(text) {
  // Reset the global regex's lastIndex by re-creating it per call, so
  // repeated scans don't drop matches under stateful global flags.
  const re = new RegExp(CHIMI_COLOR_LEAK.source, CHIMI_COLOR_LEAK.flags);
  const matches = [...text.matchAll(re)].map((m) => m[0]);
  return [...new Set(matches)];
}

const errors = [];
const warnings = [];
const info = [];

const isMain = (() => {
  try {
    return import.meta.url === new URL(`file://${process.argv[1]}`).href;
  } catch {
    return false;
  }
})();

if (isMain) {
  main().catch((err) => {
    console.error("✗", err.message);
    process.exit(2);
  });
}

/**
 * Parse CLI args. Today the only flag we honour is `--web <name>` which
 * narrows the scan to a single web's `src/` and skips the talks-scoped
 * checks (templates, decks, slide CSS). This is the shape the
 * per-workspace `prebuild` hooks consume so Vercel-style isolated
 * builds enforce the recipe contract without re-running every other
 * scan on each web's deploy.
 *
 * Without `--web`, the runner behaves as before: full sweep across
 * templates, decks, slide CSS, and all five webs.
 *
 * @param {string[]} argv
 * @returns {{ web: string|null }}
 */
export function parseArgs(argv) {
  const out = { web: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--web") {
      out.web = argv[i + 1] ?? null;
      i++;
    } else if (a.startsWith("--web=")) {
      out.web = a.slice("--web=".length);
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.web !== null && !WEBS.includes(args.web)) {
    console.error(
      `✗ check:recipes — unknown --web "${args.web}". Allowed: ${WEBS.join(", ")}.`,
    );
    process.exit(2);
  }

  const recipeIds = await loadRecipeIds();
  const namedExceptions = await loadNamedExceptions();

  if (args.web === null) {
    await checkTemplates(recipeIds);
    await checkDecks(recipeIds);
    await checkSlideStylesheets();
    await checkWebs();
  } else {
    // Scoped run: only this web; skip talks-scoped scans because they
    // do not depend on the consuming web. The linter still surfaces
    // info lines for the named exceptions and the same warn/error tier
    // semantics for whatever the scoped web produces.
    await checkWebs([args.web]);
  }

  print(namedExceptions, args.web);

  const exit = errors.length > 0 ? 1 : 0;
  process.exit(exit);
}

async function loadRecipeIds() {
  const json = JSON.parse(await readFile(COLOR_RECIPE_JSON, "utf8"));
  const root = json?.color?.recipe ?? {};
  return new Set(
    Object.keys(root).filter((k) => !k.startsWith("$") && !k.startsWith("_"))
  );
}

async function loadNamedExceptions() {
  const json = JSON.parse(await readFile(TYPE_RECIPE_JSON, "utf8"));
  const ex = json?.type?._namedExceptions ?? {};
  return {
    allowMultipleAccents: new Set(ex.allowMultipleAccents?.appliesTo ?? []),
    allowMultipleStats: new Set(ex.allowMultipleStats?.appliesTo ?? []),
    allowDeckOverride: new Set(ex.allowDeckOverride?.appliesTo ?? []),
  };
}

async function checkTemplates(recipeIds) {
  const files = (await readdir(TEMPLATES_DIR))
    .filter((f) => f.endsWith(".md") && f !== "templates.json")
    .sort();

  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    const path = resolve(TEMPLATES_DIR, file);
    const raw = await readFile(path, "utf8");
    const fm = parseFrontmatter(raw);

    if (!fm) {
      errors.push(`${slug}: no frontmatter found`);
      continue;
    }

    const recipe = fm.recipe;
    if (!recipe) {
      errors.push(`${slug}: missing 'recipe:' in frontmatter`);
      continue;
    }
    if (!recipeIds.has(recipe)) {
      errors.push(`${slug}: unknown recipe '${recipe}' (not in color.recipe.json)`);
      continue;
    }

    if (fm.criticalFg && CRITICAL_FG_FORBIDDEN_HOSTS.has(recipe)) {
      errors.push(
        `${slug}: criticalFg='${fm.criticalFg}' not allowed on host recipe '${recipe}' ` +
          `(forbidden hosts: ${[...CRITICAL_FG_FORBIDDEN_HOSTS].join(", ")})`
      );
    }
  }
}

/**
 * Walk every deck under packages/talks/decks/<deck>/*.md and confirm each
 * slide declares a known recipe. Templates already enforce this for their
 * canonical files, but deck slides are copies authored against templates and
 * can drift — a missing `recipe:` line silently breaks the slide background
 * (see the productividad-toxica regression: 48 slides rendered as
 * `data-recipe=""`, leaving --recipe-surface undefined → transparent).
 */
async function checkDecks(recipeIds) {
  if (!(await pathExists(DECKS_DIR))) return;
  const decks = (await readdir(DECKS_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const deck of decks) {
    const dir = resolve(DECKS_DIR, deck);
    const files = (await readdir(dir))
      .filter((f) => f.endsWith(".md"))
      .sort();

    for (const file of files) {
      const slug = `${deck}/${file.replace(/\.md$/, "")}`;
      const path = resolve(dir, file);
      const raw = await readFile(path, "utf8");
      const fm = parseFrontmatter(raw);
      if (!fm) continue; // not a slide page; tolerate non-frontmatter readmes

      const recipe = fm.recipe;
      if (!recipe) {
        errors.push(
          `${slug}: missing 'recipe:' in frontmatter — slide will render with ` +
            `data-recipe="" and --recipe-surface unset (transparent background).`
        );
        continue;
      }
      if (!recipeIds.has(recipe)) {
        errors.push(
          `${slug}: unknown recipe '${recipe}' (not in color.recipe.json)`
        );
      }
      if (fm.criticalFg && CRITICAL_FG_FORBIDDEN_HOSTS.has(recipe)) {
        errors.push(
          `${slug}: criticalFg='${fm.criticalFg}' not allowed on host recipe '${recipe}' ` +
            `(forbidden hosts: ${[...CRITICAL_FG_FORBIDDEN_HOSTS].join(", ")})`
        );
      }
    }
  }
}

async function checkSlideStylesheets() {
  const files = (await readdir(SLIDES_CSS_DIR))
    .filter((f) => f.endsWith(".css"))
    .sort();

  for (const file of files) {
    const path = resolve(SLIDES_CSS_DIR, file);
    const text = await readFile(path, "utf8");
    const matches = [...text.matchAll(CHIMI_COLOR_LEAK)];
    if (matches.length > 0) {
      const unique = [...new Set(matches.map((m) => m[0]))];
      errors.push(
        `${file}: ${unique.length} direct --chimi-color-* reference(s) — ` +
          `must route through --recipe-* (semantic JSON layer was removed by ` +
          `recipes-light-theme-support): ${unique.slice(0, 3).join(", ")}` +
          (unique.length > 3 ? ` (+${unique.length - 3} more)` : "")
      );
    }
  }
}

/**
 * Scan each web's `src/` for direct --chimi-color-* references and record them
 * as **errors** (post-`recipes-light-theme-support`, 2026-05-01). The
 * underlying semantic tokens no longer exist in dist/tokens.css, so a leak
 * resolves to an undefined CSS variable and renders as `unset` (transparent).
 * The build SHALL fail until every leak is migrated to --recipe-* (or to a
 * documented --chimi-primitives-color-* escape hatch).
 *
 * @param {string[]} [webs] Optional subset of webs to scan. Defaults to
 *   the full canonical list when omitted; per-workspace prebuild hooks
 *   pass a single-element list (`[name]`) so a deploy from a specific
 *   web only audits its own `src/`.
 */
async function checkWebs(webs = WEBS) {
  const totals = new Map();
  for (const web of webs) {
    const root = resolve(REPO_ROOT, `packages/${web}/src`);
    if (!(await pathExists(root))) continue;
    const files = await collectFiles(root);
    let webRefs = 0;
    let webFiles = 0;
    const offenders = [];
    for (const path of files) {
      const text = await readFile(path, "utf8");
      const matches = [...text.matchAll(CHIMI_COLOR_LEAK)];
      if (matches.length > 0) {
        webRefs += matches.length;
        webFiles += 1;
        offenders.push({
          rel: relative(REPO_ROOT, path),
          count: matches.length,
        });
      }
    }
    if (webRefs > 0) {
      totals.set(web, { refs: webRefs, files: webFiles, offenders });
      errors.push(
        `webs/${web}: ${webRefs} direct --chimi-color-* reference(s) across ${webFiles} file(s) ` +
          `must route through --recipe-* (semantic JSON layer was removed by recipes-light-theme-support).`
      );
      // Surface the worst offenders so reviewers see where to look.
      const top = offenders
        .slice()
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      for (const o of top) {
        info.push(`  · ${o.rel} (${o.count})`);
      }
    } else {
      info.push(`webs/${web}: clean — 0 direct --chimi-color-* references`);
    }
  }
  if (totals.size > 0) {
    const totalRefs = [...totals.values()].reduce((s, t) => s + t.refs, 0);
    errors.push(
      `webs total: ${totalRefs} pending --chimi-color-* reference(s) across ${totals.size} web(s)`
    );
  }
}

async function collectFiles(root) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!entry.isFile()) continue;
      const dot = entry.name.lastIndexOf(".");
      const ext = dot === -1 ? "" : entry.name.slice(dot).toLowerCase();
      if (WEB_SCAN_EXTS.has(ext)) out.push(full);
    }
  }
  return out;
}

async function pathExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Minimal YAML frontmatter parser for our flat `key: value` style.
 * We don't need full YAML — only top-level scalar keys (recipe, criticalFg).
 */
function parseFrontmatter(raw) {
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return null;
  const body = m[1];
  const out = {};
  for (const line of body.split("\n")) {
    const km = line.match(/^([a-zA-Z][\w-]*)\s*:\s*(.+?)\s*$/);
    if (!km) continue;
    let value = km[2];
    // Strip surrounding quotes if present.
    value = value.replace(/^["'](.*)["']$/, "$1");
    // Skip lines whose value starts with { (inline objects) — we don't care.
    if (value.startsWith("{") || value.startsWith("[")) continue;
    out[km[1]] = value;
  }
  return out;
}

function print(namedExceptions, scopedWeb = null) {
  const total = errors.length + warnings.length;
  const scope = scopedWeb === null ? "templates, slide CSS, and all webs" : `web "${scopedWeb}"`;

  for (const e of errors) console.error(`✗ ${e}`);
  for (const w of warnings) console.warn(`⚠ ${w}`);
  for (const i of info) console.log(`· ${i}`);

  if (total === 0) {
    console.log(`✓ check:recipes — clean (${scope})`);
  } else {
    console.log(
      `\nSummary: ${errors.length} error(s), ${warnings.length} warning(s) (${scope})`
    );
  }

  // Surface the named exceptions so consumers know where to look.
  const exceptionTotal =
    namedExceptions.allowMultipleAccents.size +
    namedExceptions.allowMultipleStats.size +
    namedExceptions.allowDeckOverride.size;
  if (exceptionTotal > 0) {
    console.log(
      `\nNamed exceptions in tokens/type.recipe.json: ` +
        `${namedExceptions.allowMultipleAccents.size} allowMultipleAccents, ` +
        `${namedExceptions.allowMultipleStats.size} allowMultipleStats, ` +
        `${namedExceptions.allowDeckOverride.size} allowDeckOverride`
    );
  }
}
