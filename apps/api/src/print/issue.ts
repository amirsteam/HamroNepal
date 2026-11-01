/**
 * Build a print issue from the database: the week's published stories,
 * planned onto pages, with the issue's number, volume and date.
 */

import { Article, Category, PrintIssue, Promotion } from "../models";
import { EDITORIAL_TOPIC } from "../seed/data";
import { runningNow } from "../routes/promotions";
import { config } from "../config";
import { toPlainText } from "../lib/sanitize";
import { planIssue, type IssuePlan, type PrintAd, type PrintAdPlacement, type PrintStory } from "./plan";
import { isNearDuplicate, titleTokens } from "../ingest/text";
import type { IssueMeta } from "./render";

const DAY_MS = 864e5;
const NPT_OFFSET_MS = (5 * 60 + 45) * 60_000;

/** Start of a day in Nepal time. `day` is "YYYY-MM-DD"; default today in Nepal. */
export function nepalDayStart(day?: string): Date {
  const ymd = day ?? new Date(Date.now() + NPT_OFFSET_MS).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) throw new Error(`Invalid date "${ymd}" (use YYYY-MM-DD)`);
  return new Date(`${ymd}T00:00:00+05:45`);
}

/** Plain-text paragraphs of an article, without the "स्रोत:" credit line. */
export function articleParagraphs(html: string): string[] {
  const blocks = html
    .replace(/<p class="source-credit">[\s\S]*?<\/p>/g, "")
    .match(/<(p|h2|h3|li|blockquote)[^>]*>[\s\S]*?<\/\1>/gi);
  const parts = blocks ?? [html];
  return parts.map((b) => toPlainText(b)).filter((t) => t.length > 0);
}

export interface BuiltIssue {
  plan: IssuePlan;
  meta: IssueMeta;
  articleIds: string[];
}

export async function buildIssue(
  /** `ads` / `editorial` replace the database's (for tests and samples). */
  opts: { date?: string; days?: number; pages?: number; ads?: PrintAd[]; editorial?: PrintStory } = {}
): Promise<BuiltIssue> {
  const issueDate = nepalDayStart(opts.date);
  const days = opts.days ?? config.print.days;
  const pageCount = opts.pages ?? config.print.pages;
  const until = new Date(issueDate.getTime() + DAY_MS);
  const since = new Date(until.getTime() - days * DAY_MS);

  const [articles, categories, lastIssue, adDocs] = await Promise.all([
    // Published only: print cannot be corrected after it goes to the press.
    Article.find({ status: "published", publishedAt: { $gte: since, $lt: until } })
      .sort({ publishedAt: -1 })
      .limit(200)
      .lean(),
    Category.find().select("name slug type level ingest parentId").lean(),
    PrintIssue.findOne().sort({ number: -1 }).select("number").lean(),
    // Print ads whose run covers the issue day.
    opts.ads ? Promise.resolve([]) : Promotion.find({ ...runningNow(new Date(issueDate.getTime() + DAY_MS / 2)), placement: /^print-/ }).lean(),
  ]);
  const ads: PrintAd[] =
    opts.ads ??
    adDocs.map((a) => ({ id: String(a._id), title: a.title, imageUrl: a.imageUrl, placement: a.placement as PrintAdPlacement }));

  const byId = new Map(categories.map((c) => [String(c._id), c]));
  const priority = new Set(categories.filter((c) => c.type === "location" && c.ingest).map((c) => String(c._id)));
  const depth = { municipality: 3, district: 2, province: 1 } as const;

  const site = config.publicSiteUrl;
  const stories: PrintStory[] = articles.map((a) => {
    const topic = byId.get(String(a.categoryId));
    const places = (a.locationIds ?? []).map((id) => byId.get(String(id))).filter((c) => !!c);
    const place = places.sort((x, y) => (depth[y!.level as keyof typeof depth] ?? 0) - (depth[x!.level as keyof typeof depth] ?? 0))[0];
    return {
      id: String(a._id),
      title: a.title,
      excerpt: toPlainText(a.excerpt || ""),
      paragraphs: articleParagraphs(a.content || ""),
      imageUrl: a.featuredImage || undefined,
      imageCredit: a.imageCredit?.name
        ? [a.imageCredit.name, a.imageCredit.provider].filter(Boolean).join(" / ")
        : undefined,
      topicSlug: topic?.slug,
      topicName: topic?.name,
      placeName: place?.name,
      isLocal: places.length > 0,
      isPriorityPlace: (a.locationIds ?? []).some((id) => priority.has(String(id))),
      sourceName: a.source?.type === "ai" ? a.source?.name || undefined : undefined,
      isBreaking: !!a.isBreaking,
      isFeatured: !!a.isFeatured,
      publishedAt: a.publishedAt ?? a.createdAt,
      url: `${site}/n/${a._id}`,
    };
  });

  // The same story from two outlets is printed once (newest kept).
  const seen: Array<Set<string>> = [];
  const unique = stories.filter((s) => {
    if (isNearDuplicate(s.title, seen)) return false;
    seen.push(titleTokens(s.title));
    return true;
  });

  // The week's latest editorial goes on page 2; editorials never fill news slots.
  const isEditorial = (st: PrintStory) => st.topicSlug === EDITORIAL_TOPIC;
  const editorial = opts.editorial ?? unique.find(isEditorial);
  const plan = planIssue(unique.filter((st) => !isEditorial(st)), pageCount, { ads, editorial });

  const first = config.print.firstIssueDate ? nepalDayStart(config.print.firstIssueDate) : issueDate;
  const volume = Math.max(1, Math.floor((issueDate.getTime() - first.getTime()) / (365.25 * DAY_MS)) + 1);
  const number = Math.max((lastIssue?.number ?? 0) + 1, config.print.issueOffset + 1);

  const meta: IssueMeta = {
    name: config.print.name,
    tagline: config.print.tagline,
    frequency: config.print.frequency,
    regNo: config.print.regNo || undefined,
    price: config.print.price || undefined,
    email: config.print.email || undefined,
    siteUrl: site,
    number,
    volume,
    issueDate,
    pages: pageCount,
  };
  return { plan, meta, articleIds: plan.used.map((s) => s.id) };
}
