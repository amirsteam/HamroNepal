/**
 * News Service – public article reads.
 */

import { api } from "@/lib/api";
import type { Article, HomeData, PaginatedResponse, PaginationParams } from "@/types";

export async function getHomeData(): Promise<HomeData> {
  return api.get<HomeData>("/home");
}

export async function getPublishedArticles(
  pagination?: PaginationParams
): Promise<PaginatedResponse<Article>> {
  return api.get("/articles", { limit: pagination?.limit ?? 20, offset: pagination?.offset });
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  try {
    return await api.get<Article>(`/articles/${encodeURIComponent(slug)}`);
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

export async function getFeaturedArticles(limit = 5): Promise<Article[]> {
  const res = await api.get<PaginatedResponse<Article>>("/articles", { featured: true, limit });
  return res.documents;
}

export async function getBreakingNews(limit = 10): Promise<Article[]> {
  const res = await api.get<PaginatedResponse<Article>>("/articles", { breaking: true, limit });
  return res.documents;
}

/** Works for topic categories and location categories (id or slug). */
export async function getArticlesByCategory(
  categoryId: string,
  pagination?: PaginationParams
): Promise<PaginatedResponse<Article>> {
  return api.get("/articles", {
    category: categoryId,
    limit: pagination?.limit ?? 20,
    offset: pagination?.offset,
  });
}

export async function getRelatedArticles(articleId: string, _categoryId?: string, limit = 5): Promise<Article[]> {
  void _categoryId;
  return api.get(`/articles/${articleId}/related`, { limit });
}

export async function getLatestArticles(limit = 10): Promise<Article[]> {
  const res = await getPublishedArticles({ limit });
  return res.documents;
}

export async function searchArticles(
  q: string,
  pagination?: PaginationParams
): Promise<PaginatedResponse<Article>> {
  return api.get("/search", { q, limit: pagination?.limit ?? 20, offset: pagination?.offset });
}

/** Fire and forget; the server increments atomically. */
export async function incrementViewCount(articleId: string): Promise<void> {
  try {
    await api.post(`/articles/${articleId}/view`);
  } catch {
    // Not important enough to bother the reader.
  }
}

const PLACEHOLDER = "/placeholder-news.jpg";

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
  return imageRef;
}
