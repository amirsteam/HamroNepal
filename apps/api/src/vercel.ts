/**
 * Vercel entry: the `api` service in vercel.json runs the built dist/vercel.js.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "./app";
import { assertServerConfig } from "./config";
import { connectDB } from "./db";

const app = createApp();

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    assertServerConfig();
    await connectDB();
  } catch (err) {
    console.error("Startup failed:", err);
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "सेवा अस्थायी रूपमा उपलब्ध छैन।" }));
    return;
  }
  return app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
