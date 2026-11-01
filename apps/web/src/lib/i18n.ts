/**
 * The English site: the same pages under /en (/en/news/<slug>, /en/category/<slug>…).
 *
 * The language comes from the URL, so every page has one address per language
 * (what the API's hreflang tags and sitemap point to). Stories come translated
 * from the API (?lang=en); this file holds the site's own words.
 */

import { useLocation } from "react-router-dom";
import { localDigits } from "@hamronepal/shared";
import type { Lang } from "@/types";

export type { Lang };

export function langFromPath(pathname: string): Lang {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "ne";
}

/** A site path in a language: "/news/x" → "/en/news/x" on the English site. */
export function localPath(path: string, lang: Lang): string {
  if (lang === "ne") return path;
  return path === "/" ? "/en" : `/en${path.startsWith("/") ? path : `/${path}`}`;
}

/** The same page in the other language (keeps ?query). */
export function otherLanguagePath(pathname: string, search: string, to: Lang): string {
  const bare = langFromPath(pathname) === "en" ? pathname.slice(3) || "/" : pathname;
  return localPath(bare, to) + search;
}

/** For API calls: only the English site adds ?lang=en, so Nepali URLs (and caches) stay as they were. */
export const langQuery = (lang?: Lang) => (lang === "en" ? "en" : undefined);

/** The pipeline's system author; shown under its English name on the English site. */
const AI_DESK_NAME = "हाम्रो नेपाल AI डेस्क";

