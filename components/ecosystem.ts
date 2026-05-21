import { sitesWithRole, type SiteEntry } from "../site-registry";

export interface EcosystemSite {
  id: string;
  name: string;
  url: string;
  description: string;
  /**
   * Site-specific logo, served from the consumer's public root after
   * `seo-prebuild` copies `design-system/assets/logos/<id>/*.svg` into
   * `public/logos/<id>/`. Sites without a logo fall back to text-only
   * rendering in `SiteHeader` and `SiteFooter`.
   */
  logoSrc?: SiteEntry["logoSrc"];
}

export interface SocialLink {
  href: string;
  label: string;
  icon: "youtube" | "twitter" | "linkedin" | "github";
}

/** @deprecated use `sitesWithRole("chrome")` from `@chimi/design-system/site-registry`. */
export const ECOSYSTEM_SITES: EcosystemSite[] = sitesWithRole("chrome").map((s) => ({
  id: s.id,
  name: s.name,
  url: s.url,
  description: s.description,
  logoSrc: s.logoSrc,
}));

export const DEFAULT_SOCIALS: SocialLink[] = [
  { href: "https://youtube.com/@chimichurricode", label: "YouTube", icon: "youtube" },
  { href: "https://twitter.com/npatarino", label: "X / Twitter", icon: "twitter" },
  { href: "https://linkedin.com/in/npatarino", label: "LinkedIn", icon: "linkedin" },
  { href: "https://github.com/npatarino", label: "GitHub", icon: "github" },
];

export function ecosystemLinksExcluding(currentId: string): EcosystemSite[] {
  return ECOSYSTEM_SITES.filter((s) => s.id !== currentId);
}
