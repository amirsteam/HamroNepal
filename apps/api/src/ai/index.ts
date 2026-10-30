/**
 * generateJSON(): ask an LLM for JSON, validate it with zod, and fall back
 * from Gemini to Groq on rate limits or errors.
 */

import type { ZodType, ZodTypeDef } from "zod";
import { config } from "../config";
import { gemini, groq, ProviderError, type Provider } from "./providers";

export interface GenerateOptions<T> {
  system: string;
  prompt: string;
  schema: ZodType<T, ZodTypeDef, unknown>;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateResult<T> {
  data: T;
  provider: Provider["name"];
  model: string;
}

export type GenerateJSON = <T>(opts: GenerateOptions<T>) => Promise<GenerateResult<T>>;

export class AIError extends Error {}

const providers: Provider[] = [gemini, groq];

export function isAIConfigured(): boolean {
  return providers.some((p) => p.isConfigured());
}

export function aiStatus() {
  return {
    configured: isAIConfigured(),
    providers: providers.map((p) => ({
      name: p.name,
      model: p.model,
      configured: p.isConfigured(),
    })),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Simple per-provider pacing so a batch job stays under free-tier RPM.
const lastCall = new Map<string, number>();
async function pace(name: string) {
  const gap = config.ai.minIntervalMs;
  const wait = (lastCall.get(name) ?? 0) + gap - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall.set(name, Date.now());
}

/** Pull the first JSON object/array out of a model reply. */
export function parseJSONReply(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/[[{][\s\S]*[\]}]/);
    if (!match) throw new Error("No JSON found in reply");
    return JSON.parse(match[0]);
  }
}

export const generateJSON: GenerateJSON = async <T>({
  system,
  prompt,
  schema,
  temperature = 0.4,
  maxTokens = 4096,
}: GenerateOptions<T>): Promise<GenerateResult<T>> => {
  const available = providers.filter((p) => p.isConfigured());
  if (!available.length) {
    throw new AIError("AI सेवा कन्फिगर गरिएको छैन (GEMINI_API_KEY वा GROQ_API_KEY)।");
  }

  const failures: string[] = [];
  for (const provider of available) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await pace(provider.name);
        const text = await provider.complete({ system, prompt, temperature, maxTokens });
        const parsed = schema.safeParse(parseJSONReply(text));
        if (parsed.success) {
          return { data: parsed.data, provider: provider.name, model: provider.model };
        }
        failures.push(`${provider.name}: invalid JSON shape (${parsed.error.issues[0]?.message})`);
        // Retry once on the same provider, then move on.
      } catch (err) {
        if (err instanceof ProviderError) {
          failures.push(`${provider.name}: ${err.message}`);
          if (!err.retryable) break; // bad key / bad request → next provider
          if (attempt === 1) {
            await sleep(Math.min(err.retryAfterMs ?? 3000, 20_000));
            continue;
          }
          break;
        }
        failures.push(`${provider.name}: ${(err as Error).message}`);
      }
    }
  }
  throw new AIError(`AI ले उत्तर दिन सकेन। ${failures.join(" | ")}`);
};
