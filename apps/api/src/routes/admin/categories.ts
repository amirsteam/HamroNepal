import { Router } from "express";
import { z } from "zod";
import type { FilterQuery } from "mongoose";
import { Article, Category } from "../../models";
import { slugify } from "../../lib/slug";
import { HttpError, badRequest, isObjectId, notFound, toApi, toApiList } from "../../lib/http";

export const adminCategoriesRouter = Router();

const objectId = z.string().refine(isObjectId, "अमान्य ID");

const categoryInput = z.object({
  name: z.string().trim().min(1).max(100),
  nameEn: z.string().trim().max(100).optional(),
  slug: z.string().trim().max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  type: z.enum(["topic", "location"]).optional(),
  parentId: objectId.nullable().optional(),
  level: z.enum(["province", "district", "municipality"]).nullable().optional(),
  aliases: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
  showInMenu: z.boolean().optional(),
  ingest: z.boolean().optional(),
  defaultImage: z.string().url().or(z.literal("")).optional(),
});

// GET /admin/categories?type=
adminCategoriesRouter.get("/", async (req, res) => {
  const filter: FilterQuery<unknown> = {};
  if (req.query.type === "topic" || req.query.type === "location") filter.type = req.query.type;
  const docs = await Category.find(filter).sort({ type: 1, sortOrder: 1, name: 1 }).lean();
  res.json(toApiList(docs));
});

adminCategoriesRouter.post("/", async (req, res) => {
  const input = categoryInput.parse(req.body);
  const slug = slugify(input.slug || input.name, 100);
  if (!slug) throw badRequest("स्लग बनाउन सकिएन।");
  const doc = await Category.create({ ...input, slug });
  res.status(201).json(toApi(doc.toObject()));
});

adminCategoriesRouter.patch("/:id", async (req, res) => {
  if (!isObjectId(req.params.id)) throw notFound();
  const input = categoryInput.partial().parse(req.body);
  const update: Record<string, unknown> = { ...input };
  if (input.slug !== undefined) update.slug = slugify(input.slug, 100);
  if (input.parentId === req.params.id) throw badRequest("श्रेणी आफैंको अभिभावक हुन सक्दैन।");
  const doc = await Category.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).lean();
  if (!doc) throw notFound("श्रेणी भेटिएन।");
  res.json(toApi(doc));
});

adminCategoriesRouter.delete("/:id", async (req, res) => {
  if (!isObjectId(req.params.id)) throw notFound();
  const id = req.params.id;
  const inUse = await Article.exists({ $or: [{ categoryId: id }, { locationIds: id }] });
  if (inUse) {
    throw new HttpError(409, "यो श्रेणीमा समाचार छन्। मेटाउनुको सट्टा निष्क्रिय गर्नुहोस्।");
  }
  if (await Category.exists({ parentId: id })) {
    throw new HttpError(409, "यो श्रेणीमुनि अरू श्रेणी छन्।");
  }
  const result = await Category.deleteOne({ _id: id });
  if (!result.deletedCount) throw notFound("श्रेणी भेटिएन।");
  res.status(204).end();
});

// POST /admin/categories/reorder { ids: [...] }
adminCategoriesRouter.post("/reorder", async (req, res) => {
  const { ids } = z.object({ ids: z.array(objectId).max(500) }).parse(req.body);
  await Category.bulkWrite(
    ids.map((id, index) => ({
      updateOne: { filter: { _id: id }, update: { $set: { sortOrder: index } } },
    }))
  );
  res.status(204).end();
});
