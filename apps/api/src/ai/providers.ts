/**
 * Free-tier LLM providers. Both are called with plain fetch (no SDKs) and
 * asked for JSON output.
 *
 * - Gemini (Google AI Studio free tier), Flash-Lite by default → primary.
 *   The full Flash model "thinks" for about a minute per call, which is too
 *   slow for an hourly batch; Flash-Lite answers in seconds with good Nepali.
 * - Groq (GPT-OSS 120B, free tier): fast fallback when Gemini is rate limited.
 */

import { config } from "../config";

export interface ChatRequest {
  system: string;
  prompt: string;
  temperature: number;
  maxTokens: number;
}

export interface Provider {
  name: "gemini" | "groq";
  model: string;
  isConfigured(): boolean;
  /** Returns the raw text the model produced (expected to be JSON). */
  complete(req: ChatRequest): Promise<string>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public status: number,
    public retryAfterMs?: number
  ) {
    super(message);
  }
  /** Rate limits, timeouts and server errors are worth retrying. */
  get retryable(): boolean {
    return this.status === 429 || this.status >= 500 || this.status === 0;
  }
}

const TIMEOUT_MS = 60_000;

function retryAfter(res: Response): number | undefined {
  const value = res.headers.get("retry-after");
  if (!value) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) ? seconds * 1000 : undefined;
}

async function post(url: string, headers: Record<string, string>, body: unknown) {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new ProviderError(`Network error: ${(err as Error).message}`, 0);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ProviderError(
      `HTTP ${res.status}: ${text.slice(0, 300)}`,
      res.status,
      retryAfter(res)
    );
  }
  return res.json();
}

export const gemini: Provider = {
  name: "gemini",
  get model() {
    return config.ai.primaryModel;
  },
  isConfigured: () => !!config.ai.geminiKey,
  async complete({ system, prompt, temperature, maxTokens }) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      config.ai.primaryModel
    )}:generateContent`;
    const data = (await post(
      url,
      { "x-goog-api-key": config.ai.geminiKey },
      {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          responseMimeType: "application/json",
        },
      }
    )) as {
      candidates?: Array<{
        finishReason?: string;
        content?: { parts?: Array<{ text?: string; thought?: boolean }> };
      }>;
      promptFeedback?: { blockReason?: string };
    };

    if (data.promptFeedback?.blockReason) {
      throw new ProviderError(`Prompt blocked: ${data.promptFeedback.blockReason}`, 400);
    }
    const candidate = data.candidates?.[0];
    const text = (candidate?.content?.parts ?? [])
      .filter((p) => !p.thought && p.text)
      .map((p) => p.text)
      .join("");
    if (!text) {
      throw new ProviderError(`Empty response (finishReason: ${candidate?.finishReason})`, 500);
    }
    return text;
  },
};

export const groq: Provider = {
  name: "groq",
  get model() {
    return config.ai.fallbackModel;
  },
  isConfigured: () => !!config.ai.groqKey,
  async complete({ system, prompt, temperature, maxTokens }) {
    const data = (await post(
      "https://api.groq.com/openai/v1/chat/completions",
      { Authorization: `Bearer ${config.ai.groqKey}` },
      {
        model: config.ai.fallbackModel,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
      }
    )) as { choices?: Array<{ message?: { content?: string } }> };

    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new ProviderError("Empty response", 500);
    return text;
  },
};
