/**
 * Keeping articles' English versions in step with the Nepali.
 *
 * A translation is (re)made when an article has none, or the Nepali changed
 * since (its fingerprint differs) and no person has edited the English.
 */

import type { FilterQuery } from "mongoose";
import { Article } from "../models";
import { sourceHash, translateArticle } from "../ai/translate";
import type { GenerateJSON } from "../ai";

type ArticleDoc = InstanceType<typeof Article>;

/** Needs a (new) machine translation. Human-edited English is never replaced. */
export function needsTranslation(a: {
  title: string;
  excerpt?: string | null;
  content?: string | null;
  en?: { title?: string | null; sourceHash?: string | null; edited?: boolean | null } | null;
}): boolean {
  if (!a.en?.title) return true;
  if (a.en.edited) return false;
  return a.en.sourceHash !== sourceHash(a);
}

export async function translateAndSave(article: ArticleDoc, generate?: GenerateJSON): Promise<void> {
  const t = await translateArticle(article, generate);
  article.set("en", {
    title: t.title,
    excerpt: t.excerpt,
    content: t.content,
    sourceHash: sourceHash(article),
    translatedAt: new Date(),
    model: t.model,
    edited: false,
  });
  await article.save();
}

/** Published articles whose English is missing or out of date, newest first. */
export async function translatePending(
  opts: { limit?: number; dryRun?: boolean; log?: (line: string) => void; generate?: GenerateJSON } = {}
): Promise<{ translated: number; failed: number; checked: number }> {
  const log = opts.log ?? (() => {});
  const limit = opts.limit ?? 15;
  // Missing, or machine-made (may be outdated); human-edited ones are skipped.
  const filter: FilterQuery<unknown> = { status: "published", "en.edited": { $ne: true } };
  const candidates = await Article.find(filter).sort({ publishedAt: -1 }).limit(limit * 10);
  const todo = candidates.filter(needsTranslation).slice(0, limit);

  let translated = 0;
  let failed = 0;
  for (const article of todo) {
    if (opts.dryRun) {
      log(`  would translate: ${article.title}`);
      continue;
    }
    try {
      await translateAndSave(article, opts.generate);
      translated++;
      log(`  EN ${article.en?.title}`);
    } catch (err) {
      failed++;
      log(`  ✗ ${article.title}: ${(err as Error).message.slice(0, 160)}`);
    }
  }
  return { translated, failed, checked: candidates.length };
}
