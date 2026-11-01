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

describe("photo credits", () => {
  it("drops the old photo credit when an editor changes the image", async () => {
    const editor = await loginAs("editor@test.np");
    const created = await editor.post("/api/admin/articles").send({
      ...base(),
      featuredImage: "https://images.pexels.com/photos/1/l.jpeg",
    });
    await Article.updateOne(
      { _id: created.body.$id },
      { $set: { imageCredit: { name: "Ram", provider: "Pexels", symbolic: true } } }
    );

    // Saving without changing the image keeps the credit.
    await editor.patch(`/api/admin/articles/${created.body.$id}`).send({ title: "नयाँ शीर्षक", featuredImage: "https://images.pexels.com/photos/1/l.jpeg" });
    expect((await Article.findById(created.body.$id).lean())!.imageCredit?.name).toBe("Ram");

    // A new image removes it.
    const res = await editor.patch(`/api/admin/articles/${created.body.$id}`).send({ featuredImage: "https://res.cloudinary.com/x/image/upload/a.jpg" });
    expect(res.status).toBe(200);
    expect((await Article.findById(created.body.$id).lean())!.imageCredit).toBeUndefined();
  });
});

describe("AI draft warnings", () => {
  it("rechecks the text when an editor saves, keeping only problems still there", async () => {
    const editor = await loginAs("editor@test.np");
    const created = await editor.post("/api/admin/articles").send(base());
    await Article.updateOne(
      { _id: created.body.$id },
      { $set: { source: { type: "ai", aiWarnings: ["स्रोतमा नभएका अंक: 120", "अंग्रेजी शब्द: the, ombudsman"] } } }
    );

    // "the" fixed, "ombudsman" left in; the credit line's English is not counted.
    await editor.patch(`/api/admin/articles/${created.body.$id}`).send({
      content: '<p>युक्रेनका ombudsman ले भने।</p><p class="source-credit">स्रोत: <a href="https://x.test/a">BBC World</a></p>',
    });
    expect((await Article.findById(created.body.$id).lean())!.source?.aiWarnings).toEqual(["अंग्रेजी शब्द: ombudsman"]);

    await editor.patch(`/api/admin/articles/${created.body.$id}`).send({ content: "<p>युक्रेनका लोकपालले भने।</p>" });
    expect((await Article.findById(created.body.$id).lean())!.source?.aiWarnings).toEqual([]);
  });
});

describe("advertisements", () => {
  const banner = (extra: Record<string, unknown> = {}) => ({
    title: "नेपाल बैंक",
    imageUrl: "https://res.cloudinary.com/x/image/upload/banner.jpg",
    linkUrl: "https://bank.example.np/offer",
    placement: "sidebar",
    ...extra,
  });

  it("only lets admins manage ads, and refuses non-web links", async () => {
    const editor = await loginAs("editor@test.np");
    expect((await editor.post("/api/admin/promotions").send(banner())).status).toBe(403);

    const admin = await loginAs("admin@test.np");
    expect((await admin.post("/api/admin/promotions").send(banner({ linkUrl: "javascript:alert(1)" }))).status).toBe(400);
    expect((await admin.post("/api/admin/promotions").send(banner({ endsAt: "2026-01-01", startsAt: "2026-02-01" }))).status).toBe(400);
    expect((await admin.post("/api/admin/promotions").send(banner())).status).toBe(201);
  });

  it("keeps empty dates empty, so an ad without dates runs", async () => {
    const admin = await loginAs("admin@test.np");
    const created = await admin.post("/api/admin/promotions").send(banner({ startsAt: null, endsAt: null }));
    expect(created.body.startsAt).toBeNull();
    expect(created.body.endsAt).toBeNull();
    const edited = await admin.patch(`/api/admin/promotions/${created.body.$id}`).send({ startsAt: null, endsAt: null });
    expect(edited.body.endsAt).toBeNull();
    expect((await request(app).get("/api/promotions")).body).toHaveLength(1);
  });

  it("shows only running ads, without their counts", async () => {
    const admin = await loginAs("admin@test.np");
    const day = 864e5;
    await admin.post("/api/admin/promotions").send(banner({ title: "चलिरहेको" }));
    await admin.post("/api/admin/promotions").send(banner({ title: "बन्द", isActive: false }));
    await admin.post("/api/admin/promotions").send(banner({ title: "सकियो", endsAt: new Date(Date.now() - day).toISOString() }));
    await admin.post("/api/admin/promotions").send(banner({ title: "आउँदै", startsAt: new Date(Date.now() + day).toISOString() }));

    const res = await request(app).get("/api/promotions");
    expect(res.body.map((p: { title: string }) => p.title)).toEqual(["चलिरहेको"]);
    expect(res.body[0].clicks).toBeUndefined();
  });

  it("keeps print-edition ads off the website", async () => {
    const admin = await loginAs("admin@test.np");
    expect((await admin.post("/api/admin/promotions").send(banner({ placement: "print-half", title: "छापा" }))).status).toBe(201);
    await admin.post("/api/admin/promotions").send(banner({ title: "वेब" }));
    const res = await request(app).get("/api/promotions");
    expect(res.body.map((p: { title: string }) => p.title)).toEqual(["वेब"]);
  });

  it("counts views and clicks, and sends clicks to the advertiser", async () => {
    const admin = await loginAs("admin@test.np");
    const created = await admin.post("/api/admin/promotions").send(banner());
    const id = created.body.$id;

    expect((await request(app).post(`/api/promotions/${id}/view`)).status).toBe(204);
    const click = await request(app).get(`/api/promotions/${id}/click`);
    expect(click.status).toBe(302);
    expect(click.headers.location).toBe("https://bank.example.np/offer");

    const list = await admin.get("/api/admin/promotions");
    expect(list.body[0]).toMatchObject({ views: 1, clicks: 1 });
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
