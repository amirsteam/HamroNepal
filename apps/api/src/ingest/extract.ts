/**
 * Get enough source text for the AI to summarise from facts, not guesses.
 * Uses the feed text when it is long enough, otherwise reads the article
 * page with Mozilla Readability.
 */

import { JSDOM, VirtualConsole } from "jsdom";
import { Readability } from "@mozilla/readability";
import type { RawItem } from "./fetch";
import { USER_AGENT } from "./agent";
import { config } from "../config";
import { pickSourceImage } from "./images";

export const MIN_SOURCE_CHARS = 300;
const ENOUGH_FEED_CHARS = 800;
const MAX_SOURCE_CHARS = 6000;
const MAX_HTML_CHARS = 2_000_000;

/** An HTML page and the URL it ended up at (after redirects). */
export async function getHtml(url: string): Promise<{ html: string; url: string }> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("html")) throw new Error(`Not HTML (${type})`);
  return { html: (await res.text()).slice(0, MAX_HTML_CHARS), url: res.url };
}

/**
 * A time from a page. Times without a zone (eKantipur writes
 * "2026-10-31 20:48:48") are taken as Nepal time.
 */
export function parsePageTime(raw: string | undefined | null): Date | undefined {
  const s = raw?.trim();
  if (!s) return undefined;
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(s);
  const iso = s.replace(" ", "T");
  const d = new Date(hasZone ? iso : /T\d/.test(iso) ? `${iso}+05:45` : `${iso}T00:00:00+05:45`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export interface PageContent {
  text: string;
  url: string;
  imageUrl?: string;
  publishedAt?: Date;
}

export async function readPage(pageUrl: string): Promise<PageContent> {
  const { html, url } = await getHtml(pageUrl);
  const dom = new JSDOM(html, { url, virtualConsole: new VirtualConsole() });
  try {
    // Read the meta tags before Readability, which changes the document.
    const doc = dom.window.document;
    const meta = (sel: string) => doc.querySelector<HTMLMetaElement>(sel)?.content;
    const imageUrl = pickSourceImage(
      meta('meta[property="og:image"]'),
      meta('meta[name="twitter:image"]'),
      meta('meta[property="og:image:url"]')
    );
    const publishedAt = parsePageTime(
      meta('meta[property="article:published_time"]') ??
        meta('meta[itemprop="datePublished"]') ??
        html.match(/"datePublished"\s*:\s*"([^"]+)"/)?.[1] ??
        doc.querySelector("time[datetime]")?.getAttribute("datetime")
    );

    const article = new Readability(doc).parse();
    const text = (article?.textContent ?? "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n+/g, "\n\n")
      .trim();
    return { text, url, imageUrl, publishedAt };
  } finally {
    dom.window.close();
  }
}

export type CheckImage = (url: string) => Promise<boolean>;

/**
 * Whether the outlet serves the image to us. Some (e.g. Khabarhub) refuse
 * their images to other sites; those stories fall back to a Pexels photo.
 */
export const imageLoads: CheckImage = async (url) => {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "image/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    await res.body?.cancel();
    return res.ok && (res.headers.get("content-type") ?? "").startsWith("image/");
  } catch {
    return false;
  }
};

export type ExtractText = (item: RawItem) => Promise<{ text: string; url: string; imageUrl?: string }>;

export const extractSourceText: ExtractText = async (item) => {
  let url = item.url;
  let text = item.text;
  let pageImage: string | undefined;

  // With source images on, read the page even when the feed text is enough:
  // its share image is usually larger than the feed's thumbnail.
  // ("page" sources have already read the article.)
  const alreadyRead = item.feed.kind === "page";
  if (!alreadyRead && (text.length < ENOUGH_FEED_CHARS || config.ingest.sourceImages)) {
    try {
      const page = await readPage(item.url);
      pageImage = page.imageUrl;
      if (page.text.length > text.length) {
        text = page.text;
        url = page.url;
      }
    } catch {
      // Keep whatever the feed gave us; the caller checks the length.
    }
  }
  return { text: text.slice(0, MAX_SOURCE_CHARS), url, imageUrl: pickSourceImage(pageImage, item.imageUrl) };
};
