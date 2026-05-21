/**
 * @file String renderer for the SEO head.
 *
 * Used by non-Astro consumers: the talks Eleventy build, the brand
 * static-HTML inject script, and tests. The Astro `SEOHead.astro`
 * component renders the same set of tags; we share the vocabulary so
 * any future consumer can either spit a string or use the component
 * without divergence.
 *
 * Tag order matters for crawlers and is fixed by `<head>` semantics:
 *   1. <meta charset>
 *   2. <title>
 *   3. <meta name="description">
 *   4. <link rel="canonical">
 *   5. <meta name="robots">
 *   6. <html lang> alternates (hreflang)
 *   7. ecosystem alternates (data-chimi-ecosystem)
 *   8. OG (og:type, og:title, og:description, og:url, og:image, og:site_name, og:locale)
 *   9. Twitter (twitter:card, twitter:site, twitter:creator, twitter:title, twitter:description, twitter:image)
 *  10. Favicon links + manifest
 *  11. Theme color
 *  12. Font preload
 *  13. Hero image preload (optional)
 *  14. JSON-LD blocks
 */

import { defaultsForSite, resolveCanonical, resolveAbsoluteUrl } from "./defaults.mjs";
import { buildAlternates, buildHreflangAlternates } from "./alternates.mjs";
import { ensureArray } from "./json-ld.mjs";

/**
 * @typedef SEOHeadProps
 * @property {import("./defaults").SiteId} site
 * @property {string} title
 * @property {string} description
 * @property {string} pathname                                  - The current page's path. Used to compute canonical when not overridden.
 * @property {string}  [canonical]                              - Override absolute URL.
 * @property {boolean} [noindex]                                - When true, robots = "noindex, nofollow".
 * @property {boolean} [includeEcosystemAlternates]             - When true (homes only), emit cross-ecosystem alternate links.
 * @property {Array<{ hreflang: string; href: string }>} [hreflangAlternates]
 * @property {string}  [lang]                                   - Defaults to "es".
 * @property {Object}  [og]
 * @property {"website"|"article"|"profile"|"event"} [og.type]
 * @property {string}  [og.image]
 * @property {string}  [og.imageAlt]
 * @property {string}  [og.locale]
 * @property {string}  [og.publishedTime]
 * @property {string}  [og.modifiedTime]
 * @property {string}  [og.author]
 * @property {string}  [og.section]
 * @property {string[]} [og.tags]
 * @property {Object}  [twitter]
 * @property {"summary"|"summary_large_image"} [twitter.card]
 * @property {string}  [twitter.site]
 * @property {string}  [twitter.creator]
 * @property {Array<object> | object} [jsonLd]
 * @property {boolean} [preloadFonts]                            - Defaults to true.
 * @property {string[]} [preloadFontUrls]                        - When omitted, falls back to the DS canonical font URLs.
 * @property {string}  [preloadImage]                            - Hero / LCP image (absolute or path); also rendered with `fetchpriority="high"` by the consumer.
 * @property {{ favicon?: string; favicon32?: string; appleTouchIcon?: string; maskIcon?: string; manifest?: string }} [icons]
 * @property {string}  [titleTemplate]                           - When provided, used as `template.replace("%s", title)`. Defaults to `"<title> · <siteName>"` (with the home page using just `<siteName>`).
 * @property {boolean} [isHome]                                  - When true and `titleTemplate` is omitted, the rendered title is just `<siteName>` (avoids "Chimichurri Code · Chimichurri Code" duplication on the root URL).
 */

const DEFAULT_FONT_URLS = [
  "/fonts/AtAero-Regular.otf",
  "/fonts/AtAero-Bold.otf",
  "/fonts/CHANEY-Regular.otf",
];

const DEFAULT_ICONS = {
  favicon: "/favicon.svg",
  favicon32: "/favicon-32x32.png",
  appleTouchIcon: "/apple-touch-icon.png",
  maskIcon: "/mask-icon.svg",
  manifest: "/manifest.webmanifest",
};

/**
 * Escape characters with special meaning in HTML attribute values.
 *
 * @param {unknown} value
 * @returns {string}
 */
function attr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escape characters with special meaning in HTML text content (no
 * attribute-quote escaping; intended for `<title>` text).
 *
 * @param {unknown} value
 */
