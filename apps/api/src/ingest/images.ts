/**
 * The source outlet's own photo for a story (INGEST_SOURCE_IMAGES=true).
 *
 * The image is linked from the outlet's server, not copied. The photos belong
 * to the outlets, so this is meant for demos or for outlets that have agreed;
 * otherwise leave it off and the pipeline uses Pexels stock photos.
 */

/** Site-wide stand-ins (logos, share posters) rather than a story photo. */
const GENERIC_FILE = /(logo|poster|placeholder|default|static|favicon|no-?image)/i;

/** A usable story image URL, or undefined. */
export function cleanImageUrl(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  let url: URL;
  try {
    url = new URL(raw.trim().replace(/&amp;/g, "&"));
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
  const file = url.pathname.split("/").pop() ?? "";
  if (GENERIC_FILE.test(file)) return undefined;

  // BBC feeds only list a 240px thumbnail; their image server makes any width.
  if (url.hostname === "ichef.bbci.co.uk") {
    url.pathname = url.pathname.replace(/^\/ace\/(standard|ws)\/\d+\//, "/ace/$1/976/");
  }
  const out = url.toString();
  return out.length <= 1000 ? out : undefined;
}

/** First usable image, in order of preference (article page first, then feed). */
export function pickSourceImage(...candidates: Array<string | undefined | null>): string | undefined {
  for (const c of candidates) {
    const url = cleanImageUrl(c);
    if (url) return url;
  }
  return undefined;
}

type MediaTag = Array<{ $?: { url?: string; width?: string; medium?: string; type?: string } }>;

/** The image an RSS item carries (media:content, media:thumbnail, enclosure or an <img>), largest first. */
export function feedItemImage(item: {
  mediaContent?: MediaTag;
  mediaThumbnail?: MediaTag;
  enclosure?: { url?: string; type?: string };
  html?: string;
}): string | undefined {
  const media = [...(item.mediaContent ?? []), ...(item.mediaThumbnail ?? [])]
    .map((m) => m.$ ?? {})
    .filter((m) => m.url && (!m.medium || m.medium === "image") && (!m.type || m.type.startsWith("image/")))
    .sort((a, b) => Number(b.width ?? 0) - Number(a.width ?? 0))
    .map((m) => m.url);
  const enclosure = item.enclosure?.type?.startsWith("image/") ? item.enclosure.url : undefined;
  const inline = item.html?.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
  return pickSourceImage(...media, enclosure, inline);
}
