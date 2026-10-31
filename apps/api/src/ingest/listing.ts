/**
 * "page" sources: news sites with no RSS feed (e.g. ekantipur.com/news).
 *
 * Reads a section page, collects links to stories on the same site whose
 * address carries a date (…/2026/10/31/story.html), then reads the newest
 * few articles for their real publish time, text and photo.
 */

import { JSDOM, VirtualConsole } from "jsdom";
import type { FeedSource, RawItem } from "./fetch";
import { getHtml, readPage, type PageContent } from "./extract";

/** Articles read per run; the section page lists newest first. */
export const MAX_PAGE_ARTICLES = 15;
const CONCURRENCY = 3;

const DATED_PATH = /\/(\d{4})\/(\d{2})\/(\d{2})\/[^/]+$/;

export interface ListingLink {
  url: string;
  title: string;
  /** The date in the address (Nepal time), used to skip old links cheaply. */
  urlDate: Date;
}

/** Story links in a section page, in page order, one per address. */
export function listingLinks(html: string, pageUrl: string): ListingLink[] {
  const dom = new JSDOM(html, { url: pageUrl, virtualConsole: new VirtualConsole() });
  try {
    const host = new URL(pageUrl).hostname.replace(/^www\./, "");
    const byUrl = new Map<string, ListingLink>();
    for (const a of dom.window.document.querySelectorAll("a[href]")) {
      let url: URL;
      try {
        url = new URL(a.getAttribute("href")!, pageUrl);
      } catch {
        continue;
      }
      if (url.hostname.replace(/^www\./, "") !== host) continue;
      const m = url.pathname.match(DATED_PATH);
      if (!m) continue;
      url.hash = "";
      const key = url.toString();
      const title = (a.textContent ?? "").replace(/\s+/g, " ").trim();
      const prev = byUrl.get(key);
      // The same story is often linked twice (photo + headline); keep the headline.
      if (prev) {
        if (title.length > prev.title.length) prev.title = title;
        continue;
      }
      byUrl.set(key, { url: key, title, urlDate: new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00+05:45`) });
    }
    return [...byUrl.values()].filter((l) => l.title.length >= 8);
  } finally {
    dom.window.close();
  }
}

export async function fetchListing(
  feed: FeedSource,
  maxAgeHours: number,
  deps: { get?: typeof getHtml; read?: (url: string) => Promise<PageContent> } = {}
): Promise<RawItem[]> {
  const get = deps.get ?? getHtml;
  const read = deps.read ?? readPage;
  const cutoff = Date.now() - maxAgeHours * 3600_000;

  const page = await get(feed.url);
  const all = listingLinks(page.html, page.url);
  // Probably a redesign: say so (shown on the sources page) rather than find nothing.
  if (!all.length) throw new Error("No dated story links found on the page");
  // A story dated yesterday in its address can still be within the window.
  const links = all.filter((l) => l.urlDate.getTime() >= cutoff - 24 * 3600_000).slice(0, MAX_PAGE_ARTICLES);

  const items: RawItem[] = [];
  const queue = [...links];
  async function worker() {
    for (let link = queue.shift(); link; link = queue.shift()) {
      try {
        const article = await read(link.url);
        const publishedAt = article.publishedAt ?? link.urlDate;
        if (publishedAt.getTime() < cutoff) continue;
        items.push({
          url: link.url,
          title: link.title,
          text: article.text,
          sourceName: feed.name,
          publishedAt,
          imageUrl: article.imageUrl,
          feed,
        });
      } catch {
        // One unreadable article should not lose the rest.
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, links.length) }, worker));
  return items;
}
