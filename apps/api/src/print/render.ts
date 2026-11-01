/**
 * The print edition as one HTML document: a 318 × 483 mm page per sheet
 * (the size of the paper's existing weekly). Chrome prints it to PDF; opened
 * in a browser it is the preview.
 *
 * Text is fitted to each story's box in the browser (FIT_SCRIPT): paragraphs
 * and then words are dropped until the story fits, and a QR code links to the
 * full story online instead of "continued on page …".
 */

import QRCode from "qrcode";
import { BS_WEEKDAYS, toNepaliDigits } from "@hamronepal/shared";
import { escapeXml as esc } from "../lib/http";
import { bsDateString } from "../lib/bs";
import { FLAG_PNG_DATA_URI } from "./flagImage";
import { PRINT_FONT_FACES } from "./printFonts";
import type { InnerPage, IssuePlan, PrintAd, PrintAdPlacement, PrintStory } from "./plan";

export interface IssueMeta {
  name: string;
  tagline: string;
  frequency: string;
  regNo?: string;
  price?: string;
  email?: string;
  siteUrl: string;
  number: number;
  volume: number;
  /** Start of the issue day, Nepal time. */
  issueDate: Date;
  pages: number;
}

const NPT_OFFSET_MS = (5 * 60 + 45) * 60_000;

/** A bigger copy of a web image for print (≈300 dpi at the sizes used). */
export function printImageUrl(url: string, width = 1000): string {
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    return url.replace("/upload/", `/upload/c_limit,w_${width},q_auto:good,f_jpg/`);
  }
  if (url.includes("images.pexels.com")) {
    try {
      const u = new URL(url);
      u.search = "";
      u.searchParams.set("auto", "compress");
      u.searchParams.set("w", String(width));
      return u.toString();
    } catch {
      return url;
    }
  }
  return url;
}

const qrSvg = (text: string) =>
  QRCode.toString(text, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff00" } });

/** Kicker above a headline: place and/or topic, e.g. "पनौती · समाज". */
function kicker(s: PrintStory): string {
  const bits = [s.placeName, s.topicName].filter(Boolean);
  return bits.length ? `<p class="kicker">${esc(bits.join(" · "))}</p>` : "";
}

function body(s: PrintStory, cls = "") {
  const paras = s.paragraphs.length ? s.paragraphs : [s.excerpt];
  return `<div class="body ${cls}" data-fit>${paras.map((p) => `<p>${esc(p)}</p>`).join("")}</div>`;
}

/** `width` in px ≈ 200 ppi at the printed size, enough for newsprint. */
function figure(s: PrintStory, cls: string, width = 750) {
  if (!s.imageUrl) return "";
  return `<figure class="${cls}"><img data-src="${esc(printImageUrl(s.imageUrl, width))}" data-w="${width}" alt="">${
    s.imageCredit ? `<figcaption>फोटो: ${esc(s.imageCredit)}</figcaption>` : ""
  }</figure>`;
}

/** Pixels for each print ad slot at 300 dpi. */
const AD_WIDTH: Record<PrintAdPlacement, number> = {
  "print-full": 3827,
  "print-half": 3472,
  "print-box": 1110,
  "print-strip": 3472,
};

function adFigure(ad: PrintAd, cls: string) {
  const w = AD_WIDTH[ad.placement];
  return `<figure class="ad ${cls}"><span class="ad-label">विज्ञापन</span><img data-src="${esc(
    printImageUrl(ad.imageUrl, w)
  )}" data-w="${w}" data-q="0.92" alt="${esc(ad.title)}"></figure>`;
}

function storyFoot(s: PrintStory, qr: Map<string, string>, size: "lg" | "sm" = "sm") {
  return `<div class="foot foot-${size}">
    <div class="qr">${qr.get(s.id) ?? ""}</div>
    <p>पूरा समाचार पढ्न स्क्यान गर्नुहोस्${s.sourceName ? `<br><span>स्रोत: ${esc(s.sourceName)}</span>` : ""}</p>
  </div>`;
}

/** A standard story box: headline, optional photo, fitted text, QR. */
function storyBox(s: PrintStory, qr: Map<string, string>, opts: { cls: string; cols: number; photo?: boolean }) {
  return `<article class="story ${opts.cls}">
    ${kicker(s)}
    <h3 data-fit-headline>${esc(s.title)}</h3>
    ${opts.photo !== false ? figure(s, "photo") : ""}
    <div class="cols-${opts.cols} grow">${body(s)}</div>
    ${storyFoot(s, qr)}
  </article>`;
}

function dateLine(meta: IssueMeta) {
  const nptDay = new Date(meta.issueDate.getTime() + NPT_OFFSET_MS);
  const weekday = BS_WEEKDAYS[nptDay.getUTCDay()];
  const ad = meta.issueDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    weekday: "long",
    timeZone: "Asia/Kathmandu",
  });
  return { bs: `${bsDateString(meta.issueDate)}, ${weekday}`, ad };
}

