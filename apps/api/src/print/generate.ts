/**
 * Print the issue HTML to a press PDF with an installed Chrome or Edge
 * (puppeteer-core downloads no browser). Used by the CLI and the weekly
 * GitHub job; not by the web server, which has no browser on Vercel.
 */

import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";
import type { UploadApiResponse } from "cloudinary";
import { config } from "../config";
import { cloudinary, cloudinaryReady } from "../lib/cloudinary";
import { USER_AGENT } from "../ingest/agent";

const BROWSERS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

export function findBrowser(): string {
  const found = [config.print.chromePath, ...BROWSERS].find((p) => p && existsSync(p));
  if (!found) throw new Error("Chrome or Edge not found. Set CHROME_PATH to the browser's executable.");
  return found;
}

export async function htmlToPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    executablePath: findBrowser(),
    headless: true,
    args: ["--no-sandbox", "--font-render-hinting=none"],
  });
  try {
    const page = await browser.newPage();
    // Photos are fetched here and handed to the page with CORS allowed, so the
    // page script may re-encode them as JPEG (a canvas refuses foreign images).
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const url = req.url();
      if (req.resourceType() !== "image" || !/^https?:/.test(url)) return void req.continue();
      fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(20_000) })
        .then(async (res) => {
          if (!res.ok) return req.respond({ status: res.status, body: "" });
          return req.respond({
            status: 200,
            contentType: res.headers.get("content-type") ?? "image/jpeg",
            headers: { "Access-Control-Allow-Origin": "*" },
            body: Buffer.from(await res.arrayBuffer()),
          });
        })
        .catch(() => req.abort());
    });
    // Fit the text in the same layout the PDF uses.
    await page.emulateMediaType("print");
    // The page script waits for fonts and photos itself, then sets data-ready.
    await page.setContent(html, { waitUntil: "load", timeout: 120_000 });
    await page.waitForFunction('document.body.dataset.ready === "1"', { timeout: 120_000 });
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

/** Store the PDF on Cloudinary (as a raw file, kept as-is). */
export async function uploadPdf(pdf: Buffer, name: string): Promise<{ url: string; publicId: string } | null> {
  if (!cloudinaryReady) return null;
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { resource_type: "raw", folder: "hamronepal/print", public_id: `${name}.pdf`, overwrite: true },
        (err, res) => (err || !res ? reject(err ?? new Error("Upload failed")) : resolve(res))
      )
      .end(pdf);
  });
  return { url: result.secure_url, publicId: result.public_id };
}
