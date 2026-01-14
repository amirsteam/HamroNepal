/**
 * AI Service - Groq API Integration
 *
 * Provides AI-powered article generation features using Groq API (Llama 3.3).
 * Free tier: 30 requests/minute, generous daily quota.
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

interface GroqResponse {
  choices?: Array<{
    message: {
      content: string;
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
 * Call Groq API with a prompt
 */
async function callGroq(prompt: string): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error("Groq API key not configured. Set VITE_GROQ_API_KEY in .env.local");
  }

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `तपाईं नेपालका अग्रणी समाचार पोर्टलहरू (कान्तिपुर, रातोपाति, सेतोपाटी, अनलाइनखबर) मा काम गरेको अनुभव भएका वरिष्ठ पत्रकार हुनुहुन्छ।

विशेषज्ञता क्षेत्रहरू:
- राजनीति: सरकार, संसद्, दलहरू, निर्वाचन, संविधान
- अर्थतन्त्र: बजेट, बैंकिंग, व्यापार, विप्रेषण, पर्यटन
- समाज: शिक्षा, स्वास्थ्य, वातावरण, प्रवास
- खेलकुद: क्रिकेट, फुटबल, राष्ट्रिय खेलहरू
- मनोरञ्जन: चलचित्र, संगीत, कलाकारहरू

लेखन शैली:
- निष्पक्ष, तथ्यपरक र व्यावसायिक
- स्पष्ट नेपाली भाषा (सरल शब्दावली)
- ५क१ह (के, को, कहाँ, कहिले, किन, कसरी) समावेश
- इन्भर्टेड पिरामिड शैली (महत्त्वपूर्ण कुरा पहिले)

नेपाल सन्दर्भ:
- वि.सं. र ई.सं. मिति
- नेपाली मुद्रा (रुपैयाँ)
- स्थानीय भूगोल र प्रशासनिक संरचना`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Groq API request failed");
  }

  const data: GroqResponse = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("No response from Groq");
  }

  return text;
}

/**
 * Extract JSON from AI response (handles markdown code blocks and control chars)
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

  // Sanitize control characters inside JSON string values
  // Replace actual newlines inside strings with escaped newlines
  jsonStr = jsonStr.replace(/"([^"]*?)"/g, (_match, content) => {
    const sanitized = content
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t")
      .replace(/[\x00-\x1F]/g, ""); // Remove other control chars
    return `"${sanitized}"`;
  });

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("JSON parse error:", e, "\nRaw JSON:", jsonStr);
    throw new Error("AI ले सही JSON उत्पन्न गर्न सकेन। कृपया पुन: प्रयास गर्नुहोस्।");
  }
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

  const response = await callGroq(prompt);
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

  const response = await callGroq(prompt);
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

  const response = await callGroq(prompt);
  return extractJSON<SuggestedTags>(response);
}

/**
 * Check if Groq API is configured
 */
export function isAIConfigured(): boolean {
  return !!GROQ_API_KEY;
}
