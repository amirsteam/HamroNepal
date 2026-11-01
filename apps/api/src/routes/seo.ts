/**
 * Crawler-facing routes: per-article link previews (Open Graph), sitemaps
 * and an RSS feed. Mounted at the site root, not under /api.
 */

import { Router, type Response } from "express";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Article, Category } from "../models";
import { config } from "../config";
import { toPlainText } from "../lib/sanitize";
import { escapeXml, isObjectId } from "../lib/http";
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from "@hamronepal/shared";
import { getSettings } from "../services/settings";

export const seoRouter = Router();

// The site's name and description come from Dashboard → साइट सेटिङ (cached a minute).
// Every handler that uses them calls refreshBrand() first.
let brand: SiteSettings = DEFAULT_SITE_SETTINGS;
let SITE_NAME = brand.name.ne;
let SITE_NAME_EN = brand.name.en;
async function refreshBrand(): Promise<SiteSettings> {
  brand = await getSettings();
  SITE_NAME = brand.name.ne;
  SITE_NAME_EN = brand.name.en;
  return brand;
}

/** The built index.html's default tags, rewritten with the site's own name, description and images. */
function brandTemplate(html: string, b: SiteSettings): string {
  const d = DEFAULT_SITE_SETTINGS;
  const title = `${b.name.ne} - ${b.tagline.ne}`;
  let out = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeXml(title)}</title>`);
  out = setMeta(out, "name", "description", b.description.ne);
  out = setMeta(out, "name", "author", b.name.ne);
  out = setMeta(out, "name", "theme-color", b.colors.primary);
  out = setMeta(out, "property", "og:site_name", b.name.ne);
  out = setMeta(out, "property", "og:title", title);
  out = setMeta(out, "property", "og:description", b.description.ne);
  out = setMeta(out, "name", "twitter:title", title);
  out = setMeta(out, "name", "twitter:description", b.description.ne);
  if (b.ogImageUrl) {
    out = setMeta(out, "property", "og:image", b.ogImageUrl);
    out = setMeta(out, "name", "twitter:image", b.ogImageUrl);
  }
  if (b.faviconUrl) out = out.replace(/<link rel="icon"[^>]*>/i, `<link rel="icon" href="${escapeXml(b.faviconUrl)}" />`);
  // Structured data and the RSS link title carry the name too.
  if (b.name.ne !== d.name.ne) out = out.split(d.name.ne).join(escapeXml(b.name.ne));
  if (b.name.en !== d.name.en) out = out.split(d.name.en).join(escapeXml(b.name.en));
  return out;
}

// ------------------------------------------------------------ index.html template

let template: { html: string; at: number } | null = null;

async function getIndexHtml(): Promise<string> {
  const b = await refreshBrand();
  if (template && Date.now() - template.at < 10 * 60_000) return brandTemplate(template.html, b);

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
  // Deployed: fetch it from the web service. On Vercel services the binding
  // WEB_URL reaches it internally (also on protected previews); else the public site.
  const bases = [process.env.WEB_URL, config.publicSiteUrl].filter(Boolean) as string[];
  for (const base of bases) {
    if (html) break;
    try {
      const res = await fetch(new URL("index.html", base.endsWith("/") ? base : `${base}/`), { signal: AbortSignal.timeout(5000) });
      if (res.ok) html = await res.text();
    } catch {
      // try the next one
    }
  }
  if (!html) throw new Error("index.html could not be loaded");
  template = { html, at: Date.now() };
  return brandTemplate(html, b);
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
    /** "website" for section and home pages (default "article"). */
    type?: "article" | "website";
    modifiedAt?: string;
    /** schema.org data for search engines (e.g. NewsArticle), added as JSON-LD. */
    jsonLd?: Record<string, unknown>;
  }
): string {
  const lang = meta.lang ?? "ne";
  const title = `${meta.title} - ${lang === "en" ? SITE_NAME_EN : SITE_NAME}`;
  let out = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeXml(title)}</title>`);
  out = out.replace(/<html lang="[^"]*"/i, `<html lang="${lang}"`);
  out = setMeta(out, "property", "og:locale", lang === "en" ? "en_US" : "ne_NP");
  out = setMeta(out, "name", "description", meta.description);
  out = setMeta(out, "property", "og:type", meta.type ?? "article");
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
  if (meta.modifiedAt) out = setMeta(out, "property", "article:modified_time", meta.modifiedAt);
  const links = [`<link rel="canonical" href="${escapeXml(meta.canonical ?? meta.url)}" />`];
  if (meta.alternates) {
    links.push(`<link rel="alternate" hreflang="ne" href="${escapeXml(meta.alternates.ne)}" />`);
    if (meta.alternates.en) links.push(`<link rel="alternate" hreflang="en" href="${escapeXml(meta.alternates.en)}" />`);
    links.push(`<link rel="alternate" hreflang="x-default" href="${escapeXml(meta.alternates.ne)}" />`);
  }
  if (meta.jsonLd) links.push(jsonLdScript(meta.jsonLd));
  return out
    .replace(/<link rel="(canonical|alternate)"[^>]*hreflang[^>]*>|<link rel="canonical"[^>]*>/gi, "")
    .replace("</head>", `    ${links.join("\n    ")}\n  </head>`);
}

