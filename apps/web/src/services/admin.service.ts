/**
 * Admin News Service
 *
 * CRUD operations for articles (admin/editor/reporter).
 */

import { ID, Query, Permission, Role } from "appwrite";
import { databases, storage, config } from "@/lib/appwrite";
import type { Article, PaginatedResponse, PaginationParams } from "@/types";

export interface CreateArticleInput {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage?: string;
  categoryId: string;
  tagIds?: string[];
  authorId: string;
  authorName: string;
  status: "draft" | "pending" | "published" | "archived";
  isFeatured?: boolean;
  isBreaking?: boolean;
  createdAtBS: string;
}

export interface UpdateArticleInput {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  featuredImage?: string;
  categoryId?: string;
  tagIds?: string[];
  status?: "draft" | "pending" | "published" | "archived";
  isFeatured?: boolean;
  isBreaking?: boolean;
  publishedAt?: string;
  publishedAtBS?: string;
}

export interface ArticleFilters {
  status?: string;
  categoryId?: string;
  authorId?: string;
  search?: string;
}

/**
 * Get articles with filters (for admin).
 */
export async function getArticlesAdmin(
  filters?: ArticleFilters,
  pagination?: PaginationParams
): Promise<PaginatedResponse<Article>> {
  const queries: string[] = [Query.orderDesc("$createdAt")];

  if (filters?.status) {
    queries.push(Query.equal("status", filters.status));
  }
  if (filters?.categoryId) {
    queries.push(Query.equal("categoryId", filters.categoryId));
  }
  if (filters?.authorId) {
    queries.push(Query.equal("authorId", filters.authorId));
  }
  if (filters?.search) {
    queries.push(Query.search("title", filters.search));
  }

  if (pagination?.limit) {
    queries.push(Query.limit(pagination.limit));
  } else {
    queries.push(Query.limit(20));
  }

  if (pagination?.offset) {
    queries.push(Query.offset(pagination.offset));
  }

  const response = await databases.listDocuments(
    config.databaseId,
    config.collections.articles,
    queries
  );

  return {
    documents: response.documents as unknown as Article[],
    total: response.total,
  };
}

/**
 * Get a single article by ID.
 */
export async function getArticleById(id: string): Promise<Article> {
  const doc = await databases.getDocument(
    config.databaseId,
    config.collections.articles,
    id
  );

  return doc as unknown as Article;
}

/**
 * Create a new article.
 */
export async function createArticle(
  data: CreateArticleInput
): Promise<Article> {
  const articleData = {
    ...data,
    tagIds: data.tagIds || [],
    isFeatured: data.isFeatured || false,
    isBreaking: data.isBreaking || false,
    viewCount: 0,
  };

  // Document-level permissions - use valid roles only
  const permissions = [
    Permission.read(Role.any()),
    Permission.update(Role.user(data.authorId)),
    Permission.delete(Role.user(data.authorId)),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ];

  const doc = await databases.createDocument(
    config.databaseId,
    config.collections.articles,
    ID.unique(),
    articleData,
    permissions
  );

  return doc as unknown as Article;
}

/**
 * Update an existing article.
 */
export async function updateArticle(
  id: string,
  data: UpdateArticleInput
): Promise<Article> {
  const doc = await databases.updateDocument(
    config.databaseId,
    config.collections.articles,
    id,
    data
  );

  return doc as unknown as Article;
}

/**
 * Delete an article.
 */
export async function deleteArticle(id: string): Promise<void> {
  await databases.deleteDocument(
    config.databaseId,
    config.collections.articles,
    id
  );
}

/**
 * Publish an article.
 */
export async function publishArticle(
  id: string,
  publishedAtBS: string
): Promise<Article> {
  return updateArticle(id, {
    status: "published",
    publishedAt: new Date().toISOString(),
    publishedAtBS,
  });
}

/**
 * Unpublish an article (set to draft).
 */
export async function unpublishArticle(id: string): Promise<Article> {
  return updateArticle(id, {
    status: "draft",
  });
}

/**
 * Submit article for review.
 */
export async function submitForReview(id: string): Promise<Article> {
  return updateArticle(id, {
    status: "pending",
  });
}

/**
 * Archive an article.
 */
export async function archiveArticle(id: string): Promise<Article> {
  return updateArticle(id, {
    status: "archived",
  });
}

/**
 * Toggle featured status.
 */
export async function toggleFeatured(id: string): Promise<Article> {
  const article = await getArticleById(id);
  return updateArticle(id, { isFeatured: !article.isFeatured });
}

/**
 * Toggle breaking news status.
 */
