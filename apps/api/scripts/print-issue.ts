/**
 * Make the weekly print edition (press PDF) from the week's published news.
 *
 *   npm run print:issue -w apps/api                      # PDF in apps/api/print/, nothing saved
 *   npm run print:issue -w apps/api -- --date 2026-11-06 --html
 *   npm run print:issue -w apps/api -- --save            # upload + record the issue (next अंक)
 *
 * Options: --date YYYY-MM-DD (issue date, default today in Nepal), --days N,
 * --pages N, --out file.pdf, --html (also write the HTML), --save, --trigger cron,
 * --rgb (skip the CMYK step).
 * Needs Chrome or Edge (CHROME_PATH) and, for CMYK, Ghostscript (GS_PATH).
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { connectDB, disconnectDB } from "../src/db";
import { config } from "../src/config";
import { PrintIssue } from "../src/models";
import { bsDateString } from "../src/lib/bs";
import { buildIssue } from "../src/print/issue";
import { renderIssueHtml } from "../src/print/render";
import { FRONT_BOTTOM, FRONT_SIDE, PER_PAGE } from "../src/print/plan";
import { htmlToPdf, uploadPdf } from "../src/print/generate";
import { findGhostscript, makePressReady } from "../src/print/press";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const num = (name: string) => (value(name) ? Number(value(name)) : undefined);

const save = flag("save");
const rgb = flag("rgb");
if (!rgb && !findGhostscript()) {
  console.error("Ghostscript not found: it makes the PDF CMYK for the press. Install it (or set GS_PATH), or use --rgb.");
  process.exit(1);
}
const trigger = (value("trigger") as "cron" | "cli" | undefined) ?? "cli";

if (save && /localhost|127\.0\.0\.1/.test(config.publicSiteUrl)) {
  console.error(
    `PUBLIC_SITE_URL is ${config.publicSiteUrl}: the QR codes would point there. Set it to the live site before --save.`
  );
  process.exit(1);
}

await connectDB();
try {
  const { plan, meta, articleIds } = await buildIssue({ date: value("date"), days: num("days"), pages: num("pages") });
  const ymd = new Date(meta.issueDate.getTime() + (5 * 60 + 45) * 60_000).toISOString().slice(0, 10);
  const name = `hamronepal-${meta.number}-${ymd}`;
  console.log(
    `${meta.name}: वर्ष ${meta.volume}, अंक ${meta.number}, ${bsDateString(meta.issueDate)} (${ymd}), ${meta.pages} pages, ${plan.used.length} stories`
  );
  if (plan.front.strip) console.log(`  page 1: front strip ad "${plan.front.strip.title}"`);
  plan.pages.forEach((p) => {
    if (p.fullAd) return console.log(`  page ${p.number}: full-page ad "${p.fullAd.title}"`);
    const extras = [
      p.editorial && `editorial "${p.editorial.title}"`,
      p.halfAd && `half-page ad "${p.halfAd.title}"`,
      ...p.boxAds.map((a) => `box ad "${a.title}"`),
    ].filter(Boolean);
    console.log(`  page ${p.number} ${p.section}: ${[p.lead, ...p.stories].filter(Boolean).length} stories${extras.length ? `, ${extras.join(", ")}` : ""}`);
  });
  for (const ad of plan.unplacedAds) console.warn(`  No room for ad "${ad.title}" (${ad.placement}) in this issue.`);
  const slots = 1 + FRONT_SIDE + FRONT_BOTTOM + (meta.pages - 1) * PER_PAGE;
  if (plan.used.length < slots) {
    console.warn(`  Only ${plan.used.length} of ${slots} story slots filled: some pages will have space left. Approve more stories, or use --pages 4.`);
  }
  if (!plan.used.length) {
    console.error("No published stories in this period; nothing to print.");
    process.exitCode = 1;
  } else {
    const html = await renderIssueHtml(plan, meta, { pdf: true });
    const out = resolve(value("out") ?? `print/${name}.pdf`);
    mkdirSync(dirname(out), { recursive: true });
    if (flag("html")) {
      writeFileSync(out.replace(/\.pdf$/i, ".html"), html);
      console.log(`  HTML: ${out.replace(/\.pdf$/i, ".html")}`);
    }
    const started = Date.now();
    const chromePdf = await htmlToPdf(html);
    const title = `${meta.name} – वर्ष ${meta.volume}, अंक ${meta.number}`;
    // CMYK, black text on the black plate, trim + 3 mm bleed boxes.
    const pdf = rgb ? chromePdf : await makePressReady(chromePdf, title);
    writeFileSync(out, pdf);
    console.log(
      `  PDF: ${out} (${rgb ? "RGB" : "CMYK"}, 318 × 483 mm + 3 mm bleed, ${(pdf.length / 1024 / 1024).toFixed(1)} MB, ${((Date.now() - started) / 1000).toFixed(0)} s)`
    );

    if (save) {
      let stored: Awaited<ReturnType<typeof uploadPdf>> = null;
      try {
        stored = await uploadPdf(pdf, name);
        if (!stored) console.warn("  Cloudinary is not configured: the PDF is only on this machine.");
      } catch (err) {
        // e.g. over the plan's file-size limit: keep the local file and still record the issue.
        console.warn(`  Upload failed (${(err as Error).message}); the PDF is only at ${out}.`);
      }
      await PrintIssue.create({
        number: meta.number,
        volume: meta.volume,
        issueDate: meta.issueDate,
        issueDateBS: bsDateString(meta.issueDate),
        pages: meta.pages,
        pdfUrl: stored?.url,
        pdfPublicId: stored?.publicId,
        sizeBytes: pdf.length,
        articleIds,
        trigger,
      });
      console.log(`  Saved अंक ${meta.number}${stored ? `: ${stored.url}` : ""}`);
    }
  }
} finally {
  await disconnectDB();
}
