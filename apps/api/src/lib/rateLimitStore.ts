/**
 * A store for express-rate-limit that keeps counts in MongoDB.
 *
 * The default store counts in memory, so on Vercel every running copy of the
 * API has its own count and a limit of 10 logins really allows 10 per copy.
 * This one is shared. Use it where the limit protects something (logins, AI
 * spend); plain counters such as page views can stay in memory.
 */

import type { ClientRateLimitInfo, Options, Store } from "express-rate-limit";
import { RateLimitHit } from "../models";

export class MongoRateLimitStore implements Store {
  /** Keys from different limiters never collide. */
  readonly prefix: string;
  readonly localKeys = false;
  private windowMs = 60_000;

  constructor(name: string) {
    this.prefix = `${name}:`;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    const doc = await RateLimitHit.findById(this.prefix + key).lean();
    if (!doc || doc.expiresAt <= new Date()) return undefined;
    return { totalHits: doc.hits, resetTime: doc.expiresAt };
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const now = new Date();
    const live = { $gt: ["$expiresAt", now] };
    // One atomic update: add a hit to a live window, or start a new window
    // (a new client, or one whose window has run out but not yet been removed).
    const doc = await RateLimitHit.collection.findOneAndUpdate(
      { _id: this.prefix + key } as never,
      [
        {
          $set: {
            hits: { $cond: [live, { $add: ["$hits", 1] }, 1] },
            expiresAt: { $cond: [live, "$expiresAt", new Date(now.getTime() + this.windowMs)] },
          },
        },
      ],
      { upsert: true, returnDocument: "after" }
    );
    return { totalHits: doc?.hits ?? 1, resetTime: doc?.expiresAt };
  }

  async decrement(key: string): Promise<void> {
    await RateLimitHit.updateOne(
      { _id: this.prefix + key, expiresAt: { $gt: new Date() }, hits: { $gt: 0 } },
      { $inc: { hits: -1 } }
    );
  }

  async resetKey(key: string): Promise<void> {
    await RateLimitHit.deleteOne({ _id: this.prefix + key });
  }
}
