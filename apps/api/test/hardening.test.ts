// SEO and security pieces that need no database.
import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { config } from "../src/config";
import { injectArticleMeta, jsonLdScript, newsArticleJsonLd } from "../src/routes/seo";

const app = createApp();
const HTML = '<html lang="ne"><head><title>x</title></head><body></body></html>';

describe("structured data", () => {
  it("can't be closed early by text from an article", () => {
    const out = jsonLdScript({ headline: "</script><script>alert(1)</script>" });
    expect(out.match(/<\/script>/g)).toHaveLength(1); // only the real closing tag
    expect(JSON.parse(out.replace(/^<script[^>]*>|<\/script>$/g, "")).headline).toContain("<script>");
  });

  it("describes a story as a NewsArticle, crediting AI-desk stories to the site", () => {
    const base = { title: "शीर्षक", publishedAt: new Date("2026-11-01T00:00:00Z"), updatedAt: new Date("2026-11-01T01:00:00Z") };
    const opts = { url: "https://x.np/news/a", lang: "ne" as const, title: "शीर्षक", description: "सार" };
    const person = newsArticleJsonLd({ ...base, authorName: "राम", source: { type: "manual" } }, opts);
    expect(person).toMatchObject({ "@type": "NewsArticle", headline: "शीर्षक", inLanguage: "ne", author: { "@type": "Person", name: "राम" } });
    const ai = newsArticleJsonLd({ ...base, authorName: "हाम्रो नेपाल AI डेस्क", source: { type: "ai" } }, opts);
    expect(ai.author).toMatchObject({ "@type": "NewsMediaOrganization" });

    const page = injectArticleMeta(HTML, { title: "t", description: "d", url: opts.url, jsonLd: person });
    expect(page).toContain('<script type="application/ld+json">');
    expect(page).toContain('<link rel="canonical" href="https://x.np/news/a" />');
  });
});

describe("robots.txt", () => {
  it("names the sitemaps with full addresses and keeps search pages out", async () => {
    const res = await request(app).get("/robots.txt");
    expect(res.status).toBe(200);
    expect(res.text).toContain(`Sitemap: ${config.publicSiteUrl}/sitemap.xml`);
    expect(res.text).toMatch(/Disallow: \/search/);
    expect(res.text).toMatch(/Disallow: \/dashboard/);
  });
});

describe("cross-site writes", () => {
  it("refuses a change sent from another site's page", async () => {
    const res = await request(app).post("/api/auth/logout").set("Origin", "https://evil.example");
    expect(res.status).toBe(403);
  });

  it("allows the site itself and requests without an Origin", async () => {
    expect((await request(app).post("/api/auth/logout").set("Origin", config.publicSiteUrl)).status).toBe(204);
    expect((await request(app).post("/api/auth/logout")).status).toBe(204);
  });
});
