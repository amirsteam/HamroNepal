/**
 * The monthly archive job: stories older than the cutoff drop off the live site
 * but stay readable at their own URLs.
 */

import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Article, Category, User } from "../src/models";
import { retireCutoff, retirableFilter, retireOldArticles } from "../src/services/archive";
import { translatePending } from "../src/services/translations";
import { buildIssue } from "../src/print/issue";
import { app, clearDb, loginAs, makeUser, startDb, stopDb } from "./helpers";

beforeAll(startDb);
afterAll(stopDb);

let topicId: string;
let authorId: string;
let n = 0;

function monthsAgo(months: number): Date {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}

async function publishedStory(ageMonths: number, extra: Record<string, unknown> = {}) {
  n++;
  return Article.create({
    title: `समाचार ${n}`,
    slug: `samachar-${n}`,
    excerpt: "सारांश",
    content: "<p>विवरण।</p>",
    categoryId: topicId,
    authorId,
    authorName: "परीक्षक",
    status: "published",
    publishedAt: monthsAgo(ageMonths),
    ...extra,
  });
}

beforeEach(async () => {
  await clearDb();
  n = 0;
  const [editor, topic] = await Promise.all([
    makeUser("editor"),
    Category.create({ name: "राजनीति", slug: "rajniti", type: "topic" }),
  ]);
  await makeUser("reporter");
  authorId = String(editor._id);
  topicId = String(topic._id);
});

describe("retireCutoff / retirableFilter (pure)", () => {
  it("counts back the given number of months", () => {
    expect(retireCutoff(new Date("2026-11-05T00:00:00Z"), 12).toISOString()).toBe(
      "2025-11-05T00:00:00.000Z"
    );
    expect(retireCutoff(new Date("2026-11-05T00:00:00Z"), 18).toISOString()).toBe(
      "2025-05-05T00:00:00.000Z"
    );
  });

  it("requires publishedAt to be a real date", () => {
    // BSON orders Null before Date, so a bare $lt would also match a published
    // story with no publishedAt and silently retire it.
    expect(retirableFilter(new Date()).publishedAt).toMatchObject({ $type: "date" });
  });
});

describe("retireOldArticles", () => {
  it("retires a story past the cutoff and leaves a recent one alone", async () => {
    const old = await publishedStory(13);
    const recent = await publishedStory(11);

    const r = await retireOldArticles({ months: 12 });

    expect(r.retired).toBe(1);
    expect((await Article.findById(old._id))!.retiredAt).toBeInstanceOf(Date);
    expect((await Article.findById(recent._id))!.retiredAt).toBeNull();
  });

  it("never touches a published story that has no publishedAt", async () => {
    const odd = await Article.create({
      title: "मिति नभएको",
      slug: "miti-nabhaeko",
      categoryId: topicId,
      authorId,
      authorName: "परीक्षक",
      status: "published",
    });

    const r = await retireOldArticles({ months: 12 });

    expect(r.retired).toBe(0);
    expect((await Article.findById(odd._id))!.retiredAt).toBeNull();
  });

  it("keeps updatedAt, because it is sitemap lastmod and JSON-LD dateModified", async () => {
    const old = await publishedStory(13);
    const before = (await Article.findById(old._id))!.updatedAt;

    await retireOldArticles({ months: 12 });

    const after = (await Article.findById(old._id))!.updatedAt;
    expect(after.getTime()).toBe(before.getTime());
  });

  it("is safe to run again", async () => {
    await publishedStory(13);
    const first = await retireOldArticles({ months: 12 });
    const stamped = (await Article.findOne({ retiredAt: { $ne: null } }))!.retiredAt!;

    const second = await retireOldArticles({ months: 12 });

    expect(first.retired).toBe(1);
    expect(second.retired).toBe(0);
    expect(second.remaining).toBe(0);
    const still = (await Article.findOne({ retiredAt: { $ne: null } }))!.retiredAt!;
    expect(still.getTime()).toBe(stamped.getTime());
  });

  it("takes the oldest first when capped, and reports the backlog", async () => {
    for (const age of [20, 19, 18, 17, 16]) await publishedStory(age);

    const r = await retireOldArticles({ months: 12, limit: 2 });

    expect(r.retired).toBe(2);
    expect(r.remaining).toBe(3);
    const retired = await Article.find({ retiredAt: { $ne: null } }).lean();
    const live = await Article.find({ retiredAt: null }).lean();
    expect(retired).toHaveLength(2);
    expect(live).toHaveLength(3);
    // Everything still live is newer than everything retired.
    expect(Math.min(...live.map((a) => a.publishedAt!.getTime()))).toBeGreaterThan(
      Math.max(...retired.map((a) => a.publishedAt!.getTime()))
    );
  });

  it("writes nothing on a dry run", async () => {
    await publishedStory(13);

    const r = await retireOldArticles({ months: 12, dryRun: true });

    expect(r.checked).toBe(1);
    expect(await Article.countDocuments({ retiredAt: { $ne: null } })).toBe(0);
  });

  it("reports one line per story, marked according to the mode", async () => {
    const old = await publishedStory(13);

    const dry: string[] = [];
    await retireOldArticles({ months: 12, dryRun: true, log: (l) => dry.push(l) });
    const real: string[] = [];
    await retireOldArticles({ months: 12, log: (l) => real.push(l) });

    expect(dry).toEqual([`  – ${old.title}`]);
    expect(real).toEqual([`  ✓ ${old.title}`]);
  });
});

