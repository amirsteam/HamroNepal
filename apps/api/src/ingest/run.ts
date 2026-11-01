/**
 * The hourly AI local-news run.
 *
 *  fetch feeds → drop seen URLs → drop near-duplicate titles → match place
 *  names → classify (AI, batched) → pick the best stories (local first, capped
 *  per category) → read source text → write summary (AI) → save as "pending"
 *
 * Nothing is published here: every draft waits for an editor in the
 * dashboard's "AI समीक्षा" page.
 */

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { IngestRunStats } from "@hamronepal/shared";
import { config } from "../config";
import { Article, Category, IngestRun, IngestedItem, NewsSource, User } from "../models";
import { generateJSON as defaultGenerate, type GenerateJSON } from "../ai";
import { uniqueSlug } from "../lib/slug";
import { EDITORIAL_TOPIC } from "../seed/data";
import { bsDateString } from "../lib/bs";
import { fetchAll as defaultFetchAll, type FeedSource, type RawItem } from "./fetch";
import {
  extractSourceText as defaultExtract,
  imageLoads as defaultCheckImage,
  MIN_SOURCE_CHARS,
  type CheckImage,
  type ExtractText,
} from "./extract";
import { Gazetteer, type LocationEntry } from "./gazetteer";
import { draftWarnings, hashUrl, isNearDuplicate, titleTokens, unsupportedNumbers } from "./text";
import { classifyItems, writeArticle } from "./steps";
import { findStockPhoto as defaultFindPhoto, type FindStockPhoto, type StockPhoto } from "../services/stockPhoto";
import { storeRemoteImage, type StoreImage } from "../services/imageStore";
import { getSettings } from "../services/settings";
import { aiDeskName } from "@hamronepal/shared";

export const AI_DESK_EMAIL = "ai-desk@hamronepal.local";
export const AI_DESK_NAME = "हाम्रो नेपाल AI डेस्क";

export interface IngestOptions {
  dryRun?: boolean;
  maxDrafts?: number;
  trigger?: "cron" | "manual" | "cli";
  log?: (line: string) => void;
  /** Use the outlet's own photo (default: INGEST_SOURCE_IMAGES). */
  sourceImages?: boolean;
}

export interface IngestDeps {
  fetchAll?: typeof defaultFetchAll;
  extract?: ExtractText;
  generate?: GenerateJSON;
  findPhoto?: FindStockPhoto;
  checkImage?: CheckImage;
  /** Upload a photo to our image storage (Cloudinary). */
  storeImage?: StoreImage;
}

export interface IngestReport {
  runId?: string;
  dryRun: boolean;
  stats: IngestRunStats;
  errorLog: string[];
  drafts: Array<{ title: string; category: string; location?: string; sourceUrl: string; articleId?: string }>;
}

async function ensureAiDeskUser() {
  const existing = await User.findOne({ email: AI_DESK_EMAIL }).lean();
  if (existing) return existing;
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
  const created = await User.create({
    email: AI_DESK_EMAIL,
    name: AI_DESK_NAME,
    role: "reporter",
    isSystem: true,
    passwordHash,
  });
  return created.toObject();
}

