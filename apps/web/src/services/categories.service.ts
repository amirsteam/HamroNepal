/**
 * Categories Service – topic menus and location (प्रदेश/जिल्ला) menus.
 */

import { api } from "@/lib/api";
import { langQuery } from "@/lib/i18n";
import type { Category, Lang } from "@/types";

/** Active topic categories (राजनीति, खेलकुद ...), in menu order. "en": English names. */
export async function getCategories(lang?: Lang): Promise<Category[]> {
  return api.get<Category[]>("/categories", { type: "topic", lang: langQuery(lang) });
}

/** Active location categories (provinces, districts, municipalities). */
export async function getLocationCategories(lang?: Lang): Promise<Category[]> {
  return api.get<Category[]>("/categories", { type: "location", lang: langQuery(lang) });
}

export async function getCategoryBySlug(slug: string, lang?: Lang): Promise<Category | null> {
  try {
    return await api.get<Category>(`/categories/${encodeURIComponent(slug)}`, { lang: langQuery(lang) });
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
