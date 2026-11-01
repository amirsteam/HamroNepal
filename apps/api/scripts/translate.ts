/**
 * English versions for the English site: translate published articles whose
 * English is missing or older than the Nepali (human-edited English is kept).
 *
 *   npm run translate -w apps/api -- --dry-run
 *   npm run translate -w apps/api -- --limit 40
 *
 * The hourly GitHub job runs this after the news pipeline.
 */

import { connectDB, disconnectDB } from "../src/db";
import { isAIConfigured } from "../src/ai";
import { translatePending } from "../src/services/translations";

const args = process.argv.slice(2);
const i = args.indexOf("--limit");
const limit = i >= 0 ? Math.max(1, Number(args[i + 1]) || 15) : 15;
const dryRun = args.includes("--dry-run");

if (!isAIConfigured()) {
  console.error("No AI provider configured. Set GEMINI_API_KEY and/or GROQ_API_KEY.");
  process.exit(1);
}

await connectDB();
try {
  console.log(`English translations (up to ${limit})${dryRun ? " – dry run, nothing saved" : ""}`);
  const r = await translatePending({ limit, dryRun, log: (l) => console.log(l) });
  console.log(`Done: ${r.translated} translated, ${r.failed} failed.`);
  if (r.failed) process.exitCode = 1;
} finally {
  await disconnectDB();
}
