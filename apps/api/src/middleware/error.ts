import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { HttpError } from "../lib/http";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "भेटिएन।" });
}

// Express recognises error handlers by their 4 arguments.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  void _next;
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "अमान्य डाटा।", details: err.flatten() });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: "अमान्य ID।" });
  }
  if ((err as { code?: number })?.code === 11000) {
    return res.status(409).json({ error: "यो स्लग/इमेल पहिले नै प्रयोगमा छ।" });
  }
  const multerCode = (err as { code?: string })?.code;
  if (multerCode === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "फाइल साइज ५ MB भन्दा कम हुनुपर्छ।" });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "सर्भर त्रुटि भयो।" });
}
