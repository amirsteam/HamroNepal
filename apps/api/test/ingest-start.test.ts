import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { IngestRun } from "../src/models";
import { clearDb, loginAs, makeUser, startDb, stopDb } from "./helpers";

// A GitHub token is set, so the button starts the GitHub news job.
vi.hoisted(() => {
  process.env.GITHUB_DISPATCH_TOKEN = "test-token";
  process.env.GITHUB_REPO = "owner/HamroNepal";
});

beforeAll(startDb);
afterAll(stopDb);

const fetchMock = vi.fn();
beforeEach(async () => {
  await clearDb();
  await makeUser("editor");
  await makeUser("reporter");
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("POST /api/admin/ingest/start", () => {
  it("starts the GitHub news job for an editor", async () => {
    const editor = await loginAs("editor@test.np");
    const res = await editor.post("/api/admin/ingest/start");
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ mode: "github" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.github.com/repos/owner/HamroNepal/actions/workflows/ingest.yml/dispatches");
    expect(init.headers.Authorization).toBe("Bearer test-token");
    expect(JSON.parse(init.body)).toEqual({ ref: "main", inputs: { max: "10" } });
  });

  it("refuses while a run is in progress", async () => {
    await IngestRun.create({ dryRun: false, startedAt: new Date() });
    const editor = await loginAs("editor@test.np");
    const res = await editor.post("/api/admin/ingest/start");
    expect(res.status).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("explains a bad token", async () => {
    fetchMock.mockResolvedValue(new Response("Bad credentials", { status: 401 }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const editor = await loginAs("editor@test.np");
    const res = await editor.post("/api/admin/ingest/start");
    expect(res.status).toBe(502);
    expect(res.body.error).toContain("GITHUB_DISPATCH_TOKEN");
    warn.mockRestore();
  });

  it("is not for reporters", async () => {
    const reporter = await loginAs("reporter@test.np");
    const res = await reporter.post("/api/admin/ingest/start");
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