const domain = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

function frontPage(plan: IssuePlan, meta: IssueMeta, qr: Map<string, string>, siteQr: string) {
  const { lead, side, bottom } = plan.front;
  const d = dateLine(meta);
  const index = plan.pages
    .filter((p) => p.lead && !p.fullAd)
    .map(
      (p) =>
        `<li><b>पृष्ठ ${toNepaliDigits(p.number)}</b> <span class="sec">${esc(p.section)}</span> ${esc(p.lead!.title)}</li>`
    )
    .join("");

  return `<section class="page front">
  <header class="masthead">
    <div class="brand">
      <img class="flag" src="${FLAG_PNG_DATA_URI}" alt="">
      <div>
        <h1><span class="r">${esc(meta.name.split(" ")[0] ?? meta.name)}</span> <span class="b">${esc(
          meta.name.split(" ").slice(1).join(" ")
        )}</span></h1>
        <p class="tagline">${esc(meta.tagline)}<span class="freq">${esc(meta.frequency)}</span></p>
      </div>
    </div>
    <aside class="mast-box">
      ${meta.regNo ? `<p class="reg">${esc(meta.regNo)}</p>` : ""}
      <div class="mast-qr">${siteQr}</div>
      <p>अनलाइन पढ्नुहोस्<br><b>${esc(domain(meta.siteUrl))}</b></p>
      ${meta.email ? `<p class="mail">आफ्ना लेख, रचना र प्रतिक्रिया पठाउन<br><b>${esc(meta.email)}</b></p>` : ""}
    </aside>
  </header>
  <div class="infobar">
    <span>वर्ष ${toNepaliDigits(meta.volume)}</span>
    <span>अंक ${toNepaliDigits(meta.number)}</span>
    <span>${esc(d.bs)}</span>
    <span>${esc(d.ad)}</span>
    <span>${esc(domain(meta.siteUrl))}</span>
    <span>पृष्ठ ${toNepaliDigits(meta.pages)}</span>
    ${meta.price ? `<span>मूल्य रु. ${esc(toNepaliDigits(meta.price))}</span>` : ""}
  </div>

  <div class="front-grid">
    ${
      lead
        ? `<article class="story lead">
      ${kicker(lead)}
      <h2 data-fit-headline>${esc(lead.title)}</h2>
      <p class="standfirst">${esc(lead.excerpt)}</p>
      <div class="lead-row">
        ${figure(lead, "photo lead-photo", 1000)}
        <div class="cols-2 grow">${body(lead)}</div>
      </div>
      ${storyFoot(lead, qr, "lg")}
    </article>`
        : `<article class="story lead empty"><p>यस अवधिमा प्रकाशित समाचार छैनन्।</p></article>`
    }
    <div class="rail">
      ${side.map((s) => storyBox(s, qr, { cls: "side", cols: 1, photo: false })).join("")}
    </div>
    <div class="bottom">
      ${bottom.map((s) => storyBox(s, qr, { cls: "low", cols: 1 })).join("")}
    </div>
  </div>
  ${plan.front.strip ? adFigure(plan.front.strip, "ad-strip") : ""}
  ${index ? `<footer class="index"><h4>भित्री पृष्ठमा</h4><ul>${index}</ul></footer>` : ""}
</section>`;
}

function innerLead(lead: PrintStory | undefined, qr: Map<string, string>) {
  if (!lead) return `<p class="empty">यस खण्डमा यस हप्ता समाचार छैन।</p>`;
  return `<article class="story inner-lead">
    ${kicker(lead)}
    <h2 data-fit-headline>${esc(lead.title)}</h2>
    <div class="inner-lead-row">
      <div class="inner-lead-left">
        ${figure(lead, "photo inner-photo", 1250)}
        <p class="standfirst">${esc(lead.excerpt)}</p>
      </div>
      <div class="cols-2 grow">${body(lead)}</div>
    </div>
    ${storyFoot(lead, qr, "lg")}
  </article>`;
}

