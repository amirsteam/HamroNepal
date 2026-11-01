/**
 * npm run seed -w apps/api -- [--skip-verify]
 *
 * Idempotent. Adds (never overwrites editor changes to names/menus):
 *  - default topic categories, only if the database has none yet
 *  - 7 provinces, 77 districts and priority municipalities (location menus)
 *  - RSS news sources, enabled only if the feed answers
 */

import { connectDB, disconnectDB } from "../src/db";
import { Category, NewsSource } from "../src/models";
import { fetchFeed } from "../src/ingest/fetch";
import { MUNICIPALITIES, PRIORITY_DISTRICTS, PROVINCES, SOURCES, TOPICS } from "../src/seed/data";

const verify = !process.argv.includes("--skip-verify");

async function upsertLocation(doc: {
  slug: string;
  name: string;
  nameEn?: string;
  level: "province" | "district" | "municipality";
  parentId: unknown;
  aliases: string[];
  sortOrder: number;
  ingest?: boolean;
}) {
  // Place data (aliases, parent, level) is ours to keep current;
  // name/menu/ordering are editable in the dashboard, so only set on insert.
  return Category.findOneAndUpdate(
    { slug: doc.slug },
    {
      $set: {
        type: "location",
        level: doc.level,
        parentId: doc.parentId,
        aliases: doc.aliases,
        ...(doc.nameEn ? { nameEn: doc.nameEn } : {}),
      },
      $setOnInsert: {
        name: doc.name,
        sortOrder: doc.sortOrder,
        isActive: true,
        showInMenu: true,
        ingest: !!doc.ingest,
      },
    },
    { upsert: true, new: true }
  ).lean();
}

await connectDB();

// ---------------------------------------------------------------- topics
// Add missing topics by slug; existing ones (renamed or reordered in the
// dashboard) are left as they are.
const existingTopics = new Set((await Category.find({ type: "topic" }).select("slug").lean()).map((c) => c.slug));
const newTopics = TOPICS.map((t, i) => ({ ...t, type: "topic", sortOrder: i })).filter((t) => !existingTopics.has(t.slug));
if (newTopics.length) {
  await Category.insertMany(newTopics);
  console.log(`Added topic categories: ${newTopics.map((t) => t.name).join(", ")}.`);
} else {
  console.log("Topic categories already exist – left unchanged.");
}
// English names for topics that have none yet (renamed ones keep theirs).
for (const t of TOPICS) {
  await Category.updateOne({ type: "topic", slug: t.slug, nameEn: { $in: [null, ""] } }, { $set: { nameEn: t.nameEn } });
}

// ---------------------------------------------------------------- locations
let count = 0;
for (const [pi, p] of PROVINCES.entries()) {
  const province = await upsertLocation({
    slug: p.slug,
    name: p.name,
    nameEn: p.en,
    level: "province",
    parentId: null,
    aliases: [...new Set([p.name, p.en, ...p.aliases])],
    sortOrder: pi,
  });
  count++;
  for (const [di, [slug, name, en, aliases = []]] of p.districts.entries()) {
    await upsertLocation({
      slug,
      name,
      nameEn: en,
      level: "district",
      parentId: province!._id,
      aliases: [...new Set([name, en, ...aliases])],
      sortOrder: di,
      ingest: PRIORITY_DISTRICTS.includes(slug),
    });
    count++;
  }
}
for (const [mi, m] of MUNICIPALITIES.entries()) {
  const district = await Category.findOne({ slug: m.district }).lean();
  if (!district) continue;
  await upsertLocation({
    slug: m.slug,
    name: m.name,
    // The English spelling is among the aliases (e.g. "Panauti").
    nameEn: m.aliases.find((a) => /^[A-Za-z]/.test(a)),
    level: "municipality",
    parentId: district._id,
    aliases: [...new Set([m.name, ...m.aliases])],
    sortOrder: mi,
    ingest: m.priority,
  });
  count++;
}
console.log(`Location categories ready: ${count} (7 provinces, 77 districts, ${MUNICIPALITIES.length} municipalities).`);

// ---------------------------------------------------------------- sources
for (const s of SOURCES) {
  const existing = await NewsSource.findOne({ url: s.url }).lean();
  if (existing) continue;
  let isActive = true;
  let note = "added";
  if (verify) {
    try {
      const items = await fetchFeed({ name: s.name, url: s.url, kind: s.kind }, 24 * 7);
      isActive = items.length > 0;
      note = isActive ? `ok (${items.length} items)` : "no recent items – added disabled";
    } catch (err) {
      isActive = false;
      note = `unreachable – added disabled (${(err as Error).message.slice(0, 60)})`;
    }
  }
  const { location, ...fields } = s;
  const place = location ? await Category.findOne({ type: "location", slug: location }).select("_id").lean() : null;
  await NewsSource.create({ ...fields, locationId: place?._id ?? null, isActive });
  console.log(`  source ${s.name}: ${note}${place ? ` (स्थान: ${location})` : ""}`);
}

console.log("Seed complete.");
await disconnectDB();
