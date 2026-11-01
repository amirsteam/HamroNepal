/**
 * Which stories go on which page of the print edition. Pure: no database,
 * no browser, so it can be tested on its own.
 */

export interface PrintStory {
  id: string;
  title: string;
  excerpt: string;
  /** Plain-text paragraphs of the story (no HTML). */
  paragraphs: string[];
  imageUrl?: string;
  imageCredit?: string;
  topicSlug?: string;
  topicName?: string;
  /** Most specific place, e.g. "पनौती". */
  placeName?: string;
  /** Article has a place (local news). */
  isLocal: boolean;
  /** Its place is a priority area (Kavre/Panauti). */
  isPriorityPlace: boolean;
  sourceName?: string;
  isBreaking: boolean;
  isFeatured: boolean;
  publishedAt: Date;
  /** Short link to the full story online (for the QR code). */
  url: string;
}

export type PrintAdPlacement = "print-full" | "print-half" | "print-box" | "print-strip";

export interface PrintAd {
  id: string;
  title: string;
  imageUrl: string;
  placement: PrintAdPlacement;
}

export interface InnerPage {
  number: number;
  section: string;
  /** The whole page is this advertisement (no news). */
  fullAd?: PrintAd;
  /** The lower half of the page is this advertisement. */
  halfAd?: PrintAd;
  /** Advertisements in story boxes. */
  boxAds: PrintAd[];
  /** सम्पादकीय column (page 2). */
  editorial?: PrintStory;
  lead?: PrintStory;
  stories: PrintStory[];
}

export interface IssuePlan {
  front: { lead?: PrintStory; side: PrintStory[]; bottom: PrintStory[]; strip?: PrintAd };
  pages: InnerPage[];
  /** Every story used, in page order (editorial included). */
  used: PrintStory[];
  /** Advertisements that did not fit this issue. */
  unplacedAds: PrintAd[];
}

interface Section {
  title: string;
  /** Takes local (place-tagged) stories. */
  local?: boolean;
  /** Topic slugs this section takes. */
  topics?: string[];
}

/** Inner-page sections in order (page 2 onwards). Extra pages are "विविध". */
export const SECTIONS: Section[] = [
  { title: "राष्ट्रिय", topics: ["rajniti", "samaj"] },
  { title: "स्थानीय", local: true },
  { title: "अर्थ / शिक्षा / स्वास्थ्य", topics: ["arthatantra", "shiksha", "swasthya", "prabidhi"] },
  { title: "अन्तर्राष्ट्रिय", topics: ["antarrashtriya"] },
  { title: "खेलकुद / मनोरञ्जन", topics: ["khelkud", "manoranjan"] },
];
const MISC = "विविध";

export const FRONT_SIDE = 3;
export const FRONT_BOTTOM = 3;
/** Lead + six others on each inner page (stories are short: 150–300 words). */
export const PER_PAGE = 7;
/** With the editorial column, page 2 holds a lead and four stories. */
export const PER_EDITORIAL_PAGE = 5;
/** Box ads per page at most (so a page keeps at least five stories). */
export const MAX_BOX_ADS = 2;

/** Strongest first: breaking, featured, has a photo, newest. */
function rank(a: PrintStory, b: PrintStory): number {
  return (
    Number(b.isBreaking) - Number(a.isBreaking) ||
    Number(b.isFeatured) - Number(a.isFeatured) ||
    Number(!!b.imageUrl) - Number(!!a.imageUrl) ||
    b.publishedAt.getTime() - a.publishedAt.getTime()
  );
}

const newestFirst = (a: PrintStory, b: PrintStory) => b.publishedAt.getTime() - a.publishedAt.getTime();

/** Take the first story with a photo as lead (else the first), plus the rest. */
function splitLead(stories: PrintStory[]): { lead?: PrintStory; rest: PrintStory[] } {
  const i = stories.findIndex((s) => s.imageUrl);
  const at = i >= 0 ? i : 0;
  if (!stories.length) return { rest: [] };
  return { lead: stories[at], rest: stories.filter((_, j) => j !== at) };
}