function cells(page: InnerPage, qr: Map<string, string>, extra = "") {
  const items = [
    ...page.stories.map((s) => storyBox(s, qr, { cls: "cell", cols: 2 })),
    ...page.boxAds.map((ad) => adFigure(ad, "ad-box cell")),
  ].slice(0, 6);
  return `<div class="cells cells-${items.length} ${extra}">${items.join("")}</div>`;
}

function editorialColumn(ed: PrintStory, meta: IssueMeta, qr: Map<string, string>) {
  return `<aside class="editorial">
    <div class="ed-head"><img src="${FLAG_PNG_DATA_URI}" alt=""><span>${esc(meta.name)}</span></div>
    <h2 class="ed-label">सम्पादकीय</h2>
    <h3 data-fit-headline>${esc(ed.title)}</h3>
    <div class="cols-1 grow">${body(ed)}</div>
    ${storyFoot(ed, qr)}
  </aside>`;
}

function innerPage(page: InnerPage, meta: IssueMeta, qr: Map<string, string>) {
  // A full-page advertisement fills the whole sheet, bleed included.
  if (page.fullAd) return `<section class="page adpage">${adFigure(page.fullAd, "ad-full")}</section>`;

  const d = dateLine(meta);
  const head = `<header class="runhead">
    <span class="pno">${toNepaliDigits(page.number)}</span>
    <span class="rh-date">${esc(d.bs)} &nbsp;|&nbsp; ${esc(d.ad)}</span>
    <span class="rh-name"><img src="${FLAG_PNG_DATA_URI}" alt="">${esc(meta.name)}</span>
  </header>
  <h2 class="section"><svg viewBox="0 0 14 17" aria-hidden="true"><path d="M1.2 1.2 L12.4 8.3 H6.2 L12.4 15.8 H1.2 Z" fill="#c8102e" stroke="#003893" stroke-width="1.4" stroke-linejoin="round"/></svg>${esc(page.section)}</h2>`;

  const content = page.editorial
    ? `<div class="with-editorial">
        ${editorialColumn(page.editorial, meta, qr)}
        <div class="ed-main">${innerLead(page.lead, qr)}${cells(page, qr, "cells-ed")}</div>
      </div>`
    : `${innerLead(page.lead, qr)}${page.halfAd ? adFigure(page.halfAd, "ad-half") : cells(page, qr)}`;

  return `<section class="page inner">${head}${content}</section>`;
}

