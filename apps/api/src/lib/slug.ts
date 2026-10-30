import { randomBytes } from "node:crypto";
import type { Model } from "mongoose";

/** Slug that keeps Devanagari (Nepali titles) and ASCII letters/digits. */
export function slugify(text: string, maxLength = 120): string {
  return text
    .normalize("NFC")
    .toLowerCase()
    .trim()
    .replace(/[^\w\sऀ-ॿ-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, maxLength)
    .replace(/-$/, "");
}

/**
 * Return `base` if it is free in `model`, otherwise `base-2`, `base-3`, ...
 * (falling back to a random suffix after a few attempts).
 */
export async function uniqueSlug(
  model: Model<any>,
  base: string,
  excludeId?: string
): Promise<string> {
  const root = slugify(base) || randomBytes(4).toString("hex");
  for (let i = 1; i <= 5; i++) {
    const candidate = i === 1 ? root : `${root}-${i}`;
    const filter: Record<string, unknown> = { slug: candidate };
    if (excludeId) filter._id = { $ne: excludeId };
    if (!(await model.exists(filter))) return candidate;
  }
  return `${root}-${randomBytes(3).toString("hex")}`;
}
