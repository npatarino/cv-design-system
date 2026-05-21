/**
 * @file JSON-LD dispatcher for the SEO head.
 *
 * Each kind maps to a schema.org type covering the page's primary
 * entity. Helpers always return a plain JSON-serialisable object with
 * `@context` and `@type` set; the head renderer wraps each result in
 * `<script type="application/ld+json">`.
 *
 * Reference: https://schema.org/. The `schema-dts` typings are loaded
 * only as a devDependency; we keep the helpers JS-typed via JSDoc so
 * non-Astro consumers (Eleventy, brand build script) can call them
 * without a TS toolchain.
 */

import { defaultsForSite, resolveAbsoluteUrl } from "./defaults.mjs";

const CTX = "https://schema.org";

/**
 * @typedef {"home"|"article"|"breadcrumb"|"person"|"event"|"scholarly-article"|"software-application"|"presentation"|"webpage"} JsonLdKind
 */

/**
 * @typedef BuildJsonLdInput
 * @property {JsonLdKind} kind
 * @property {import("./defaults.mjs").SiteId} siteId
 * @property {Record<string, unknown>} data
 */

/**
 * Validate at runtime that all required keys exist and are non-empty
 * strings. Throws to make the linter / build catch missing data.
 *
 * @param {string} kind
 * @param {Record<string, unknown>} data
 * @param {string[]} required
 */
function requireKeys(kind, data, required) {
  const missing = required.filter((k) => {
    const v = data[k];
    return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
  });
  if (missing.length) {
    throw new Error(
      `[chimi/seo] buildJsonLd kind="${kind}" missing required field(s): ${missing.join(", ")}`,
    );
  }
}

/**
 * Build a `WebSite` + `Organization` pair for any web's home page.
 * Returns an array of two JSON-LD objects so callers can spread into
 * the head:
 *   `jsonLd: [...buildHomeJsonLd(...)]`
 *
 * @param {import("./defaults.mjs").SiteId} siteId
 * @param {{ socials?: string[] }} [data]
 * @returns {object[]}
 */
function buildHome(siteId, data = {}) {
  const d = defaultsForSite(siteId);
  const socials = Array.isArray(data.socials) ? data.socials : [];
  return [
    {
      "@context": CTX,
      "@type": "WebSite",
      name: d.siteName,
      url: `${d.canonicalBase}/`,
      description: d.defaultDescription,
      inLanguage: d.lang,
    },
    {
      "@context": CTX,
      "@type": "Organization",
      name: "Chimichurri Code",
      url: "https://chimi.pro",
      logo: "https://chimi.pro/favicon.svg",
      ...(socials.length ? { sameAs: socials } : {}),
    },
  ];
}

/**
 * Article schema for blog posts.
 *
 * @param {import("./defaults.mjs").SiteId} siteId
 * @param {{ headline: string; description?: string; url: string; datePublished: string; dateModified?: string; author?: string; image?: string; tags?: string[]; section?: string }} data
 */
function buildArticle(siteId, data) {
  requireKeys("article", data, ["headline", "url", "datePublished"]);
  const d = defaultsForSite(siteId);
  const url = resolveAbsoluteUrl(siteId, data.url);
  const image = data.image
    ? resolveAbsoluteUrl(siteId, data.image)
    : resolveAbsoluteUrl(siteId, d.defaultOgImage);
  return {
    "@context": CTX,
    "@type": "Article",
    headline: data.headline,
    description: data.description ?? d.defaultDescription,
    image,
    datePublished: data.datePublished,
    ...(data.dateModified ? { dateModified: data.dateModified } : {}),
    author: {
      "@type": "Person",
      name: data.author ?? "Nicolás Patarino",
      url: "https://chimi.pro/sobre-mi",
    },
    publisher: {
      "@type": "Organization",
      name: "Chimichurri Code",
      logo: {
        "@type": "ImageObject",
        url: "https://chimi.pro/favicon.svg",
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    inLanguage: d.lang,
    ...(data.section ? { articleSection: data.section } : {}),
    ...(Array.isArray(data.tags) && data.tags.length ? { keywords: data.tags.join(", ") } : {}),
  };
}

/**
 * BreadcrumbList for a hierarchy of pages.
 *
 * @param {import("./defaults.mjs").SiteId} siteId
 * @param {{ items: Array<{ name: string; url: string }> }} data
 */
function buildBreadcrumb(siteId, data) {
  if (!Array.isArray(data.items) || data.items.length < 2) {
    throw new Error('[chimi/seo] buildJsonLd kind="breadcrumb" requires at least 2 items.');
  }
  return {
    "@context": CTX,
    "@type": "BreadcrumbList",
    itemListElement: data.items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: resolveAbsoluteUrl(siteId, item.url),
    })),
  };
}

