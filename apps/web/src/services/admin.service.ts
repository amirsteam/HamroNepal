/**
 * Admin News Service – dashboard article management. Permissions are
 * enforced by the API; the UI checks are only for showing/hiding buttons.
 */

import { api } from "@/lib/api";
import type { Article, ArticleStatus, PaginatedResponse, PaginationParams } from "@/types";

export interface ArticleInput {
  title: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  featuredImage?: string;
  categoryId: string;
  locationIds?: string[];
  tags?: string[];
  status?: ArticleStatus;
  isFeatured?: boolean;
  isBreaking?: boolean;
}

export type CreateArticleInput = ArticleInput;
export type UpdateArticleInput = Partial<ArticleInput>;

export interface ArticleFilters {
  status?: string;
  categoryId?: string;
  authorId?: string;
  search?: string;
  source?: "ai" | "manual";
  mine?: boolean;
}

export interface DashboardStats {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  pendingArticles: number;
  archivedArticles: number;
  totalViews: number;
  aiPending: number;
}

export async function getArticlesAdmin(
  filters?: ArticleFilters,
  pagination?: PaginationParams
): Promise<PaginatedResponse<Article>> {
  return api.get("/admin/articles", {
    ...filters,
    mine: filters?.mine ? "true" : undefined,
    limit: pagination?.limit ?? 20,
    offset: pagination?.offset,
  });
}

/**
 * Articles for the dashboard list. Editors and admins see everyone's
 * articles; reporters see their own (the API enforces this).
 */
export async function getMyArticles(
  _authorId: string,
  limit = 10,
  offset = 0,
  status?: string
): Promise<{ articles: Article[]; total: number }> {
  void _authorId;
  const res = await getArticlesAdmin({ status }, { limit, offset });
  return { articles: res.documents, total: res.total };
}

export async function getArticleById(id: string): Promise<Article> {
  return api.get(`/admin/articles/${id}`);
}

export async function createArticle(data: CreateArticleInput): Promise<Article> {
  return api.post("/admin/articles", data);
}

export async function updateArticle(id: string, data: UpdateArticleInput): Promise<Article> {
  return api.patch(`/admin/articles/${id}`, data);
}

export async function deleteArticle(id: string): Promise<void> {
  await api.delete(`/admin/articles/${id}`);
}

export async function updateArticleStatus(id: string, status: ArticleStatus): Promise<Article> {
  return updateArticle(id, { status });
}

export const publishArticle = (id: string) => updateArticleStatus(id, "published");
export const unpublishArticle = (id: string) => updateArticleStatus(id, "draft");
export const submitForReview = (id: string) => updateArticleStatus(id, "pending");
export const archiveArticle = (id: string) => updateArticleStatus(id, "archived");

export async function getDashboardStats(_authorId?: string, mine = false): Promise<DashboardStats> {
  void _authorId;
  return api.get("/admin/articles/stats", { mine: mine ? "true" : undefined });
}

/** Upload an image; returns its public URL. */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post<{ url: string; publicId: string }>("/admin/uploads", form);
  return res.url;
}

/** Kept for existing callers: images are stored as full URLs now. */
export function getImagePreviewUrl(url: string, width?: number, height?: number): string {
  if (!url) return "";
  if (url.includes("res.cloudinary.com") && url.includes("/upload/") && (width || height)) {
    const t = ["c_fill", "g_auto", "f_auto", "q_auto", width && `w_${width}`, height && `h_${height}`]
      .filter(Boolean)
      .join(",");
    return url.replace("/upload/", `/upload/${t}/`);
  }
  return url;
}

export async function isSlugUnique(slug: string, excludeId?: string): Promise<boolean> {
  const res = await api.get<{ available: boolean }>("/admin/articles/slug-available", { slug, excludeId });
  return res.available;
}
