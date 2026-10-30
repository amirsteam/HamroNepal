/**
 * Cookie-based JWT auth with server-side role checks.
 */

import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "@hamronepal/shared";
import { config } from "../config";
import { User } from "../models";
import { forbidden, unauthorized } from "../lib/http";

export const SESSION_COOKIE = "hn_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

function secret(): string {
  if (!config.jwtSecret) throw new Error("JWT_SECRET is not configured");
  return config.jwtSecret;
}

export function issueSession(res: Response, userId: string): void {
  const token = jwt.sign({ sub: userId }, secret(), { expiresIn: SESSION_TTL_SECONDS });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}

export function clearSession(res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax",
    path: "/",
  });
}

/**
 * Attach `req.user` when a valid session cookie is present. The user is
 * re-read from the database every time so role changes and deactivation
 * take effect immediately.
 */
export async function loadUser(req: Request, _res: Response, next: NextFunction) {
  const token: string | undefined = req.cookies?.[SESSION_COOKIE];
  if (!token) return next();
  try {
    const payload = jwt.verify(token, secret()) as { sub?: string };
    if (!payload.sub) return next();
    const user = await User.findById(payload.sub).lean();
    if (user && user.isActive && !user.isSystem) {
      req.user = {
        id: String(user._id),
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
      };
    }
  } catch {
    // Invalid or expired token: treat as signed out.
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized());
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

export const isEditorOrAdmin = (user?: SessionUser) =>
  !!user && (user.role === "admin" || user.role === "editor");