const ne = {
  siteName: "हाम्रो नेपाल",
  brand: ["हाम्रो", "नेपाल"] as [string, string],
  tagline: "तपाईंको ठाउँको, देशभरको समाचार",
  defaultTitle: "हाम्रो नेपाल - नेपालको विश्वसनीय समाचार पोर्टल",
  homeHeading: "हाम्रो नेपाल – ताजा नेपाली समाचार",
  homeLink: "हाम्रो नेपाल गृहपृष्ठ",
  home: "गृहपृष्ठ",
  search: "खोज्नुहोस्",
  menu: "मेनु",
  mainMenu: "मुख्य मेनु",
  mobileMenu: "मोबाइल मेनु",
  openMenu: "मेनु खोल्नुहोस्",
  closeMenu: "मेनु बन्द गर्नुहोस्",
  categories: "श्रेणीहरू",
  local: "स्थानीय",
  localNews: "स्थानीय समाचार",
  allOf: (name: string) => `सबै ${name}`,
  breaking: "ब्रेकिङ",
  copyrightShort: "© हाम्रो नेपाल न्युज पोर्टल",
  /** Link to the other language (shown in that language). */
  switchLabel: "English",
  switchTitle: "Read Hamro Nepal in English",

  // footer
  about: "नेपालको विश्वसनीय समाचार पोर्टल। राजनीति, अर्थतन्त्र, खेलकुद, मनोरञ्जन र अन्य विविध समाचारहरू।",
  quickLinks: "द्रुत लिङ्कहरू",
  allNews: "सबै समाचार",
  rssFeed: "RSS फिड",
  newsCategories: "समाचार श्रेणीहरू",
  footerTopics: [
    ["rajniti", "राजनीति"],
    ["arthatantra", "अर्थतन्त्र"],
    ["khelkud", "खेलकुद"],
    ["manoranjan", "मनोरञ्जन"],
  ] as Array<[string, string]>,
  contact: "सम्पर्क",
  phone: "फोन",
  email: "इमेल",
  rights: (year: string) => `© ${year} हाम्रो नेपाल। सर्वाधिकार सुरक्षित।`,
  pexelsBefore: "केही प्रतीकात्मक तस्बिरहरू",
  pexelsAfter: "बाट।",

  // home
  topStories: "मुख्य समाचार",
  latestNews: "ताजा समाचार",
  seeAll: "सबै हेर्नुहोस्",
  seeMore: "थप हेर्नुहोस्",
  localPrefix: (name: string) => `स्थानीय: ${name}`,
  moreNews: "अन्य समाचार",
  homeError: "गृहपृष्ठ लोड गर्न सकिएन।",
  homeEmpty: "अहिले कुनै समाचार छैन।",
  homeEmptyLink: "",

  // category
  breadcrumb: "ब्रेडक्रम्ब",
  categoryNotFound: "श्रेणी भेटिएन।",
  categoryError: "श्रेणी लोड गर्न सकिएन।",
  loading: "लोड हुँदैछ...",
  totalNews: (n: string) => `कुल ${n} समाचार`,
  newsHeading: "समाचारहरू",
  loadMoreNews: "थप समाचार हेर्नुहोस्",
  categoryEmpty: "यस श्रेणीमा कुनै समाचार छैन।",

  // article
  articleNotFound: "समाचार भेटिएन।",
  articleError: "समाचार लोड गर्न सकिएन।",
  views: (n: string) => `${n} पटक हेरिएको`,
  aiNote: (source?: string) =>
    `यो समाचार AI को सहायताले ${source ? `${source}को` : "अन्य सञ्चारमाध्यमको"} रिपोर्टका आधारमा तयार पारी हाम्रो सम्पादकले जाँच गरेका हुन्।`,
  tags: "ट्यागहरू:",
  share: "सेयर गर्नुहोस्:",
  related: "सम्बन्धित समाचार",
  noRelated: "कुनै सम्बन्धित समाचार भेटिएन।",
  notTranslated: "",
  readInNepali: "",

  // search
  searchTitle: "खोज",
  searchHeading: "समाचार खोज",
  searchLabel: "समाचार खोज्नुहोस्",
  searchPlaceholder: "समाचार खोज्नुहोस्...",
  searchError: "खोज्न सकिएन।",
  searchFound: (q: string, n: string) => `“${q}” को लागि ${n} समाचार भेटिए`,
  searchNone: "कुनै समाचार भेटिएन। अर्को शब्दले खोज्नुहोस्।",
  moreResults: "थप समाचार",
  noNews: "कुनै समाचार भेटिएन।",

  // 404
  notFoundTitle: "पृष्ठ भेटिएन",
  notFoundText: "तपाईंले खोज्नुभएको पृष्ठ अवस्थित छैन वा हटाइएको हुन सक्छ।",
  goHome: "गृहपृष्ठमा जानुहोस्",

  // shared bits
  errorTitle: "त्रुटि भयो",
  errorMessage: "डाटा लोड गर्न सकिएन। कृपया पुन: प्रयास गर्नुहोस्।",
  retry: "पुन: प्रयास गर्नुहोस्",
  ad: "विज्ञापन",
  close: "बन्द गर्नुहोस्",
  symbolicPhoto: "प्रतीकात्मक तस्बिर",
  photo: "फोटो:",

  // weather
  weather: "मौसम",
  weatherCity: "मौसम हेर्ने सहर",
  weatherDefault: "पूर्वनिर्धारित",
  myLocation: "मेरो स्थान",
  weatherOfficial: "आधिकारिक मौसम पूर्वानुमान (जल तथा मौसम विज्ञान विभाग)",
  feelsLike: "महसुस",
  humidity: "आर्द्रता",
  weatherLoading: "मौसम लोड हुँदै…",
  weatherForecast: "मौसम पूर्वानुमान हेर्नुहोस् ↗",
  noGeolocation: "यो ब्राउजरमा स्थान पत्ता लगाउन मिल्दैन।",
  geolocationFailed: "स्थान पत्ता लाग्न सकेन। सूचीबाट सहर छान्नुहोस्।",
};

export type Strings = typeof ne;

