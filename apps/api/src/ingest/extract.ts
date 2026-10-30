/**
 * Get enough source text for the AI to summarise from facts, not guesses.
 * Uses the feed text when it is long enough, otherwise reads the article
 * page with Mozilla Readability.
 */

import { JSDOM, VirtualConsole } from "jsdom";
import { Readability } from "@mozilla/readability";
import { USER_AGENT, type RawItem } from "./fetch";

export const MIN_SOURCE_CHARS = 300;
const ENOUGH_FEED_CHARS = 800;
const MAX_SOURCE_CHARS = 6000;
const MAX_HTML_CHARS = 2_000_000;

async function readPage(url: string): Promise<{ text: string; url: string }> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("html")) throw new Error(`Not HTML (${type})`);
  const html = (await res.text()).slice(0, MAX_HTML_CHARS);

  const dom = new JSDOM(html, { url: res.url, virtualConsole: new VirtualConsole() });
  try {
    const article = new Readability(dom.window.document).parse();
    const text = (article?.textContent ?? "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n+/g, "\n\n")
      .trim();
    return { text, url: res.url };
  } finally {
    dom.window.close();
  }
}

export type ExtractText = (item: RawItem) => Promise<{ text: string; url: string }>;

export const extractSourceText: ExtractText = async (item) => {
  let url = item.url;
  let text = item.text;

  if (text.length < ENOUGH_FEED_CHARS) {
    try {
      const page = await readPage(item.url);
      if (page.text.length > text.length) {
        text = page.text;
        url = page.url;
      }
    } catch {
      // Keep whatever the feed gave us; the caller checks the length.
    }
  }
  return { text: text.slice(0, MAX_SOURCE_CHARS), url };
};
