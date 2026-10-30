import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Article, Category, IngestedItem, NewsSource } from "../src/models";
import { Gazetteer } from "../src/ingest/gazetteer";
import { hashUrl, isNearDuplicate, titleTokens, unsupportedNumbers } from "../src/ingest/text";
import { runIngest } from "../src/ingest/run";
import type { GenerateJSON } from "../src/ai";
import type { RawItem } from "../src/ingest/fetch";
import { clearDb, startDb, stopDb } from "./helpers";
import { injectArticleMeta } from "../src/routes/seo";

describe("text helpers", () => {
  it("ignores tracking params and www when hashing URLs", () => {
    expect(hashUrl("https://www.onlinekhabar.com/a/1?utm_source=fb#x")).toBe(hashUrl("https://onlinekhabar.com/a/1"));
  });

  it("spots the same story with slightly different headlines", () => {
    const known = [titleTokens("काभ्रेको पनौतीमा भीषण आगलागी, तीन घर जले")];
    expect(isNearDuplicate("पनौतीमा भीषण आगलागी, तीन घर जले", known)).toBe(true);
    expect(isNearDuplicate("धुलिखेलमा नयाँ अस्पताल सञ्चालनमा", known)).toBe(false);
  });

  it("flags numbers that are not in the source", () => {
    expect(unsupportedNumbers("२५ जना घाइते, ३ को मृत्यु", "25 जना घाइते भएका छन्")).toEqual([]);
    expect(unsupportedNumbers("१२० जना घाइते", "२५ जना घाइते")).toEqual(["120"]);
  });
});

describe("gazetteer", () => {
  const g = new Gazetteer([
    { id: "p3", slug: "bagmati-pradesh", name: "बागमती प्रदेश", level: "province", parentId: null, aliases: [] },
    { id: "d1", slug: "kavrepalanchok", name: "काभ्रेपलाञ्चोक", level: "district", parentId: "p3", aliases: ["काभ्रे", "Kavre", "धुलिखेल"] },
    { id: "m1", slug: "panauti", name: "पनौती", level: "municipality", parentId: "d1", aliases: [] },
    { id: "d2", slug: "gorkha", name: "गोरखा", level: "district", parentId: null, aliases: [] },
  ]);

  it("matches names with Nepali postpositions", () => {
    expect(g.match("काभ्रेमा पहिरो").map((m) => m.slug)).toEqual(["kavrepalanchok"]);
    expect(g.match("धुलिखेलको सडक").map((m) => m.slug)).toEqual(["kavrepalanchok"]);
  });

  it("does not match inside other words", () => {
    expect(g.match("गोरखापत्रमा प्रकाशित")).toEqual([]);
  });

  it("prefers the most specific place and walks up to the province", () => {
    const matches = g.match("पनौती, कात्तिक १३ – काभ्रेको पनौती नगरपालिकाले");
    expect(matches[0].slug).toBe("panauti");
    expect(g.withAncestors("m1")).toEqual(["m1", "d1", "p3"]);
  });

  it("matches English names case-insensitively", () => {
    expect(g.match("Landslide in KAVRE")[0]?.slug).toBe("kavrepalanchok");
  });
});

describe("seo", () => {
  it("injects per-article Open Graph tags", () => {
    const html = `<html><head><title>Site</title><meta property="og:title" content="old" /></head><body></body></html>`;
    const out = injectArticleMeta(html, { title: `"काभ्रे" <समाचार>`, description: "सार", url: "https://x.np/news/a", image: "https://img/x.jpg" });
    expect(out).toContain(`<meta property="og:title" content="&quot;काभ्रे&quot; &lt;समाचार&gt;" />`);
    expect(out).toContain(`og:image" content="https://img/x.jpg"`);
    expect(out).not.toContain(`content="old"`);
  });
});

