/**
 * Advertisements for the public website.
 *
 * Named "promotions" rather than "ads" so that ad blockers do not hide the
 * whole slot by its address. Ads are still labelled "विज्ञापन" on the page.
 */

import { Router } from "express";
import rateLimit from "express-rate-limit";
import { Promotion } from "../models";
import { config } from "../config";
import { isObjectId, notFound, toApiList } from "../lib/http";

export const promotionsRouter = Router();

/** Active and inside its start/end dates. */
export function runningNow(now = new Date()) {
  return {
    isActive: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
    ],
  };
}

const countLimiter = rateLimit({
  windowMs: 60_000,
  limit: config.rateLimits.viewsPerMinute,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

// GET /api/promotions – everything running now (the page picks by placement).
promotionsRouter.get("/", async (_req, res) => {
  // Print-edition ads never appear on the website.
  const docs = await Promotion.find({ ...runningNow(), placement: { $not: /^print-/ } })
    .select("-views -clicks")
    .sort({ createdAt: -1 })
    .lean();
  res.set("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
  res.json(toApiList(docs));
});

// GET /api/promotions/:id/click – count the click, then go to the advertiser.
promotionsRouter.get("/:id/click", countLimiter, async (req, res) => {
  if (!isObjectId(req.params.id)) throw notFound();
  const doc = await Promotion.findOneAndUpdate({ _id: req.params.id }, { $inc: { clicks: 1 } }, { new: true })
    .select("linkUrl")
    .lean();
  if (!doc?.linkUrl) throw notFound("विज्ञापन भेटिएन।");
  res.set("Cache-Control", "no-store");
  res.redirect(302, doc.linkUrl);
});

// POST /api/promotions/:id/view – the ad was shown on screen.
promotionsRouter.post("/:id/view", countLimiter, async (req, res) => {
  if (isObjectId(req.params.id)) {
    await Promotion.updateOne({ _id: req.params.id, ...runningNow() }, { $inc: { views: 1 } });
  }
  res.status(204).end();
});
