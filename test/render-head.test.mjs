import { describe, expect, test } from "bun:test";
import { renderSEOHeadHTML, FONT_PRELOAD_SETS } from "../seo/render-head.mjs";
import { defaultsForSite } from "../seo/defaults.mjs";

const base = { site: "blog", title: "Hola", description: "Descripción de prueba", pathname: "/" };
const themeTags = (html) => html.split("\n").filter((l) => l.startsWith('<meta name="theme-color"'));

describe("renderSEOHeadHTML theme-color", () => {
  test("without overrides emits the single registry colour (unchanged output)", () => {
    const html = renderSEOHeadHTML(base);
    const { themeColor } = defaultsForSite("blog");
    expect(themeTags(html)).toEqual([`<meta name="theme-color" content="${themeColor}">`]);
    expect(html).toContain(`<meta name="msapplication-TileColor" content="${themeColor}">`);
  });

  test("a { light, dark } prop emits a prefers-color-scheme pair", () => {
    const html = renderSEOHeadHTML({ ...base, themeColor: { light: "#FAFAF8", dark: "#1C1C1C" } });
    expect(themeTags(html)).toEqual([
      '<meta name="theme-color" content="#FAFAF8" media="(prefers-color-scheme: light)">',
      '<meta name="theme-color" content="#1C1C1C" media="(prefers-color-scheme: dark)">',
    ]);
  });

  test("a string prop overrides the single colour", () => {
    const html = renderSEOHeadHTML({ ...base, themeColor: "#017275" });
    expect(themeTags(html)).toEqual(['<meta name="theme-color" content="#017275">']);
  });

  test("an incomplete pair falls back to the registry colour", () => {
    const html = renderSEOHeadHTML({ ...base, themeColor: { light: "#FAFAF8" } });
    expect(themeTags(html)).toEqual([`<meta name="theme-color" content="${defaultsForSite("blog").themeColor}">`]);
  });

  test("values are attribute-escaped", () => {
    const html = renderSEOHeadHTML({ ...base, themeColor: { light: '"><x', dark: "#000" } });
    expect(html).not.toContain('"><x');
  });

  test("defaults expose no themeColorScheme unless the registry declares one", () => {
    expect("themeColorScheme" in defaultsForSite("blog")).toBe(false);
  });
});

describe("renderSEOHeadHTML font preloads", () => {
  const preloads = (html) =>
    html.split("\n").filter((l) => l.startsWith('<link rel="preload" as="font"')).map((l) => l.match(/href="([^"]+)"/)[1]);

  test("defaults to the app set, as woff2", () => {
    const html = renderSEOHeadHTML(base);
    expect(preloads(html)).toEqual([...FONT_PRELOAD_SETS.app]);
    expect(html).toContain('<link rel="preload" as="font" type="font/woff2" href="/fonts/CHANEY-Extended.woff2" crossorigin="anonymous">');
  });

  test("preloadFontSet picks the page type", () => {
    expect(preloads(renderSEOHeadHTML({ ...base, preloadFontSet: "article" }))).toEqual([...FONT_PRELOAD_SETS.article]);
    expect(preloads(renderSEOHeadHTML({ ...base, preloadFontSet: "editorial" }))).toEqual([...FONT_PRELOAD_SETS.editorial]);
  });

  test("an unknown set falls back to app; explicit URLs win", () => {
    expect(preloads(renderSEOHeadHTML({ ...base, preloadFontSet: "nope" }))).toEqual([...FONT_PRELOAD_SETS.app]);
    const html = renderSEOHeadHTML({ ...base, preloadFontSet: "article", preloadFontUrls: ["/fonts/X.otf"] });
    expect(preloads(html)).toEqual(["/fonts/X.otf"]);
    expect(html).toContain('type="font/otf" href="/fonts/X.otf"');
  });

  test("every set only names faces that fonts.css declares", async () => {
    const css = await Bun.file(new URL("../fonts.css", import.meta.url)).text();
    for (const url of Object.values(FONT_PRELOAD_SETS).flat()) expect(css).toContain(`url('${url}')`);
  });

  test("preloadFonts: false emits none", () => {
    expect(preloads(renderSEOHeadHTML({ ...base, preloadFonts: false }))).toEqual([]);
  });
});
