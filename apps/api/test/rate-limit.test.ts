// The shared rate-limit store: one count across every running copy of the API.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import express from "express";
import rateLimit from "express-rate-limit";
import request from "supertest";
import { MongoRateLimitStore } from "../src/lib/rateLimitStore";
import { RateLimitHit } from "../src/models";
import { clearDb, startDb, stopDb } from "./helpers";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

/** One "server": its own app and limiter, like a separate Vercel instance. */
function instance(limit = 3) {
  const app = express();
  app.use(rateLimit({ windowMs: 60_000, limit, store: new MongoRateLimitStore("t"), legacyHeaders: false }));
  app.get("/", (_req, res) => res.send("ok"));
  return app;
}

describe("MongoRateLimitStore", () => {
  it("counts one client across separate instances", async () => {
    const a = instance();
    const b = instance();
    expect((await request(a).get("/")).status).toBe(200);
    expect((await request(b).get("/")).status).toBe(200);
    expect((await request(a).get("/")).status).toBe(200);
    expect((await request(b).get("/")).status).toBe(429);
  });

  it("starts a new window once the old one has run out", async () => {
    const a = instance(1);
    expect((await request(a).get("/")).status).toBe(200);
    expect((await request(a).get("/")).status).toBe(429);
    // MongoDB removes expired rows up to a minute late; the store must not wait for that.
    await RateLimitHit.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await request(a).get("/")).status).toBe(200);
  });

  it("counts every hit when many arrive at once", async () => {
    const store = new MongoRateLimitStore("burst");
    store.init({ windowMs: 60_000 } as never);
    await Promise.all(Array.from({ length: 20 }, () => store.increment("ip")));
    expect((await store.get("ip"))?.totalHits).toBe(20);
    await store.decrement("ip");
    expect((await store.get("ip"))?.totalHits).toBe(19);
    await store.resetKey("ip");
    expect(await store.get("ip")).toBeUndefined();
  });
});
