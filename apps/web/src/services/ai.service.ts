/**
 * AI Service - Google Gemini Integration
 *
 * Provides AI-powered article generation features using Gemini API.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
  error?: {
    message: string;
  };
}

export interface GeneratedArticle {
  title: string;
  excerpt: string;
  content: string;
}

export interface SuggestedTags {
  categoryId: string;
  tags: string[];
}

/**
 * Call Gemini API with a prompt
 */
async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key not configured. Set VITE_GEMINI_API_KEY in .env.local");
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Gemini API request failed");
  }

  const data: GeminiResponse = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("No response from Gemini");
  }

  return text;
}

/**
 * Extract JSON from Gemini response (handles markdown code blocks)
 */
function extractJSON<T>(text: string): T {
  // Remove markdown code blocks if present
  let jsonStr = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  // Find JSON object or array
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  return JSON.parse(jsonStr);
}

/**
 * Generate article draft from a topic
 */
export async function generateArticleDraft(topic: string): Promise<GeneratedArticle> {
  const prompt = `तपाईं एक अनुभवी नेपाली पत्रकार हुनुहुन्छ। निम्न विषयमा समाचार लेख लेख्नुहोस्:

विषय: ${topic}

लेखमा समावेश गर्नुहोस्:
- आकर्षक शीर्षक (title)
- संक्षिप्त सारांश २-३ वाक्यमा (excerpt)
- विस्तृत समाचार ३-४ अनुच्छेदमा (content) - HTML फर्म्याटमा <p> ट्यागहरू प्रयोग गर्नुहोस्

JSON फर्म्याटमा मात्र उत्तर दिनुहोस्:
{"title": "शीर्षक", "excerpt": "सारांश", "content": "<p>पहिलो अनुच्छेद</p><p>दोस्रो अनुच्छेद</p>"}`;

  const response = await callGemini(prompt);
  return extractJSON<GeneratedArticle>(response);
}

/**
 * Improve/generate excerpt from title and content
 */
export async function improveExcerpt(title: string, content: string): Promise<string> {
  // Truncate content if too long
  const truncatedContent = content.length > 2000 ? content.substring(0, 2000) + "..." : content;

  const prompt = `तपाईं एक अनुभवी नेपाली पत्रकार हुनुहुन्छ। निम्न समाचारको लागि आकर्षक सारांश (excerpt) लेख्नुहोस्।

शीर्षक: ${title}

समाचार:
${truncatedContent}

सारांश २-३ वाक्यमा लेख्नुहोस् जुन:
- पाठकलाई आकर्षित गर्ने
- मुख्य कुराहरू समेटेको
- समाचार पढ्न उत्सुक बनाउने

केवल सारांश मात्र लेख्नुहोस्, अरू केही नलेख्नुहोस्:`;

  const response = await callGemini(prompt);
  // Clean up - remove quotes if wrapped
  return response.trim().replace(/^["']|["']$/g, "");
}

/**
 * Suggest category and tags based on content
 */
export async function suggestTags(
  content: string,
  availableCategories: Array<{ id: string; name: string }>
): Promise<SuggestedTags> {
  const truncatedContent = content.length > 1500 ? content.substring(0, 1500) + "..." : content;
  const categoryList = availableCategories.map((c) => `${c.id}: ${c.name}`).join(", ");

  const prompt = `तपाईं एक समाचार वर्गीकरण विशेषज्ञ हुनुहुन्छ। निम्न समाचारको लागि उपयुक्त श्रेणी र ट्यागहरू सुझाव दिनुहोस्।

समाचार:
${truncatedContent}

उपलब्ध श्रेणीहरू: ${categoryList}

JSON फर्म्याटमा उत्तर दिनुहोस्:
{"categoryId": "श्रेणी_id", "tags": ["ट्याग१", "ट्याग२", "ट्याग३"]}

ट्यागहरू नेपालीमा र ३-५ वटा मात्र दिनुहोस्।`;

  const response = await callGemini(prompt);
  return extractJSON<SuggestedTags>(response);
}

/**
 * Check if Gemini API is configured
 */
export function isAIConfigured(): boolean {
  return !!GEMINI_API_KEY;
}
