import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkSlop } from "../scripts/check-slop.mjs";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "../scripts/check-slop.mjs");
const dirs = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

/** Build a throwaway site from { "path": "content" }. */
function site(files) {
  const dir = mkdtempSync(join(tmpdir(), "slop-"));
  dirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), content);
  }
  return dir;
}
const page = (main, head = "") => `<!doctype html><html><head>${head}</head><body><main>${main}</main></body></html>`;
const rule = (result, id) => result.rules.find((r) => r.id === id);
const CLEAN = { "index.html": page("<h1>Hola</h1><p>Texto.</p>"), "a.css": ".x{color:var(--recipe-ink);border-left:1px solid var(--hairline)}" };

describe("checkSlop", () => {
  test("a clean site has no warnings and passes strict", () => {
    const r = checkSlop(site(CLEAN), { strict: "all" });
    expect(r.warnings).toBe(0);
    expect(r.failed).toBe(false);
  });

  test("finds coloured side borders written as shorthand, hex and longhand", () => {
    const r = checkSlop(site({
      "a.css": [
        ".a{border-left:3px solid var(--recipe-accent)}",
        ".b{border-top:4px solid #d33}",
        ".c{border-left-color:rgb(200, 30, 30)}",
        ".d{border-inline-start:2px solid var(--status-bad)}",
        ".ok1{border-left:1px solid var(--recipe-accent)}",
        ".ok2{border-top:3px solid #333}",
        ".ok3{border-left:2px solid var(--hairline-strong)}",
      ].join("\n"),
    }));
    expect(rule(r, "side-borders").count).toBe(4);
  });

  test("reads <style> blocks and style attributes, on any .html file", () => {
    const r = checkSlop(site({
      "docs/page.html": page(
        '<h1>T</h1><div style="background: linear-gradient(red, blue)">x</div>',
        "<style>\n.g{backdrop-filter:blur(8px)}\n.s{box-shadow:0 0 12px var(--recipe-accent)}\n</style>",
      ),
    }));
    expect(rule(r, "gradients").count).toBe(1);
    expect(rule(r, "glass").count).toBe(1);
    expect(rule(r, "color-shadows").count).toBe(1);
    expect(rule(r, "glass").locations[0]).toMatchObject({ file: join("docs", "page.html"), line: 2 });
  });

  test("neutral shadows and backdrop-filter: none are fine", () => {
    const r = checkSlop(site({ "a.css": ".a{box-shadow:0 1px 2px rgba(0,0,0,.2)}.b{backdrop-filter:none}.c{box-shadow:0 2px 6px color-mix(in srgb, var(--chimi-primitives-color-charcoal-100) 20%, transparent)}" }));
    expect(rule(r, "color-shadows").count).toBe(0);
    const tinted = checkSlop(site({ "a.css": ".c{box-shadow:0 2px 6px var(--chimi-primitives-color-patagonia-base)}" }));
    expect(rule(tinted, "color-shadows").count).toBe(1);
    expect(rule(r, "glass").count).toBe(0);
  });

  test("flags template fonts in CSS and in Google Fonts links, not words that contain them", () => {
    const r = checkSlop(site({
      "a.css": 'body{font-family:"Inter",sans-serif}.b{font:400 16px/1.5 Space Grotesk}.ok{font-family:"Interstate","At Aero"}',
      "index.html": page("<h1>T</h1>", '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif">'),
    }));
    expect(rule(r, "banned-fonts").count).toBe(3);
  });

  test("locations name the selector in minified CSS", () => {
    const r = checkSlop(site({ "a.css": ".x{color:red}.callout[data-astro-cid-abc]{padding:1px;border-left:3px solid var(--recipe-em)}" }));
    const [loc] = rule(r, "side-borders").locations;
    expect(loc.excerpt).toBe(".callout { border-left:3px solid var(--recipe-em)");
    expect(loc).toMatchObject({ file: "a.css", line: 1, col: 55 });
  });

  test("markup rules: h1, primary buttons, stat rows, emoji, copy", () => {
    const r = checkSlop(site({
      "index.html": page(
        '<h1>Uno</h1><h1>Dos</h1><a class="btn primary" href="#">A</a><button class="btn btn--primary">B</button>' +
        "<dl><dd>50+</dd><dd>90%</dd><dd>5</dd></dl><p>Listo ★ para llevar tu carrera al siguiente nivel.</p>",
      ),
    }));
    for (const id of ["multi-h1", "multi-primary", "stat-rows", "emoji", "copy"]) expect(rule(r, id).count).toBe(1);
  });

  test("years in a timeline are not a stat row; chrome outside <main> is ignored", () => {
    const r = checkSlop(site({
      "index.html": `<html><body><header><a class="btn primary">a</a><a class="btn primary">b</a> ★</header>${"<main><h1>T</h1><span>2019</span><span>2020</span><span>2021</span></main>"}</body></html>`,
    }));
    expect(r.warnings).toBe(0);
  });

  test("strict fails on enforced rules only; strict=all includes advisory ones; --max raises a limit", () => {
    const advisory = site({ "index.html": page("<h1>T</h1><p>Hola ★</p>") });
    expect(checkSlop(advisory, { strict: true }).failed).toBe(false);
    expect(checkSlop(advisory, { strict: "all" }).failed).toBe(true);

    const enforced = site({ "a.css": ".a{border-left:3px solid var(--recipe-accent)}" });
    expect(checkSlop(enforced).failed).toBe(false);
    expect(checkSlop(enforced, { strict: true }).failed).toBe(true);
    expect(checkSlop(enforced, { strict: true, max: { "side-borders": 1 } }).failed).toBe(false);
  });

  test("pagefind output is skipped", () => {
    const r = checkSlop(site({ ...CLEAN, "pagefind/ui.css": ".a{background:linear-gradient(red,blue);backdrop-filter:blur(2px)}" }));
    expect(r.warnings).toBe(0);
  });
});

describe("check-slop CLI", () => {
  const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });

  test("runs when npm invokes it through the node_modules/.bin symlink", () => {
    const dir = mkdtempSync(join(tmpdir(), "chimi-bin-"));
    const link = join(dir, "chimi-check-slop");
    symlinkSync(SCRIPT, link);
    const r = spawnSync(process.execPath, [link, join(dir, "missing")], { encoding: "utf8" });
    rmSync(dir, { recursive: true, force: true });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("check-slop");
  });
  const bad = () => site({ "a.css": ".callout{border-left:3px solid var(--recipe-accent)}" });

  test("reports and exits 0 without --strict", () => {
    const r = run(bad());
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("a.css:1:10  .callout { border-left:3px solid var(--recipe-accent)");
  });
  test("exits 1 with --strict, 0 once the limit is raised", () => {
    expect(run(bad(), "--strict").status).toBe(1);
    expect(run(bad(), "--strict", "--max", "side-borders=1").status).toBe(0);
  });
  test("--json prints the report", () => {
    const out = JSON.parse(run(bad(), "--json").stdout);
    expect(out.rules.find((r) => r.id === "side-borders").count).toBe(1);
  });
  test("exits 2 on a bad option or a missing directory", () => {
    expect(run(bad(), "--max", "nope=1").status).toBe(2);
    expect(run(join(tmpdir(), "slop-does-not-exist")).status).toBe(2);
  });
});