export async function runIngest(opts: IngestOptions = {}, deps: IngestDeps = {}): Promise<IngestReport> {
  const dryRun = !!opts.dryRun;
  const maxDrafts = opts.maxDrafts ?? config.ingest.maxDrafts;
  const sourceImages = opts.sourceImages ?? config.ingest.sourceImages;
  const log = opts.log ?? (() => {});
  const fetchAll = deps.fetchAll ?? defaultFetchAll;
  const extract = deps.extract ?? defaultExtract;
  const generate = deps.generate ?? defaultGenerate;
  const findPhoto = deps.findPhoto ?? defaultFindPhoto;
  const checkImage = deps.checkImage ?? defaultCheckImage;
  const storeImage = deps.storeImage ?? storeRemoteImage;

  // The outlet's name (Dashboard → साइट सेटिङ): in the writer's prompt and the drafts' byline.
  const site = await getSettings();
  const deskName = aiDeskName(site.name.ne);

  const stats: IngestRunStats = { fetched: 0, duplicates: 0, skipped: 0, classified: 0, drafted: 0, failed: 0 };
  const errorLog: string[] = [];
  const drafts: IngestReport["drafts"] = [];

  const run = await IngestRun.create({ dryRun, trigger: opts.trigger ?? "cli", startedAt: new Date() });

  /** Remember an item so later runs do not look at it again. */
  const record = async (
    item: RawItem,
    status: "drafted" | "duplicate" | "skipped" | "failed",
    reason?: string,
    articleId?: unknown
  ) => {
    if (dryRun) return;
    await IngestedItem.updateOne(
      { urlHash: hashUrl(item.url) },
      { $setOnInsert: { url: item.url, title: item.title, sourceName: item.sourceName, status, reason, articleId } },
      { upsert: true }
    );
  };

  try {
    // ---------------------------------------------------------- 1. load setup
    const [topics, locations, sources] = await Promise.all([
      // Editorials are written by editors, never by the pipeline.
      Category.find({ type: "topic", isActive: true, slug: { $ne: EDITORIAL_TOPIC } }).lean(),
      Category.find({ type: "location", isActive: true }).lean(),
      NewsSource.find({ isActive: true }).lean(),
    ]);
    if (!topics.length) throw new Error("No topic categories found. Run `npm run seed -w apps/api` first.");

    const gazetteer = new Gazetteer(
      locations.map<LocationEntry>((l) => ({
        id: String(l._id),
        slug: l.slug,
        name: l.name,
        level: (l.level as LocationEntry["level"]) ?? null,
        parentId: l.parentId ? String(l.parentId) : null,
        aliases: l.aliases ?? [],
      }))
    );
    const topicById = new Map(topics.map((t) => [String(t._id), t]));
    const topicBySlug = new Map(topics.map((t) => [t.slug, t]));

    const feeds: FeedSource[] = sources.map((s) => ({
      id: String(s._id),
      name: s.name,
      url: s.url,
      kind: s.kind === "page" ? "page" : "rss",
      categoryId: s.categoryId ? String(s.categoryId) : null,
      locationId: s.locationId ? String(s.locationId) : null,
    }));

    // ---------------------------------------------------------- 2. fetch
    const { items: fetched, results } = await fetchAll(feeds, config.ingest.maxAgeHours);
    stats.fetched = fetched.length;
    for (const r of results) {
      log(`  ${r.error ? "✗" : "✓"} ${r.feed.name}: ${r.error ?? `${r.count} items`}`);
      if (r.error) errorLog.push(`${r.feed.name}: ${r.error}`);
      if (!dryRun && r.feed.id) {
        await NewsSource.updateOne(
          { _id: r.feed.id },
          { lastFetchedAt: new Date(), lastItemCount: r.count, lastError: r.error ?? null }
        );
      }
    }

    // ---------------------------------------------------------- 3. dedupe
    const byHash = new Map<string, RawItem>();
    for (const item of fetched) {
      const h = hashUrl(item.url);
      if (!byHash.has(h)) byHash.set(h, item);
      else stats.duplicates++;
    }
    const seen = await IngestedItem.find({ urlHash: { $in: [...byHash.keys()] } }).select("urlHash").lean();
    for (const s of seen) {
      if (byHash.delete(s.urlHash)) stats.duplicates++;
    }

    const recent = await Article.find({
      "source.type": "ai",
      createdAt: { $gte: new Date(Date.now() - 72 * 3600_000) },
    })
      .select("title source.title")
      .lean();
    const knownTitles = recent.flatMap((a) => [titleTokens(a.title), titleTokens(a.source?.title ?? "")]);

    const fresh: RawItem[] = [];
    for (const item of [...byHash.values()].sort(
      (a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0)
    )) {
      if (isNearDuplicate(item.title, knownTitles)) {
        stats.duplicates++;
        await record(item, "duplicate", "same story already covered");
        continue;
      }
      knownTitles.push(titleTokens(item.title));
      fresh.push(item);
    }
    log(`Fetched ${stats.fetched}, ${fresh.length} new after removing ${stats.duplicates} duplicates.`);

    // Only classify a few times what we can write, to save AI quota.
    const candidates = fresh.slice(0, Math.max(maxDrafts * 3, 10));
    if (!candidates.length) return await finish();

    // ---------------------------------------------------------- 4. place match + classify
    const inputs = candidates.map((item, i) => {
      const matches = gazetteer.match(`${item.title}\n${item.text.slice(0, 600)}`);
      const forced = item.feed.locationId ? gazetteer.get(item.feed.locationId) : undefined;
      const options = matches.slice(0, 4).map((m) => ({ slug: m.slug, name: m.name }));
      if (forced && !options.some((o) => o.slug === forced.slug)) options.unshift({ slug: forced.slug, name: forced.name });
      return { i, title: item.title, summary: item.text.slice(0, 500), sourceName: item.sourceName, locationOptions: options };
    });

    const decisions = await classifyItems(
      generate,
      inputs,
      topics.map((t) => ({ slug: t.slug, name: t.name }))
    );
    stats.classified = decisions.size;

    // ---------------------------------------------------------- 5. choose
    type Pick = { item: RawItem; topicId: string; locationId?: string; confidence: number };
    const picks: Pick[] = [];
    for (const input of inputs) {
      const item = candidates[input.i];
      const d = decisions.get(input.i);
      const fallbackTopic = item.feed.categoryId && topicById.get(item.feed.categoryId);
      const topic = (d?.topic && topicBySlug.get(d.topic)) || fallbackTopic;
      if (!d || !d.newsworthy || d.confidence < config.ingest.minConfidence || !topic) {
        stats.skipped++;
        await record(item, "skipped", !d ? "not classified" : !d.newsworthy ? d.reason || "not newsworthy" : "low confidence");
        continue;
      }
      const loc = d.location ? locations.find((l) => l.slug === d.location) : undefined;
      picks.push({ item, topicId: String(topic._id), locationId: loc ? String(loc._id) : undefined, confidence: d.confidence });
    }

    // Priority locations (`ingest: true`, e.g. Kavre/Panauti) first. Cap per topic.
    const priority = new Set(locations.filter((l) => l.ingest).map((l) => String(l._id)));
    const weight = (p: Pick) => {
      if (!p.locationId) return 0;
      return gazetteer.withAncestors(p.locationId).some((id) => priority.has(id)) ? 2 : 1;
    };
    picks.sort((a, b) => weight(b) - weight(a) || b.confidence - a.confidence);
    // Then topics take turns (best story of each topic, then the second best…),
    // so local news or one busy topic can't fill every draft slot and national
    // topics such as politics still get written.
    const byTopic = new Map<string, Pick[]>();
    for (const p of picks) {
      if (weight(p) === 2) continue;
      if (!byTopic.has(p.topicId)) byTopic.set(p.topicId, []);
      byTopic.get(p.topicId)!.push(p);
    }
    const turns: Pick[] = [];
    for (let round = 0; ; round++) {
      const row = [...byTopic.values()].map((list) => list[round]).filter((p): p is Pick => !!p);
      if (!row.length) break;
      turns.push(...row);
    }
    const ordered = [...picks.filter((p) => weight(p) === 2), ...turns];

    const perTopic = new Map<string, number>();
    const chosen = ordered.filter((p) => {
      const n = perTopic.get(p.topicId) ?? 0;
      if (n >= config.ingest.maxPerCategory) return false;
      perTopic.set(p.topicId, n + 1);
      return true;
    });

    // ---------------------------------------------------------- 6. write + save
    const aiDesk = dryRun ? null : await ensureAiDeskUser();
    // Photos used in the last two weeks, so the site doesn't keep repeating one image.
    const recentImages = new Set(
      (
        await Article.find({ featuredImage: { $exists: true }, createdAt: { $gte: new Date(Date.now() - 14 * 864e5) } })
          .select("featuredImage")
          .lean()
      ).map((a) => a.featuredImage as string)
    );
    for (const pick of chosen) {
      if (stats.drafted >= maxDrafts) break;
      const { item } = pick;
      const topic = topicById.get(pick.topicId)!;
      const location = pick.locationId ? gazetteer.get(pick.locationId) : undefined;
      try {
        const source = await extract(item);
        if (source.text.length < MIN_SOURCE_CHARS) {
          stats.skipped++;
          await record(item, "skipped", "insufficient source text");
          continue;
        }

        const written = await writeArticle(generate, {
          siteName: site.name.ne,
          title: item.title,
          sourceName: item.sourceName,
          sourceUrl: source.url,
          sourceText: source.text,
          topicName: topic.name,
          locationName: location?.name,
        });

        // Checked on the model's own words only: the "स्रोत:" credit link has
        // digits and English in its URL that are not the model's.
        const ownText = `${written.title} ${written.excerpt} ${written.bodyText}`;

        // Guard against invented figures: numbers must come from the source.
        const invented = unsupportedNumbers(ownText, `${item.title} ${source.text}`);
        let confidence = pick.confidence;
        if (invented.length > 2) {
          stats.skipped++;
          await record(item, "skipped", `numbers not in source: ${invented.join(", ")}`);
          continue;
        }
        if (invented.length) confidence = Math.round(confidence * 50) / 100;

        // Leftovers from translation (e.g. "रु the युक्रेन", "सफਾ") are flagged
        // for the editor rather than dropped; the story itself is usually fine.
        const warnings = draftWarnings(`${ownText} ${written.tags.join(" ")}`, invented);

        let photo: StockPhoto | null = null;
        let photoPublicId: string | undefined;
        // The outlet's own photo, credited to it, if the outlet serves it to
        // other sites. Uploaded with the article below (our own copy).
        const candidate = sourceImages ? (source.imageUrl ?? item.imageUrl) : undefined;
        const sourceImage = candidate && (await checkImage(candidate)) ? candidate : undefined;
        if (candidate && !sourceImage) log(`  (source photo blocked, using stock photo: ${candidate})`);
        if (sourceImage) {
          photo = { url: sourceImage, alt: written.title, credit: { name: item.sourceName, url: source.url } };
        } else if (written.imageQuery) {
          try {
            photo = await findPhoto(written.imageQuery, recentImages);
          } catch (err) {
            log(`  (photo lookup failed: ${(err as Error).message})`);
          }
        }
        if (photo) recentImages.add(photo.url);

        const label = `${topic.name}${location ? ` / ${location.name}` : ""}`;
        const photoNote = sourceImage ? "  🖼 स्रोतको तस्बिर" : photo ? `  🖼 "${written.imageQuery}"` : "";
        log(`  ✎ [${label}] ${written.title}${photoNote}`);
        for (const w of warnings) log(`      ⚠ ${w}`);

        if (dryRun) {
          stats.drafted++;
          drafts.push({ title: written.title, category: topic.name, location: location?.name, sourceUrl: source.url });
          continue;
        }

        // Keep our own copy of the outlet's photo, so the article doesn't
        // depend on their server. If that fails, keep the link as before.
        if (sourceImage && photo) {
          try {
            const stored = await storeImage(sourceImage);
            if (stored) {
              photo = { ...photo, url: stored.url };
              photoPublicId = stored.publicId;
            }
          } catch (err) {
            log(`      (photo upload failed, linking instead: ${(err as Error).message})`);
          }
        }

        const article = await Article.create({
          title: written.title,
          slug: await uniqueSlug(Article, written.title),
          excerpt: written.excerpt,
          content: written.content,
          featuredImage: photo?.url ?? (topic.defaultImage || undefined),
          featuredImagePublicId: photoPublicId,
          imageCredit: photo?.credit,
          categoryId: topic._id,
          locationIds: location ? gazetteer.withAncestors(location.id) : [],
          tags: written.tags,
          authorId: aiDesk!._id,
          authorName: deskName,
          status: "pending",
          createdAtBS: bsDateString(),
          source: {
            type: "ai",
            url: source.url,
            name: item.sourceName,
            title: item.title,
            publishedAt: item.publishedAt,
            aiModel: written.model,
            aiConfidence: confidence,
            aiWarnings: warnings,
          },
        });
        stats.drafted++;
        drafts.push({ title: written.title, category: topic.name, location: location?.name, sourceUrl: source.url, articleId: String(article._id) });
        await record(item, "drafted", undefined, article._id);
      } catch (err) {
        stats.failed++;
        const msg = `${item.title.slice(0, 60)}: ${(err as Error).message.slice(0, 200)}`;
        errorLog.push(msg);
        log(`  ✗ ${msg}`);
        await record(item, "failed", (err as Error).message.slice(0, 200));
      }
    }
  } catch (err) {
    errorLog.push(`Run failed: ${(err as Error).message}`);
    log(`Run failed: ${(err as Error).message}`);
  }
  return await finish();

  async function finish(): Promise<IngestReport> {
    await IngestRun.updateOne({ _id: run._id }, { finishedAt: new Date(), stats, errorLog: errorLog.slice(0, 50) });
    return { runId: String(run._id), dryRun, stats, errorLog, drafts };
  }
}
