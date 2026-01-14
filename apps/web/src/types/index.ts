/**
 * TypeScript Types for HamroNepal Web App
 */

// Article Status
export type ArticleStatus = "draft" | "pending" | "published" | "archived";

// Base document with Appwrite fields
export interface BaseDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
}

// Category
export interface Category extends BaseDocument {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parentId?: string;
  sortOrder: number;
  isActive: boolean;
}

// Article
export interface Article extends BaseDocument {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage?: string;
  categoryId: string;
  tagIds: string[];
  authorId: string;
  authorName: string;
  status: ArticleStatus;
  isFeatured: boolean;
  isBreaking: boolean;
  viewCount: number;
  publishedAt?: string;
  publishedAtBS?: string;
  createdAtBS: string;
}

// Author
export interface Author extends BaseDocument {
  userId: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  socialLinks?: string;
  role: "admin" | "editor" | "reporter";
  isActive: boolean;
}

// Tag
export interface Tag extends BaseDocument {
  name: string;
  slug: string;
}

// Pagination
export interface PaginationParams {
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  documents: T[];
  total: number;
}

// Advertisement
export interface Advertisement extends BaseDocument {
  name: string;
  position: "header" | "sidebar" | "inline" | "footer" | "popup";
  imageId: string;
  linkUrl?: string;
  isActive: boolean;
}

// Settings
export interface Setting extends BaseDocument {
  key: string;
  value: string;
  type: "string" | "number" | "boolean" | "json";
}
