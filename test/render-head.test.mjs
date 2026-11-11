import { describe, expect, test } from "bun:test";
import { renderSEOHeadHTML } from "../seo/render-head.mjs";
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
