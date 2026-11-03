import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { extractFontsFromTarball, fetchFonts, readTar } from "../scripts/fetch-fonts.mjs";

// ---------------------------------------------------------------- fake tarball

function header(name, size, type = "0", prefix = "") {
  const h = Buffer.alloc(512);
  h.write(name, 0, 100, "utf8");
  h.write("0000644\0", 100);
  h.write("0000000\0", 108);
  h.write("0000000\0", 116);
  h.write(size.toString(8).padStart(11, "0") + "\0", 124);
  h.write("00000000000\0", 136);
  h.write(type, 156);
  h.write("ustar\0", 257);
  h.write("00", 263);
  h.write(prefix, 345, 155, "utf8");
  h.fill(" ", 148, 156);
  let sum = 0;
  for (const b of h) sum += b;
  h.write(sum.toString(8).padStart(6, "0") + "\0 ", 148);
  return h;
}

function entry(name, data, type = "0", prefix = "") {
  const body = Buffer.from(data);
  const pad = Buffer.alloc((512 - (body.length % 512)) % 512);
  return Buffer.concat([header(name, body.length, type, prefix), body, pad]);
}

function paxRecord(key, value) {
  const base = ` ${key}=${value}\n`;
  let len = base.length;
  len += String(len + String(len).length).length;
  return `${len}${base}`;
}

/** A GitHub-style repo tarball: `<owner>-<repo>-<sha>/…` plus a global pax header. */
function fakeRepoTarball() {
  const root = "npatarino-cv-fonts-abc123";
  const longName = `${"Very".repeat(30)}-Long.woff2`;
  return gzipSync(
    Buffer.concat([
      entry("pax_global_header", paxRecord("comment", "abc123"), "g"),
      entry(`${root}/`, "", "5"),
      entry(`${root}/README.md`, "readme"),
      entry(`${root}/fonts/`, "", "5"),
      entry(`${root}/fonts/A-Regular.otf`, "font-a"),
      entry(`${root}/fonts/B-VF.ttf`, "x".repeat(1000)),
      entry("fonts/C-Bold.woff", "font-c", "0", root), // ustar prefix
      entry("PaxHeader", paxRecord("path", `${root}/fonts/${longName}`), "x"),
      entry("ignored-short-name", "font-long"),
      entry(`${root}/fonts/notes.txt`, "not a font"),
      entry(`${root}/fonts/sub/D.otf`, "nested"),
      entry(`${root}/other/E.otf`, "elsewhere"),
      Buffer.alloc(1024),
    ]),
  );
}

// --------------------------------------------------------------------- setup

let tmp;
const quiet = { log: () => {}, warn: () => {} };
const noFetch = () => {
  throw new Error("network must not be used");
};

function makeDir(rel, files) {
  const dir = path.join(tmp, rel);
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, data] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), data);
  return dir;
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "chimi-fonts-"));
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

// --------------------------------------------------------------------- tests

describe("tar extraction", () => {
  test("reads ustar prefix, pax path and skips directories/global headers", () => {
    const paths = readTar(gunzipSync(fakeRepoTarball())).map((e) => e.path);
    expect(paths).toContain("npatarino-cv-fonts-abc123/fonts/C-Bold.woff");
    expect(paths.some((p) => p.endsWith("-Long.woff2"))).toBe(true);
    expect(paths).not.toContain("ignored-short-name");
    expect(paths).not.toContain("pax_global_header");
  });

  test("keeps only font files directly under fonts/", () => {
    const fonts = extractFontsFromTarball(fakeRepoTarball());
    const names = fonts.map((f) => f.name).sort();
    expect(names).toEqual(["A-Regular.otf", "B-VF.ttf", "C-Bold.woff", `${"Very".repeat(30)}-Long.woff2`]);
    expect(fonts.find((f) => f.name === "B-VF.ttf").data.toString()).toBe("x".repeat(1000));
  });
});