/** A JSON-LD block; "<" is escaped so text from articles can never close the script tag. */
export function jsonLdScript(data: Record<string, unknown>): string {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

const ARTICLE_FIELDS = "title excerpt featuredImage slug publishedAt updatedAt authorName source.type en.title en.excerpt";

type ArticleForLd = {
  title: string;
  excerpt?: string | null;
  featuredImage?: string | null;
  publishedAt?: Date | null;
  updatedAt?: Date | null;
  authorName?: string | null;
  source?: { type?: string | null } | null;
};

/**
 * schema.org NewsArticle (Google's article and Top Stories features).
 * AI-desk drafts are credited to the organisation, not to a person.
 */
export function newsArticleJsonLd(a: ArticleForLd, o: { url: string; lang: "ne" | "en"; title: string; description: string }) {
  const site = config.publicSiteUrl;
  const publisher = {
    "@type": "NewsMediaOrganization",
    name: o.lang === "en" ? SITE_NAME_EN : SITE_NAME,
    url: `${site}/`,
    logo: { "@type": "ImageObject", url: brand.logoUrl || brand.ogImageUrl || `${site}/og-image.png` },
  };
  const byPerson = a.authorName && a.source?.type !== "ai";
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: { "@type": "WebPage", "@id": o.url },
    headline: o.title.slice(0, 110),
    description: o.description,
    ...(a.featuredImage ? { image: [a.featuredImage] } : {}),
    ...(a.publishedAt ? { datePublished: a.publishedAt.toISOString() } : {}),
    ...(a.updatedAt ? { dateModified: a.updatedAt.toISOString() } : {}),
    author: byPerson ? { "@type": "Person", name: a.authorName } : publisher,
    publisher,
    inLanguage: o.lang,
    isAccessibleForFree: true,
  };
}

