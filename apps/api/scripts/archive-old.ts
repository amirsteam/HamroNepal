/**
 * Retire old news: stories published more than ARCHIVE_AFTER_MONTHS ago (12 by
 * default) drop off the home page, the lists, search, the sitemaps and RSS.
 * They stay readable at /news/<slug>, so links and printed QR codes keep working.
 *
 *   npm run archive -w apps/api -- --dry-run          # list what is due, change nothing
 *   npm run archive -w apps/api                       # retire them
 *   npm run archive -w apps/api -- --months 18        # a different cutoff
 *   npm run archive -w apps/api -- --limit 5000       # bigger batch (first run backlog)
 *
 * The monthly GitHub job (.github/workflows/archive.yml) runs this on the 1st.
 * An editor can put a single story back from the dashboard.
 */

import { connectDB, disconnectDB } from "../src/db";
import { config } from "../src/config";
import { retireCutoff, retireOldArticles } from "../src/services/archive";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const num = (name: string) => (value(name) ? Number(value(name)) : undefined);

const dryRun = flag("dry-run");
const months = num("months") ?? config.archive.months;
const limit = num("limit") ?? config.archive.maxPerRun;

if (!config.mongoUri) {
  console.error("MONGODB_URI is not set.");
  process.exit(1);
}
if (!Number.isFinite(months) || months < 1) {
  console.error(`--months must be a whole number of months, 1 or more (got ${value("months")}).`);
  process.exit(1);
}
if (!Number.isFinite(limit) || limit < 1) {
  console.error(`--limit must be 1 or more (got ${value("limit")}).`);
  process.exit(1);
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

// Header first, then the service's per-story lines under it.
console.log(
  `Retiring stories published before ${ymd(retireCutoff(undefined, months))} (${months} months)` +
    `${dryRun ? " – dry run, nothing saved" : ""}`
);

await connectDB();
try {
  const r = await retireOldArticles({ months, limit, dryRun, log: (l) => console.log(l) });
  console.log(`Done: ${dryRun ? `${r.checked} due` : `${r.retired} retired`}.`);
  if (r.remaining > 0) {
    // Normal on a first run with a backlog, not an error.
    console.log(`  ${r.remaining} more still due: run again, or pass --limit ${r.remaining}.`);
  }
} catch (err) {
  // A quiet month with nothing to retire is the expected outcome, so only a real
  // failure should fail the GitHub job.
  console.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
