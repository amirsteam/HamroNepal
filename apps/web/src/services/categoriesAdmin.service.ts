/**
 * Categories Admin Service – CRUD for topic and location categories.
 */

import { api } from "@/lib/api";
import type { Category, CategoryType } from "@/types";

export interface CreateCategoryInput {
  name: string;
  /** English name for the English site (/en). */
  nameEn?: string;
  slug?: string;
  description?: string;
  icon?: string;
  color?: string;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  type?: CategoryType;
  showInMenu?: boolean;
  ingest?: boolean;
  aliases?: string[];
  defaultImage?: string;
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

/** All categories including inactive ones. Defaults to topics. */
export async function getAdminCategories(type: CategoryType | "all" = "topic"): Promise<Category[]> {
  return api.get("/admin/categories", { type: type === "all" ? undefined : type });
}

export const getAllCategoriesAdmin = getAdminCategories;

export async function createCategory(data: CreateCategoryInput): Promise<Category> {
  return api.post("/admin/categories", clean(data));
}

export async function updateCategory(id: string, data: UpdateCategoryInput): Promise<Category> {
  return api.patch(`/admin/categories/${id}`, clean(data));
}

export async function deleteCategory(id: string): Promise<void> {
  await api.delete(`/admin/categories/${id}`);
}

export async function toggleCategoryStatus(category: Category): Promise<Category> {
  return updateCategory(category.$id, { isActive: !category.isActive });
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  await api.post("/admin/categories/reorder", { ids: orderedIds });
}

export function generateCategorySlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\sऀ-ॿ-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 100);
}

/** The API rejects empty strings for optional URL/ID fields. */
function clean<T extends object>(data: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === "" && (k === "parentId" || k === "slug")) continue;
    out[k] = v;
  }
  return out as T;
}
