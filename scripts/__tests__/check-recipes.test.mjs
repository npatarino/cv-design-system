import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
/**
 * @file Unit tests for the recipe-leak regex used by `check-recipes.mjs`.
 *
 * The full linter walks templates, decks, slide CSS, and the five Astro
 * webs. Tests here pin the *core contract* that the `closed-recipe-model`
 * capability requires: the regex catches direct `--chimi-color-*` leaks
 * but tolerates the documented escape hatches (`--chimi-primitives-*`,
 * `--chimi-color-recipe-*`).
 *
 * The CLI behaviour (warning vs error tiers per scan target) is exercised
 * end-to-end by `npm run check:recipes`; here we focus on the regex
 * because that is the bit the spec normatively constrains.
 */




import { CHIMI_COLOR_LEAK, scanForLeaks, parseArgs, WEBS } from "../check-recipes.mjs";

it("regex flags semantic --chimi-color-* references as leaks", () => {
  const text = `
    .button {
      background: var(--chimi-color-accent-primary);
      color: var(--chimi-color-text-on-canvas);
    }
  `;
  const leaks = scanForLeaks(text);
  expect(leaks.length).toEqual(2);
  assert.ok(
    leaks.includes("var(--chimi-color-accent-primary)"),
    "expected --chimi-color-accent-primary to be flagged",
  );
  assert.ok(
    leaks.includes("var(--chimi-color-text-on-canvas)"),
    "expected --chimi-color-text-on-canvas to be flagged",
  );
});

it("regex does NOT flag --chimi-primitives-color-* (escape hatch)", () => {
  const text = `
    /* primitive escape hatch for the duotone logo. */
    .logo-shadow { fill: var(--chimi-primitives-color-plasma-base); }
    .logo-glow   { stroke: var(--chimi-primitives-color-lemon-base); }
  `;
  const leaks = scanForLeaks(text);
  assert.deepEqual(
    leaks,
    [],
    "primitives namespace must be tolerated as an escape hatch",
  );
});

it("regex does NOT flag --chimi-color-recipe-* (internal recipe wiring)", () => {
  const text = `
    :where([data-recipe="canvas-quiet"]) {
      --recipe-surface: var(--chimi-color-recipe-canvas-quiet-surface);
      --recipe-ink: var(--chimi-color-recipe-canvas-quiet-ink);
    }
  `;
  const leaks = scanForLeaks(text);
  assert.deepEqual(
    leaks,
    [],
    "recipe-internal --chimi-color-recipe-* references must be tolerated",
  );
});

it("regex coexists with --recipe-* contract consumption (no leaks reported)", () => {
  const text = `
    body { background: var(--recipe-surface); color: var(--recipe-ink); }
    a    { color: var(--recipe-accent); }
    em   { color: var(--recipe-em); }
  `;
  const leaks = scanForLeaks(text);
  expect(leaks).toEqual([]);
});

it("regex global flag exposes every match (not just the first)", () => {
  const text = `
    var(--chimi-color-accent-primary) var(--chimi-color-accent-emphasis)
    var(--chimi-color-warn) var(--chimi-color-text-on-canvas)
  `;
  // Use the exported regex directly (with new RegExp to avoid stateful
  // lastIndex contamination).
  const re = new RegExp(CHIMI_COLOR_LEAK.source, CHIMI_COLOR_LEAK.flags);
  const matches = [...text.matchAll(re)];
  expect(matches.length).toEqual(4);
});

// --- CLI flag parsing ------------------------------------------------------
//
// The `--web <name>` flag is the contract every per-workspace `prebuild`
// hook depends on. If the parser drifts (e.g. a refactor renames the
// flag or stops accepting `--web=value`), Vercel deploys for the five
// webs would silently stop enforcing the recipe contract. These tests
// pin that surface.

it("parseArgs returns null web when no flag is supplied", () => {
  expect(parseArgs([])).toEqual({ web: null });
  expect(parseArgs(["--unrelated").toEqual("value"]), { web: null });
});

it("parseArgs accepts `--web <name>` (space-separated)", () => {
  for (const w of WEBS) {
    expect(parseArgs(["--web").toEqual(w]), { web: w });
  }
});

it("parseArgs accepts `--web=<name>` (equals form)", () => {
  for (const w of WEBS) {
    expect(parseArgs([`--web=${w}`])).toEqual({ web: w });
  }
});

it("parseArgs preserves the literal value (validation is the runner's job)", () => {
  // The runner is responsible for validating the value against `WEBS`
  // and exiting non-zero. Here we only pin the parsing contract.
  expect(parseArgs(["--web").toEqual("bogus"]), { web: "bogus" });
  expect(parseArgs(["--web="])).toEqual({ web: "" });
});

it("WEBS canonical list matches the per-workspace prebuild wiring (7 webs)", () => {
  // The seven webs whose package.json carries a `check:recipes --web …`
  // step in `prebuild`. Adding/removing one must update both this list
  // and the workspace package.json simultaneously.
  assert.deepEqual(
    [...WEBS].sort(),
    [
      "blog",
      "recall-for-papers",
      "simple-json-diff",
      "simple-pdf-converter",
      "simple-scrum-poker",
      "simple-web-validator",
      "techconf",
    ],
  );
});
