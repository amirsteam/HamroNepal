/**
 * Site settings: the outlet's name, logo, colours and contact details,
 * edited by admins in Dashboard → साइट सेटिङ. These defaults apply until an
 * admin saves something, so a fresh install still looks finished.
 */

export interface Localized {
  ne: string;
  en: string;
}

export interface SiteSettings {
  name: Localized;
  tagline: Localized;
  /** Default description for search engines and link previews. */
  description: Localized;
  /** Replaces the text wordmark (and flag) when set. */
  logoUrl: string;
  faviconUrl: string;
  /** Default picture for link previews (1200 × 630). */
  ogImageUrl: string;
  /** The Nepali flag beside the name (when there is no logo). */
  showFlag: boolean;
  colors: {
    /** Breaking news, links, active items. */
    primary: string;
    /** Menu bar, footer. */
    secondary: string;
    /** Headlines. */
    ink: string;
  };
  contact: { address: Localized; phone: string; email: string };
  social: { facebook: string; x: string; instagram: string; youtube: string; tiktok: string };
  /** The /en edition and its language switch. */
  englishEdition: boolean;
  /** Print masthead details. */
  print: { regNo: string; price: string; email: string };
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  name: { ne: "हाम्रो नेपाल", en: "Hamro Nepal" },
  tagline: { ne: "तपाईंको ठाउँको, देशभरको समाचार", en: "News from your place and all of Nepal" },
  description: {
    ne: "नेपालको विश्वसनीय समाचार पोर्टल। राजनीति, अर्थतन्त्र, खेलकुद, मनोरञ्जन र स्थानीय समाचार।",
    en: "Trusted news from Nepal: politics, the economy, sports, entertainment and local news.",
  },
  logoUrl: "",
  faviconUrl: "",
  ogImageUrl: "",
  showFlag: true,
  colors: { primary: "#c8102e", secondary: "#003893", ink: "#10213f" },
  contact: { address: { ne: "काठमाडौं, नेपाल", en: "Kathmandu, Nepal" }, phone: "", email: "" },
  social: { facebook: "", x: "", instagram: "", youtube: "", tiktok: "" },
  englishEdition: true,
  print: { regNo: "", price: "५", email: "" },
};

/** Saved values over the defaults (missing or empty names fall back). */
export function mergeSiteSettings(saved?: Partial<SiteSettings> | null): SiteSettings {
  const d = DEFAULT_SITE_SETTINGS;
  const s = saved ?? {};
  const loc = (v: Partial<Localized> | undefined, def: Localized): Localized => ({
    ne: v?.ne?.trim() || def.ne,
    en: v?.en?.trim() || def.en,
  });
  return {
    name: loc(s.name, d.name),
    tagline: loc(s.tagline, d.tagline),
    description: loc(s.description, d.description),
    logoUrl: s.logoUrl ?? d.logoUrl,
    faviconUrl: s.faviconUrl ?? d.faviconUrl,
    ogImageUrl: s.ogImageUrl ?? d.ogImageUrl,
    showFlag: s.showFlag ?? d.showFlag,
    colors: {
      primary: isHex(s.colors?.primary) ? s.colors!.primary : d.colors.primary,
      secondary: isHex(s.colors?.secondary) ? s.colors!.secondary : d.colors.secondary,
      ink: isHex(s.colors?.ink) ? s.colors!.ink : d.colors.ink,
    },
    contact: {
      address: { ne: s.contact?.address?.ne ?? d.contact.address.ne, en: s.contact?.address?.en ?? d.contact.address.en },
      phone: s.contact?.phone ?? d.contact.phone,
      email: s.contact?.email ?? d.contact.email,
    },
    social: { ...d.social, ...(s.social ?? {}) },
    englishEdition: s.englishEdition ?? d.englishEdition,
    print: { ...d.print, ...(s.print ?? {}) },
  };
}

export const isHex = (v?: string | null): v is string => !!v && /^#[0-9a-f]{6}$/i.test(v);

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** A darker shade (hover states): `amount` 0–1. */
export function darken(hex: string, amount = 0.2): string {
  return `#${rgb(hex)
    .map((c) => Math.round(c * (1 - amount)).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** WCAG contrast ratio between two colours (1–21). Text needs 4.5 (3 for large text). */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = rgb(hex).map((c) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** "हाम्रो नेपाल AI डेस्क": the byline of the AI pipeline's drafts. */
export const aiDeskName = (siteName: string) => `${siteName} AI डेस्क`;
export const aiDeskNameEn = (siteNameEn: string) => `${siteNameEn} AI Desk`;
