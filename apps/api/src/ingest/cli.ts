/**
 * npm run ingest -w apps/api -- [--dry-run] [--max 5] [--trigger cron]
 */

import { connectDB, disconnectDB } from "../db";
import { config } from "../config";
import { isAIConfigured } from "../ai";
import { runIngest } from "./run";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

if (!config.mongoUri) {
  console.error("MONGODB_URI is not set.");
  process.exit(1);
}
if (!isAIConfigured()) {
  console.error("No AI provider configured. Set GEMINI_API_KEY and/or GROQ_API_KEY.");
  process.exit(1);
}

const dryRun = flag("dry-run");
const max = value("max");
const trigger = (value("trigger") as "cron" | "cli" | undefined) ?? "cli";

await connectDB();
console.log(`HamroNepal AI ingest${dryRun ? " (dry run – nothing is saved)" : ""}`);

const report = await runIngest(
  { dryRun, trigger, maxDrafts: max ? Number(max) : undefined, log: (l) => console.log(l) },
  {}
);

console.log("\nSummary:", JSON.stringify(report.stats));
if (report.errorLog.length) console.log("Problems:\n - " + report.errorLog.join("\n - "));
await disconnectDB();

// Fail the GitHub Action only when nothing worked at all.
const total = report.stats.fetched;
process.exit(total === 0 && report.errorLog.length > 0 ? 1 : 0);
