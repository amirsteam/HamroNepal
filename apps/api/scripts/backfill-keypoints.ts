/**
 * Key points (the phone article page's "मुख्य बुँदा") for stories that have
 * none: older AI drafts and stories written in the dashboard. Translated too
 * when the story already has an English version.
 *
 *   npm run keypoints:backfill -w apps/api -- --dry-run --limit 3
 *   npm run keypoints:backfill -w apps/api -- --limit 50
 *
 * The hourly GitHub job runs it with --limit 20.
 */

import { connectDB, disconnectDB } from "../src/db";
import { isAIConfigured } from "../src/ai";
import { backfillKeyPoints } from "../src/services/keyPoints";

const args = process.argv.slice(2);
const i = args.indexOf("--limit");
const limit = i >= 0 ? Math.max(1, Number(args[i + 1]) || 50) : 50;
const dryRun = args.includes("--dry-run");

if (!isAIConfigured()) {
  console.error("No AI provider configured. Set GEMINI_API_KEY and/or GROQ_API_KEY.");
  process.exit(1);
}

await connectDB();
try {
  console.log(`Key points (up to ${limit} stories)${dryRun ? " – dry run, nothing saved" : ""}`);
  const r = await backfillKeyPoints({ limit, dryRun, log: (l) => console.log(l) });
  console.log(`Done: ${r.done} of ${r.checked} stories, ${r.failed} failed.`);
  if (r.failed) process.exitCode = 1;
} finally {
  await disconnectDB();
}