/**
 * Person schema for sobre-mí style pages.
 *
 * @param {import("./defaults.mjs").SiteId} siteId
 * @param {{ name: string; jobTitle?: string; description?: string; url?: string; image?: string; sameAs?: string[] }} data
 */
function buildPerson(siteId, data) {
  requireKeys("person", data, ["name"]);
  const d = defaultsForSite(siteId);
  return {
    "@context": CTX,
    "@type": "Person",
    name: data.name,
    ...(data.jobTitle ? { jobTitle: data.jobTitle } : {}),
    ...(data.description ? { description: data.description } : {}),
    url: data.url ? resolveAbsoluteUrl(siteId, data.url) : d.canonicalBase,
    ...(data.image ? { image: resolveAbsoluteUrl(siteId, data.image) } : {}),
    ...(Array.isArray(data.sameAs) && data.sameAs.length ? { sameAs: data.sameAs } : {}),
  };
}

/**
 * Event schema for techconf and similar.
 *
 * @param {import("./defaults.mjs").SiteId} siteId
 * @param {{ name: string; description?: string; startDate: string; endDate?: string; url?: string; locationName?: string; locationAddress?: string; eventStatus?: string; eventAttendanceMode?: string; image?: string; organizerName?: string; organizerUrl?: string }} data
 */
function buildEvent(siteId, data) {
  requireKeys("event", data, ["name", "startDate"]);
  const d = defaultsForSite(siteId);
  return {
    "@context": CTX,
    "@type": "Event",
    name: data.name,
    description: data.description ?? d.defaultDescription,
    startDate: data.startDate,
    ...(data.endDate ? { endDate: data.endDate } : {}),
    eventStatus: data.eventStatus ?? "https://schema.org/EventScheduled",
    eventAttendanceMode:
      data.eventAttendanceMode ?? "https://schema.org/OfflineEventAttendanceMode",
    url: data.url ? resolveAbsoluteUrl(siteId, data.url) : d.canonicalBase,
    image: data.image
      ? resolveAbsoluteUrl(siteId, data.image)
      : resolveAbsoluteUrl(siteId, d.defaultOgImage),
    ...(data.locationName
      ? {
          location: {
            "@type": "Place",
            name: data.locationName,
            ...(data.locationAddress ? { address: data.locationAddress } : {}),
          },
        }
      : {}),
    organizer: {
      "@type": "Organization",
      name: data.organizerName ?? d.siteName,
      url: data.organizerUrl ?? d.canonicalBase,
    },
  };
}

/**
 * ScholarlyArticle for RC4P paper details.
 *
 * @param {import("./defaults.mjs").SiteId} siteId
 * @param {{ headline: string; abstract?: string; url: string; datePublished?: string; author?: string; keywords?: string[]; image?: string }} data
 */
function buildScholarlyArticle(siteId, data) {
  requireKeys("scholarly-article", data, ["headline", "url"]);
  const d = defaultsForSite(siteId);
  return {
    "@context": CTX,
    "@type": "ScholarlyArticle",
    headline: data.headline,
    ...(data.abstract ? { abstract: data.abstract } : {}),
    url: resolveAbsoluteUrl(siteId, data.url),
    ...(data.datePublished ? { datePublished: data.datePublished } : {}),
    author: {
      "@type": "Person",
      name: data.author ?? "Nicolás Patarino",
    },
    image: data.image
      ? resolveAbsoluteUrl(siteId, data.image)
      : resolveAbsoluteUrl(siteId, d.defaultOgImage),
    publisher: {
      "@type": "Organization",
      name: d.siteName,
      url: d.canonicalBase,
    },
    inLanguage: d.lang,
    ...(Array.isArray(data.keywords) && data.keywords.length
      ? { keywords: data.keywords.join(", ") }
      : {}),
  };
}

/**
 * SoftwareApplication for utility webs (PDF, Poker).
 *
 * @param {import("./defaults.mjs").SiteId} siteId
 * @param {{ name?: string; description?: string; applicationCategory?: string; operatingSystem?: string; url?: string; price?: string; priceCurrency?: string }} [data]
 */
