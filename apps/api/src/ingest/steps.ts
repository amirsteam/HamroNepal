/**
 * AI steps of the pipeline: classify (batched) and write (one per story).
 */

import type { GenerateJSON } from "../ai";
import {
  CLASSIFIER_SYSTEM,
  WRITER_SYSTEM,
  PROMPT_SITE_NAME,
  classifyPrompt,
  classifySchema,
  writePrompt,
  writeSchema,
  type ClassifyInput,
  type ClassifyResult,
  type WrittenArticle,
} from "../ai/prompts";
import { sanitizeArticleHtml, toPlainText } from "../lib/sanitize";
import { escapeXml } from "../lib/http";

export const CLASSIFY_BATCH = 10;

export async function classifyItems(
  generate: GenerateJSON,
  items: ClassifyInput[],
  topics: Array<{ slug: string; name: string }>
): Promise<Map<number, ClassifyResult>> {
  const out = new Map<number, ClassifyResult>();
  for (let start = 0; start < items.length; start += CLASSIFY_BATCH) {
    const batch = items.slice(start, start + CLASSIFY_BATCH);
    const { data } = await generate({
      system: CLASSIFIER_SYSTEM,
      prompt: classifyPrompt(batch, topics),
      schema: classifySchema,
      temperature: 0.1,
      maxTokens: 4096,
    });
    const validTopics = new Set(topics.map((t) => t.slug));
    for (const r of data.results) {
      const input = batch.find((b) => b.i === r.i);
      if (!input) continue;
      // Never trust a slug the model invented.
      const topic = r.topic && validTopics.has(r.topic) ? r.topic : null;
      const location =
        r.isLocal && r.location && input.locationOptions.some((l) => l.slug === r.location)
          ? r.location
          : null;
      out.set(r.i, { ...r, topic, location });
    }
  }
  return out;
}

export interface WriteInput {
  title: string;
  sourceName: string;
  sourceUrl: string;
  sourceText: string;
  topicName: string;
  locationName?: string;
  /** The outlet's name (site settings), used in the writer's instructions. */
  siteName?: string;
}

export interface WriteOutput extends WrittenArticle {
  model: string;
  /** The model's own text (no HTML, no "स्रोत:" credit), for the quality checks. */
  bodyText: string;
}

/** Credit line added by code (not the model) so attribution is always present. */
export function sourceCredit(name: string, url: string): string {
  return `<p class="source-credit">स्रोत: <a href="${escapeXml(url)}" target="_blank" rel="noopener noreferrer nofollow">${escapeXml(name)}</a></p>`;
}

/** Article HTML without the credit line added by `sourceCredit`. */
export function withoutSourceCredit(html: string): string {
  return html.replace(/<p class="source-credit">[\s\S]*?<\/p>/g, "");
}

export async function writeArticle(generate: GenerateJSON, input: WriteInput): Promise<WriteOutput> {
  const { data, model } = await generate({
    system: input.siteName ? WRITER_SYSTEM.split(PROMPT_SITE_NAME).join(input.siteName) : WRITER_SYSTEM,
    prompt: writePrompt(input),
    schema: writeSchema,
    temperature: 0.3,
    maxTokens: 4096,
  });
  const body = sanitizeArticleHtml(data.content);
  return {
    title: toPlainText(data.title),
    excerpt: toPlainText(data.excerpt),
    content: body + sourceCredit(input.sourceName, input.sourceUrl),
    bodyText: toPlainText(body),
    tags: [...new Set(data.tags.map(toPlainText).filter(Boolean))].slice(0, 6),
    imageQuery: toPlainText(data.imageQuery ?? "").slice(0, 80),
    model,
  };
}
