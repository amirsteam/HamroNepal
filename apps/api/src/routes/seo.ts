/**
 * Crawler-facing routes: per-article link previews (Open Graph), sitemaps
 * and an RSS feed. Mounted at the site root, not under /api.
 */

import { Router } from "express";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Article, Category } from "../models";
import { config } from "../config";
import { toPlainText } from "../lib/sanitize";
import { escapeXml, isObjectId } from "../lib/http";

export const seoRouter = Router();

const SITE_NAME = "हाम्रो नेपाल";
const SITE_NAME_EN = "Hamro Nepal";

// ------------------------------------------------------------ index.html template

let template: { html: string; at: number } | null = null;

async function getIndexHtml(): Promise<string> {
  if (template && Date.now() - template.at < 10 * 60_000) return template.html;

  // Local/dev: read the built SPA. Production (Vercel): fetch the static file.
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, "../../web/dist/index.html"),
    path.resolve(here, "../../../web/dist/index.html"),
    path.resolve(process.cwd(), "apps/web/dist/index.html"),
  ];
  let html = "";
  for (const file of candidates) {
    if (existsSync(file)) {
      html = readFileSync(file, "utf8");
      break;
    }
  }
  if (!html) {
    const res = await fetch(`${config.publicSiteUrl}/index.html`, { signal: AbortSignal.timeout(5000) });
    html = await res.text();
  }
  template = { html, at: Date.now() };
  return html;
}

function setMeta(html: string, attr: "property" | "name", key: string, value: string): string {
  const tag = `<meta ${attr}="${key}" content="${escapeXml(value)}" />`;
  const re = new RegExp(`<meta\\s+${attr}="${key}"[^>]*>`, "i");
  return re.test(html) ? html.replace(re, tag) : html.replace("</head>", `    ${tag}\n  </head>`);
}

export function injectArticleMeta(
  html: string,
  meta: {
    title: string;
    description: string;
    image?: string;
    url: string;
    publishedAt?: string;
    /** Page language (default Nepali). */
    lang?: "ne" | "en";
    /** The same story in each language, for hreflang links. */
    alternates?: { ne: string; en?: string };
    /** Where search engines should index this (default: url). */
    canonical?: string;
  }
): string {
  const lang = meta.lang ?? "ne";
  const title = `${meta.title} - ${lang === "en" ? SITE_NAME_EN : SITE_NAME}`;
  let out = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeXml(title)}</title>`);
  out = out.replace(/<html lang="[^"]*"/i, `<html lang="${lang}"`);
  out = setMeta(out, "property", "og:locale", lang === "en" ? "en_US" : "ne_NP");
  out = setMeta(out, "name", "description", meta.description);
  out = setMeta(out, "property", "og:type", "article");
  out = setMeta(out, "property", "og:title", meta.title);
  out = setMeta(out, "property", "og:description", meta.description);
  out = setMeta(out, "property", "og:url", meta.url);
  out = setMeta(out, "name", "twitter:title", meta.title);
  out = setMeta(out, "name", "twitter:description", meta.description);
  out = setMeta(out, "name", "twitter:url", meta.url);
  if (meta.image) {
    out = setMeta(out, "property", "og:image", meta.image);
    out = setMeta(out, "name", "twitter:image", meta.image);
  }
  if (meta.publishedAt) out = setMeta(out, "property", "article:published_time", meta.publishedAt);
  const links = [`<link rel="canonical" href="${escapeXml(meta.canonical ?? meta.url)}" />`];
  if (meta.alternates) {
    links.push(`<link rel="alternate" hreflang="ne" href="${escapeXml(meta.alternates.ne)}" />`);
    if (meta.alternates.en) links.push(`<link rel="alternate" hreflang="en" href="${escapeXml(meta.alternates.en)}" />`);
    links.push(`<link rel="alternate" hreflang="x-default" href="${escapeXml(meta.alternates.ne)}" />`);
  }
  return out
    .replace(/<link rel="(canonical|alternate)"[^>]*hreflang[^>]*>|<link rel="canonical"[^>]*>/gi, "")
    .replace("</head>", `    ${links.join("\n    ")}\n  </head>`);
}

// GET /news/:slug – SPA shell with this article's preview tags.
seoRouter.get("/news/:slug", async (req, res) => {
  const html = await getIndexHtml();
  const article = await Article.findOne({ slug: req.params.slug, status: "published" })
    .select("title excerpt featuredImage slug publishedAt en.title")
    .lean();
  res.set("Content-Type", "text/html; charset=utf-8");
  res.set("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=600");
  if (!article) return res.status(404).send(html);

  res.send(
    injectArticleMeta(html, {
      title: article.title,
      description: toPlainText(article.excerpt || article.title).slice(0, 200),
      image: article.featuredImage || undefined,
      url: `${config.publicSiteUrl}/news/${encodeURIComponent(article.slug)}`,
      publishedAt: article.publishedAt?.toISOString(),
      alternates: articleAlternates(article),
    })
  );
});

const articleAlternates = (a: { slug: string; en?: { title?: string | null } | null }) => {
  const path = `/news/${encodeURIComponent(a.slug)}`;
  return { ne: `${config.publicSiteUrl}${path}`, en: a.en?.title ? `${config.publicSiteUrl}/en${path}` : undefined };
};

// GET /en/news/:slug – the English page's preview tags (English when translated).
seoRouter.get("/en/news/:slug", async (req, res) => {
  const html = await getIndexHtml();
  const article = await Article.findOne({ slug: req.params.slug, status: "published" })
    .select("title excerpt featuredImage slug publishedAt en.title en.excerpt")
    .lean();
  res.set("Content-Type", "text/html; charset=utf-8");
  res.set("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=600");
  if (!article) return res.status(404).send(html.replace(/<html lang="[^"]*"/i, '<html lang="en"'));

  const alternates = articleAlternates(article);
  const translated = !!article.en?.title;
  res.send(
    injectArticleMeta(html, {
      title: translated ? article.en!.title! : article.title,
      description: toPlainText((translated ? article.en!.excerpt : article.excerpt) || article.title).slice(0, 200),
      image: article.featuredImage || undefined,
      url: `${config.publicSiteUrl}/en/news/${encodeURIComponent(article.slug)}`,
      publishedAt: article.publishedAt?.toISOString(),
      lang: "en",
      alternates,
      // Not translated yet: the page shows the Nepali, so index the Nepali one.
      canonical: translated ? undefined : alternates.ne,
    })
  );
});

// GET /n/:id – short link printed as a QR code in the print edition.
seoRouter.get("/n/:id", async (req, res) => {
  const article = isObjectId(req.params.id)
    ? await Article.findOne({ _id: req.params.id, status: "published" }).select("slug").lean()
    : null;
  res.set("Cache-Control", "public, max-age=0, s-maxage=3600");
  res.redirect(301, article ? `/news/${encodeURIComponent(article.slug)}` : "/");
});

// GET /sitemap.xml
seoRouter.get("/sitemap.xml", async (_req, res) => {
  const [articles, categories] = await Promise.all([
    Article.find({ status: "published" }).select("slug updatedAt en.title").sort({ publishedAt: -1 }).limit(5000).lean(),
    Category.find({ isActive: true }).select("slug updatedAt").lean(),
  ]);
  const base = config.publicSiteUrl;
  const urls = [
    `<url><loc>${base}/</loc><changefreq>hourly</changefreq><priority>1.0</priority></url>`,
    `<url><loc>${base}/en</loc><changefreq>hourly</changefreq><priority>0.9</priority></url>`,
    ...categories.map(
      (c) => `<url><loc>${base}/category/${encodeURIComponent(c.slug)}</loc><changefreq>hourly</changefreq></url>`
    ),
    ...articles.map(
      (a) =>
        `<url><loc>${base}/news/${encodeURIComponent(a.slug)}</loc><lastmod>${a.updatedAt.toISOString()}</lastmod></url>`
    ),
    ...articles
      .filter((a) => a.en?.title)
      .map(
        (a) =>
          `<url><loc>${base}/en/news/${encodeURIComponent(a.slug)}</loc><lastmod>${a.updatedAt.toISOString()}</lastmod></url>`
      ),
  ];
  res.set("Content-Type", "application/xml; charset=utf-8");
  res.set("Cache-Control", "public, max-age=0, s-maxage=900");
  res.send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`
  );
});