function buildSoftwareApplication(siteId, data = {}) {
  const d = defaultsForSite(siteId);
  return {
    "@context": CTX,
    "@type": "SoftwareApplication",
    name: data.name ?? d.siteName,
    description: data.description ?? d.defaultDescription,
    applicationCategory: data.applicationCategory ?? "UtilitiesApplication",
    operatingSystem: data.operatingSystem ?? "Any (browser-based)",
    url: data.url ? resolveAbsoluteUrl(siteId, data.url) : `${d.canonicalBase}/`,
    offers: {
      "@type": "Offer",
      price: data.price ?? "0",
      priceCurrency: data.priceCurrency ?? "USD",
    },
    publisher: {
      "@type": "Organization",
      name: "Chimichurri Code",
      url: "https://chimi.pro",
    },
  };
}

/**
 * PresentationDigitalDocument for talks decks.
 *
 * @param {import("./defaults.mjs").SiteId} siteId
 * @param {{ name: string; description?: string; url: string; datePublished?: string; author?: string; thumbnailUrl?: string; numberOfPages?: number }} data
 */
function buildPresentation(siteId, data) {
  requireKeys("presentation", data, ["name", "url"]);
  const d = defaultsForSite(siteId);
  return {
    "@context": CTX,
    "@type": "PresentationDigitalDocument",
    name: data.name,
    description: data.description ?? d.defaultDescription,
    url: resolveAbsoluteUrl(siteId, data.url),
    ...(data.datePublished ? { datePublished: data.datePublished } : {}),
    author: {
      "@type": "Person",
      name: data.author ?? "Nicolás Patarino",
      url: "https://chimi.pro/sobre-mi",
    },
    inLanguage: d.lang,
    ...(data.thumbnailUrl
      ? { thumbnailUrl: resolveAbsoluteUrl(siteId, data.thumbnailUrl) }
      : { thumbnailUrl: resolveAbsoluteUrl(siteId, d.defaultOgImage) }),
    ...(typeof data.numberOfPages === "number" ? { numberOfPages: data.numberOfPages } : {}),
  };
}

/**
 * Plain WebPage schema (used for legal/about pages and the brand book).
 *
 * @param {import("./defaults.mjs").SiteId} siteId
 * @param {{ name: string; description?: string; url: string }} data
 */
function buildWebPage(siteId, data) {
  requireKeys("webpage", data, ["name", "url"]);
  const d = defaultsForSite(siteId);
  return {
    "@context": CTX,
    "@type": "WebPage",
    name: data.name,
    description: data.description ?? d.defaultDescription,
    url: resolveAbsoluteUrl(siteId, data.url),
    inLanguage: d.lang,
    isPartOf: {
      "@type": "WebSite",
      name: d.siteName,
      url: `${d.canonicalBase}/`,
    },
  };
}

/**
 * Dispatcher. Returns either a single JSON-LD object or an array
 * (e.g. `home` returns `[WebSite, Organization]`). Callers should
 * normalise to an array before rendering.
 *
 * @param {BuildJsonLdInput} input
 * @returns {object | object[]}
 */
export function buildJsonLd({ kind, siteId, data }) {
  switch (kind) {
    case "home":
      return buildHome(siteId, /** @type {any} */ (data ?? {}));
    case "article":
      return buildArticle(siteId, /** @type {any} */ (data));
    case "breadcrumb":
      return buildBreadcrumb(siteId, /** @type {any} */ (data));
    case "person":
      return buildPerson(siteId, /** @type {any} */ (data));
    case "event":
      return buildEvent(siteId, /** @type {any} */ (data));
    case "scholarly-article":
      return buildScholarlyArticle(siteId, /** @type {any} */ (data));
    case "software-application":
      return buildSoftwareApplication(siteId, /** @type {any} */ (data ?? {}));
    case "presentation":
      return buildPresentation(siteId, /** @type {any} */ (data));
    case "webpage":
      return buildWebPage(siteId, /** @type {any} */ (data));
    default: {
      const exhaustive = /** @type {never} */ (kind);
      throw new Error(`[chimi/seo] Unknown JSON-LD kind: ${exhaustive}`);
    }
  }
}

/**
 * Normalise the result of `buildJsonLd` (or hand-written JSON-LD) to
 * an array. Convenience for SEOHead, which always treats the prop as
 * a list of blocks.
 *
 * @param {object | object[] | undefined | null} input
 * @returns {object[]}
 */
export function ensureArray(input) {
  if (input == null) return [];
  return Array.isArray(input) ? input : [input];
}
