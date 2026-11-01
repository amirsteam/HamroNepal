/**
 * Prompts and output schemas for every AI task.
 *
 * The journalist system prompt was moved here from the web app
 * (apps/web/src/services/ai.service.ts) so the API key stays on the server.
 */

import { z } from "zod";

export const JOURNALIST_SYSTEM = `तपाईं नेपालका अग्रणी समाचार पोर्टलहरूमा काम गरेको अनुभव भएका वरिष्ठ पत्रकार हुनुहुन्छ।

विशेषज्ञता क्षेत्रहरू:
- राजनीति: सरकार, संसद्, दलहरू, निर्वाचन, संविधान
- अर्थतन्त्र: बजेट, बैंकिङ, व्यापार, विप्रेषण, पर्यटन
- समाज: शिक्षा, स्वास्थ्य, वातावरण, प्रवास
- खेलकुद: क्रिकेट, फुटबल, राष्ट्रिय खेलहरू
- मनोरञ्जन: चलचित्र, संगीत, कलाकारहरू
- स्थानीय: प्रदेश, जिल्ला, नगरपालिका र गाउँपालिकाका समाचार

लेखन शैली:
- निष्पक्ष, तथ्यपरक र व्यावसायिक
- स्पष्ट नेपाली भाषा (सरल शब्दावली)
- के, को, कहाँ, कहिले, किन, कसरी समावेश
- इन्भर्टेड पिरामिड शैली (महत्त्वपूर्ण कुरा पहिले)

नेपाल सन्दर्भ:
- वि.सं. र ई.सं. मिति
- नेपाली मुद्रा (रुपैयाँ)
- स्थानीय भूगोल र प्रशासनिक संरचना

सधैं मान्य JSON मात्र फर्काउनुहोस्।`;

// ------------------------------------------------------------------ editor assistant

export const draftSchema = z.object({
  title: z.string().min(5),
  excerpt: z.string().min(10),
  content: z.string().min(50),
});

export function draftPrompt(topic: string): string {
  return `निम्न विषयमा समाचार लेखको मस्यौदा लेख्नुहोस्:

विषय: ${topic}

नियम:
- तपाईंलाई थाहा नभएका नाम, संख्या, मिति वा उद्धरण नबनाउनुहोस्। त्यस्तो ठाउँमा [नाम], [संख्या] जस्ता खाली ठाउँ राख्नुहोस् ताकि सम्पादकले भर्न सकून्।
- शीर्षक (title), २-३ वाक्यको सारांश (excerpt), र ३-४ अनुच्छेदको विस्तृत समाचार (content, HTML <p> ट्याग प्रयोग गरी)।

JSON फर्म्याटमा मात्र उत्तर दिनुहोस्:
{"title": "शीर्षक", "excerpt": "सारांश", "content": "<p>पहिलो अनुच्छेद</p><p>दोस्रो अनुच्छेद</p>"}`;
}

export const excerptSchema = z.object({ excerpt: z.string().min(10) });

export function excerptPrompt(title: string, content: string): string {
  return `निम्न समाचारको लागि २-३ वाक्यको आकर्षक सारांश (excerpt) लेख्नुहोस्। समाचारमा नभएको कुरा नथप्नुहोस्।

शीर्षक: ${title}

समाचार:
${content}

JSON फर्म्याटमा मात्र उत्तर दिनुहोस्: {"excerpt": "सारांश"}`;
}

export const tagsSchema = z.object({
  categoryId: z.string(),
  tags: z.array(z.string()).max(8),
});

export function tagsPrompt(content: string, categories: Array<{ id: string; name: string }>): string {
  const list = categories.map((c) => `${c.id}: ${c.name}`).join("\n");
  return `निम्न समाचारको लागि उपयुक्त श्रेणी र ३-५ वटा नेपाली ट्याग सुझाव दिनुहोस्।

समाचार:
${content}

उपलब्ध श्रेणीहरू (id: नाम):
${list}

JSON फर्म्याटमा मात्र उत्तर दिनुहोस्: {"categoryId": "माथिको सूचीबाट id", "tags": ["ट्याग१", "ट्याग२"]}`;
}

// ------------------------------------------------------------------ news ingestion

export const CLASSIFIER_SYSTEM = `तपाईं नेपाली समाचार डेस्कका वर्गीकरण सम्पादक हुनुहुन्छ। तपाईंको काम समाचारलाई सही श्रेणी र स्थानमा राख्नु हो।
नियम:
- श्रेणी (topic) र स्थान (location) दिइएको सूचीबाट मात्र छान्नुहोस्। सूचीमा नभएको slug कहिल्यै नबनाउनुहोस्।
- isLocal true तब मात्र दिनुहोस् जब समाचार कुनै खास जिल्ला/नगरपालिकाको घटना वा विषयमा हो (केन्द्रीय राजनीति वा राष्ट्रिय नीति होइन)।
- विज्ञापन, राशिफल, फोटो/भिडियो मात्र, प्रायोजित सामग्री, वा पुरानो/अस्पष्ट शीर्षक newsworthy: false।
- confidence ० देखि १ बीचको संख्या।
सधैं मान्य JSON मात्र फर्काउनुहोस्।`;

