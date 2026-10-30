/**
 * Add symbolic stock photos to AI articles that have no image yet
 * (e.g. drafts saved before PEXELS_API_KEY was set).
 *
 *   npm run images:backfill -w apps/api -- --dry-run
 *   npm run images:backfill -w apps/api -- --limit 20
 *
 * One AI call (to pick English search words) + one Pexels search per article.
 */

import { connectDB, disconnectDB } from "../src/db";
import { config } from "../src/config";
import { Article } from "../src/models";
import { generateJSON, isAIConfigured } from "../src/ai";
import { imageQueryPrompt, imageQuerySchema } from "../src/ai/prompts";
import { toPlainText } from "../src/lib/sanitize";
import { findStockPhoto, isStockPhotoConfigured } from "../src/services/stockPhoto";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.indexOf("--limit");
const limit = limitArg >= 0 ? Math.max(1, Number(args[limitArg + 1]) || 20) : 20;

if (!isStockPhotoConfigured()) {
  console.error("PEXELS_API_KEY is not set (apps/api/.env). Get a free key at https://www.pexels.com/api/");
  process.exit(1);
}
if (!isAIConfigured()) {
  console.error("Set GEMINI_API_KEY or GROQ_API_KEY first.");
  process.exit(1);
}

await connectDB(config.mongoUri);
try {
  const articles = await Article.find({
    "source.type": "ai",
    $or: [{ featuredImage: { $exists: false } }, { featuredImage: null }, { featuredImage: "" }],
  })
    .sort({ createdAt: -1 })
    .limit(limit);

  const used = new Set(
    (await Article.find({ featuredImage: { $exists: true } }).select("featuredImage").lean()).map((a) => a.featuredImage as string)
  );

  console.log(`${articles.length} AI article(s) without an image${dryRun ? " (dry run – nothing is saved)" : ""}`);
  let added = 0;
  for (const article of articles) {
    try {
      const { data } = await generateJSON({
        system: "You pick search words for stock photos. Reply with JSON only.",
        prompt: imageQueryPrompt(article.title, toPlainText(article.excerpt || "")),
        schema: imageQuerySchema,
        temperature: 0.2,
        maxTokens: 200,
      });
      const query = toPlainText(data.imageQuery).slice(0, 80);
      const photo = query ? await findStockPhoto(query, used) : null;
      if (!photo) {
        console.log(`  – no photo for "${query}": ${article.title}`);
        continue;
      }
      used.add(photo.url);
      added++;
      console.log(`  🖼 "${query}" → ${article.title}`);
      if (!dryRun) {
        article.set({ featuredImage: photo.url, imageCredit: photo.credit });
        await article.save();
      }
    } catch (err) {
      console.log(`  ✗ ${article.title}: ${(err as Error).message}`);
    }
  }
  console.log(`Done: ${added} photo(s) ${dryRun ? "found" : "added"}.`);
} finally {
  await disconnectDB();
}
