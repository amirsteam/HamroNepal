/**
 * Make Chrome's RGB PDF press-ready:
 *
 * 1. Vector colours (text, rules, QR codes) are rewritten from RGB to CMYK
 *    here, so black and grey text sit on the black plate only (sharp small
 *    type on newsprint) and the brand colours get fixed ink values.
 * 2. Ghostscript converts the photos to CMYK (PRINT_ICC_PROFILE if the press
 *    gives one, e.g. a newsprint profile; otherwise Ghostscript's default).
 * 3. TrimBox (318 × 483 mm) and BleedBox (3 mm more on each side) are set.
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PDFArray, PDFDocument, PDFName, PDFRawStream, PDFRef, decodePDFRawStream } from "pdf-lib";
import { config } from "../config";

export const TRIM_MM = { width: 318, height: 483 };
export const BLEED_MM = 3;
export const PT_PER_MM = 72 / 25.4;
/** Newsprint takes at most about 240% total ink. */
const MAX_INK = 2.4;

type CMYK = [number, number, number, number];

/** Site colours with ink values chosen for print rather than computed. */
const BRAND: Array<{ rgb: [number, number, number]; cmyk: CMYK }> = [
  { rgb: [0xc8, 0x10, 0x2e], cmyk: [0, 1, 0.8, 0.1] }, // flag crimson
  { rgb: [0xa0, 0x0d, 0x25], cmyk: [0, 1, 0.8, 0.35] }, // dark crimson
  { rgb: [0x00, 0x38, 0x93], cmyk: [1, 0.8, 0, 0.2] }, // flag blue
  { rgb: [0x10, 0x21, 0x3f], cmyk: [0.9, 0.7, 0.2, 0.55] }, // headline navy (2.35 total)
  { rgb: [0xee, 0xf3, 0xfb], cmyk: [0.06, 0.02, 0, 0] }, // rail tint
];

const round = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 1000) / 1000;

/** RGB (0–1) to CMYK (0–1). Greys and black use the black plate only. */
export function rgbToCmyk(r: number, g: number, b: number): CMYK {
  const brand = BRAND.find(({ rgb }) => rgb.every((v, i) => Math.abs(v / 255 - [r, g, b][i]) < 0.01));
  if (brand) return brand.cmyk;
  if (Math.max(r, g, b) - Math.min(r, g, b) < 0.03) {
    // Near-black is printed solid: a 90% tint is a dot screen, fuzzy for small text.
    const k = 1 - (r + g + b) / 3;
    return [0, 0, 0, k >= 0.85 ? 1 : round(k)];
  }
  const k = 1 - Math.max(r, g, b);
  let [c, m, y] = [r, g, b].map((v) => (1 - v - k) / (1 - k));
  const total = c + m + y + k;
  if (total > MAX_INK) {
    const scale = (MAX_INK - k) / (c + m + y);
    [c, m, y] = [c * scale, m * scale, y * scale];
  }
  return [round(c), round(m), round(y), round(k)];
}

/** Rewrite "r g b rg" (fill) and "r g b RG" (stroke) in a content stream as CMYK "k"/"K". */
export function rgbOperatorsToCmyk(content: string): string {
  return content.replace(
    /(^|\s)(\d*\.?\d+)\s+(\d*\.?\d+)\s+(\d*\.?\d+)\s+(rg|RG)(?=\s|$)/g,
    (_all, pre: string, r: string, g: string, b: string, op: string) =>
      `${pre}${rgbToCmyk(Number(r), Number(g), Number(b)).join(" ")} ${op === "rg" ? "k" : "K"}`
  );
}

async function rewriteVectorColours(pdf: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdf);
  for (const page of doc.getPages()) {
    const contents = page.node.get(PDFName.of("Contents"));
    if (!contents) continue;
    const refs = contents instanceof PDFArray ? contents.asArray() : [contents];
    const fresh = refs.map((ref) => {
      const stream = doc.context.lookup(ref as PDFRef);
      if (!(stream instanceof PDFRawStream)) return ref;
      const text = Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1");
      return doc.context.register(doc.context.flateStream(Buffer.from(rgbOperatorsToCmyk(text), "latin1")));
    });
    page.node.set(PDFName.of("Contents"), fresh.length === 1 ? fresh[0] : doc.context.obj(fresh));
  }
  return doc.save({ useObjectStreams: false });
}

async function setPrintBoxes(pdf: Uint8Array, title: string): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdf);
  // Exactly 318 × 483 mm, centred: Chrome rounds the page to whole points.
  const trimW = TRIM_MM.width * PT_PER_MM;
  const trimH = TRIM_MM.height * PT_PER_MM;
  for (const page of doc.getPages()) {
    const { width, height } = page.getMediaBox();
    page.setBleedBox(0, 0, width, height);
    page.setTrimBox((width - trimW) / 2, (height - trimH) / 2, trimW, trimH);
  }
  doc.setTitle(title);
  doc.setProducer("हाम्रो नेपाल print edition (Chrome + Ghostscript)");
  return doc.save({ useObjectStreams: false });
}

export function findGhostscript(): string | null {
  if (config.print.gsPath) return existsSync(config.print.gsPath) ? config.print.gsPath : null;
  for (const name of ["gs", "gswin64c"]) {
    if (spawnSync(name, ["--version"], { stdio: "ignore" }).status === 0) return name;
  }
  const roots = [path.join(process.env.LOCALAPPDATA ?? "", "Programs", "gs"), "C:/Program Files/gs"];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const version of readdirSync(root).sort().reverse()) {
      const exe = path.join(root, version, "bin", "gswin64c.exe");
      if (existsSync(exe)) return exe;
    }
  }
  return null;
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`Ghostscript failed (${code}): ${err.slice(0, 400)}`))));
  });
}

/** CMYK + trim/bleed boxes. Throws if Ghostscript is missing. */
export async function makePressReady(rgbPdf: Buffer, title: string): Promise<Buffer> {
  const gs = findGhostscript();
  if (!gs) throw new Error("Ghostscript not found (needed for CMYK). Install it or set GS_PATH; or use --rgb.");

  const cmykVectors = await rewriteVectorColours(rgbPdf);
  const dir = mkdtempSync(path.join(tmpdir(), "hn-print-"));
  try {
    const input = path.join(dir, "in.pdf");
    const output = path.join(dir, "out.pdf");
    writeFileSync(input, cmykVectors);
    await run(gs, [
      "-dSAFER",
      "-dBATCH",
      "-dNOPAUSE",
      "-dQUIET",
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      // Photos (still RGB) become CMYK; the vectors are CMYK already and stay as set.
      "-sColorConversionStrategy=CMYK",
      "-sProcessColorModel=DeviceCMYK",
      ...(config.print.iccProfile ? [`-sOutputICCProfile=${config.print.iccProfile}`] : []),
      "-dAutoRotatePages=/None",
      "-dAutoFilterColorImages=false",
      "-dColorImageFilter=/DCTEncode",
      "-dDownsampleColorImages=false",
      "-dJPEGQ=90",
      `-sOutputFile=${output}`,
      input,
    ]);
    return Buffer.from(await setPrintBoxes(readFileSync(output), title));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
