/**
 * Advertisement management (admin only).
 */

import { Router } from "express";
import { z } from "zod";
import { PROMO_PLACEMENTS, Promotion } from "../../models";
import { badRequest, isObjectId, notFound, toApi, toApiList } from "../../lib/http";

export const adminPromotionsRouter = Router();

/** http(s) only, so a banner can never run javascript: links. */
const webUrl = z
  .string()
  .trim()
  .max(1000)
  .url()
  .refine((u) => /^https?:\/\//i.test(u), "http वा https लिङ्क मात्र।");

// null (an empty date box) must stay null: coercing it would give 1 Jan 1970,
// which hides the ad as long expired. So match null before coercing.
const date = z.union([z.null(), z.coerce.date()]).optional();

const promotionInput = z.object({
  title: z.string().trim().min(1).max(120),
  imageUrl: webUrl,
  mobileImageUrl: webUrl.or(z.literal("")).optional(),
  linkUrl: webUrl.or(z.literal("")).optional(),
  placement: z.enum(PROMO_PLACEMENTS),
  startsAt: date,
  endsAt: date,
  isActive: z.boolean().optional(),
});

function checkDates(input: { startsAt?: Date | null; endsAt?: Date | null }) {
  if (input.startsAt && input.endsAt && input.endsAt < input.startsAt) {
    throw badRequest("अन्त्य मिति सुरु मितिभन्दा पछि हुनुपर्छ।");
  }
}

adminPromotionsRouter.get("/", async (_req, res) => {
  const docs = await Promotion.find().sort({ isActive: -1, placement: 1, createdAt: -1 }).lean();
  res.json(toApiList(docs));
});

adminPromotionsRouter.post("/", async (req, res) => {
  const input = promotionInput.parse(req.body);
  checkDates(input);
  const doc = await Promotion.create(input);
  res.status(201).json(toApi(doc.toObject()));
});

adminPromotionsRouter.patch("/:id", async (req, res) => {
  if (!isObjectId(req.params.id)) throw notFound();
  const input = promotionInput.partial().parse(req.body);
  const doc = await Promotion.findById(req.params.id);
  if (!doc) throw notFound("विज्ञापन भेटिएन।");
  doc.set(input);
  checkDates(doc);
  await doc.save();
  res.json(toApi(doc.toObject()));
});

adminPromotionsRouter.delete("/:id", async (req, res) => {
  if (!isObjectId(req.params.id)) throw notFound();
  const result = await Promotion.deleteOne({ _id: req.params.id });
  if (!result.deletedCount) throw notFound("विज्ञापन भेटिएन।");
  res.status(204).end();
});