describe("fetchFonts", () => {
  test("1. CHIMI_FONTS_DIR wins and copies only fonts", async () => {
    const src = makeDir("clone/fonts", { "A.otf": "a", "B.ttf": "b", "README.md": "no" });
    const res = await fetchFonts({ cwd: tmp, env: { CHIMI_FONTS_DIR: src, CHIMI_FONTS_TOKEN: "t" }, fetch: noFetch, ...quiet });
    expect(res.source).toBe("dir");
    expect(fs.readdirSync(path.join(tmp, "public/fonts")).sort()).toEqual(["A.otf", "B.ttf"]);
  });

  test("does not rewrite identical files", async () => {
    const src = makeDir("clone/fonts", { "A.otf": "a" });
    const env = { CHIMI_FONTS_DIR: src };
    expect((await fetchFonts({ cwd: tmp, env, ...quiet })).written).toBe(1);
    const dest = path.join(tmp, "public/fonts/A.otf");
    const before = fs.statSync(dest).mtimeMs;
    expect((await fetchFonts({ cwd: tmp, env, ...quiet })).written).toBe(0);
    expect(fs.statSync(dest).mtimeMs).toBe(before);
    fs.writeFileSync(path.join(src, "A.otf"), "changed");
    expect((await fetchFonts({ cwd: tmp, env, ...quiet })).written).toBe(1);
  });

  test("2. CHIMI_FONTS_TOKEN downloads the tarball once, then uses the cache", async () => {
    const calls = [];
    const fakeFetch = async (url, init) => {
      calls.push({ url, auth: init.headers.Authorization });
      return new Response(fakeRepoTarball());
    };
    const env = { CHIMI_FONTS_TOKEN: "s3cret", CHIMI_FONTS_REF: "v1" };
    const logs = [];
    const capture = { log: (m) => logs.push(m), warn: (m) => logs.push(m) };
    const res = await fetchFonts({ cwd: tmp, env, fetch: fakeFetch, outDir: "theme/fonts", ...capture });
    expect(res.source).toBe("github");
    expect(res.total).toBe(4);
    expect(calls).toEqual([{ url: "https://api.github.com/repos/npatarino/cv-fonts/tarball/v1", auth: "Bearer s3cret" }]);
    expect(fs.readFileSync(path.join(tmp, "theme/fonts/A-Regular.otf"), "utf8")).toBe("font-a");
    expect(fs.existsSync(path.join(tmp, "node_modules/.cache/chimi-fonts/v1/A-Regular.otf"))).toBe(true);

    const again = await fetchFonts({ cwd: tmp, env, fetch: fakeFetch, outDir: "theme/fonts", ...capture });
    expect(again.from).toContain("cached");
    expect(again.written).toBe(0);
    expect(calls.length).toBe(1);
    expect(logs.join("\n")).not.toContain("s3cret");
  });

  test("a failed download falls back to the legacy package fonts without leaking the token", async () => {
    makeDir("node_modules/@chimichurricode/design-system/assets/fonts", { "Old.otf": "old" });
    const warnings = [];
    const res = await fetchFonts({
      cwd: tmp,
      env: { CHIMI_FONTS_TOKEN: "s3cret" },
      fetch: async () => new Response("nope", { status: 404, statusText: "Not Found s3cret" }),
      log: () => {},
      warn: (m) => warnings.push(m),
    });
    expect(res.source).toBe("legacy");
    expect(fs.readFileSync(path.join(tmp, "public/fonts/Old.otf"), "utf8")).toBe("old");
    expect(warnings.join("\n")).toContain("HTTP 404");
    expect(warnings.join("\n")).not.toContain("s3cret");
  });

  test("3. without token, uses the legacy fonts of an installed design system", async () => {
    makeDir("node_modules/@chimichurricode/design-system/assets/fonts", { "Old.otf": "old", ".DS_Store": "x" });
    const res = await fetchFonts({ cwd: tmp, env: {}, fetch: noFetch, ...quiet });
    expect(res.source).toBe("legacy");
    expect(fs.readdirSync(path.join(tmp, "public/fonts"))).toEqual(["Old.otf"]);
  });

  test("4. nothing available: warns and succeeds, or throws when required", async () => {
    const warnings = [];
    const res = await fetchFonts({ cwd: tmp, env: {}, fetch: noFetch, log: () => {}, warn: (m) => warnings.push(m) });
    expect(res.source).toBe("none");
    expect(warnings.join("\n")).toContain("CHIMI_FONTS_TOKEN");
    expect(fs.existsSync(path.join(tmp, "public/fonts"))).toBe(false);

    await expect(fetchFonts({ cwd: tmp, env: { CHIMI_FONTS_REQUIRED: "1" }, fetch: noFetch, ...quiet })).rejects.toThrow(
      "no font source available",
    );
    await expect(fetchFonts({ cwd: tmp, env: {}, require: true, fetch: noFetch, ...quiet })).rejects.toThrow();
  });

  test("an empty CHIMI_FONTS_DIR falls through to the next source", async () => {
    const empty = makeDir("empty", {});
    makeDir("node_modules/@chimichurricode/design-system/assets/fonts", { "Old.otf": "old" });
    const res = await fetchFonts({ cwd: tmp, env: { CHIMI_FONTS_DIR: empty }, ...quiet });
    expect(res.source).toBe("legacy");
  });
});