describe("a retired story stays readable", () => {
  it("opens by slug and by id, and redirects from its printed QR link", async () => {
    const old = await publishedStory(13);
    await retireOldArticles({ months: 12 });

    await request(app).get(`/api/articles/${old.slug}`).expect(200);
    // The id path matters: /articles/:slug passes its own $or for id-or-slug.
    await request(app).get(`/api/articles/${old._id}`).expect(200);
    const qr = await request(app).get(`/n/${old._id}`).expect(301);
    expect(qr.headers.location).toBe(`/news/${encodeURIComponent(old.slug)}`);
  });

  it("still counts a view", async () => {
    const old = await publishedStory(13);
    await retireOldArticles({ months: 12 });

    await request(app).post(`/api/articles/${old._id}/view`).expect(204);

    expect((await Article.findById(old._id))!.viewCount).toBe(1);
  });
});

describe("a retired story leaves the live site", () => {
  it("is gone from the lists, search, the sitemap and RSS", async () => {
    const old = await publishedStory(13);
    await publishedStory(1);
    await retireOldArticles({ months: 12 });

    const list = await request(app).get("/api/articles").expect(200);
    expect(list.body.documents.map((a: { $id: string }) => a.$id)).not.toContain(String(old._id));
    expect(list.body.total).toBe(1);

    const home = await request(app).get("/api/home").expect(200);
    expect(JSON.stringify(home.body)).not.toContain(old.slug);

    const search = await request(app).get("/api/search?q=%E0%A4%B8%E0%A4%AE%E0%A4%BE%E0%A4%9A%E0%A4%BE%E0%A4%B0").expect(200);
    expect(search.body.documents.map((a: { $id: string }) => a.$id)).not.toContain(String(old._id));

    const sitemap = await request(app).get("/sitemap.xml").expect(200);
    expect(sitemap.text).not.toContain(old.slug);

    const rss = await request(app).get("/rss.xml").expect(200);
    expect(rss.text).not.toContain(old.slug);
  });

  it("stays off the home rails even when featured and breaking", async () => {
    const old = await publishedStory(13, { isFeatured: true, isBreaking: true });
    await retireOldArticles({ months: 12 });

    const home = await request(app).get("/api/home").expect(200);
    expect(JSON.stringify(home.body)).not.toContain(old.slug);
    // The job leaves the flags alone; the live filter is what hides it.
    expect((await Article.findById(old._id))!.isFeatured).toBe(true);
  });

  it("leaves the English list", async () => {
    await publishedStory(13, {
      en: { title: "Old story", excerpt: "Summary", content: "<p>Body.</p>" },
    });
    await retireOldArticles({ months: 12 });

    const list = await request(app).get("/api/articles?lang=en").expect(200);

    expect(list.body.total).toBe(0);
  });
});

