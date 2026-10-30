import { Types } from "mongoose";

/** An error that maps directly to an HTTP response. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export const badRequest = (msg: string, details?: unknown) => new HttpError(400, msg, details);
export const unauthorized = (msg = "लगइन आवश्यक छ।") => new HttpError(401, msg);
export const forbidden = (msg = "यो कार्य गर्न अनुमति छैन।") => new HttpError(403, msg);
export const notFound = (msg = "भेटिएन।") => new HttpError(404, msg);

export function isObjectId(value: unknown): value is string {
  return typeof value === "string" && Types.ObjectId.isValid(value) && /^[a-f0-9]{24}$/i.test(value);
}

/** Read a bounded integer from a query string value. */
export function intParam(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/**
 * Convert a lean Mongo document to the API shape: `_id` → `$id`,
 * `createdAt`/`updatedAt` → `$createdAt`/`$updatedAt`.
 */
export function toApi<T extends Record<string, unknown>>(doc: T | null | undefined) {
  if (!doc) return null;
  const { _id, __v, createdAt, updatedAt, passwordHash, ...rest } = doc as Record<string, unknown>;
  void __v;
  void passwordHash;
  return {
    $id: String(_id),
    $createdAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt,
    $updatedAt: updatedAt instanceof Date ? updatedAt.toISOString() : updatedAt,
    ...rest,
  };
}

export function toApiList<T extends Record<string, unknown>>(docs: T[]) {
  return docs.map((d) => toApi(d)!);
}

export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
