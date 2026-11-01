/**
 * Add photos to AI articles that have no image yet.
 *
 *   npm run images:backfill -w apps/api -- --dry-run
 *   npm run images:backfill -w apps/api -- --limit 20
 *   npm run images:backfill -w apps/api -- --from-source --limit 50
 *
 * Default: a symbolic Pexels stock photo (one AI call for English search
 * words + one Pexels search per article; needs PEXELS_API_KEY).
 * --from-source: the outlet's own photo from the original article page,
 * linked from its server and credited to it. The photos are the outlets'
 * copyright: for demos or with their permission (see INGEST_SOURCE_IMAGES).
 */

import { connectDB, disconnectDB } from "../src/db";
import { config } from "../src/config";
import { Article } from "../src/models";
import { generateJSON, isAIConfigured } from "../src/ai";
import { imageQueryPrompt, imageQuerySchema } from "../src/ai/prompts";
import { toPlainText } from "../src/lib/sanitize";
import { findStockPhoto, isStockPhotoConfigured, type StockPhoto } from "../src/services/stockPhoto";
import { imageLoads, readPage } from "../src/ingest/extract";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const fromSource = args.includes("--from-source");
const limitArg = args.indexOf("--limit");
const limit = limitArg >= 0 ? Math.max(1, Number(args[limitArg + 1]) || 20) : 20;

if (!fromSource && !isStockPhotoConfigured()) {
  console.error("PEXELS_API_KEY is not set (apps/api/.env). Get a free key at https://www.pexels.com/api/");
  console.error("Or use --from-source to link each outlet's own photo.");
  process.exit(1);
}
if (!fromSource && !isAIConfigured()) {
  console.error("Set GEMINI_API_KEY or GROQ_API_KEY first.");
  process.exit(1);
}

type Doc = InstanceType<typeof Article>;

async function stockPhoto(article: Doc, used: Set<string>): Promise<{ photo: StockPhoto | null; note: string }> {
  const { data } = await generateJSON({
    system: "You pick search words for stock photos. Reply with JSON only.",
    prompt: imageQueryPrompt(article.title, toPlainText(article.excerpt || "")),
    schema: imageQuerySchema,
    temperature: 0.2,
    maxTokens: 200,
  });
  const query = toPlainText(data.imageQuery).slice(0, 80);
  return { photo: query ? await findStockPhoto(query, used) : null, note: `"${query}"` };
}

async function sourcePhoto(article: Doc): Promise<{ photo: StockPhoto | null; note: string }> {
  const url = article.source?.url;
  if (!url) return { photo: null, note: "no source link" };
  const page = await readPage(url);
  if (!page.imageUrl) return { photo: null, note: "no photo on the source page" };
  if (!(await imageLoads(page.imageUrl))) return { photo: null, note: `photo refused: ${page.imageUrl}` };
  return {
    photo: { url: page.imageUrl, alt: article.title, credit: { name: article.source?.name || new URL(url).hostname, url } },
    note: article.source?.name ?? "source",
  };
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

  console.log(
    `${articles.length} AI article(s) without an image, using ${fromSource ? "source photos" : "Pexels"}${dryRun ? " (dry run – nothing is saved)" : ""}`
  );
  let added = 0;
  for (const article of articles) {
    try {
      const { photo, note } = fromSource ? await sourcePhoto(article) : await stockPhoto(article, used);
      if (!photo) {
        console.log(`  – ${note}: ${article.title}`);
        continue;
      }
      used.add(photo.url);
      added++;
      console.log(`  🖼 ${note} → ${article.title}`);
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