// GET /news-sitemap.xml – Google News sitemap (last 48 hours only).
seoRouter.get("/news-sitemap.xml", async (_req, res) => {
  const since = new Date(Date.now() - 48 * 3600_000);
  const articles = await Article.find({ status: "published", publishedAt: { $gte: since } })
    .select("slug title publishedAt")
    .sort({ publishedAt: -1 })
    .limit(1000)
    .lean();
  const base = config.publicSiteUrl;
  const items = articles.map(
    (a) => `<url><loc>${base}/news/${encodeURIComponent(a.slug)}</loc><news:news><news:publication><news:name>${SITE_NAME}</news:name><news:language>ne</news:language></news:publication><news:publication_date>${a.publishedAt!.toISOString()}</news:publication_date><news:title>${escapeXml(a.title)}</news:title></news:news></url>`
  );
  res.set("Content-Type", "application/xml; charset=utf-8");
  res.set("Cache-Control", "public, max-age=0, s-maxage=300");
  res.send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${items.join("\n")}\n</urlset>`
  );
});

// GET /rss.xml – latest 50 articles.
seoRouter.get("/rss.xml", async (_req, res) => {
  const articles = await Article.find({ status: "published" })
    .select("slug title excerpt publishedAt featuredImage")
    .sort({ publishedAt: -1 })
    .limit(50)
    .lean();
  const base = config.publicSiteUrl;
  const items = articles.map((a) => {
    const link = `${base}/news/${encodeURIComponent(a.slug)}`;
    return `<item><title>${escapeXml(a.title)}</title><link>${link}</link><guid isPermaLink="true">${link}</guid><pubDate>${(a.publishedAt ?? new Date()).toUTCString()}</pubDate><description>${escapeXml(toPlainText(a.excerpt || ""))}</description>${a.featuredImage ? `<enclosure url="${escapeXml(a.featuredImage)}" type="image/jpeg" />` : ""}</item>`;
  });
  res.set("Content-Type", "application/rss+xml; charset=utf-8");
  res.set("Cache-Control", "public, max-age=0, s-maxage=300");
  res.send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${SITE_NAME}</title><link>${base}/</link><description>नेपालको विश्वसनीय समाचार पोर्टल</description><language>ne</language>\n${items.join("\n")}\n</channel></rss>`
  );
});