const CSS = `
/* Trim 318 × 483 mm plus 3 mm bleed on every side. */
@page { size: 324mm 489mm; margin: 0; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: "Mukta", "Noto Sans Devanagari", sans-serif; color: #000; font-size: 9.6pt; }
@media screen { body { background: #8a8f98; padding: 12mm 0; } .page { margin: 0 auto 12mm; box-shadow: 0 6px 30px rgba(0,0,0,.35); } .page::after { content: ""; position: absolute; inset: 3mm; outline: 0.4pt dashed rgba(200,16,46,.6); pointer-events: none; } }
.page { width: 324mm; height: 489mm; padding: 14mm 15mm 15mm; background: #fff; display: flex; flex-direction: column; overflow: hidden; break-after: page; position: relative; }
h1, h2, h3, h4 { font-family: "Anek Print", "Mukta", sans-serif; margin: 0; color: #10213f; line-height: 1.22; }
p { margin: 0; }
.kicker { color: #c8102e; font-weight: 700; font-size: 9pt; margin-bottom: 1mm; }
.standfirst { font-weight: 600; font-size: 12pt; line-height: 1.4; color: #10213f; margin: 1.5mm 0 2.5mm; }
.grow { flex: 1; min-height: 0; }
.body { height: 100%; overflow: hidden; text-align: justify; line-height: 1.5; }
.body p { margin-bottom: 1.6mm; text-indent: 4mm; }
.body p:first-child { text-indent: 0; }
.cols-1 .body { column-count: 1; }
.cols-2 .body { column-count: 2; column-gap: 5mm; column-rule: 0.3pt solid #b8bcc4; }
.cols-3 .body { column-count: 3; column-gap: 5mm; column-rule: 0.3pt solid #b8bcc4; }
.cols-4 .body { column-count: 4; column-gap: 5mm; column-rule: 0.3pt solid #b8bcc4; }
figure { margin: 0 0 2mm; }
figure img { width: 100%; object-fit: cover; display: block; }
figcaption { font-size: 7pt; color: #555; margin-top: 0.8mm; }
.story { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.foot { display: flex; align-items: center; gap: 2.5mm; margin-top: 2mm; font-size: 7.5pt; color: #333; line-height: 1.3; }
.foot span { color: #666; }
.foot .qr svg { display: block; }
.foot-sm .qr svg { width: 11mm; height: 11mm; }
.foot-lg .qr svg { width: 15mm; height: 15mm; }

/* ---- front page */
.masthead { display: flex; justify-content: space-between; align-items: center; gap: 8mm; padding-bottom: 3mm; }
.brand { display: flex; align-items: center; gap: 6mm; }
.brand .flag { height: 44mm; width: auto; }
.brand h1 { font-size: 104pt; font-weight: 800; line-height: 1; letter-spacing: -0.5pt; }
.brand .r { color: #c8102e; } .brand .b { color: #003893; }
.tagline { font-size: 15pt; color: #333; margin-top: 2mm; display: flex; align-items: center; gap: 5mm; }
.freq { font-family: "Anek Print", sans-serif; font-weight: 700; font-size: 20pt; color: #fff; background: #003893; padding: 0.5mm 4mm 1mm; border-radius: 1.5mm; }
.mast-box { width: 62mm; border: 0.8pt solid #c8102e; padding: 3mm; text-align: center; font-size: 9pt; line-height: 1.35; }
.mast-box .reg { font-size: 8pt; color: #333; margin-bottom: 2mm; }
.mast-qr svg { width: 20mm; height: 20mm; margin: 0 auto 1.5mm; display: block; }
.mast-box .mail { border-top: 0.5pt solid #ddd; margin-top: 2mm; padding-top: 2mm; }
.infobar { display: flex; justify-content: space-between; background: #c8102e; color: #fff; font-weight: 600; font-size: 10.5pt; padding: 1.6mm 4mm; border-bottom: 1.4mm solid #003893; margin-bottom: 4mm; }
.front-grid { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 74mm; grid-template-rows: auto 1fr; gap: 5mm 6mm; }
.lead { grid-column: 1; grid-row: 1; border: 0.8pt solid #003893; padding: 4mm; }
.lead h2 { font-size: 40pt; font-weight: 800; max-height: 2.5em; overflow: hidden; }
/* Photo and text side by side at a fixed height: short stories don't leave a tall empty column. */
.lead-row { height: 104mm; display: grid; grid-template-columns: 58% 1fr; gap: 5mm; }
.lead-row > .grow { display: flex; flex-direction: column; min-height: 0; }
.rail { grid-column: 2; grid-row: 1 / span 2; background: #eef3fb; border-top: 1.4mm solid #003893; padding: 4mm; display: flex; flex-direction: column; gap: 4mm; min-height: 0; }
.rail .side { flex: 1 1 0; }
.rail .side + .side { border-top: 0.5pt solid #b8c6e0; padding-top: 4mm; }
.side h3 { font-size: 17pt; font-weight: 800; max-height: 3.7em; overflow: hidden; margin-bottom: 2mm; }
.bottom { grid-column: 1; grid-row: 2; display: grid; grid-template-columns: repeat(3, 1fr); gap: 5mm; min-height: 0; border-top: 0.8pt solid #10213f; padding-top: 3mm; }
.low h3, .cell h3 { font-size: 15.5pt; font-weight: 800; max-height: 2.6em; overflow: hidden; margin-bottom: 2mm; }
/* Photos: the image fills, the caption sits below it (never over the text). */
.photo { display: flex; flex-direction: column; }
.photo img { flex: 1 1 0; min-height: 0; }
.lead-photo, .inner-photo { height: 100%; margin: 0; }
.low .photo, .cell .photo { height: 34mm; flex: none; }
.index { margin-top: 4mm; border-top: 1.4mm solid #c8102e; padding-top: 2mm; display: flex; gap: 5mm; align-items: baseline; }
.index h4 { font-size: 14pt; white-space: nowrap; color: #c8102e; }
.index ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(${3}, 1fr); gap: 1mm 5mm; font-size: 9pt; }
.index li { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.index .sec { color: #c8102e; font-weight: 700; }
.empty { color: #666; font-size: 12pt; padding: 10mm; }

/* ---- advertisements (labelled; kept whole, except full pages which fill the bleed) */
.ad { margin: 0; position: relative; display: flex; flex-direction: column; min-height: 0; }
.ad img { flex: 1 1 0; min-height: 0; width: 100%; object-fit: contain; }
.ad-label { font-size: 7pt; color: #666; text-align: center; margin-bottom: 0.8mm; }
.ad-half { flex: 1; border-top: 0.8pt solid #10213f; padding-top: 2mm; }
.ad-strip { height: 52mm; flex: none; margin-top: 4mm; }
.ad-box { border: 0.5pt solid #b8bcc4; padding: 1.5mm; }
.adpage { padding: 0; }
.ad-full { height: 100%; }
.ad-full img { object-fit: cover; }
.ad-full .ad-label { position: absolute; top: 6mm; right: 7mm; background: rgba(255,255,255,.9); padding: 0.5mm 2mm; margin: 0; }

/* ---- सम्पादकीय column (page 2) */
.with-editorial { flex: 1; min-height: 0; display: grid; grid-template-columns: 80mm 1fr; gap: 6mm; }
.editorial { display: flex; flex-direction: column; min-height: 0; overflow: hidden; background: #eef3fb; border-top: 1.4mm solid #c8102e; padding: 4mm; }
.ed-head { display: flex; align-items: center; gap: 2mm; font-family: "Anek Print", sans-serif; font-weight: 800; font-size: 13pt; color: #003893; }
.ed-head img { height: 8mm; }
.ed-label { font-size: 22pt; font-weight: 800; color: #c8102e; margin: 2mm 0 2mm; border-bottom: 0.8pt solid #10213f; padding-bottom: 1mm; }
.editorial h3 { font-size: 17pt; font-weight: 800; max-height: 3.7em; overflow: hidden; margin-bottom: 2mm; }
.editorial .body { font-size: 10.2pt; }
.ed-main { display: flex; flex-direction: column; min-height: 0; }
.cells-ed { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
.cells-ed .cell:nth-child(n+3) { border-top: 0.5pt solid #b8bcc4; padding-top: 3mm; }
.cells-ed .cell:nth-child(n+4) { border-top: 0.5pt solid #b8bcc4; }

/* ---- inner pages */
.runhead { display: flex; align-items: center; justify-content: space-between; border-bottom: 0.8pt solid #10213f; padding-bottom: 2mm; font-size: 10pt; color: #333; }
.pno { font-family: "Anek Print", sans-serif; font-weight: 800; font-size: 20pt; color: #fff; background: #c8102e; min-width: 12mm; text-align: center; border-radius: 1mm; padding: 0 2mm; }
.rh-name { display: flex; align-items: center; gap: 2mm; font-family: "Anek Print", sans-serif; font-weight: 800; font-size: 16pt; color: #003893; }
.rh-name img { height: 7mm; }
h2.section { display: flex; align-items: center; gap: 3mm; font-size: 26pt; font-weight: 800; margin: 3mm 0 4mm; border-bottom: 1.4mm solid #c8102e; padding-bottom: 1.5mm; }
h2.section svg { width: 6mm; height: 7.3mm; }
.inner-lead { flex: none; border-bottom: 0.8pt solid #10213f; padding-bottom: 4mm; margin-bottom: 5mm; }
.inner-lead h2 { font-size: 32pt; font-weight: 800; max-height: 2.5em; overflow: hidden; margin-bottom: 3mm; }
.inner-lead-row { height: 104mm; display: grid; grid-template-columns: 56% 1fr; gap: 6mm; }
.inner-lead-left { display: flex; flex-direction: column; min-height: 0; }
.inner-lead-left .standfirst { margin-bottom: 0; }
.inner-lead-row > .grow { display: flex; flex-direction: column; min-height: 0; }
.cells { flex: 1; min-height: 0; display: grid; gap: 5mm 6mm; grid-template-columns: repeat(3, 1fr); grid-template-rows: 1fr 1fr; }
.cells-1 { grid-template-columns: 1fr; grid-template-rows: 1fr; }
.cells-2 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr; }
.cells-3 { grid-template-rows: 1fr; }
.cells-4 { grid-template-columns: 1fr 1fr; }
.cells .cell:nth-child(n+4) { border-top: 0.5pt solid #b8bcc4; padding-top: 3mm; }
.cells-4 .cell:nth-child(3) { border-top: 0.5pt solid #b8bcc4; padding-top: 3mm; }
`;