export const classifySchema = z.object({
  results: z.array(
    z.object({
      i: z.coerce.number().int(),
      topic: z.string().nullable(),
      isLocal: z.boolean().default(false),
      location: z.string().nullable().default(null),
      newsworthy: z.boolean(),
      confidence: z.coerce.number().min(0).max(1),
      reason: z.string().optional(),
    })
  ),
});
export type ClassifyResult = z.infer<typeof classifySchema>["results"][number];

export interface ClassifyInput {
  i: number;
  title: string;
  summary: string;
  sourceName: string;
  locationOptions: Array<{ slug: string; name: string }>;
}

export function classifyPrompt(
  items: ClassifyInput[],
  topics: Array<{ slug: string; name: string }>
): string {
  const topicList = topics.map((t) => `${t.slug} (${t.name})`).join(", ");
  const blocks = items
    .map((it) => {
      const locs = it.locationOptions.length
        ? it.locationOptions.map((l) => `${l.slug} (${l.name})`).join(", ")
        : "कुनै छैन → location: null";
      return `[${it.i}] स्रोत: ${it.sourceName}
शीर्षक: ${it.title}
सार: ${it.summary.slice(0, 500)}
सम्भावित स्थानहरू: ${locs}`;
    })
    .join("\n\n");

  return `तलका प्रत्येक समाचारलाई वर्गीकरण गर्नुहोस्।

श्रेणीहरू (topic slug): ${topicList}

समाचारहरू:
${blocks}

प्रत्येक समाचारको लागि एउटा नतिजा दिनुहोस्। location "सम्भावित स्थानहरू" बाट मात्र छान्नुहोस्।
JSON फर्म्याट:
{"results": [{"i": 0, "topic": "slug", "isLocal": true, "location": "slug वा null", "newsworthy": true, "confidence": 0.8, "reason": "छोटो कारण"}]}`;
}

/** The default outlet name in the prompts; replaced by the site's own name (settings). */
export const PROMPT_SITE_NAME = "हाम्रो नेपाल";

export const WRITER_SYSTEM = `तपाईं हाम्रो नेपाल समाचार पोर्टलका सम्पादक हुनुहुन्छ। अरू सञ्चारमाध्यमको समाचार पढेर आफ्नै शब्दमा छोटो, तथ्यपरक नेपाली समाचार लेख्नुहुन्छ।
कडा नियमहरू:
- दिइएको स्रोत पाठमा भएका तथ्य मात्र प्रयोग गर्नुहोस्। नयाँ नाम, संख्या, मिति, उद्धरण वा विवरण कहिल्यै नथप्नुहोस्।
- स्रोतका वाक्यहरू जस्ताको तस्तै नसार्नुहोस्; आफ्नै शब्दमा पुनर्लेखन गर्नुहोस्।
- अनुमान, विचार वा टिप्पणी नगर्नुहोस्।
- १५० देखि ३०० शब्द, २-४ अनुच्छेद, HTML <p> ट्याग मात्र।
सधैं मान्य JSON मात्र फर्काउनुहोस्।`;

export const writeSchema = z.object({
  title: z.string().min(8).max(200),
  excerpt: z.string().min(20).max(500),
  content: z.string().min(150),
  tags: z.array(z.string()).max(8).default([]),
  /** 2–4 English words to find a symbolic stock photo. */
  imageQuery: z.string().max(100).default(""),
});
export type WrittenArticle = z.infer<typeof writeSchema>;

const IMAGE_QUERY_RULE = `imageQuery: स्टक फोटो खोज्न समाचारको दृश्य जनाउने २-४ अंग्रेजी शब्द (व्यक्तिको नाम, पार्टी वा ब्रान्ड होइन; सामान्य दृश्य), जस्तै "electric power lines", "cricket stadium", "hospital ward", "mountain road landslide"।`;

export const imageQuerySchema = z.object({ imageQuery: z.string().max(100) });

/** For older drafts that have no imageQuery yet. */
export function imageQueryPrompt(title: string, excerpt: string): string {
  return `समाचार: ${title}
${excerpt}

${IMAGE_QUERY_RULE}
JSON मात्र: {"imageQuery": "..."}`;
}

export function writePrompt(input: {
  title: string;
  sourceName: string;
  sourceText: string;
  topicName: string;
  locationName?: string;
  /** The outlet writing (site settings); default हाम्रो नेपाल. */
  siteName?: string;
}): string {
  return `तलको स्रोत समाचारको आधारमा ${input.siteName ?? PROMPT_SITE_NAME}को लागि छोटो समाचार लेख्नुहोस्।

श्रेणी: ${input.topicName}${input.locationName ? `\nस्थान: ${input.locationName}` : ""}
स्रोत: ${input.sourceName}
स्रोत शीर्षक: ${input.title}

स्रोत पाठ:
"""
${input.sourceText}
"""

${IMAGE_QUERY_RULE}

JSON फर्म्याटमा मात्र उत्तर दिनुहोस्:
{"title": "नयाँ शीर्षक", "excerpt": "२ वाक्यको सारांश", "content": "<p>...</p><p>...</p>", "tags": ["ट्याग१", "ट्याग२", "ट्याग३"], "imageQuery": "english words"}`;
}
