/**
 * Key points for stories that have none: the ones written before the AI writer
 * made them, and stories written by people in the dashboard. The phone article
 * page shows the excerpt until a story has them.
 */

import { Article } from "../models";
import { generateJSON as defaultGenerate, type GenerateJSON } from "../ai";
import { keyPointsPrompt, keyPointsSchema, WRITER_SYSTEM } from "../ai/prompts";
import { translateKeyPoints } from "../ai/translate";
import { cleanKeyPoints, withoutSourceCredit } from "../ingest/steps";
import { unsupportedNumbers } from "../ingest/text";
import { toPlainText } from "../lib/sanitize";

/** Published and pending stories without key points, newest first. */
const MISSING = {
  status: { $in: ["published", "pending"] },
  retiredAt: null,
  "keyPoints.0": { $exists: false },
};

export async function backfillKeyPoints(
  opts: { limit?: number; dryRun?: boolean; log?: (line: string) => void; generate?: GenerateJSON } = {}
): Promise<{ done: number; failed: number; checked: number }> {
  const log = opts.log ?? (() => {});
  const generate = opts.generate ?? defaultGenerate;
  const articles = await Article.find(MISSING)
    .sort({ publishedAt: -1, _id: -1 })
    .limit(opts.limit ?? 50)
    .select("title excerpt content en.title en.edited")
    .lean();

  let done = 0;
  let failed = 0;
  for (const a of articles) {
    try {
      // The story's own words, without the "स्रोत:" credit link.
      const text = toPlainText(withoutSourceCredit(a.content ?? ""));
      const { data } = await generate({
        system: WRITER_SYSTEM,
        prompt: keyPointsPrompt(a.title, toPlainText(a.excerpt ?? ""), text.slice(0, 6000)),
        schema: keyPointsSchema,
        temperature: 0.2,
        maxTokens: 1000,
      });
      const source = `${a.title} ${a.excerpt ?? ""} ${text}`;
      const points = cleanKeyPoints(data.keyPoints)
        .filter((p) => unsupportedNumbers(p, source).length === 0)
        .slice(0, 3);
      if (!points.length) {
        log(`  – ${a.title}: no usable points`);
        continue;
      }
      // English too, when the story already has its English version.
      const en = a.en?.title ? await translateKeyPoints(points, generate) : [];
      log(`  ✓ ${a.title}`);
      for (const p of points) log(`      • ${p}`);
      for (const p of en) log(`      • ${p}`);
      if (opts.dryRun) {
        done++;
        continue;
      }
      // timestamps: false – updatedAt is the sitemap lastmod and JSON-LD dateModified.
      await Article.updateOne(
        { _id: a._id },
        { $set: { keyPoints: points, ...(en.length ? { "en.keyPoints": en } : {}) } },
        { timestamps: false }
      );
      done++;
    } catch (err) {
      failed++;
      log(`  ✗ ${a.title}: ${(err as Error).message.slice(0, 200)}`);
    }
  }
  return { done, failed, checked: articles.length };
}
