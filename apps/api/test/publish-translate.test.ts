import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Article, Category } from "../src/models";
import { app, clearDb, loginAs, makeUser, startDb, stopDb } from "./helpers";
import request from "supertest";

// Pretend an AI key is set, and translate without calling a provider.
const translate = vi.hoisted(() => vi.fn());
vi.mock("../src/ai", async (orig) => ({ ...(await orig<typeof import("../src/ai")>()), isAIConfigured: () => true }));
vi.mock("../src/ai/translate", async (orig) => ({
  ...(await orig<typeof import("../src/ai/translate")>()),
  translateArticle: translate,
}));

beforeAll(startDb);
afterAll(stopDb);

let topicId: string;
beforeEach(async () => {
  await clearDb();
  await makeUser("editor");
  await makeUser("reporter");
  topicId = String((await Category.create({ name: "राजनीति", slug: "rajniti", type: "topic" }))._id);
  translate.mockReset();
  translate.mockImplementation(async (a: { title: string }) => ({
    title: `EN ${a.title}`,
    excerpt: "Summary",
    content: "<p>English</p>",
    model: "fake",
  }));
});

describe("English version on publish", () => {
  it("translates a story when an editor approves it", async () => {
    const editor = await loginAs("editor@test.np");
    const draft = await editor.post("/api/admin/articles").send({ title: "मस्यौदा", content: "<p>पाठ</p>", categoryId: topicId });
    expect(translate).not.toHaveBeenCalled(); // drafts stay Nepali only

    const res = await editor.patch(`/api/admin/articles/${draft.body.$id}`).send({ status: "published" });
    expect(res.status).toBe(200);
    expect(res.body.en.title).toBe("EN मस्यौदा");

    const list = await request(app).get("/api/articles?lang=en");
    expect(list.body.documents.map((a: { title: string }) => a.title)).toContain("EN मस्यौदा");
  });

  it("re-translates when a published story's Nepali changes, but not a person's English", async () => {
    const editor = await loginAs("editor@test.np");
    const created = await editor.post("/api/admin/articles").send({ title: "पहिलो", categoryId: topicId, status: "published" });
    expect(created.body.en.title).toBe("EN पहिलो");

    await editor.patch(`/api/admin/articles/${created.body.$id}`).send({ title: "दोस्रो" });
    expect((await Article.findById(created.body.$id))!.en!.title).toBe("EN दोस्रो");

    await editor.patch(`/api/admin/articles/${created.body.$id}`).send({ en: { title: "Hand written" } });
    await editor.patch(`/api/admin/articles/${created.body.$id}`).send({ title: "तेस्रो" });
    expect((await Article.findById(created.body.$id))!.en!.title).toBe("Hand written");
    expect(translate).toHaveBeenCalledTimes(2);
  });

  it("still publishes when the translation fails", async () => {
    translate.mockRejectedValue(new Error("rate limited"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const editor = await loginAs("editor@test.np");
    const res = await editor.post("/api/admin/articles").send({ title: "समाचार", categoryId: topicId, status: "published" });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("published");
    expect(res.body.en).toBeFalsy();
    warn.mockRestore();
  });

  it("does not translate a reporter's story (it only goes to review)", async () => {
    const reporter = await loginAs("reporter@test.np");
    const res = await reporter.post("/api/admin/articles").send({ title: "रिपोर्ट", categoryId: topicId, status: "published" });
    expect(res.body.status).toBe("pending");
    expect(translate).not.toHaveBeenCalled();
  });
});
