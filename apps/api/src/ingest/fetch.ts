/**
 * Read RSS feeds from Nepali outlets.
 *
 * (Google News search feeds were tried for per-district news, but Nepali
 * queries only work via the Hindi edition and every link is an encrypted
 * redirect, so the story text cannot be read. Writing from a headline alone
 * would mean guessing, so they are not used.)
 */

import Parser from "rss-parser";
import { stripHtml } from "./text";
import { feedItemImage } from "./images";
import { USER_AGENT } from "./agent";
import { fetchListing } from "./listing";

export interface FeedSource {
  id?: string;
  name: string;
  url: string;
  categoryId?: string | null;
  locationId?: string | null;
  /** "rss" (default) or "page": a section page listing story links (sites with no feed). */
  kind?: "rss" | "page";
}

export interface RawItem {
  url: string;
  title: string;
  /** Plain text from the feed (summary or full content:encoded). */
  text: string;
  /** Outlet that published the story. */
  sourceName: string;
  publishedAt?: Date;
  /** The story's photo as listed in the feed, if any. */
  imageUrl?: string;
  feed: FeedSource;
}

export { USER_AGENT };

type FeedItem = Parser.Item &
  Pick<Parameters<typeof feedItemImage>[0], "mediaContent" | "mediaThumbnail"> & { "content:encoded"?: string };

const parser: Parser<object, FeedItem> = new Parser({
  timeout: 20_000,
  headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml, text/xml" },
  customFields: {
    item: [
      "content:encoded",
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
    ] as never,
  },
});

export async function fetchFeed(feed: FeedSource, maxAgeHours: number): Promise<RawItem[]> {
  if (feed.kind === "page") return fetchListing(feed, maxAgeHours);
  const parsed = await parser.parseURL(feed.url);
  const cutoff = Date.now() - maxAgeHours * 3600_000;
  const items: RawItem[] = [];

  for (const item of parsed.items ?? []) {
    if (!item.link || !item.title) continue;
    const publishedAt = item.isoDate ? new Date(item.isoDate) : undefined;
    if (publishedAt && publishedAt.getTime() < cutoff) continue;

    const html = item["content:encoded"] || item.content || item.contentSnippet || "";
    items.push({
      url: item.link.trim(),
      title: item.title.trim(),
      text: stripHtml(html),
      sourceName: feed.name,
      publishedAt,
      imageUrl: feedItemImage({ ...item, html }),
      feed,
    });
  }
  return items;
}

/** Fetch many feeds with limited concurrency; failures are reported, not thrown. */
export async function fetchAll(
  feeds: FeedSource[],
  maxAgeHours: number,
  concurrency = 4
): Promise<{ items: RawItem[]; results: Array<{ feed: FeedSource; count: number; error?: string }> }> {
  const items: RawItem[] = [];
  const results: Array<{ feed: FeedSource; count: number; error?: string }> = [];
  const queue = [...feeds];

  async function worker() {
    for (let feed = queue.shift(); feed; feed = queue.shift()) {
      try {
        const got = await fetchFeed(feed, maxAgeHours);
        items.push(...got);
        results.push({ feed, count: got.length });
      } catch (err) {
        results.push({ feed, count: 0, error: (err as Error).message.slice(0, 300) });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, feeds.length) }, worker));
  return { items, results };
}
