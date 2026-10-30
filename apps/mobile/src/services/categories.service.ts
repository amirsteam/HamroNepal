/**
 * Categories Service for Mobile – topic menus plus location menus.
 */

import { apiGet } from "@/lib/api";
import type { Category } from "@/types";

/**
 * Topic categories, followed by the priority local areas (e.g. Kavre,
 * Panauti) and the 7 provinces, so local news is one tap away.
 */
export async function getCategories(): Promise<Category[]> {
  const [topics, locations] = await Promise.all([
    apiGet<Category[]>("/categories", { type: "topic" }),
    apiGet<Category[]>("/categories", { type: "location" }),
  ]);
  const local = locations.filter((l) => l.ingest || l.level === "province");
  local.sort((a, b) => Number(!!b.ingest) - Number(!!a.ingest) || a.sortOrder - b.sortOrder);
  return [...topics, ...local];
}

async function getOne(key: string): Promise<Category | null> {
  try {
    return await apiGet<Category>(`/categories/${encodeURIComponent(key)}`);
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

export const getCategoryBySlug = getOne;
export const getCategoryById = getOne;
