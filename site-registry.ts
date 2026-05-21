export interface SiteEntry {
  readonly id: SiteId;
  readonly name: string;
  readonly url: string;          // canonical https URL, no trailing slash
  readonly description: string;  // ≤ 80 chars for tooltips
  readonly chrome: boolean;      // include in cross-web chrome (header/footer)?
  readonly seo: boolean;         // has its own SEO surface (sitemap, manifest, OG, alternates)?
  readonly themeColor: string;   // hex, used by manifest theme_color + Safari pinned tab
  readonly backgroundColor: string;
  readonly maskIconColor: string;
  readonly logoSrc?: { logo: string; logoDark?: string; favicon: string };
}

export type SiteId =
  | "blog"
  | "techconf"
  | "recall-for-papers"
  | "simple-pdf-converter"
  | "simple-scrum-poker"
  | "simple-json-diff"
  | "simple-web-validator"
  | "simple-radar-skills"
  | "simple-font-tester"
  | "talks"
  | "brand";

const SITE_REGISTRY: readonly SiteEntry[] = Object.freeze([
  {
    id: "blog",
    name: "Chimichurri Code",
    url: "https://chimi.pro",
    description: "Blog, podcast y charlas sobre software, liderazgo y artesanía técnica.",
    chrome: true,
    seo: true,
    themeColor: "#1B1B1B",
    backgroundColor: "#1B1B1B",
    maskIconColor: "#02B5B9",
  },
  {
    id: "techconf",
    name: "TechConf",
    url: "https://techconf.chimi.pro",
    description: "Conferencias técnicas en España con foco en mobile, plataforma y backend.",
    chrome: true,
    seo: true,
    themeColor: "#02898C",
    backgroundColor: "#02898C",
    maskIconColor: "#02898C",
  },
  {
    id: "recall-for-papers",
    name: "reCall4Papers",
    url: "https://recall.chimi.pro",
    description: "Pulí tu propuesta de charla con feedback estructurado y herramientas concretas.",
    chrome: true,
    seo: true,
    themeColor: "#1B1B1B",
    backgroundColor: "#1B1B1B",
    maskIconColor: "#02B5B9",
  },
  {
    id: "simple-pdf-converter",
    name: "Simple PDF Converter",
    url: "https://pdf.chimi.pro",
    description: "Herramientas para PDF que corren 100% en el navegador, sin subir tus archivos.",
    chrome: true,
    seo: true,
    themeColor: "#FAFAF8",
    backgroundColor: "#FAFAF8",
    maskIconColor: "#02898C",
  },
  {
    id: "simple-scrum-poker",
    name: "Simple Scrum Poker",
    url: "https://poker.chimi.pro",
    description: "Voto a ciegas para estimar puntos en equipos remotos. Sin login, sin fricción.",
    chrome: true,
    seo: true,
    themeColor: "#D9B038",
    backgroundColor: "#1B1B1B",
    maskIconColor: "#D9B038",
    logoSrc: {
      logo: "/logos/simple-scrum-poker/favicon.svg",
      logoDark: "/logos/simple-scrum-poker/favicon-dark.svg",
      favicon: "/logos/simple-scrum-poker/favicon.svg",
    },
  },
  {
    id: "simple-json-diff",
    name: "Simple JSON Diff",
    url: "https://simple-json-diff.chimi.pro",
    description: "Compará dos JSONs ignorando orden y formato. Diff determinista, 100% en el navegador.",
    chrome: true,
    seo: true,
    themeColor: "#1B1B1B",
    backgroundColor: "#1B1B1B",
    maskIconColor: "#02B5B9",
  },
  {
    id: "simple-web-validator",
    name: "Simple Web Validator",
    url: "https://simple-web-validator.chimi.pro",
    description: "Validador in-browser de meta tags, JSON-LD, sitemap, favicons y headers. Pegá una URL y revisá todo.",
    chrome: true,
    seo: true,
    themeColor: "#1B1B1B",
    backgroundColor: "#1B1B1B",
    maskIconColor: "#02B5B9",
  },
  {
    id: "simple-radar-skills",
    name: "Simple Radar Skills",
    url: "https://radar.chimi.pro",
    description: "Visualizá tu seniority como un radar chart frente a frameworks reales de Big Tech.",
    chrome: true,
    seo: true,
    themeColor: "#1B1B1B",
    backgroundColor: "#1B1B1B",
    maskIconColor: "#02B5B9",
  },
  {
    id: "talks",
    name: "Chimichurri / Talks",
    url: "https://talks.chimi.pro",
    description: "Charlas y decks técnicos de Chimichurri Code, listos para presentar o leer.",
    chrome: false,
    seo: true,
    themeColor: "#1B1B1B",
    backgroundColor: "#1B1B1B",
    maskIconColor: "#02B5B9",
  },
  {
    id: "brand",
    name: "Chimichurri / Brand",
    url: "https://brand.chimi.pro",
    description: "Brand book y guidelines del ecosistema Chimichurri Code.",
    chrome: false,
    seo: true,
    themeColor: "#FAFAF8",
    backgroundColor: "#FAFAF8",
    maskIconColor: "#02898C",
  },
  {
    id: "simple-font-tester",
    name: "Simple Font Tester",
    url: "https://fonts.chimi.pro",
    description: "Probá y compará tus tipografías locales con texto personalizable. 100% privado y local.",
    chrome: true,
    seo: true,
    themeColor: "#1B1B1B",
    backgroundColor: "#1B1B1B",
    maskIconColor: "#02B5B9",
  },
]);

export function siteRegistry(): readonly SiteEntry[] {
  return SITE_REGISTRY;
}

export function getSite(id: SiteId): SiteEntry {
  const site = SITE_REGISTRY.find((s) => s.id === id);
  if (!site) {
    throw new Error(`[chimi/registry] Unknown siteId "${id}".`);
  }
  return site;
}

export function findSite(id: string): SiteEntry | undefined {
  return SITE_REGISTRY.find((s) => s.id === id);
}

export function sitesWithRole(role: "chrome" | "seo"): SiteEntry[] {
  return SITE_REGISTRY.filter((s) => s[role]);
}

export function isSiteId(id: string): id is SiteId {
  return SITE_REGISTRY.some((s) => s.id === id);
}