describe("runIngest (fake feeds + fake AI)", () => {
  beforeAll(startDb);
  afterAll(stopDb);

  let topicId: string;
  beforeEach(async () => {
    await clearDb();
    const topic = await Category.create({ name: "समाज", slug: "samaj", type: "topic" });
    topicId = String(topic._id);
    const province = await Category.create({ name: "बागमती प्रदेश", slug: "bagmati-pradesh", type: "location", level: "province" });
    await Category.create({
      name: "काभ्रेपलाञ्चोक",
      slug: "kavrepalanchok",
      type: "location",
      level: "district",
      parentId: province._id,
      aliases: ["काभ्रे"],
      ingest: true,
    });
    await NewsSource.create({ name: "परीक्षण खबर", url: "https://feed.test/rss" });
  });

  const sourceText =
    "काभ्रे, कात्तिक १३ । काभ्रेको पनौती नगरपालिकामा आज बिहान आगलागी हुँदा तीन घर जलेका छन् । " +
    "प्रहरीका अनुसार आगलागीमा कोही हताहत भएका छैनन् । स्थानीय र प्रहरीको सहयोगमा आगो नियन्त्रणमा लिइएको हो । ".repeat(4);

  const items: RawItem[] = [
    {
      url: "https://feed.test/news/1?utm_source=rss",
      title: "काभ्रेमा आगलागी, तीन घर जले",
      text: sourceText,
      sourceName: "परीक्षण खबर",
      publishedAt: new Date(),
      feed: { name: "परीक्षण खबर", url: "https://feed.test/rss" },
    },
    {
      url: "https://feed.test/news/2",
      title: "राशिफल: आजको दिन",
      text: "राशिफल ".repeat(80),
      sourceName: "परीक्षण खबर",
      publishedAt: new Date(),
      feed: { name: "परीक्षण खबर", url: "https://feed.test/rss" },
    },
  ];

  const fakeAI: GenerateJSON = async ({ schema, prompt }) => {
    const raw = prompt.includes("वर्गीकरण")
      ? {
          results: [
            { i: 0, topic: "samaj", isLocal: true, location: "kavrepalanchok", newsworthy: true, confidence: 0.9 },
            { i: 1, topic: "samaj", isLocal: false, location: null, newsworthy: false, confidence: 0.9, reason: "राशिफल" },
            // invented slugs must be ignored
            { i: 1, topic: "made-up", isLocal: true, location: "atlantis", newsworthy: true, confidence: 1 },
          ].slice(0, 2),
        }
      : {
          title: "पनौतीमा आगलागी, तीन घर जले",
          excerpt: "काभ्रेको पनौतीमा आगलागी हुँदा तीन घर जलेका छन्। कोही हताहत भएका छैनन्।",
          content: "<p>काभ्रेको पनौती नगरपालिकामा आगलागी हुँदा तीन घर जलेका छन्। प्रहरीका अनुसार कोही हताहत भएका छैनन्।</p><p>स्थानीय र प्रहरीको सहयोगमा आगो नियन्त्रणमा लिइएको हो।</p><script>x</script>",
          tags: ["आगलागी", "पनौती"],
        };
    return { data: schema.parse(raw), provider: "gemini", model: "fake-model" };
  };

  const deps = {
    fetchAll: async () => ({ items, results: [{ feed: items[0].feed, count: items.length }] }),
    extract: async (item: RawItem) => ({ text: item.text, url: item.url }),
    generate: fakeAI,
  };

  it("creates one pending, attributed, location-tagged draft and skips the rest", async () => {
    const report = await runIngest({ maxDrafts: 5 }, deps);
    expect(report.stats.drafted).toBe(1);
    expect(report.stats.skipped).toBe(1);

    const article = await Article.findOne().lean();
    expect(article!.status).toBe("pending");
    expect(String(article!.categoryId)).toBe(topicId);
    expect(article!.locationIds).toHaveLength(2); // district + province
    expect(article!.source?.type).toBe("ai");
    expect(article!.source?.aiModel).toBe("fake-model");
    expect(article!.content).toContain('class="source-credit"');
    expect(article!.content).toContain("परीक्षण खबर");
    expect(article!.content).not.toContain("<script");
    expect(article!.authorName).toBe("हाम्रो नेपाल AI डेस्क");
  });

  it("does nothing new on a second run (dedupe)", async () => {
    await runIngest({ maxDrafts: 5 }, deps);
    const second = await runIngest({ maxDrafts: 5 }, deps);
    expect(second.stats.drafted).toBe(0);
    expect(second.stats.duplicates).toBe(2);
    expect(await Article.countDocuments()).toBe(1);
    expect(await IngestedItem.countDocuments()).toBe(2);
  });

  it("writes nothing in a dry run", async () => {
    const report = await runIngest({ dryRun: true, maxDrafts: 5 }, deps);
    expect(report.drafts).toHaveLength(1);
    expect(await Article.countDocuments()).toBe(0);
    expect(await IngestedItem.countDocuments()).toBe(0);
  });
});
