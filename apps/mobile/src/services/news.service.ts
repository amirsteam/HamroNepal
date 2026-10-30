/**
 * News Service for Mobile – reads from the HamroNepal API.
 */

import { apiGet, apiPost, getImageUrl } from "@/lib/api";
import type { Article, PaginatedResponse } from "@/types";

export { getImageUrl };

/** Published articles, newest first; `categoryId` may be a topic or a location. */
export async function getArticles(
  limit = 20,
  offset = 0,
  categoryId?: string
): Promise<PaginatedResponse<Article>> {
  return apiGet("/articles", { limit, offset, category: categoryId });
}

export async function getFeaturedArticles(limit = 5): Promise<Article[]> {
  return (await apiGet<PaginatedResponse<Article>>("/articles", { featured: true, limit })).documents;
}

export async function getBreakingNews(limit = 5): Promise<Article[]> {
  return (await apiGet<PaginatedResponse<Article>>("/articles", { breaking: true, limit })).documents;
}

async function getOne(key: string): Promise<Article | null> {
  try {
    return await apiGet<Article>(`/articles/${encodeURIComponent(key)}`);
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

export const getArticleBySlug = getOne;
export const getArticleById = getOne;

/** The server counts atomically; failures are ignored. */
export async function incrementViewCount(articleId: string): Promise<void> {
  try {
    await apiPost(`/articles/${articleId}/view`);
  } catch {
    // ignore
  }
}

export async function searchArticles(query: string, limit = 20): Promise<Article[]> {
  return (await apiGet<PaginatedResponse<Article>>("/search", { q: query, limit })).documents;
}
