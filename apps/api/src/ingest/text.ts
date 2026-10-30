/**
 * Text helpers for the ingestion pipeline: URL normalising, title
 * similarity (duplicate detection), and Nepali digit handling.
 */

import { createHash } from "node:crypto";

const TRACKING_PARAMS = /^(utm_|fbclid$|gclid$|oc$|ref$|mc_|_ga$)/i;

export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw.trim());
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    let out = url.toString();
    if (out.endsWith("/")) out = out.slice(0, -1);
    return out.replace(/^http:/, "https:");
  } catch {
    return raw.trim();
  }
}

export function hashUrl(url: string): string {
  return createHash("sha1").update(normalizeUrl(url)).digest("hex");
}

const STOPWORDS = new Set([
  "को", "का", "की", "मा", "र", "ले", "लाई", "छ", "छन्", "भयो", "हो", "पनि", "यो", "त्यो",
  "एक", "बाट", "देखि", "सम्म", "लागि", "गरे", "गरी", "गर्ने", "गर्न", "भने", "थियो", "हुने",
  "the", "a", "an", "of", "in", "on", "to", "and", "for", "is",
]);

/** Word set used for title similarity. Keeps Devanagari letters and marks. */
export function titleTokens(title: string): Set<string> {
  const words = title
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
  return new Set(words);
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / (a.size + b.size - shared);
}

export const NEAR_DUPLICATE_THRESHOLD = 0.6;

export function isNearDuplicate(title: string, others: Iterable<Set<string>>): boolean {
  const tokens = titleTokens(title);
  for (const other of others) {
    if (jaccard(tokens, other) >= NEAR_DUPLICATE_THRESHOLD) return true;
  }
  return false;
}

const NEPALI_DIGITS = "०१२३४५६७८९";

export function toAsciiDigits(text: string): string {
  return text.replace(/[०-९]/g, (d) => String(NEPALI_DIGITS.indexOf(d)));
}

/** Numbers (2+ digits) in the output that never appear in the source text. */
export function unsupportedNumbers(output: string, source: string): string[] {
  const sourceNumbers = new Set(toAsciiDigits(source).match(/\d+(?:[.,]\d+)*/g) ?? []);
  const normalized = new Set([...sourceNumbers].map((n) => n.replace(/,/g, "")));
  const found = toAsciiDigits(output).match(/\d+(?:[.,]\d+)*/g) ?? [];
  return [...new Set(found)].filter((n) => {
    const plain = n.replace(/,/g, "");
    return plain.length >= 2 && !normalized.has(plain) && !sourceNumbers.has(n);
  });
}

export function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&#\d+;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}