function text(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Sanitise a JSON-LD payload before injecting into a script tag.
 *
 * The only character that can break out of `<script type="application/ld+json">`
 * is `<` (e.g. `</script>` inside a string). Replacing `<` with its
 * unicode-escape preserves JSON validity and prevents injection.
 *
 * @param {unknown} payload
 * @returns {string}
 */
function jsonLdScriptBody(payload) {
  return JSON.stringify(payload).replace(/</g, "\\u003c").replace(/-->/g, "--\\u003e");
}

/**
 * Render the full SEO head as a string of HTML tags.
 *
 * The output omits `<head>` itself and the `<html lang>` attribute —
 * those are the consumer's responsibility (Astro emits its own `<html>`,
 * and the brand inject script preserves the existing one). Returns a
 * single string with leading/trailing newlines so it can be inserted
 * cleanly between markers.
 *
 * @param {SEOHeadProps} props
 * @returns {string}
 */
export function renderSEOHeadHTML(props) {
  if (!props || !props.site) {
    throw new Error('[chimi/seo] renderSEOHeadHTML requires a `site` prop.');
  }
  const d = defaultsForSite(props.site);

  const description = props.description?.trim() || d.defaultDescription;
  const lang = props.lang ?? d.lang;
  const canonical =
    props.canonical && /^https?:\/\//i.test(props.canonical)
      ? props.canonical
      : resolveCanonical(props.site, props.pathname ?? "/");

  const renderedTitle = props.titleTemplate
    ? props.titleTemplate.replace("%s", props.title)
    : props.isHome
      ? d.siteName
      : `${props.title} · ${d.siteName}`;

  const ogType = props.og?.type ?? "website";
  const ogImage = resolveAbsoluteUrl(props.site, props.og?.image ?? d.defaultOgImage);
  const ogImageAlt = props.og?.imageAlt ?? d.defaultOgImageAlt;
  const ogLocale = props.og?.locale ?? d.locale;

  const twitterCard = props.twitter?.card ?? "summary_large_image";
  const twitterSite = props.twitter?.site ?? d.twitterSite;
  const twitterCreator = props.twitter?.creator ?? d.twitterCreator;

  const icons = { ...DEFAULT_ICONS, ...(props.icons ?? {}) };

  const lines = [];
  lines.push(`<title>${text(renderedTitle)}</title>`);
  lines.push(`<meta name="description" content="${attr(description)}">`);
  lines.push(`<link rel="canonical" href="${attr(canonical)}">`);
  if (props.noindex) {
    lines.push(`<meta name="robots" content="noindex, nofollow">`);
  } else {
    lines.push(`<meta name="robots" content="index, follow">`);
  }

  if (Array.isArray(props.hreflangAlternates) && props.hreflangAlternates.length) {
    for (const alt of buildHreflangAlternates(props.hreflangAlternates)) {
      lines.push(`<link rel="${attr(alt.rel)}" hreflang="${attr(alt.hreflang)}" href="${attr(alt.href)}">`);
    }
  }

  if (props.includeEcosystemAlternates) {
    for (const alt of buildAlternates(props.site)) {
      lines.push(
        `<link rel="alternate" data-chimi-ecosystem="true" href="${attr(alt.href)}" title="${attr(alt.title)}">`,
      );
    }
  }

  lines.push(`<meta property="og:type" content="${attr(ogType)}">`);
  lines.push(`<meta property="og:title" content="${attr(props.title)}">`);
  lines.push(`<meta property="og:description" content="${attr(description)}">`);
  lines.push(`<meta property="og:url" content="${attr(canonical)}">`);
  lines.push(`<meta property="og:image" content="${attr(ogImage)}">`);
  lines.push(`<meta property="og:image:alt" content="${attr(ogImageAlt)}">`);
  lines.push(`<meta property="og:site_name" content="${attr(d.siteName)}">`);
  lines.push(`<meta property="og:locale" content="${attr(ogLocale)}">`);
  if (ogType === "article") {
    if (props.og?.publishedTime)
      lines.push(`<meta property="article:published_time" content="${attr(props.og.publishedTime)}">`);
    if (props.og?.modifiedTime)
      lines.push(`<meta property="article:modified_time" content="${attr(props.og.modifiedTime)}">`);
    if (props.og?.author)
      lines.push(`<meta property="article:author" content="${attr(props.og.author)}">`);
    if (props.og?.section)
      lines.push(`<meta property="article:section" content="${attr(props.og.section)}">`);
    if (Array.isArray(props.og?.tags)) {
      for (const tag of props.og.tags) {
        lines.push(`<meta property="article:tag" content="${attr(tag)}">`);
      }
    }
  }

  lines.push(`<meta name="twitter:card" content="${attr(twitterCard)}">`);
  lines.push(`<meta name="twitter:site" content="${attr(twitterSite)}">`);
  lines.push(`<meta name="twitter:creator" content="${attr(twitterCreator)}">`);
  lines.push(`<meta name="twitter:title" content="${attr(props.title)}">`);
  lines.push(`<meta name="twitter:description" content="${attr(description)}">`);
  lines.push(`<meta name="twitter:image" content="${attr(ogImage)}">`);
  lines.push(`<meta name="twitter:image:alt" content="${attr(ogImageAlt)}">`);

  lines.push(`<link rel="icon" type="image/svg+xml" href="${attr(icons.favicon)}">`);
  lines.push(`<link rel="alternate icon" type="image/png" sizes="32x32" href="${attr(icons.favicon32)}">`);
  lines.push(`<link rel="apple-touch-icon" sizes="180x180" href="${attr(icons.appleTouchIcon)}">`);
  lines.push(`<link rel="mask-icon" href="${attr(icons.maskIcon)}" color="${attr(d.maskIconColor)}">`);
  lines.push(`<link rel="manifest" href="${attr(icons.manifest)}">`);
  lines.push(`<meta name="theme-color" content="${attr(d.themeColor)}">`);
  lines.push(`<meta name="msapplication-TileColor" content="${attr(d.themeColor)}">`);

  const fontUrls = props.preloadFontUrls ?? DEFAULT_FONT_URLS;
  if (props.preloadFonts !== false && fontUrls.length) {
    for (const href of fontUrls) {
      lines.push(
        `<link rel="preload" as="font" type="font/woff2" href="${attr(href)}" crossorigin="anonymous">`,
      );
    }
  }

  if (props.preloadImage) {
    const heroAbs = resolveAbsoluteUrl(props.site, props.preloadImage);
    lines.push(`<link rel="preload" as="image" href="${attr(heroAbs)}" fetchpriority="high">`);
  }

  /** @type {object[]} */
  const ldBlocks = ensureArray(props.jsonLd).flat();
  for (const block of ldBlocks) {
    lines.push(
      `<script type="application/ld+json">${jsonLdScriptBody(block)}</script>`,
    );
  }

  return `${lines.join("\n")}\n`;
}

/** @type {string[]} */
export const SEO_HEAD_DEFAULT_FONT_URLS = DEFAULT_FONT_URLS;
/** @type {typeof DEFAULT_ICONS} */
export const SEO_HEAD_DEFAULT_ICONS = DEFAULT_ICONS;
