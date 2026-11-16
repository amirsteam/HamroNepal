import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Article, Category, User } from "../src/models";
import type { GenerateJSON } from "../src/ai";
import { backfillKeyPoints } from "../src/services/keyPoints";
import { clearDb, makeUser, startDb, stopDb } from "./helpers";

beforeAll(startDb);
afterAll(stopDb);

let base: Record<string, unknown>;
beforeEach(async () => {
  await clearDb();
  await makeUser("editor");
  const author = await User.findOne().lean();
  const topic = await Category.create({ name: "समाज", slug: "samaj", type: "topic" });
  base = {
    content: "<p>पनौतीमा आगलागी हुँदा तीन घर जले। कोही हताहत भएनन्।</p>",
    categoryId: topic._id,
    authorId: author!._id,
    authorName: "सम्पादक",
    status: "published",
    publishedAt: new Date(),
  };
});

/** Nepali points (one with an invented figure); English when asked to translate. */
const fakeAI: GenerateJSON = async ({ schema, prompt }) => {
  const raw = prompt.startsWith("Translate")
    ? { keyPoints: ["Three houses burned in Panauti.", "No one was hurt."] }
    : { keyPoints: ["• पनौतीमा तीन घर जले।", "आगलागीमा ८० लाख क्षति भयो।", "कोही हताहत भएनन्।"] };
  return { data: schema.parse(raw), provider: "gemini", model: "fake" };
};

describe("key points backfill", () => {
  it("adds checked points, English ones for translated stories, without touching updatedAt", async () => {
    const ne = await Article.create({ ...base, title: "पनौतीमा आगलागी", slug: "a" });
    await Article.create({
      ...base,
      title: "पनौतीमा फेरि आगलागी",
      slug: "b",
      en: { title: "Fire in Panauti", excerpt: "", content: "<p>Fire</p>" },
    });
    await Article.create({ ...base, title: "पुरानो बुँदासहित", slug: "c", keyPoints: ["पहिल्यै छ"] });
    await Article.create({ ...base, title: "अस्वीकृत", slug: "d", status: "archived" });
    const before = (await Article.findById(ne._id).lean())!.updatedAt!.getTime();

    const r = await backfillKeyPoints({ generate: fakeAI });
    expect(r).toEqual({ done: 2, failed: 0, checked: 2 });

    const a = await Article.findOne({ slug: "a" }).lean();
    expect(a!.keyPoints).toEqual(["पनौतीमा तीन घर जले।", "कोही हताहत भएनन्।"]);
    expect(a!.en).toBeUndefined();
    expect(a!.updatedAt!.getTime()).toBe(before);

    const b = await Article.findOne({ slug: "b" }).lean();
    expect(b!.en!.keyPoints).toEqual(["Three houses burned in Panauti.", "No one was hurt."]);
    expect(b!.en!.title).toBe("Fire in Panauti");

    expect((await Article.findOne({ slug: "c" }).lean())!.keyPoints).toEqual(["पहिल्यै छ"]);
    expect((await Article.findOne({ slug: "d" }).lean())!.keyPoints ?? []).toEqual([]);
  });

  it("saves nothing on a dry run", async () => {
    await Article.create({ ...base, title: "पनौतीमा आगलागी", slug: "a" });
    const r = await backfillKeyPoints({ generate: fakeAI, dryRun: true });
    expect(r.done).toBe(1);
    expect((await Article.findOne({ slug: "a" }).lean())!.keyPoints ?? []).toEqual([]);
  });
});
