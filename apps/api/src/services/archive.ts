/**
 * Retiring old stories.
 *
 * Twelve months after publishing, a story drops off the home page, the lists,
 * search, the sitemaps and RSS — but stays readable at /news/<slug>, so no
 * inbound link, shared link, search result or printed QR code breaks. The
 * monthly job (.github/workflows/archive.yml) sets `retiredAt`; an editor can
 * clear it again from the dashboard.
 *
 * `retiredAt` is deliberately separate from status "archived", which means an
 * editor rejected or took a story down and is never public.
 */

import type { FilterQuery } from "mongoose";
import { Article } from "../models";
import { config } from "../config";

/** Stories published before this moment are due to be retired. Pure: no database. */
export function retireCutoff(now: Date = new Date(), months: number = config.archive.months): Date {
  const cutoff = new Date(now);
  // A Feb-29 "now" lands on Mar 1. Irrelevant at one-day granularity on a
  // 365-day boundary, so it isn't worth clamping.
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
  return cutoff;
}

/** The stories a run would retire. Pure: no database. */
export function retirableFilter(cutoff: Date): FilterQuery<unknown> {
  return {
    status: "published",
    retiredAt: null,
    // $type is load-bearing: BSON orders Null before Date, so a bare $lt would
    // also match a published story whose publishedAt is null or missing.
    publishedAt: { $type: "date", $lt: cutoff },
  };
}

/**
 * Retire what is due, oldest first. Safe to run again: stories already carrying
 * a `retiredAt` are skipped, so a repeat run reports 0 and overwrites nothing.
 */
export async function retireOldArticles(
  opts: {
    months?: number;
    limit?: number;
    dryRun?: boolean;
    now?: Date;
    log?: (line: string) => void;
  } = {}
): Promise<{ retired: number; remaining: number; checked: number; cutoff: Date }> {
  const log = opts.log ?? (() => {});
  const cutoff = retireCutoff(opts.now, opts.months ?? config.archive.months);
  const limit = opts.limit ?? config.archive.maxPerRun;
  const filter = retirableFilter(cutoff);

  const checked = await Article.countDocuments(filter);
  const due = await Article.find(filter)
    .sort({ publishedAt: 1 }) // oldest first, so a capped run makes forward progress
    .limit(limit)
    .select("_id title publishedAt")
    .lean();

  for (const story of due) {
    log(`  ${opts.dryRun ? "–" : "✓"} ${story.title}`);
  }

  let retired = 0;
  if (due.length && !opts.dryRun) {
    const result = await Article.updateMany(
      // retiredAt restated so a concurrent run can't overwrite an existing date.
      { _id: { $in: due.map((s) => s._id) }, retiredAt: null },
      { $set: { retiredAt: new Date() } },
      // Keep updatedAt: seo.ts uses it for sitemap <lastmod> and JSON-LD
      // dateModified. Bumping it would tell Google we edited every one of these
      // old stories today.
      { timestamps: false }
    );
    retired = result.modifiedCount;
  }

  // Only ever sets retiredAt. isFeatured/isBreaking are left alone: the live
  // filter already keeps retired stories out of those rails, and clearing them
  // would throw away editorial information. Nothing is deleted, so slugs stay
  // taken and no new story can claim an old URL.
  const remaining = opts.dryRun ? Math.max(0, checked - due.length) : await Article.countDocuments(filter);
  return { retired: opts.dryRun ? 0 : retired, remaining, checked, cutoff };
}
