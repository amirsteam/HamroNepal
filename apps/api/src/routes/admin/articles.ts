/**
 * Dashboard article management.
 *
 * Role rules (enforced here, not just in the UI):
 * - reporter: create; edit own articles while not published; cannot publish,
 *   feature, mark breaking, or delete. "published" requests become "pending".
 * - editor:   everything except delete.
 * - admin:    everything.
 */

import { Router, type Request } from "express";
import { z } from "zod";
import { Types, type FilterQuery } from "mongoose";
import { Article, Category } from "../../models";
import { sanitizeArticleHtml, toPlainText } from "../../lib/sanitize";
import { uniqueSlug } from "../../lib/slug";
import { bsDateString } from "../../lib/bs";
import { badRequest, escapeRegex, forbidden, intParam, isObjectId, notFound, toApi, toApiList } from "../../lib/http";
import { isEditorOrAdmin, requireRole } from "../../middleware/auth";

export const adminArticlesRouter = Router();

const statusEnum = z.enum(["draft", "pending", "published", "archived"]);
const objectId = z.string().refine(isObjectId, "अमान्य ID");

const articleInput = z.object({
  title: z.string().trim().min(1).max(300),
  slug: z.string().trim().max(200).optional(),
  excerpt: z.string().max(1000).optional(),
  content: z.string().max(200_000).optional(),
  featuredImage: z.string().url().max(1000).or(z.literal("")).nullable().optional(),
  featuredImagePublicId: z.string().max(300).nullable().optional(),
  categoryId: objectId,
  locationIds: z.array(objectId).max(10).optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(15).optional(),
  status: statusEnum.optional(),
  isFeatured: z.boolean().optional(),
  isBreaking: z.boolean().optional(),
});
const articlePatch = articleInput.partial();
type ArticleInput = z.infer<typeof articlePatch>;

/** Add parent locations (district → province) so menus at every level match. */
async function expandLocations(ids: string[]): Promise<string[]> {
  const result = new Set(ids);
  let frontier = ids;
  for (let depth = 0; depth < 3 && frontier.length; depth++) {
    const docs = await Category.find({ _id: { $in: frontier }, type: "location" })
      .select("parentId")
      .lean();
    frontier = docs.map((d) => d.parentId && String(d.parentId)).filter(Boolean) as string[];
    frontier.forEach((id) => result.add(id));
  }
  return [...result];
}

/** Turn validated input into the fields we store, applying role rules. */
async function buildUpdate(
  req: Request,
  input: ArticleInput,
  current?: { status: string; publishedAt?: Date | null; featuredImage?: string | null }
) {
  const privileged = isEditorOrAdmin(req.user);
  const update: Record<string, unknown> = {};

  if (input.title !== undefined) update.title = toPlainText(input.title);
  if (input.excerpt !== undefined) update.excerpt = toPlainText(input.excerpt);
  if (input.content !== undefined) update.content = sanitizeArticleHtml(input.content);
  if (input.featuredImage !== undefined) {
    update.featuredImage = input.featuredImage || undefined;
    // A new or removed image no longer matches the old photo credit.
    if ((input.featuredImage || undefined) !== (current?.featuredImage || undefined)) update.imageCredit = undefined;
  }
  if (input.featuredImagePublicId !== undefined) update.featuredImagePublicId = input.featuredImagePublicId || undefined;
  if (input.tags !== undefined) update.tags = [...new Set(input.tags.map(toPlainText).filter(Boolean))];

  if (input.categoryId !== undefined) {
    const cat = await Category.exists({ _id: input.categoryId, type: "topic" });
    if (!cat) throw badRequest("श्रेणी भेटिएन।");
    update.categoryId = input.categoryId;
  }
  if (input.locationIds !== undefined) update.locationIds = await expandLocations(input.locationIds);

  if (privileged) {
    if (input.isFeatured !== undefined) update.isFeatured = input.isFeatured;
    if (input.isBreaking !== undefined) update.isBreaking = input.isBreaking;
  }

  if (input.status !== undefined) {
    let status = input.status;
    if (!privileged && (status === "published" || status === "archived")) status = "pending";
    update.status = status;
    if (status === "published" && (current?.status !== "published" || !current?.publishedAt)) {
      const now = new Date();
      update.publishedAt = now;
      update.publishedAtBS = bsDateString(now);
    }
  }
  return update;
}

function canEdit(req: Request, article: { authorId: unknown; status: string }) {
  if (isEditorOrAdmin(req.user)) return true;
  return String(article.authorId) === req.user!.id && article.status !== "published";
}