// GET /news/:slug – SPA shell with this article's preview tags.
seoRouter.get("/news/:slug", async (req, res) => {
  const html = await getIndexHtml();
  const article = await Article.findOne({ slug: req.params.slug, status: "published" })
    .select(ARTICLE_FIELDS)
    .lean();
  res.set("Content-Type", "text/html; charset=utf-8");
  res.set("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=600");
  if (!article) return res.status(404).send(html);

  const url = `${config.publicSiteUrl}/news/${encodeURIComponent(article.slug)}`;
  const description = toPlainText(article.excerpt || article.title).slice(0, 200);
  res.send(
    injectArticleMeta(html, {
      title: article.title,
      description,
      image: article.featuredImage || undefined,
      url,
      publishedAt: article.publishedAt?.toISOString(),
      modifiedAt: article.updatedAt?.toISOString(),
      alternates: articleAlternates(article),
      jsonLd: newsArticleJsonLd(article, { url, lang: "ne", title: article.title, description }),
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
    .select(ARTICLE_FIELDS)
    .lean();
  res.set("Content-Type", "text/html; charset=utf-8");
  res.set("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=600");
  if (!article) return res.status(404).send(html.replace(/<html lang="[^"]*"/i, '<html lang="en"'));

  const alternates = articleAlternates(article);
  const translated = !!article.en?.title;
  const title = translated ? article.en!.title! : article.title;
  const description = toPlainText((translated ? article.en!.excerpt : article.excerpt) || title).slice(0, 200);
  const url = `${config.publicSiteUrl}/en/news/${encodeURIComponent(article.slug)}`;
  res.send(
    injectArticleMeta(html, {
      title,
      description,
      image: article.featuredImage || undefined,
      url,
      publishedAt: article.publishedAt?.toISOString(),
      modifiedAt: article.updatedAt?.toISOString(),
      lang: "en",
      alternates,
      // Not translated yet: the page shows the Nepali, so index the Nepali one.
      canonical: translated ? undefined : alternates.ne,
      // Structured data only for the real English page (the Nepali one carries its own).
      jsonLd: translated ? newsArticleJsonLd(article, { url, lang: "en", title, description }) : undefined,
    })
  );
});

// ------------------------------------------------------------ section pages and the English home

const HOME_TEXT = {
  ne: { title: "ताजा नेपाली समाचार", description: "राजनीति, अर्थतन्त्र, खेलकुद, मनोरञ्जन र स्थानीय समाचार – हाम्रो नेपाल।" },
  en: { title: "Latest news from Nepal", description: "Politics, the economy, sports, entertainment and local news from Nepal, in English." },
};

/** Title, description, canonical and hreflang for a section page (/category/x) or a home page. */
async function sendSectionPage(res: Response, lang: "ne" | "en", slug?: string) {
  const html = await getIndexHtml();
  res.set("Content-Type", "text/html; charset=utf-8");
  res.set("Cache-Control", "public, max-age=0, s-maxage=600, stale-while-revalidate=1800");
  const site = config.publicSiteUrl;
  const path = slug ? `/category/${encodeURIComponent(slug)}` : "/";
  const alternates = { ne: `${site}${path}`, en: `${site}/en${path === "/" ? "" : path}` };
  const url = lang === "en" ? alternates.en : alternates.ne;

  let title = HOME_TEXT[lang].title;
  let description = brand.description[lang] || HOME_TEXT[lang].description;
  if (slug && slug !== "all") {
    const cat = await Category.findOne({ slug, isActive: true }).select("name nameEn description").lean();
    if (!cat) return res.status(404).send(html.replace(/<html lang="[^"]*"/i, `<html lang="${lang}"`));
    title = lang === "en" ? cat.nameEn || cat.name : cat.name;
    description =
      (lang === "ne" && cat.description) ||
      (lang === "en" ? `${title}: the latest news from Nepal, in English.` : `${title} – ${SITE_NAME}का ताजा समाचार।`);
  }
  res.send(injectArticleMeta(html, { title, description, url, lang, alternates, type: "website" }));
}

// The Nepali home is the static index.html (it already has the site's tags).
seoRouter.get("/en", (_req, res) => sendSectionPage(res, "en"));
seoRouter.get("/category/:slug", (req, res) => sendSectionPage(res, "ne", req.params.slug));
seoRouter.get("/en/category/:slug", (req, res) => sendSectionPage(res, "en", req.params.slug));

// GET /robots.txt – sitemap addresses must be absolute.
seoRouter.get("/robots.txt", (_req, res) => {
  const base = config.publicSiteUrl;
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.set("Cache-Control", "public, max-age=3600");
  res.send(
    [
      "User-agent: *",
      "Allow: /",
      "Disallow: /dashboard",
      "Disallow: /api/",
      // Search results are endless thin pages.
      "Disallow: /search",
      "Disallow: /en/search",
      "",
      `Sitemap: ${base}/sitemap.xml`,
      `Sitemap: ${base}/news-sitemap.xml`,
      "",
    ].join("\n")
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
    ...categories.flatMap((c) => [
      `<url><loc>${base}/category/${encodeURIComponent(c.slug)}</loc><changefreq>hourly</changefreq></url>`,
      `<url><loc>${base}/en/category/${encodeURIComponent(c.slug)}</loc><changefreq>hourly</changefreq></url>`,
    ]),
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
  await refreshBrand();
  const since = new Date(Date.now() - 48 * 3600_000);
  const articles = await Article.find({ status: "published", publishedAt: { $gte: since } })
    .select("slug title publishedAt en.title")
    .sort({ publishedAt: -1 })
    .limit(500)
    .lean();
  const base = config.publicSiteUrl;
  const entry = (loc: string, name: string, lang: string, date: Date, title: string) =>
    `<url><loc>${loc}</loc><news:news><news:publication><news:name>${escapeXml(name)}</news:name><news:language>${lang}</news:language></news:publication><news:publication_date>${date.toISOString()}</news:publication_date><news:title>${escapeXml(title)}</news:title></news:news></url>`;
  // Google allows 1000 URLs per news sitemap: up to 500 stories in each language.
  const items = articles.flatMap((a) => {
    const path = `/news/${encodeURIComponent(a.slug)}`;
    const out = [entry(`${base}${path}`, SITE_NAME, "ne", a.publishedAt!, a.title)];
    if (a.en?.title) out.push(entry(`${base}/en${path}`, SITE_NAME_EN, "en", a.publishedAt!, a.en.title));
    return out;
  });
  res.set("Content-Type", "application/xml; charset=utf-8");
  res.set("Cache-Control", "public, max-age=0, s-maxage=300");
  res.send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${items.join("\n")}\n</urlset>`
  );
});

// GET /rss.xml – latest 50 articles.
seoRouter.get("/rss.xml", async (_req, res) => {
  await refreshBrand();
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
    `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${escapeXml(SITE_NAME)}</title><link>${base}/</link><description>${escapeXml(brand.description.ne)}</description><language>ne</language>\n${items.join("\n")}\n</channel></rss>`
  );
});
