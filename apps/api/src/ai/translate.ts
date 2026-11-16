/**
 * English versions of articles for the English site, made by the same AI
 * providers as the news pipeline. Faithful translation only: no added facts,
 * same paragraphs and markup, names transliterated, numbers unchanged.
 */

import { createHash } from "node:crypto";
import { z } from "zod";
import { generateJSON as defaultGenerate, type GenerateJSON } from "./index";
import { sanitizeArticleHtml, toPlainText } from "../lib/sanitize";

const SYSTEM = `You translate Nepali news articles into clear, natural English for a Nepali news website's English edition.
Rules:
- Translate faithfully. Never add, remove or guess facts, names, numbers, dates or quotes.
- Keep the same paragraphs and the same HTML tags (<p>, <h2>, <h3>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>, <a href="…">). Do not add tags or attributes; keep href values unchanged.
- Write Nepali numerals as Western digits (२५ → 25). Keep amounts in their unit (रु. → Rs.; लाख/करोड → lakh/crore, e.g. "Rs. 5 lakh").
- Transliterate Nepali names of people and places (काभ्रेपलाञ्चोक → Kavrepalanchok, पनौती → Panauti). Use common English names for institutions where they exist (प्रतिनिधि सभा → House of Representatives).
- Bikram Sambat dates stay as BS dates in English (१५ कार्तिक २०८३ → 15 Kartik 2083 BS).
- Reply with JSON only.`;

const schema = z.object({
  title: z.string().min(3).max(300),
  excerpt: z.string().max(1000).default(""),
  content: z.string().min(1),
  keyPoints: z.array(z.string().max(400)).max(6).default([]),
});

/** Key points as plain lines, at most 3 (the same rules as the Nepali ones). */
function cleanPoints(points: string[]): string[] {
  return points.map((p) => toPlainText(p).replace(/^[\s•\-–*]+/, "").trim()).filter(Boolean).slice(0, 3);
}

const CREDIT = /<p class="source-credit">([\s\S]*?)<\/p>/;

/** Fingerprint of the Nepali text a translation was made from. */
export function sourceHash(a: { title: string; excerpt?: string | null; content?: string | null }): string {
  return createHash("sha1")
    .update(`${a.title}\u0000${a.excerpt ?? ""}\u0000${a.content ?? ""}`)
    .digest("hex");
}

export interface Translation {
  title: string;
  excerpt: string;
  content: string;
  /** Empty when the Nepali has no key points. */
  keyPoints: string[];
  model: string;
}

type Source = { title: string; excerpt?: string | null; content?: string | null; keyPoints?: string[] | null };

export async function translateArticle(
  article: Source,
  generate: GenerateJSON = defaultGenerate
): Promise<Translation> {
  const html = article.content ?? "";
  // The "स्रोत:" credit is code-made: carried over as "Source:" rather than translated.
  const credit = html.match(CREDIT)?.[1];
  const body = html.replace(CREDIT, "").trim();
  const points = article.keyPoints ?? [];

  const { data, model } = await generate({
    system: SYSTEM,
    prompt: `Translate this article. JSON: {"title": "...", "excerpt": "...", ${points.length ? '"keyPoints": ["...", "..."], ' : ""}"content": "<p>...</p>"}

TITLE: ${article.title}

EXCERPT: ${toPlainText(article.excerpt ?? "")}
${points.length ? `\nKEY POINTS (translate each, same order):\n${points.map((p) => `- ${p}`).join("\n")}\n` : ""}
CONTENT (HTML):
${body}`,
    schema,
    temperature: 0.2,
    maxTokens: 6000,
  });

  const content =
    sanitizeArticleHtml(data.content) +
    (credit ? `<p class="source-credit">${sanitizeArticleHtml(credit.replace(/^\s*स्रोत\s*:/, "Source:"))}</p>` : "");
  return {
    title: toPlainText(data.title),
    excerpt: toPlainText(data.excerpt),
    content,
    keyPoints: points.length ? cleanPoints(data.keyPoints) : [],
    model,
  };
}

const pointsSchema = z.object({ keyPoints: z.array(z.string().max(400)).max(6) });

/** Only the key points, for stories translated before they had any (backfill). */
export async function translateKeyPoints(points: string[], generate: GenerateJSON = defaultGenerate): Promise<string[]> {
  if (!points.length) return [];
  const { data } = await generate({
    system: SYSTEM,
    prompt: `Translate these key points of a news story, one English sentence each, same order. JSON: {"keyPoints": ["...", "..."]}

${points.map((p) => `- ${p}`).join("\n")}`,
    schema: pointsSchema,
    temperature: 0.2,
    maxTokens: 1000,
  });
  return cleanPoints(data.keyPoints);
}
