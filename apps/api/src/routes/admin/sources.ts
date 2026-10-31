/**
 * News sources for AI ingestion (admin) and ingestion runs (editor/admin).
 */

import { Router } from "express";
import { z } from "zod";
import { IngestRun, NewsSource } from "../../models";
import { isObjectId, notFound, toApi, toApiList } from "../../lib/http";
import { requireRole } from "../../middleware/auth";
import { fetchFeed } from "../../ingest/fetch";
import { runIngest } from "../../ingest/run";

export const adminSourcesRouter = Router();
export const adminIngestRouter = Router();

const objectId = z.string().refine(isObjectId, "अमान्य ID");
const sourceInput = z.object({
  name: z.string().trim().min(1).max(100),
  url: z.string().trim().url().max(1000),
  kind: z.enum(["rss", "page"]).optional(),
  categoryId: objectId.nullable().optional(),
  locationId: objectId.nullable().optional(),
  isActive: z.boolean().optional(),
});

adminSourcesRouter.get("/", async (_req, res) => {
  res.json(toApiList(await NewsSource.find().sort({ isActive: -1, name: 1 }).lean()));
});

adminSourcesRouter.post("/", requireRole("admin"), async (req, res) => {
  const doc = await NewsSource.create(sourceInput.parse(req.body));
  res.status(201).json(toApi(doc.toObject()));
});

adminSourcesRouter.patch("/:id", requireRole("admin"), async (req, res) => {
  if (!isObjectId(req.params.id)) throw notFound();
  const doc = await NewsSource.findByIdAndUpdate(req.params.id, sourceInput.partial().parse(req.body), {
    new: true,
    runValidators: true,
  }).lean();
  if (!doc) throw notFound();
  res.json(toApi(doc));
});

adminSourcesRouter.delete("/:id", requireRole("admin"), async (req, res) => {
  if (!isObjectId(req.params.id)) throw notFound();
  await NewsSource.deleteOne({ _id: req.params.id });
  res.status(204).end();
});

// POST /admin/sources/:id/test – fetch the feed once and report what came back.
adminSourcesRouter.post("/:id/test", requireRole("admin"), async (req, res) => {
  if (!isObjectId(req.params.id)) throw notFound();
  const source = await NewsSource.findById(req.params.id).lean();
  if (!source) throw notFound();
  try {
    const items = await fetchFeed({ name: source.name, url: source.url, kind: source.kind === "page" ? "page" : "rss" }, 72);
    res.json({ ok: true, count: items.length, sample: items.slice(0, 5).map((i) => i.title) });
  } catch (err) {
    res.json({ ok: false, error: (err as Error).message });
  }
});

// GET /admin/ingest/runs
adminIngestRouter.get("/runs", async (_req, res) => {
  res.json(toApiList(await IngestRun.find().sort({ startedAt: -1 }).limit(20).lean()));
});

// POST /admin/ingest/run { dryRun?, maxDrafts? } – admin only. Kept small so it
// fits in a serverless request; the hourly GitHub Action does the full run.
adminIngestRouter.post("/run", requireRole("admin"), async (req, res) => {
  const { dryRun, maxDrafts } = z
    .object({ dryRun: z.boolean().default(false), maxDrafts: z.number().int().min(1).max(3).default(2) })
    .parse(req.body ?? {});
  const run = await runIngest({ dryRun, maxDrafts, trigger: "manual" });
  res.json(run);
});
