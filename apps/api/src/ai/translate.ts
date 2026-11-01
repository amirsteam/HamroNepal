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
});

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
  model: string;
}

export async function translateArticle(
  article: { title: string; excerpt?: string | null; content?: string | null },
  generate: GenerateJSON = defaultGenerate
): Promise<Translation> {
  const html = article.content ?? "";
  // The "स्रोत:" credit is code-made: carried over as "Source:" rather than translated.
  const credit = html.match(CREDIT)?.[1];
  const body = html.replace(CREDIT, "").trim();

  const { data, model } = await generate({
    system: SYSTEM,
    prompt: `Translate this article. JSON: {"title": "...", "excerpt": "...", "content": "<p>...</p>"}

TITLE: ${article.title}

EXCERPT: ${toPlainText(article.excerpt ?? "")}

CONTENT (HTML):
${body}`,
    schema,
    temperature: 0.2,
    maxTokens: 6000,
  });

  const content =
    sanitizeArticleHtml(data.content) +
    (credit ? `<p class="source-credit">${sanitizeArticleHtml(credit.replace(/^\s*स्रोत\s*:/, "Source:"))}</p>` : "");
  return { title: toPlainText(data.title), excerpt: toPlainText(data.excerpt), content, model };
}
