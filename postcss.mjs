/**
 * PostCSS helper for consumers of the design system.
 *
 * `dist/breakpoints.css` declares the canonical breakpoints as
 * `@custom-media --md (min-width: 768px);` etc. No browser understands
 * `@custom-media`, so any consumer stylesheet that writes `@media (--md)`
 * must inline it at build time. This helper does exactly that:
 *
 *   // postcss.config.mjs
 *   import { dsCustomMedia } from "@chimichurricode/design-system/postcss";
 *   export default { plugins: [...dsCustomMedia()] };
 *
 * It returns two plugins: one that prepends the DS `@custom-media`
 * definitions to every stylesheet that uses them, and `postcss-custom-media`
 * which consumes them. Astro/Vite pick `postcss.config.mjs` up automatically.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import postcssCustomMedia from "postcss-custom-media";

const BREAKPOINTS_CSS = fileURLToPath(new URL("./dist/breakpoints.css", import.meta.url));

/** The `@custom-media` definitions shipped in dist/breakpoints.css. */
export function dsCustomMediaDefinitions() {
  const css = readFileSync(BREAKPOINTS_CSS, "utf-8");
  return [...css.matchAll(/@custom-media\s+(--[\w-]+)\s+([^;]+);/g)].map((m) => ({
    name: m[1],
    params: m[2].trim(),
  }));
}

/** PostCSS plugin: inject the DS definitions into stylesheets that reference them. */
export function dsInjectCustomMedia() {
  const defs = dsCustomMediaDefinitions();
  const plugin = {
    postcssPlugin: "chimi-ds-inject-custom-media",
    Once(root, { AtRule }) {
      if (!root.toString().includes("(--")) return;
      for (const d of [...defs].reverse()) {
        root.prepend(new AtRule({ name: "custom-media", params: `${d.name} ${d.params}` }));
      }
    },
  };
  return plugin;
}
dsInjectCustomMedia.postcss = true;

/** The full plugin list a consumer needs: inject + inline. */
export function dsCustomMedia() {
  return [dsInjectCustomMedia(), postcssCustomMedia()];
}
