/**
 * Public, read-only API used by the website and the mobile app.
 */

import { Router, type Response } from "express";
import rateLimit from "express-rate-limit";
import type { FilterQuery } from "mongoose";
import { Article, Category } from "../models";
import { config } from "../config";
import { escapeRegex, intParam, isObjectId, notFound, toApi, toApiList } from "../lib/http";
import { getWeather } from "../services/weather";

export const publicRouter = Router();

const LIST_FIELDS = "-content -featuredImagePublicId";

function cache(res: Response, seconds = 60) {
  res.set("Cache-Control", `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=300`);
}

const published = (extra: FilterQuery<unknown> = {}) => ({ status: "published", ...extra });

/** Find an active category by id or slug. */
async function findCategory(idOrSlug: string) {
  const filter = isObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  return Category.findOne({ ...filter, isActive: true }).lean();
}

/** Articles for a topic (by categoryId) or a location (by locationIds). */
function categoryFilter(cat: { _id: unknown; type?: string | null }) {
  return cat.type === "location" ? { locationIds: cat._id } : { categoryId: cat._id };
}

function listArticles(filter: FilterQuery<unknown>, limit: number, offset = 0) {
  return Article.find(filter)
    .select(LIST_FIELDS)
    .sort({ publishedAt: -1, _id: -1 })
    .skip(offset)
    .limit(limit)
    .lean();
}

// GET /home – everything the home page needs in one request.
publicRouter.get("/home", async (_req, res) => {
  const [featured, breaking, latest, topics, localCats] = await Promise.all([
    listArticles(published({ isFeatured: true }), 5),
    listArticles(published({ isBreaking: true }), 10),
    listArticles(published(), 12),
    Category.find({ type: "topic", isActive: true, showInMenu: true }).sort({ sortOrder: 1 }).limit(8).lean(),
    Category.find({ type: "location", isActive: true, ingest: true }).sort({ sortOrder: 1 }).limit(3).lean(),
  ]);

  const section = async (cat: (typeof topics)[number]) => ({
    category: toApi(cat),
    articles: toApiList(await listArticles(published(categoryFilter(cat)), 4)),
  });

  const [sections, local] = await Promise.all([
    Promise.all(topics.map(section)),
    Promise.all(localCats.map(section)),
  ]);

  cache(res, 60);
  res.json({
    featured: toApiList(featured),
    breaking: toApiList(breaking),
    latest: toApiList(latest),
    sections: sections.filter((s) => s.articles.length > 0),
    local: local.filter((s) => s.articles.length > 0),
  });
});

// GET /articles?category=&location=&featured=&breaking=&limit=&offset=
publicRouter.get("/articles", async (req, res) => {
  const limit = intParam(req.query.limit, 20, 1, 50);
  const offset = intParam(req.query.offset, 0, 0, 10_000);
  const filter: FilterQuery<unknown> = published();

  for (const key of ["category", "location"] as const) {
    const value = req.query[key];
    if (typeof value === "string" && value) {
      const cat = await findCategory(value);
      if (!cat) return res.json({ documents: [], total: 0 });
      Object.assign(filter, categoryFilter(cat));
    }
  }
  if (req.query.featured === "true") filter.isFeatured = true;
  if (req.query.breaking === "true") filter.isBreaking = true;

  const [documents, total] = await Promise.all([
    listArticles(filter, limit, offset),
    Article.countDocuments(filter),
  ]);
  cache(res, 60);
  res.json({ documents: toApiList(documents), total });
});

// GET /articles/:slugOrId – full published article (web links use slugs, mobile ids).
publicRouter.get("/articles/:slug", async (req, res) => {
  const key = req.params.slug;
  const match = isObjectId(key) ? { $or: [{ _id: key }, { slug: key }] } : { slug: key };
  const article = await Article.findOne(published(match))
    .select("-featuredImagePublicId")
    .lean();
  if (!article) throw notFound("समाचार भेटिएन।");
  cache(res, 60);
  res.json(toApi(article));
});

// GET /articles/:id/related
publicRouter.get("/articles/:id/related", async (req, res) => {
  if (!isObjectId(req.params.id)) throw notFound();
  const article = await Article.findById(req.params.id).select("categoryId").lean();
  if (!article) throw notFound();
  const limit = intParam(req.query.limit, 5, 1, 20);
  const docs = await listArticles(
    published({ categoryId: article.categoryId, _id: { $ne: article._id } }),
    limit
  );
  cache(res, 300);
  res.json(toApiList(docs));
});

// POST /articles/:id/view – atomic view counter.
const viewLimiter = rateLimit({
  windowMs: 60_000,
  limit: config.rateLimits.viewsPerMinute,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
publicRouter.post("/articles/:id/view", viewLimiter, async (req, res) => {
  if (isObjectId(req.params.id)) {
    await Article.updateOne(published({ _id: req.params.id }), { $inc: { viewCount: 1 } });
  }
  res.status(204).end();
});

// GET /search?q=&limit=&offset=
publicRouter.get("/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim().slice(0, 100);
  const limit = intParam(req.query.limit, 20, 1, 50);
  const offset = intParam(req.query.offset, 0, 0, 1000);
  if (q.length < 2) return res.json({ documents: [], total: 0 });

  // Full-text index first; fall back to a title "contains" match, which
  // handles partial Nepali words the text index does not split on.
  const textFilter = published({ $text: { $search: q } });
  let total = await Article.countDocuments(textFilter);
  let documents;
  if (total > 0) {
    documents = await Article.find(textFilter, { score: { $meta: "textScore" } })
      .select(LIST_FIELDS)
      .sort({ score: { $meta: "textScore" }, publishedAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();
  } else {
    const regexFilter = published({ title: { $regex: escapeRegex(q), $options: "i" } });
    [documents, total] = await Promise.all([
      listArticles(regexFilter, limit, offset),
      Article.countDocuments(regexFilter),
    ]);
  }
  res.json({ documents: toApiList(documents), total });
});

// GET /categories?type=topic|location|all
publicRouter.get("/categories", async (req, res) => {
  const type = String(req.query.type ?? "topic");
  const filter: FilterQuery<unknown> = { isActive: true };
  if (type === "topic" || type === "location") filter.type = type;
  const docs = await Category.find(filter)
    .select("-aliases")
    .sort({ sortOrder: 1, name: 1 })
    .lean();
  cache(res, 300);
  res.json(toApiList(docs));
});

// GET /categories/:idOrSlug
publicRouter.get("/categories/:idOrSlug", async (req, res) => {
  const cat = await findCategory(req.params.idOrSlug);
  if (!cat) throw notFound("श्रेणी भेटिएन।");
  cache(res, 300);
  const { aliases, ingest, ...rest } = cat;
  void aliases;
  void ingest;
  res.json(toApi(rest));
});

// GET /weather – proxied so the OpenWeather key stays private.
publicRouter.get("/weather", async (_req, res) => {
  cache(res, 900);
  res.json(await getWeather());
});