export async function toggleBreaking(id: string): Promise<Article> {
  const article = await getArticleById(id);
  return updateArticle(id, { isBreaking: !article.isBreaking });
}

/**
 * Upload an article image.
 */
export async function uploadImage(file: File): Promise<string> {
  // File permissions - readable by anyone, manageable by uploader
  const permissions = [Permission.read(Role.any())];

  const result = await storage.createFile(
    config.buckets.articleImages,
    ID.unique(),
    file,
    permissions
  );

  return result.$id;
}

/**
 * Delete an image.
 */
export async function deleteImage(fileId: string): Promise<void> {
  await storage.deleteFile(config.buckets.articleImages, fileId);
}

/**
 * Get image preview URL.
 */
export function getImagePreviewUrl(
  fileId: string,
  width?: number,
  height?: number
): string {
  if (!fileId) return "";

  return storage
    .getFilePreview(config.buckets.articleImages, fileId, width, height)
    .toString();
}

/**
 * Generate slug from title.
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u0900-\u097F-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 200);
}

/**
 * Check if slug is unique.
 */
export async function isSlugUnique(
  slug: string,
  excludeId?: string
): Promise<boolean> {
  const response = await databases.listDocuments(
    config.databaseId,
    config.collections.articles,
    [Query.equal("slug", slug), Query.limit(1)]
  );

  if (response.documents.length === 0) {
    return true;
  }

  if (excludeId && response.documents[0].$id === excludeId) {
    return true;
  }

  return false;
}

/**
 * Get article statistics.
 */
export async function getArticleStats(): Promise<{
  total: number;
  published: number;
  draft: number;
  pending: number;
}> {
  const [total, published, draft, pending] = await Promise.all([
    databases.listDocuments(config.databaseId, config.collections.articles, [
      Query.limit(1),
    ]),
    databases.listDocuments(config.databaseId, config.collections.articles, [
      Query.equal("status", "published"),
      Query.limit(1),
    ]),
    databases.listDocuments(config.databaseId, config.collections.articles, [
      Query.equal("status", "draft"),
      Query.limit(1),
    ]),
    databases.listDocuments(config.databaseId, config.collections.articles, [
      Query.equal("status", "pending"),
      Query.limit(1),
    ]),
  ]);

  return {
    total: total.total,
    published: published.total,
    draft: draft.total,
    pending: pending.total,
  };
}

/**
 * Get articles by author (for dashboard).
 */
export async function getMyArticles(
  authorId: string,
  limit = 10,
  offset = 0,
  status?: string
): Promise<{ articles: Article[]; total: number }> {
  const queries: string[] = [
    Query.equal("authorId", authorId),
    Query.orderDesc("$createdAt"),
    Query.limit(limit),
    Query.offset(offset),
  ];

  if (status) {
    queries.push(Query.equal("status", status));
  }

  const response = await databases.listDocuments(
    config.databaseId,
    config.collections.articles,
    queries
  );

  return {
    articles: response.documents as unknown as Article[],
    total: response.total,
  };
}

/**
 * Get dashboard stats for an author.
 */
export async function getDashboardStats(authorId: string): Promise<{
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  totalViews: number;
}> {
  const [total, published, drafts] = await Promise.all([
    databases.listDocuments(config.databaseId, config.collections.articles, [
      Query.equal("authorId", authorId),
      Query.limit(1),
    ]),
    databases.listDocuments(config.databaseId, config.collections.articles, [
      Query.equal("authorId", authorId),
      Query.equal("status", "published"),
      Query.limit(1),
    ]),
    databases.listDocuments(config.databaseId, config.collections.articles, [
      Query.equal("authorId", authorId),
      Query.equal("status", "draft"),
      Query.limit(1),
    ]),
  ]);

  // Sum view counts
  const allArticles = await databases.listDocuments(
    config.databaseId,
    config.collections.articles,
    [Query.equal("authorId", authorId), Query.limit(100)]
  );

  const totalViews = allArticles.documents.reduce(
    (sum, article) =>
      sum + (((article as Record<string, unknown>).viewCount as number) || 0),
    0
  );

  return {
    totalArticles: total.total,
    publishedArticles: published.total,
    draftArticles: drafts.total,
    totalViews,
  };
}

/**
 * Update article status.
 */
export async function updateArticleStatus(
  id: string,
  status: "draft" | "published" | "archived"
): Promise<Article> {
  const updateData: UpdateArticleInput = { status };

  if (status === "published") {
    updateData.publishedAt = new Date().toISOString();
  }

  return updateArticle(id, updateData);
}
