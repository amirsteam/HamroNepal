import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { DEFAULT_SITE_SETTINGS, aiDeskName, type SiteSettings } from "@hamronepal/shared";
import { app, clearDb, loginAs, makeUser, startDb, stopDb } from "./helpers";
import { clearSettingsCache } from "../src/services/settings";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  clearSettingsCache();
  await Promise.all([makeUser("admin"), makeUser("editor")]);
});

const custom = (): SiteSettings => ({
  ...DEFAULT_SITE_SETTINGS,
  name: { ne: "काभ्रे खबर", en: "Kavre Khabar" },
  tagline: { ne: "काभ्रेको आफ्नै समाचार", en: "Kavre's own news" },
  description: { ne: "काभ्रेका समाचार", en: "News from Kavre" },
  colors: { primary: "#0b6e4f", secondary: "#1d3557", ink: "#111827" },
  social: { ...DEFAULT_SITE_SETTINGS.social, facebook: "https://facebook.com/kavrekhabar" },
});

describe("site settings", () => {
  it("starts with the defaults and only lets admins change them", async () => {
    expect((await request(app).get("/api/settings")).body.name.ne).toBe(DEFAULT_SITE_SETTINGS.name.ne);

    const editor = await loginAs("editor@test.np");
    expect((await editor.put("/api/admin/settings").send(custom())).status).toBe(403);

    const admin = await loginAs("admin@test.np");
    const saved = await admin.put("/api/admin/settings").send(custom());
    expect(saved.status).toBe(200);
    expect(saved.body.name.en).toBe("Kavre Khabar");

    const pub = await request(app).get("/api/settings");
    expect(pub.body.colors.primary).toBe("#0b6e4f");
    expect(pub.body.social.facebook).toBe("https://facebook.com/kavrekhabar");
  });

  it("refuses unsafe links and malformed colours", async () => {
    const admin = await loginAs("admin@test.np");
    expect((await admin.put("/api/admin/settings").send({ ...custom(), logoUrl: "javascript:alert(1)" })).status).toBe(400);
    expect((await admin.put("/api/admin/settings").send({ ...custom(), colors: { ...custom().colors, primary: "red" } })).status).toBe(400);
  });

  it("names the RSS feed after the site", async () => {
    const admin = await loginAs("admin@test.np");
    await admin.put("/api/admin/settings").send(custom());
    const rss = await request(app).get("/rss.xml");
    expect(rss.text).toContain("<title>काभ्रे खबर</title>");
    expect(rss.text).toContain("<description>काभ्रेका समाचार</description>");
  });

  it("builds the AI desk byline from the site name", () => {
    expect(aiDeskName("काभ्रे खबर")).toBe("काभ्रे खबर AI डेस्क");
  });
});