// GET /admin/articles?status=&categoryId=&authorId=&search=&source=ai|manual&mine=true&limit=&offset=
adminArticlesRouter.get("/", async (req, res) => {
  const limit = intParam(req.query.limit, 20, 1, 100);
  const offset = intParam(req.query.offset, 0, 0, 100_000);
  const filter: FilterQuery<unknown> = {};
  const q = req.query;

  if (typeof q.status === "string" && statusEnum.safeParse(q.status).success) filter.status = q.status;
  if (typeof q.categoryId === "string" && isObjectId(q.categoryId)) filter.categoryId = q.categoryId;
  if (q.source === "ai" || q.source === "manual") filter["source.type"] = q.source;
  if (typeof q.search === "string" && q.search.trim()) {
    filter.title = { $regex: escapeRegex(q.search.trim().slice(0, 100)), $options: "i" };
  }
  // Reporters only ever see their own work.
  if (!isEditorOrAdmin(req.user) || q.mine === "true") {
    filter.authorId = req.user!.id;
  } else if (typeof q.authorId === "string" && isObjectId(q.authorId)) {
    filter.authorId = q.authorId;
  }

  const [documents, total] = await Promise.all([
    Article.find(filter).select("-content").sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    Article.countDocuments(filter),
  ]);
  res.json({ documents: toApiList(documents), total });
});

// GET /admin/articles/stats?mine=true
adminArticlesRouter.get("/stats", async (req, res) => {
  const match: FilterQuery<unknown> = {};
  if (!isEditorOrAdmin(req.user) || req.query.mine === "true") {
    match.authorId = new Types.ObjectId(req.user!.id);
  }
  const [byStatus, aiPending] = await Promise.all([
    Article.aggregate<{ _id: string; count: number; views: number }>([
      { $match: match },
      { $group: { _id: "$status", count: { $sum: 1 }, views: { $sum: "$viewCount" } } },
    ]),
    isEditorOrAdmin(req.user)
      ? Article.countDocuments({ status: "pending", "source.type": "ai" })
      : Promise.resolve(0),
  ]);
  const get = (s: string) => byStatus.find((b) => b._id === s)?.count ?? 0;
  res.json({
    totalArticles: byStatus.reduce((n, b) => n + b.count, 0),
    publishedArticles: get("published"),
    draftArticles: get("draft"),
    pendingArticles: get("pending"),
    archivedArticles: get("archived"),
    totalViews: byStatus.reduce((n, b) => n + b.views, 0),
    aiPending,
  });
});

// GET /admin/articles/slug-available?slug=&excludeId=
adminArticlesRouter.get("/slug-available", async (req, res) => {
  const slug = String(req.query.slug ?? "");
  const filter: FilterQuery<unknown> = { slug };
  if (isObjectId(req.query.excludeId)) filter._id = { $ne: req.query.excludeId };
  res.json({ available: !!slug && !(await Article.exists(filter)) });
});

// GET /admin/articles/:id
adminArticlesRouter.get("/:id", async (req, res) => {
  if (!isObjectId(req.params.id)) throw notFound();
  const article = await Article.findById(req.params.id).lean();
  if (!article) throw notFound("समाचार भेटिएन।");
  if (!isEditorOrAdmin(req.user) && String(article.authorId) !== req.user!.id) throw forbidden();
  res.json(toApi(article));
});

// POST /admin/articles
adminArticlesRouter.post("/", async (req, res) => {
  const input = articleInput.parse(req.body);
  const fields = await buildUpdate(req, { status: "draft", ...input });
  const slug = await uniqueSlug(Article, input.slug || input.title);
  const article = await Article.create({
    ...fields,
    slug,
    authorId: req.user!.id,
    authorName: req.user!.name,
    createdAtBS: bsDateString(),
    source: { type: "manual" },
  });
  res.status(201).json(toApi(article.toObject()));
});

// PATCH /admin/articles/:id
adminArticlesRouter.patch("/:id", async (req, res) => {
  if (!isObjectId(req.params.id)) throw notFound();
  const article = await Article.findById(req.params.id);
  if (!article) throw notFound("समाचार भेटिएन।");
  if (!canEdit(req, article)) throw forbidden("यो समाचार सम्पादन गर्ने अनुमति छैन।");

  const input = articlePatch.parse(req.body);
  const fields = await buildUpdate(req, input, article);
  if (input.slug !== undefined && input.slug !== article.slug) {
    fields.slug = await uniqueSlug(Article, input.slug || article.title, String(article._id));
  }
  article.set(fields);
  await article.save();
  res.json(toApi(article.toObject()));
});

// DELETE /admin/articles/:id (admin only)
adminArticlesRouter.delete("/:id", requireRole("admin"), async (req, res) => {
  if (!isObjectId(req.params.id)) throw notFound();
  const result = await Article.deleteOne({ _id: req.params.id });
  if (!result.deletedCount) throw notFound("समाचार भेटिएन।");
  res.status(204).end();
});
