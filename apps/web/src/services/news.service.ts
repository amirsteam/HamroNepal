/**
 * News Service – public article reads.
 */

import { api } from "@/lib/api";
import { langQuery } from "@/lib/i18n";
import type { Article, HomeData, Lang, PaginatedResponse, PaginationParams } from "@/types";

// Every read takes the reader's language: "en" returns the English versions
// (lists then hold only translated stories; one story falls back to Nepali, lang: "ne").

export async function getHomeData(lang?: Lang): Promise<HomeData> {
  return api.get<HomeData>("/home", { lang: langQuery(lang) });
}

export async function getPublishedArticles(
  pagination?: PaginationParams,
  lang?: Lang
): Promise<PaginatedResponse<Article>> {
  return api.get("/articles", { limit: pagination?.limit ?? 20, offset: pagination?.offset, lang: langQuery(lang) });
}

export async function getArticleBySlug(slug: string, lang?: Lang): Promise<Article | null> {
  try {
    return await api.get<Article>(`/articles/${encodeURIComponent(slug)}`, { lang: langQuery(lang) });
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

export async function getFeaturedArticles(limit = 5, lang?: Lang): Promise<Article[]> {
  const res = await api.get<PaginatedResponse<Article>>("/articles", { featured: true, limit, lang: langQuery(lang) });
  return res.documents;
}

export async function getBreakingNews(limit = 10, lang?: Lang): Promise<Article[]> {
  const res = await api.get<PaginatedResponse<Article>>("/articles", { breaking: true, limit, lang: langQuery(lang) });
  return res.documents;
}

/** Works for topic categories and location categories (id or slug). */
export async function getArticlesByCategory(
  categoryId: string,
  pagination?: PaginationParams,
  lang?: Lang
): Promise<PaginatedResponse<Article>> {
  return api.get("/articles", {
    category: categoryId,
    limit: pagination?.limit ?? 20,
    offset: pagination?.offset,
    lang: langQuery(lang),
  });
}

export async function getRelatedArticles(articleId: string, _categoryId?: string, limit = 5, lang?: Lang): Promise<Article[]> {
  void _categoryId;
  return api.get(`/articles/${articleId}/related`, { limit, lang: langQuery(lang) });
}

export async function getLatestArticles(limit = 10, lang?: Lang): Promise<Article[]> {
  const res = await getPublishedArticles({ limit }, lang);
  return res.documents;
}

export async function searchArticles(
  q: string,
  pagination?: PaginationParams,
  lang?: Lang
): Promise<PaginatedResponse<Article>> {
  return api.get("/search", { q, limit: pagination?.limit ?? 20, offset: pagination?.offset, lang: langQuery(lang) });
}

/** Fire and forget; the server increments atomically. */
export async function incrementViewCount(articleId: string): Promise<void> {
  try {
    await api.post(`/articles/${articleId}/view`);
  } catch {
    // Not important enough to bother the reader.
  }
}

export const PLACEHOLDER = "/placeholder-news.svg";

/**
 * srcset for photos on hosts that resize (Cloudinary, Pexels), so phones
 * download a phone-sized photo. Undefined for other hosts (one size only).
 */
export function getArticleImageSrcSet(imageRef: string, widths: number[], ratio: number): string | undefined {
  if (!imageRef || !/res\.cloudinary\.com\/.*\/upload\/|images\.pexels\.com/.test(imageRef)) return undefined;
  return widths.map((w) => `${getArticleImageUrl(imageRef, w, Math.round(w * ratio))} ${w}w`).join(", ");
}

/**
 * Image URL at a given size. Cloudinary URLs get a resize transform; other
 * URLs are used as they are.
 */
export function getArticleImageUrl(imageRef: string, width?: number, height?: number): string {
  if (!imageRef) return PLACEHOLDER;
  if (imageRef.includes("res.cloudinary.com") && imageRef.includes("/upload/") && (width || height)) {
    const t = ["c_fill", "g_auto", "f_auto", "q_auto", width && `w_${width}`, height && `h_${height}`]
      .filter(Boolean)
      .join(",");
    return imageRef.replace("/upload/", `/upload/${t}/`);
  }
  // Pexels stock photos: ask their CDN for the size we show.
  if (imageRef.includes("images.pexels.com") && (width || height)) {
    try {
      const u = new URL(imageRef);
      u.search = "";
      u.searchParams.set("auto", "compress");
      u.searchParams.set("cs", "tinysrgb");
      u.searchParams.set("fit", "crop");
      if (width) u.searchParams.set("w", String(width));
      if (height) u.searchParams.set("h", String(height));
      return u.toString();
    } catch {
      return imageRef;
    }
  }
  return imageRef;
}
