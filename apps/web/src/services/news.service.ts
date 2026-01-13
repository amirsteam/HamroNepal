/**
 * News Service
 *
 * Handles fetching articles from Appwrite.
 */

import { Query } from "appwrite";
import { databases, storage, config } from "@/lib/appwrite";
import type { Article, PaginatedResponse, PaginationParams } from "@/types";

/**
 * Get published articles with pagination.
 */
export async function getPublishedArticles(
  pagination?: PaginationParams
): Promise<PaginatedResponse<Article>> {
  const queries = [
    Query.equal("status", "published"),
    Query.orderDesc("publishedAt"),
  ];

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
 * Get article by slug.
 */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const response = await databases.listDocuments(
    config.databaseId,
    config.collections.articles,
    [
      Query.equal("slug", slug),
      Query.equal("status", "published"),
      Query.limit(1),
    ]
  );

  if (response.documents.length === 0) {
    return null;
  }

  return response.documents[0] as unknown as Article;
}

/**
 * Get featured articles.
 */
export async function getFeaturedArticles(limit = 5): Promise<Article[]> {
  const response = await databases.listDocuments(
    config.databaseId,
    config.collections.articles,
    [
      Query.equal("status", "published"),
      Query.equal("isFeatured", true),
      Query.orderDesc("publishedAt"),
      Query.limit(limit),
    ]
  );

  return response.documents as unknown as Article[];
}

/**
 * Get breaking news.
 */
export async function getBreakingNews(limit = 10): Promise<Article[]> {
  const response = await databases.listDocuments(
    config.databaseId,
    config.collections.articles,
    [
      Query.equal("status", "published"),
      Query.equal("isBreaking", true),
      Query.orderDesc("publishedAt"),
      Query.limit(limit),
    ]
  );

  return response.documents as unknown as Article[];
}

/**
 * Get articles by category.
 */
export async function getArticlesByCategory(
  categoryId: string,
  pagination?: PaginationParams
): Promise<PaginatedResponse<Article>> {
  const queries = [
    Query.equal("status", "published"),
    Query.equal("categoryId", categoryId),
    Query.orderDesc("publishedAt"),
  ];

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
 * Get related articles.
 */
export async function getRelatedArticles(
  articleId: string,
  categoryId: string,
  limit = 5
): Promise<Article[]> {
  const response = await databases.listDocuments(
    config.databaseId,
    config.collections.articles,
    [
      Query.equal("status", "published"),
      Query.equal("categoryId", categoryId),
      Query.notEqual("$id", articleId),
      Query.orderDesc("publishedAt"),
      Query.limit(limit),
    ]
  );

  return response.documents as unknown as Article[];
}

/**
 * Get latest articles.
 */
export async function getLatestArticles(limit = 10): Promise<Article[]> {
  const response = await databases.listDocuments(
    config.databaseId,
    config.collections.articles,
    [
      Query.equal("status", "published"),
      Query.orderDesc("publishedAt"),
      Query.limit(limit),
    ]
  );

  return response.documents as unknown as Article[];
}

/**
 * Increment view count (fire and forget).
 */
export async function incrementViewCount(articleId: string): Promise<void> {
  try {
    const article = await databases.getDocument(
      config.databaseId,
      config.collections.articles,
      articleId
    );

    await databases.updateDocument(
      config.databaseId,
      config.collections.articles,
      articleId,
      { viewCount: (article.viewCount || 0) + 1 }
    );
  } catch (error) {
    console.error("Failed to increment view count:", error);
  }
}

/**
 * Get article image URL.
 */
export function getArticleImageUrl(
  imageRef: string,
  width?: number,
  height?: number
): string {
  if (!imageRef) return "/placeholder-news.jpg";

  // If it's already a full URL, return it directly
  if (imageRef.startsWith("http://") || imageRef.startsWith("https://")) {
    return imageRef;
  }

  // Otherwise treat it as a file ID
  return storage
    .getFilePreview(
      config.buckets.articleImages,
      imageRef,
      width,
      height,
      undefined,
      85
    )
    .toString();
}