export function planIssue(
  stories: PrintStory[],
  pageCount: number,
  opts: { ads?: PrintAd[]; editorial?: PrintStory } = {}
): IssuePlan {
  const pool = [...stories].sort(rank);
  const taken = new Set<string>();
  const take = (s: PrintStory) => {
    taken.add(s.id);
    return s;
  };
  const ads = opts.ads ?? [];
  const unplacedAds: PrintAd[] = [];

  // ---- front page
  const frontPick = splitLead(pool.slice(0, 1 + FRONT_SIDE + FRONT_BOTTOM));
  const strips = ads.filter((a) => a.placement === "print-strip");
  unplacedAds.push(...strips.slice(1));
  const front = {
    lead: frontPick.lead && take(frontPick.lead),
    side: frontPick.rest.slice(0, FRONT_SIDE).map(take),
    bottom: frontPick.rest.slice(FRONT_SIDE, FRONT_SIDE + FRONT_BOTTOM).map(take),
    strip: strips[0],
  };

  // ---- inner pages: reserve space for ads and the editorial first
  const innerCount = Math.max(0, pageCount - 1);
  const pages: InnerPage[] = Array.from({ length: innerCount }, (_, i) => ({
    number: i + 2,
    section: "",
    boxAds: [],
    stories: [],
  }));
  if (opts.editorial && pages[0]) pages[0].editorial = opts.editorial;

  // Full-page ads from the back; page 2 always stays news.
  const fromBack = () => [...pages].reverse();
  for (const ad of ads.filter((a) => a.placement === "print-full")) {
    const page = fromBack().find((p) => p.number > 2 && !p.fullAd);
    if (page) page.fullAd = ad;
    else unplacedAds.push(ad);
  }
  const newsPages = () => pages.filter((p) => !p.fullAd);
  for (const ad of ads.filter((a) => a.placement === "print-half")) {
    const page = [...newsPages()].reverse().find((p) => !p.halfAd && !p.editorial);
    if (page) page.halfAd = ad;
    else unplacedAds.push(ad);
  }
  for (const ad of ads.filter((a) => a.placement === "print-box")) {
    // Spread out: the page with the fewest box ads, from the back.
    const page = [...newsPages()]
      .reverse()
      .filter((p) => !p.halfAd && !p.editorial && p.boxAds.length < MAX_BOX_ADS)
      .sort((a, b) => a.boxAds.length - b.boxAds.length)[0];
    if (page) page.boxAds.push(ad);
    else unplacedAds.push(ad);
  }
  const capacity = (p: InnerPage) =>
    p.halfAd ? 1 : p.editorial ? PER_EDITORIAL_PAGE : PER_PAGE - p.boxAds.length;

  // ---- sections go to the news pages in order; each story belongs to one
  const news = newsPages();
  const sections = news.map((_, i) => SECTIONS[i] ?? { title: MISC });
  const sectionOf = (s: PrintStory): number => {
    if (s.isLocal) {
      const local = sections.findIndex((x) => x.local);
      if (local >= 0) return local;
    }
    return sections.findIndex((x) => s.topicSlug && x.topics?.includes(s.topicSlug));
  };

  const buckets = sections.map(() => [] as PrintStory[]);
  const leftovers: PrintStory[] = [];
  for (const s of pool) {
    if (taken.has(s.id)) continue;
    const i = sectionOf(s);
    (i >= 0 ? buckets[i] : leftovers).push(s);
  }
  // Local news: priority places (Kavre/Panauti) first.
  buckets.forEach((b, i) => {
    if (sections[i].local) b.sort((a, c) => Number(c.isPriorityPlace) - Number(a.isPriorityPlace) || rank(a, c));
  });
  // Overflow from full sections tops up short ones (newest first).
  buckets.forEach((b, i) => leftovers.push(...b.splice(capacity(news[i]))));
  leftovers.sort(newestFirst);

  news.forEach((page, i) => {
    const bucket = buckets[i];
    while (bucket.length < capacity(page) && leftovers.length) bucket.push(leftovers.shift()!);
    bucket.forEach(take);
    const { lead, rest } = splitLead(bucket);
    // A section with none of its own stories is shown as "विविध".
    const own = bucket.some((s) => sectionOf(s) === i);
    Object.assign(page, { section: own ? sections[i].title : MISC, lead, stories: rest });
  });
  pages.filter((p) => p.fullAd).forEach((p) => (p.section = "विज्ञापन"));

  const used = [
    ...[front.lead, ...front.side, ...front.bottom].filter((s): s is PrintStory => !!s),
    ...pages.flatMap((p) => [p.editorial, p.lead, ...p.stories].filter((s): s is PrintStory => !!s)),
  ];
  return { front, pages, used, unplacedAds };
}
