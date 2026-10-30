/**
 * Free stock photos for AI drafts (Pexels API, https://www.pexels.com/api/).
 *
 * Photos are symbolic ("प्रतीकात्मक तस्बिर"), not pictures of the event, and
 * always carry the photographer + Pexels credit that Pexels asks for.
 * Without PEXELS_API_KEY every lookup returns null (callers fall back to the
 * topic's default image).
 */

import type { ImageCredit } from "@hamronepal/shared";
import { config } from "../config";

export interface StockPhoto {
  /** Landscape crop (1200×627), also good for social previews. */
  url: string;
  alt: string;
  credit: ImageCredit;
}

export type FindStockPhoto = (query: string, exclude?: Set<string>) => Promise<StockPhoto | null>;

interface PexelsPhoto {
  id: number;
  url: string;
  alt?: string;
  photographer: string;
  photographer_url: string;
  src: { landscape: string; large: string };
}

export function isStockPhotoConfigured(): boolean {
  return !!config.stockPhotos.pexelsKey;
}

/**
 * Best landscape photo for an English query, skipping URLs in `exclude`
 * (recently used photos) so the front page doesn't repeat the same image.
 */
export const findStockPhoto: FindStockPhoto = async (query, exclude = new Set()) => {
  const key = config.stockPhotos.pexelsKey;
  const q = query.trim().slice(0, 80);
  if (!key || !q) return null;

  const url = `https://api.pexels.com/v1/search?${new URLSearchParams({
    query: q,
    orientation: "landscape",
    per_page: "15",
  })}`;
  const res = await fetch(url, {
    headers: { Authorization: key },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Pexels HTTP ${res.status}`);
  const data = (await res.json()) as { photos?: PexelsPhoto[] };

  const photo = (data.photos ?? []).find((p) => p.src?.landscape && !exclude.has(p.src.landscape));
  if (!photo) return null;
  return {
    url: photo.src.landscape,
    alt: photo.alt || q,
    credit: {
      name: photo.photographer,
      url: photo.photographer_url,
      provider: "Pexels",
      pageUrl: photo.url,
      symbolic: true,
    },
  };
};