describe("status 'archived' is still private", () => {
  // Do not delete these. "archived" is what the AI review queue sets when an
  // editor rejects a draft, and what an editor sets to take a story down.
  // Retiring old news must never make either of them readable.
  it("keeps a rejected AI draft out of the public API", async () => {
    const reject = await Article.create({
      title: "अस्वीकृत मस्यौदा",
      slug: "aswikrit-masyauda",
      categoryId: topicId,
      authorId,
      authorName: "हाम्रो नेपाल AI डेस्क",
      status: "archived",
      source: { type: "ai", aiWarnings: ["unsupported number"] },
    });

    const r = await retireOldArticles({ months: 12 });

    expect(r.retired).toBe(0);
    expect((await Article.findById(reject._id))!.retiredAt).toBeNull();
    await request(app).get(`/api/articles/${reject.slug}`).expect(404);
    await request(app).get(`/api/articles/${reject._id}`).expect(404);
    const qr = await request(app).get(`/n/${reject._id}`).expect(301);
    expect(qr.headers.location).toBe("/");
  });

  it("still hides a story an editor takes down after publishing", async () => {
    const taken = await publishedStory(1);
    taken.set({ status: "archived" });
    await taken.save();

    await request(app).get(`/api/articles/${taken.slug}`).expect(404);
  });
});

describe("the dashboard can see and undo it", () => {
  it("filters by retired and counts them", async () => {
    const old = await publishedStory(13);
    await publishedStory(1);
    await retireOldArticles({ months: 12 });
    const agent = await loginAs("editor@test.np");

    const retired = await agent.get("/api/admin/articles?retired=true").expect(200);
    expect(retired.body.documents.map((a: { $id: string }) => a.$id)).toEqual([String(old._id)]);

    const live = await agent.get("/api/admin/articles?retired=false").expect(200);
    expect(live.body.total).toBe(1);

    const stats = await agent.get("/api/admin/articles/stats").expect(200);
    expect(stats.body.retiredArticles).toBe(1);
    // Retired stories are still published, so that number must not change.
    expect(stats.body.publishedArticles).toBe(2);
  });

  it("lets an editor put a story back without re-stamping publishedAt", async () => {
    const old = await publishedStory(13);
    const publishedAt = old.publishedAt!.getTime();
    await retireOldArticles({ months: 12 });
    const agent = await loginAs("editor@test.np");

    await agent.patch(`/api/admin/articles/${old._id}`).send({ retired: false }).expect(200);

    const back = (await Article.findById(old._id))!;
    expect(back.retiredAt).toBeNull();
    expect(back.publishedAt!.getTime()).toBe(publishedAt);
    const list = await request(app).get("/api/articles").expect(200);
    expect(list.body.total).toBe(1);
  });

  it("does not let a reporter put one back", async () => {
    const old = await publishedStory(13);
    await retireOldArticles({ months: 12 });
    const reporter = (await User.findOne({ role: "reporter" }))!;
    await Article.updateOne({ _id: old._id }, { authorId: reporter._id, status: "draft" });
    const agent = await loginAs("reporter@test.np");

    await agent.patch(`/api/admin/articles/${old._id}`).send({ retired: false });

    expect((await Article.findById(old._id))!.retiredAt).not.toBeNull();
  });
});

describe("knock-on effects", () => {
  it("drops out of the translation queue", async () => {
    await publishedStory(13);
    await retireOldArticles({ months: 12 });

    const r = await translatePending({ limit: 10, dryRun: true });

    expect(r.checked).toBe(0);
  });

  it("stays out of a print issue built over a wide window", async () => {
    const old = await publishedStory(13);
    await retireOldArticles({ months: 12 });

    const issue = await buildIssue({ days: 800 });

    expect(issue.articleIds.map(String)).not.toContain(String(old._id));
  });
});