/**
 * Runs in the browser: shrink long headlines, then cut each story's text to
 * its box (whole paragraphs first, then words) and end it with "…".
 * Sets body[data-ready] when done, which the PDF step waits for.
 */
const FIT_SCRIPT = `
(function () {
  function over(el) { return el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1; }
  function shrinkHeadline(h) {
    var size = parseFloat(getComputedStyle(h).fontSize), min = size * 0.62;
    while (over(h) && size > min) { size *= 0.95; h.style.fontSize = size + "px"; }
  }
  function fitWords(el, p, words) {
    var lo = 0, hi = words.length;
    while (lo < hi) {
      var mid = Math.ceil((lo + hi) / 2);
      p.textContent = words.slice(0, mid).join(" ") + " …";
      if (over(el)) hi = mid - 1; else lo = mid;
    }
    if (lo === 0) { p.remove(); return false; }
    p.textContent = words.slice(0, lo).join(" ") + " …";
    return true;
  }
  function fit(el) {
    if (!over(el)) return;
    var ps = Array.prototype.slice.call(el.querySelectorAll("p"));
    var removed = null;
    while (ps.length > 1 && over(el)) { removed = ps.pop(); removed.remove(); }
    if (!over(el) && removed) {
      el.appendChild(removed);
      if (fitWords(el, removed, removed.textContent.split(/\\s+/))) { el.dataset.trimmed = "1"; return; }
    }
    var last = el.querySelector("p:last-child");
    if (last && over(el)) fitWords(el, last, last.textContent.split(/\\s+/));
    else if (last && !/…$/.test(last.textContent)) {
      last.textContent += " …";
      if (over(el)) fitWords(el, last, last.textContent.replace(/ …$/, "").split(/\\s+/));
    }
    el.dataset.trimmed = "1";
  }
  // In PDF mode (window.__HN_PRINT__) photos are fetched by the PDF step and
  // re-encoded here as JPEG at their print size: outlets' WebP/PNG photos
  // would otherwise be stored losslessly and make the PDF huge.
  var PRINT = !!window.__HN_PRINT__;
  function loadImages() {
    return Promise.all(Array.prototype.map.call(document.querySelectorAll("img[data-src]"), function (img) {
      return new Promise(function (r) {
        img.onload = img.onerror = r;
        if (PRINT) img.crossOrigin = "anonymous";
        img.src = img.dataset.src;
      });
    }));
  }
  // A photo that fails to load (e.g. the outlet refuses it) is removed, so the
  // text takes its space instead of a broken box going to the press.
  function dropIfBroken(img) {
    if (img.complete && img.naturalWidth === 0) { var f = img.closest("figure"); (f || img).remove(); }
  }
  function toJpeg(img) {
    if (!PRINT || !img.dataset.w || img.naturalWidth === 0) return Promise.resolve();
    var w = Math.min(img.naturalWidth, Number(img.dataset.w)), h = Math.round(img.naturalHeight * w / img.naturalWidth);
    try {
      var c = document.createElement("canvas"); c.width = w; c.height = h;
      var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h);
      var url = c.toDataURL("image/jpeg", Number(img.dataset.q) || 0.85);
      return new Promise(function (r) { img.onload = img.onerror = r; img.src = url; });
    } catch (e) { return Promise.resolve(); }
  }
  function waitImages() {
    return loadImages().then(function () {
      var imgs = Array.prototype.slice.call(document.querySelectorAll("img[data-src]"));
      imgs.forEach(dropIfBroken);
      return Promise.all(imgs.filter(function (i) { return i.isConnected; }).map(toJpeg));
    });
  }
  Promise.all([document.fonts ? document.fonts.ready : 0, waitImages()]).then(function () {
    document.querySelectorAll("[data-fit-headline]").forEach(shrinkHeadline);
    document.querySelectorAll("[data-fit]").forEach(fit);
    document.body.dataset.ready = "1";
  });
})();
`;

/** `pdf: true` when Chrome prints it (photos are re-encoded for a smaller file). */
export async function renderIssueHtml(plan: IssuePlan, meta: IssueMeta, opts: { pdf?: boolean } = {}): Promise<string> {
  const qr = new Map<string, string>();
  for (const s of plan.used) qr.set(s.id, await qrSvg(s.url));
  const siteQr = await qrSvg(meta.siteUrl);
  const title = `${meta.name} – अंक ${toNepaliDigits(meta.number)}`;

  return `<!doctype html>
<html lang="ne">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Mukta:wght@400;600;700&display=block" rel="stylesheet">
<style>${PRINT_FONT_FACES}${CSS}</style>
</head>
<body>
${frontPage(plan, meta, qr, siteQr)}
${plan.pages.map((p) => innerPage(p, meta, qr)).join("\n")}
${opts.pdf ? "<script>window.__HN_PRINT__ = true;</script>" : ""}
<script>${FIT_SCRIPT}</script>
</body>
</html>`;
}
