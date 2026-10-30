/**
 * Categories Service – topic menus and location (प्रदेश/जिल्ला) menus.
 */

import { api } from "@/lib/api";
import type { Category } from "@/types";

/** Active topic categories (राजनीति, खेलकुद ...), in menu order. */
export async function getCategories(): Promise<Category[]> {
  return api.get<Category[]>("/categories", { type: "topic" });
}

/** Active location categories (provinces, districts, municipalities). */
export async function getLocationCategories(): Promise<Category[]> {
  return api.get<Category[]>("/categories", { type: "location" });
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    return await api.get<Category>(`/categories/${encodeURIComponent(slug)}`);
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

export const getCategoryById = getCategoryBySlug;

export interface LocationNode extends Category {
  children: LocationNode[];
}

/** Province → district → municipality tree from a flat list. */
export function buildLocationTree(locations: Category[]): LocationNode[] {
  const nodes = new Map<string, LocationNode>(locations.map((l) => [l.$id, { ...l, children: [] }]));
  const roots: LocationNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sort = (list: LocationNode[]) => {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "ne"));
    list.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}
