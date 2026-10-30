/**
 * AI Service – calls the API, which talks to Gemini/Groq. No AI keys live in
 * the browser any more.
 */

import { api } from "@/lib/api";

export interface GeneratedArticle {
  title: string;
  excerpt: string;
  content: string;
}

export interface SuggestedTags {
  categoryId: string;
  tags: string[];
}

export interface AIStatus {
  configured: boolean;
  providers: Array<{ name: string; model: string; configured: boolean }>;
}

export async function getAIStatus(): Promise<AIStatus> {
  return api.get("/admin/ai/status");
}

export async function generateArticleDraft(topic: string): Promise<GeneratedArticle> {
  return api.post("/admin/ai/draft", { topic });
}

export async function improveExcerpt(title: string, content: string): Promise<string> {
  const res = await api.post<{ excerpt: string }>("/admin/ai/excerpt", { title, content });
  return res.excerpt;
}

/** The API picks from the active topic categories itself. */
export async function suggestTags(content: string): Promise<SuggestedTags> {
  return api.post("/admin/ai/tags", { content });
}