const en: Strings = {
  siteName: "Hamro Nepal",
  brand: ["Hamro", "Nepal"],
  tagline: "News from your town and all of Nepal",
  defaultTitle: "Hamro Nepal - Trusted news from Nepal",
  homeHeading: "Hamro Nepal – latest news from Nepal in English",
  homeLink: "Hamro Nepal home",
  home: "Home",
  search: "Search",
  menu: "Menu",
  mainMenu: "Main menu",
  mobileMenu: "Mobile menu",
  openMenu: "Open menu",
  closeMenu: "Close menu",
  categories: "Sections",
  local: "Local",
  localNews: "Local news",
  allOf: (name: string) => `All of ${name}`,
  breaking: "Breaking",
  copyrightShort: "© Hamro Nepal news portal",
  switchLabel: "नेपाली",
  switchTitle: "हाम्रो नेपाल नेपालीमा पढ्नुहोस्",

  about: "Trusted news from Nepal: politics, the economy, sports, entertainment and more, in English.",
  quickLinks: "Quick links",
  allNews: "All news",
  rssFeed: "RSS feed (Nepali)",
  newsCategories: "Sections",
  footerTopics: [
    ["rajniti", "Politics"],
    ["arthatantra", "Economy"],
    ["khelkud", "Sports"],
    ["manoranjan", "Entertainment"],
  ],
  contact: "Contact",
  phone: "Phone",
  email: "Email",
  rights: (year: string) => `© ${year} Hamro Nepal. All rights reserved.`,
  pexelsBefore: "Some representative photos from",
  pexelsAfter: ".",

  topStories: "Top stories",
  latestNews: "Latest news",
  seeAll: "See all",
  seeMore: "See more",
  localPrefix: (name: string) => `Local: ${name}`,
  moreNews: "More news",
  homeError: "Could not load the home page.",
  homeEmpty: "English versions of our stories will appear here soon.",
  homeEmptyLink: "Read the latest news in Nepali →",

  breadcrumb: "Breadcrumb",
  categoryNotFound: "Section not found.",
  categoryError: "Could not load this section.",
  loading: "Loading...",
  totalNews: (n: string) => `${n} ${n === "1" ? "story" : "stories"}`,
  newsHeading: "Stories",
  loadMoreNews: "Load more stories",
  categoryEmpty: "No English stories in this section yet.",

  articleNotFound: "Story not found.",
  articleError: "Could not load this story.",
  views: (n: string) => `${n} ${n === "1" ? "view" : "views"}`,
  aiNote: (source?: string) =>
    `This story was prepared with the help of AI from ${source ? `a report by ${source}` : "other outlets' reports"}, checked by our editors and translated into English.`,
  tags: "Tags:",
  share: "Share:",
  related: "Related news",
  noRelated: "No related news found.",
  notTranslated: "This story is not available in English yet. Here is the Nepali original.",
  readInNepali: "Read on the Nepali site",

  searchTitle: "Search",
  searchHeading: "Search news",
  searchLabel: "Search news",
  searchPlaceholder: "Search news in English...",
  searchError: "Search failed.",
  searchFound: (q: string, n: string) => `${n} ${n === "1" ? "story" : "stories"} found for “${q}”`,
  searchNone: "No stories found. Try another word.",
  moreResults: "More results",
  noNews: "No stories found.",

  notFoundTitle: "Page not found",
  notFoundText: "The page you are looking for does not exist or may have been removed.",
  goHome: "Go to the home page",

  errorTitle: "Something went wrong",
  errorMessage: "Could not load the data. Please try again.",
  retry: "Try again",
  ad: "Advertisement",
  close: "Close",
  symbolicPhoto: "Representative image",
  photo: "Photo:",

  weather: "Weather",
  weatherCity: "City for the weather",
  weatherDefault: "default",
  myLocation: "My location",
  weatherOfficial: "Official weather forecast (Department of Hydrology and Meteorology)",
  feelsLike: "Feels like",
  humidity: "Humidity",
  weatherLoading: "Loading weather…",
  weatherForecast: "See the forecast ↗",
  noGeolocation: "This browser cannot find your location.",
  geolocationFailed: "Could not find your location. Choose a city from the list.",
};

export const STRINGS: Record<Lang, Strings> = { ne, en };

/** Author line: the AI desk has an English name; people's names are shown as written. */
export function authorLabel(name: string | undefined, lang: Lang): string | undefined {
  return lang === "en" && name === AI_DESK_NAME ? "Hamro Nepal AI Desk" : name;
}

/** The page's language from the URL. Only for components inside the router. */
export function useLang(): Lang {
  return langFromPath(useLocation().pathname);
}

/** Everything a public component needs for the reader's language. */
export function useT() {
  const lang = useLang();
  return {
    lang,
    t: STRINGS[lang],
    /** A site path in this language. */
    to: (path: string) => localPath(path, lang),
    /** Digits in this language (१२ / 12). */
    num: (n: number | string) => localDigits(n, lang),
  };
}
