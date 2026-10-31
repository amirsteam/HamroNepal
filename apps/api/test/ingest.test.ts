import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { config } from "../src/config";
import { findStockPhoto, type FindStockPhoto } from "../src/services/stockPhoto";
import { Article, Category, IngestedItem, NewsSource } from "../src/models";
import { Gazetteer } from "../src/ingest/gazetteer";
import { hashUrl, isNearDuplicate, scriptIssues, titleTokens, unsupportedNumbers } from "../src/ingest/text";
import { runIngest } from "../src/ingest/run";
import { cleanImageUrl, feedItemImage } from "../src/ingest/images";
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

  it("accepts English figures rewritten with हजार / लाख / करोड", () => {
    expect(unsupportedNumbers("८० हजार घर, २४ हजार मानिस, १५ लाख डलर", "80,000 homes; 24,000 people; $1,500,000")).toEqual([]);
    expect(unsupportedNumbers("९० हजार घर", "80,000 homes")).toEqual(["90"]);
  });

  it("finds English words and other-script letters left in Nepali text", () => {
    expect(scriptIssues("रु the युक्रेनमाथि, मानव अधिकार ombudsman, बाटो सफਾ गरी")).toEqual({
      english: ["the", "ombudsman"],
      otherScript: ["सफਾ"],
    });
    // Acronyms are normal in Nepali news.
    expect(scriptIssues("BBC, AI र G20 बैठक")).toEqual({ english: [], otherScript: [] });
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

  // The pipeline sorts newest first and the fake AI answers by position, so the
  // fire story must stay newest. Two `new Date()` calls can land a millisecond
  // apart and swap the order, which made this flaky in CI.
  const now = Date.now();
  const items: RawItem[] = [
    {
      url: "https://feed.test/news/1?utm_source=rss",
      title: "काभ्रेमा आगलागी, तीन घर जले",
      text: sourceText,
      sourceName: "परीक्षण खबर",
      publishedAt: new Date(now),
      feed: { name: "परीक्षण खबर", url: "https://feed.test/rss" },
    },
    {
      url: "https://feed.test/news/2",
      title: "राशिफल: आजको दिन",
      text: "राशिफल ".repeat(80),
      sourceName: "परीक्षण खबर",
      publishedAt: new Date(now - 60_000),
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
          imageQuery: "house fire",
        };
    return { data: schema.parse(raw), provider: "gemini", model: "fake-model" };
  };

  const photoQueries: string[] = [];
  const fakePhoto: FindStockPhoto = async (query) => {
    photoQueries.push(query);
    return {
      url: "https://images.pexels.com/photos/1/pexels-photo-1.jpeg?h=627&w=1200",
      alt: "fire",
      credit: { name: "Test Photographer", url: "https://www.pexels.com/@test", provider: "Pexels", pageUrl: "https://www.pexels.com/photo/1/", symbolic: true },
    };
  };

  const deps = {
    fetchAll: async () => ({ items, results: [{ feed: items[0].feed, count: items.length }] }),
    extract: async (item: RawItem) => ({ text: item.text, url: item.url }),
    generate: fakeAI,
    findPhoto: fakePhoto,
  };

  it("adds a credited, symbolic stock photo from the AI's search words", async () => {
    await runIngest({ maxDrafts: 5 }, deps);
    const article = await Article.findOne().lean();
    expect(photoQueries).toContain("house fire");
    expect(article!.featuredImage).toContain("images.pexels.com");
    expect(article!.imageCredit?.name).toBe("Test Photographer");
    expect(article!.imageCredit?.provider).toBe("Pexels");
    expect(article!.imageCredit?.symbolic).toBe(true);
  });

  it("saves translation leftovers as warnings, ignoring the credit link's URL", async () => {
    const leaky: GenerateJSON = async (args) => {
      const r = await fakeAI(args);
      if (!args.prompt.includes("वर्गीकरण")) {
        const d = r.data as { content: string };
        d.content = d.content.replace("आगो", "the आगो");
      }
      return r;
    };
    await runIngest(
      { maxDrafts: 5 },
      // A source URL with digits and English must not count against the draft.
      { ...deps, generate: leaky, extract: async (item: RawItem) => ({ text: item.text, url: "https://feed.test/news/article-2818" }) }
    );
    const article = await Article.findOne().lean();
    expect(article!.source?.aiWarnings).toEqual(["अंग्रेजी शब्द: the"]);
    expect(article!.source?.aiConfidence).toBe(0.9);
  });

  it("links the outlet's own photo, credited to the outlet, when source images are on", async () => {
    photoQueries.length = 0;
    const withImage = {
      ...deps,
      extract: async (item: RawItem) => ({ text: item.text, url: item.url, imageUrl: "https://cdn.feed.test/fire.jpg" }),
      checkImage: async () => true,
    };
    await runIngest({ maxDrafts: 5, sourceImages: true }, withImage);
    const article = await Article.findOne().lean();
    expect(article!.featuredImage).toBe("https://cdn.feed.test/fire.jpg");
    expect(article!.imageCredit?.name).toBe("परीक्षण खबर");
    expect(article!.imageCredit?.url).toBe("https://feed.test/news/1?utm_source=rss");
    expect(article!.imageCredit?.symbolic).toBeFalsy();
    expect(photoQueries).toEqual([]); // no Pexels call needed
  });

  it("falls back to a stock photo when the outlet refuses its image", async () => {
    const blocked = {
      ...deps,
      extract: async (item: RawItem) => ({ text: item.text, url: item.url, imageUrl: "https://cdn.feed.test/fire.jpg" }),
      checkImage: async () => false,
    };
    await runIngest({ maxDrafts: 5, sourceImages: true }, blocked);
    const article = await Article.findOne().lean();
    expect(article!.featuredImage).toContain("images.pexels.com");
    expect(article!.imageCredit?.provider).toBe("Pexels");
  });

  it("ignores the outlet's photo when source images are off", async () => {
    const withImage = { ...deps, extract: async (item: RawItem) => ({ text: item.text, url: item.url, imageUrl: "https://cdn.feed.test/fire.jpg" }) };
    await runIngest({ maxDrafts: 5, sourceImages: false }, withImage);
    expect((await Article.findOne().lean())!.featuredImage).toContain("images.pexels.com");
  });

  it("still saves the draft when the photo lookup fails", async () => {
    const report = await runIngest(
      { maxDrafts: 5 },
      { ...deps, findPhoto: async () => { throw new Error("Pexels HTTP 500"); } }
    );
    expect(report.stats.drafted).toBe(1);
    const article = await Article.findOne().lean();
    expect(article!.featuredImage).toBeUndefined();
    expect(article!.imageCredit).toBeUndefined();
  });

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

describe("source images", () => {
  it("skips logos and share posters, and asks BBC for a bigger photo", () => {
    expect(cleanImageUrl("https://gorkhapatraonline.com/commons/gopa_static.png")).toBeUndefined();
    expect(cleanImageUrl("https://static.files.bbci.co.uk/x/metadata/poster-1024x576.png")).toBeUndefined();
    expect(cleanImageUrl("javascript:alert(1)")).toBeUndefined();
    expect(cleanImageUrl("https://ichef.bbci.co.uk/ace/standard/240/cpsprodpb/41b8/live/a.jpg")).toBe(
      "https://ichef.bbci.co.uk/ace/standard/976/cpsprodpb/41b8/live/a.jpg"
    );
  });

  it("reads the largest image an RSS item lists", () => {
    expect(
      feedItemImage({
        mediaThumbnail: [{ $: { url: "https://x.test/small.jpg", width: "240" } }, { $: { url: "https://x.test/big.jpg", width: "976" } }],
      })
    ).toBe("https://x.test/big.jpg");
    expect(feedItemImage({ mediaContent: [{ $: { url: "https://x.test/clip.mp4", medium: "video" } }], html: '<p><img src="https://x.test/in.jpg"></p>' })).toBe(
      "https://x.test/in.jpg"
    );
    expect(feedItemImage({ enclosure: { url: "https://x.test/a.mp3", type: "audio/mpeg" } })).toBeUndefined();
  });
});

describe("stock photos (Pexels client)", () => {
  const photo = (id: number) => ({
    id,
    url: `https://www.pexels.com/photo/${id}/`,
    alt: "power lines",
    photographer: "Ram",
    photographer_url: "https://www.pexels.com/@ram",
    src: { landscape: `https://images.pexels.com/photos/${id}/l.jpeg`, large: `https://images.pexels.com/photos/${id}/b.jpeg` },
  });
  const original = config.stockPhotos.pexelsKey;
  afterEach(() => {
    config.stockPhotos.pexelsKey = original;
    vi.unstubAllGlobals();
  });

  it("returns nothing without an API key", async () => {
    config.stockPhotos.pexelsKey = "";
    expect(await findStockPhoto("power lines")).toBeNull();
  });

  it("sends the key, skips recently used photos and credits Pexels", async () => {
    config.stockPhotos.pexelsKey = "test-key";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ photos: [photo(1), photo(2)] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await findStockPhoto("power lines", new Set(["https://images.pexels.com/photos/1/l.jpeg"]));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("query=power+lines");
    expect(url).toContain("orientation=landscape");
    expect((init.headers as Record<string, string>).Authorization).toBe("test-key");
    expect(result?.url).toBe("https://images.pexels.com/photos/2/l.jpeg");
    expect(result?.credit).toMatchObject({ name: "Ram", provider: "Pexels", pageUrl: "https://www.pexels.com/photo/2/", symbolic: true });
  });
});
