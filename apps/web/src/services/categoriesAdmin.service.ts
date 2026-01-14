/**
 * Categories Admin Service
 *
 * CRUD operations for categories.
 */

import { ID, Query } from "appwrite";
import { databases, config } from "@/lib/appwrite";
import type { Category } from "@/types";

export interface CreateCategoryInput {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parentId?: string;
  sortOrder: number;
  isActive?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  parentId?: string;
  sortOrder?: number;
  isActive?: boolean;
}

/**
 * Get all categories for admin (including inactive).
 */
export async function getAdminCategories(): Promise<Category[]> {
  const response = await databases.listDocuments(
    config.databaseId,
    config.collections.categories,
    [Query.orderAsc("sortOrder"), Query.limit(100)]
  );

  return response.documents as unknown as Category[];
}

/**
 * Alias for backward compatibility.
 */
export const getAllCategoriesAdmin = getAdminCategories;

/**
 * Create a new category.
 */
export async function createCategory(
  data: CreateCategoryInput
): Promise<Category> {
  const doc = await databases.createDocument(
    config.databaseId,
    config.collections.categories,
    ID.unique(),
    data
  );

  return doc as unknown as Category;
}

/**
 * Update a category.
 */
export async function updateCategory(
  id: string,
  data: UpdateCategoryInput
): Promise<Category> {
  const doc = await databases.updateDocument(
    config.databaseId,
    config.collections.categories,
    id,
    data
  );

  return doc as unknown as Category;
}

/**
 * Delete a category.
 */
export async function deleteCategory(id: string): Promise<void> {
  await databases.deleteDocument(
    config.databaseId,
    config.collections.categories,
    id
  );
}

/**
 * Toggle category active status.
 */
export async function toggleCategoryStatus(id: string): Promise<Category> {
  const cat = await databases.getDocument(
    config.databaseId,
    config.collections.categories,
    id
  );

  return updateCategory(id, { isActive: !cat.isActive });
}

/**
 * Reorder categories.
 */
export async function reorderCategories(orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) =>
    databases.updateDocument(
      config.databaseId,
      config.collections.categories,
      id,
      { sortOrder: index }
    )
  );

  await Promise.all(updates);
}

/**
 * Check if slug is unique.
 */
export async function isCategorySlugUnique(
  slug: string,
  excludeId?: string
): Promise<boolean> {
  const response = await databases.listDocuments(
    config.databaseId,
    config.collections.categories,
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
 * Generate slug from name.
 */
export function generateCategorySlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u0900-\u097F-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 100);
}
