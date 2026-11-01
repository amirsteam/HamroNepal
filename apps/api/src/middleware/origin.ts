/**
 * Cross-site request check for the cookie-authenticated API (defence in depth
 * on top of the SameSite cookie): a request that changes something and comes
 * from a page on another site is refused.
 *
 * Browsers send Origin on cross-site POST/PATCH/DELETE. Requests without it
 * (curl, server jobs, same-origin GETs) are let through; they carry no
 * victim's cookie.
 */

import type { NextFunction, Request, Response } from "express";
import { config } from "../config";
import { forbidden } from "../lib/http";

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

function allowedOrigins(req: Request): Set<string> {
  const own = `${req.protocol}://${req.get("host")}`;
  return new Set([own, config.publicSiteUrl, ...config.corsOrigins]);
}

export function sameOriginWrites(req: Request, _res: Response, next: NextFunction) {
  if (SAFE.has(req.method)) return next();
  const origin = req.get("origin");
  if (!origin) return next();
  if (origin !== "null" && allowedOrigins(req).has(origin)) return next();
  next(forbidden("अनुमति छैन।"));
}
