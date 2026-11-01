import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { Article, Category } from "../src/models";
import { app, clearDb, loginAs, makeUser, startDb, stopDb } from "./helpers";
import { sourceHash, translateArticle } from "../src/ai/translate";
import { needsTranslation } from "../src/services/translations";
import type { GenerateJSON } from "../src/ai";

beforeAll(startDb);
afterAll(stopDb);

let topicId: string;
beforeEach(async () => {
  await clearDb();
  await makeUser("editor");
  const topic = await Category.create({ name: "राजनीति", nameEn: "Politics", slug: "rajniti", type: "topic" });
  topicId = String(topic._id);
});

async function article(slug: string, en?: { title: string; excerpt?: string; content?: string }) {
  const doc = {
    title: `नेपाली ${slug}`,
    slug,
    excerpt: "सारांश",
    content: "<p>नेपाली सामग्री</p>",
    categoryId: topicId,
    authorId: "6ae446870e672381e5f3e8b7",
    authorName: "सम्पादक",
    status: "published",
    publishedAt: new Date(),
  };
  return Article.create({ ...doc, ...(en ? { en: { ...en, sourceHash: sourceHash(doc) } } : {}) });
}

describe("English site (public API)", () => {
  it("lists only translated stories in English, with English names", async () => {
    await article("one", { title: "English one", excerpt: "Summary", content: "<p>Body</p>" });
    await article("two");

    const en = await request(app).get("/api/articles?lang=en");
    expect(en.body.documents.map((a: { title: string }) => a.title)).toEqual(["English one"]);
    expect(en.body.documents[0].lang).toBe("en");
    expect(en.body.documents[0].en).toBeUndefined(); // no duplicate English object

    const ne = await request(app).get("/api/articles");
    expect(ne.body.total).toBe(2);
    expect(ne.body.documents[0].title).toMatch(/^नेपाली/);

    const cats = await request(app).get("/api/categories?lang=en");
    expect(cats.body[0].name).toBe("Politics");
  });

  it("returns an untranslated story in Nepali, marked as such", async () => {
    await article("two");
    const res = await request(app).get("/api/articles/two?lang=en");
    expect(res.status).toBe(200);
    expect(res.body.lang).toBe("ne");
    expect(res.body.title).toBe("नेपाली two");
  });
});

describe("English versions in the dashboard", () => {
  it("keeps an editor's English and flags it when the Nepali changes", async () => {
    const a = await article("three", { title: "Machine", content: "<p>x</p>" });
    const editor = await loginAs("editor@test.np");

    const saved = await editor.patch(`/api/admin/articles/${a._id}`).send({ en: { title: "Edited title", excerpt: "Fixed", content: "<p>Better</p><script>x</script>" } });
    expect(saved.body.en).toMatchObject({ title: "Edited title", edited: true, outdated: false, model: "editor" });
    expect(saved.body.en.content).not.toContain("<script");
    expect(saved.body.en.sourceHash).toBeUndefined();

    const changed = await editor.patch(`/api/admin/articles/${a._id}`).send({ title: "नयाँ नेपाली शीर्षक" });
    expect(changed.body.en.outdated).toBe(true);
    // A person edited it: the AI must not replace it.
    expect(needsTranslation((await Article.findById(a._id).lean())!)).toBe(false);
  });

  it("needs a new machine translation when the Nepali changed", async () => {
    const a = (await article("four", { title: "Old" })).toObject();
    expect(needsTranslation(a)).toBe(false);
    expect(needsTranslation({ ...a, title: "बदलिएको" })).toBe(true);
    expect(needsTranslation({ ...a, en: undefined })).toBe(true);
  });
});

describe("translator", () => {
  it("keeps the source credit (as 'Source:') and sanitizes the output", async () => {
    let prompt = "";
    const fake: GenerateJSON = async ({ schema, prompt: p }) => {
      prompt = p;
      return { data: schema.parse({ title: "Flood in Panauti", excerpt: "Three bridges.", content: '<p>Text</p><img src="javascript:x">' }), provider: "gemini", model: "fake" };
    };
    const t = await translateArticle(
      { title: "पनौतीमा बाढी", excerpt: "तीन पुल", content: '<p>पाठ</p><p class="source-credit">स्रोत: <a href="https://x.test/a">रातोपाटी</a></p>' },
      fake
    );
    expect(prompt).not.toContain("source-credit"); // never sent to the AI
    expect(t.title).toBe("Flood in Panauti");
    expect(t.content).toContain('<p class="source-credit">Source: <a href="https://x.test/a"');
    expect(t.content).not.toContain("javascript");
  });
});
