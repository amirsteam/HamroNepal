/**
 * Editor AI assistant (draft, excerpt, tags). Runs on the server so the
 * provider keys are never sent to the browser.
 */

import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { Category } from "../../models";
import { AIError, aiStatus, generateJSON, isAIConfigured } from "../../ai";
import {
  JOURNALIST_SYSTEM,
  draftPrompt,
  draftSchema,
  excerptPrompt,
  excerptSchema,
  tagsPrompt,
  tagsSchema,
} from "../../ai/prompts";
import { sanitizeArticleHtml, toPlainText } from "../../lib/sanitize";
import { HttpError } from "../../lib/http";

export const adminAiRouter = Router();

adminAiRouter.get("/status", (_req, res) => {
  res.json(aiStatus());
});

const aiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 15,
  keyGenerator: (req) => req.user?.id ?? "anon",
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "धेरै AI अनुरोध भयो। एक मिनेटपछि प्रयास गर्नुहोस्।" },
});
adminAiRouter.use(aiLimiter);

async function run<T>(fn: () => Promise<T>): Promise<T> {
  if (!isAIConfigured()) throw new HttpError(503, "AI सेवा कन्फिगर गरिएको छैन।");
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AIError) throw new HttpError(502, err.message);
    throw err;
  }
}

adminAiRouter.post("/draft", async (req, res) => {
  const { topic } = z.object({ topic: z.string().trim().min(3).max(500) }).parse(req.body);
  const { data, model } = await run(() =>
    generateJSON({ system: JOURNALIST_SYSTEM, prompt: draftPrompt(topic), schema: draftSchema, temperature: 0.7 })
  );
  res.json({
    title: toPlainText(data.title),
    excerpt: toPlainText(data.excerpt),
    content: sanitizeArticleHtml(data.content),
    model,
  });
});

adminAiRouter.post("/excerpt", async (req, res) => {
  const { title, content } = z
    .object({ title: z.string().max(300), content: z.string().min(20).max(200_000) })
    .parse(req.body);
  const text = toPlainText(content).slice(0, 2500);
  const { data } = await run(() =>
    generateJSON({ system: JOURNALIST_SYSTEM, prompt: excerptPrompt(title, text), schema: excerptSchema })
  );
  res.json({ excerpt: toPlainText(data.excerpt) });
});

adminAiRouter.post("/tags", async (req, res) => {
  const { content } = z.object({ content: z.string().min(20).max(200_000) }).parse(req.body);
  const categories = await Category.find({ type: "topic", isActive: true }).select("name").lean();
  const list = categories.map((c) => ({ id: String(c._id), name: c.name }));
  const text = toPlainText(content).slice(0, 2000);
  const { data } = await run(() =>
    generateJSON({ system: JOURNALIST_SYSTEM, prompt: tagsPrompt(text, list), schema: tagsSchema, temperature: 0.2 })
  );
  const valid = list.some((c) => c.id === data.categoryId);
  res.json({
    categoryId: valid ? data.categoryId : "",
    tags: data.tags.map(toPlainText).filter(Boolean).slice(0, 6),
  });
});
