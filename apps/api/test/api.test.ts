import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { Article, Category } from "../src/models";
import { app, clearDb, loginAs, makeUser, startDb, stopDb } from "./helpers";

let topicId: string;
let districtId: string;
let provinceId: string;

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  await Promise.all([makeUser("admin"), makeUser("editor"), makeUser("reporter"), makeUser("reporter", "other@test.np")]);
  const topic = await Category.create({ name: "राजनीति", slug: "rajniti", type: "topic" });
  const province = await Category.create({ name: "बागमती प्रदेश", slug: "bagmati-pradesh", type: "location", level: "province" });
  const district = await Category.create({
    name: "काभ्रेपलाञ्चोक",
    slug: "kavrepalanchok",
    type: "location",
    level: "district",
    parentId: province._id,
  });
  topicId = String(topic._id);
  districtId = String(district._id);
  provinceId = String(province._id);
});

const base = () => ({ title: "परीक्षण समाचार", content: "<p>सामग्री</p>", categoryId: topicId });

describe("auth", () => {
  it("rejects a wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "admin@test.np", password: "nope" });
    expect(res.status).toBe(401);
  });

  it("returns the user without the password hash", async () => {
    const agent = await loginAs("editor@test.np");
    const res = await agent.get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("editor");
    expect(res.body.$id).toBeTruthy();
    expect(res.body.passwordHash).toBeUndefined();
  });

  it("answers null (not an error) when signed out", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it("blocks anonymous writes", async () => {
    const res = await request(app).post("/api/admin/articles").send(base());
    expect(res.status).toBe(401);
  });
});

describe("roles", () => {
  it("turns a reporter's 'published' into 'pending' and ignores featured/breaking", async () => {
    const agent = await loginAs("reporter@test.np");
    const res = await agent.post("/api/admin/articles").send({ ...base(), status: "published", isFeatured: true, isBreaking: true });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("pending");
    expect(res.body.isFeatured).toBe(false);
    expect(res.body.isBreaking).toBe(false);
    expect(res.body.publishedAt).toBeUndefined();
  });

  it("stops a reporter editing someone else's article", async () => {
    const other = await loginAs("other@test.np");
    const created = await other.post("/api/admin/articles").send(base());
    const reporter = await loginAs("reporter@test.np");
    const res = await reporter.patch(`/api/admin/articles/${created.body.$id}`).send({ title: "हाइज्याक" });
    expect(res.status).toBe(403);
  });

  it("only lets admins delete", async () => {
    const editor = await loginAs("editor@test.np");
    const created = await editor.post("/api/admin/articles").send(base());
    expect((await editor.delete(`/api/admin/articles/${created.body.$id}`)).status).toBe(403);
    const admin = await loginAs("admin@test.np");
    expect((await admin.delete(`/api/admin/articles/${created.body.$id}`)).status).toBe(204);
  });

  it("lets an editor publish and sets the publish dates once", async () => {
    const editor = await loginAs("editor@test.np");
    const created = await editor.post("/api/admin/articles").send(base());
    const published = await editor.patch(`/api/admin/articles/${created.body.$id}`).send({ status: "published" });
    expect(published.body.status).toBe("published");
    expect(published.body.publishedAt).toBeTruthy();
    expect(published.body.publishedAtBS).toMatch(/[०-९]/);

    const again = await editor.patch(`/api/admin/articles/${created.body.$id}`).send({ title: "नयाँ शीर्षक", status: "published" });
    expect(again.body.publishedAt).toBe(published.body.publishedAt);
  });

  it("keeps reporters out of category management", async () => {
    const reporter = await loginAs("reporter@test.np");
    expect((await reporter.post("/api/admin/categories").send({ name: "नयाँ" })).status).toBe(403);
  });
});

describe("content safety", () => {
  it("strips scripts and event handlers on save", async () => {
    const editor = await loginAs("editor@test.np");
    const res = await editor.post("/api/admin/articles").send({
      ...base(),
      content: `<p onclick="x()">ठीक</p><script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">लिङ्क</a>`,
    });
    expect(res.body.content).not.toMatch(/script|onerror|onclick|javascript:/i);
    expect(res.body.content).toContain("<p>ठीक</p>");
  });

  it("makes slugs unique", async () => {
    const editor = await loginAs("editor@test.np");
    const a = await editor.post("/api/admin/articles").send(base());
    const b = await editor.post("/api/admin/articles").send(base());
    expect(a.body.slug).not.toBe(b.body.slug);
  });
});

describe("public API", () => {
  async function publishedArticle(extra: Record<string, unknown> = {}) {
    const editor = await loginAs("editor@test.np");
    const res = await editor.post("/api/admin/articles").send({ ...base(), status: "published", ...extra });
    return res.body;
  }

  it("hides unpublished articles", async () => {
    const editor = await loginAs("editor@test.np");
    const draft = await editor.post("/api/admin/articles").send(base());
    expect((await request(app).get(`/api/articles/${encodeURIComponent(draft.body.slug)}`)).status).toBe(404);
    const list = await request(app).get("/api/articles");
    expect(list.body.total).toBe(0);
  });

  it("serves published articles and the home page", async () => {
    const art = await publishedArticle({ isFeatured: true });
    const one = await request(app).get(`/api/articles/${encodeURIComponent(art.slug)}`);
    expect(one.status).toBe(200);
    expect(one.body.title).toBe("परीक्षण समाचार");

    const home = await request(app).get("/api/home");
    expect(home.status).toBe(200);
    expect(home.body.featured).toHaveLength(1);
    expect(home.body.sections[0].category.slug).toBe("rajniti");
    expect(home.body.sections[0].articles[0]).not.toHaveProperty("content");
  });

  it("files a district article under its province too", async () => {
    await publishedArticle({ locationIds: [districtId] });
    const district = await request(app).get("/api/articles?category=kavrepalanchok");
    const province = await request(app).get("/api/articles?category=bagmati-pradesh");
    expect(district.body.total).toBe(1);
    expect(province.body.total).toBe(1);
    const stored = await Article.findOne().lean();
    expect(stored!.locationIds.map(String).sort()).toEqual([districtId, provinceId].sort());
  });

  it("counts views atomically", async () => {
    const art = await publishedArticle();
    await Promise.all(Array.from({ length: 50 }, () => request(app).post(`/api/articles/${art.$id}/view`)));
    const stored = await Article.findById(art.$id).lean();
    expect(stored!.viewCount).toBe(50);
  });

  it("searches titles", async () => {
    await publishedArticle({ title: "काभ्रेमा नयाँ सडक" });
    const res = await request(app).get(`/api/search?q=${encodeURIComponent("सडक")}`);
    expect(res.body.total).toBe(1);
  });

  it("serves sitemap and RSS", async () => {
    const art = await publishedArticle();
    const sitemap = await request(app).get("/sitemap.xml");
    expect(sitemap.text).toContain(`/news/${encodeURIComponent(art.slug)}`);
    const rss = await request(app).get("/rss.xml");
    expect(rss.text).toContain("<rss");
  });
});
