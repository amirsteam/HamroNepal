/**
 * Site settings (admin only): name, logo, colours, contact, social links,
 * English edition and print masthead. Public copy at GET /api/settings.
 */

import { Router } from "express";
import { z } from "zod";
import { getSettings, saveSettings } from "../../services/settings";

export const adminSettingsRouter = Router();

const text = (max: number) => z.string().trim().max(max);
const localized = (max: number) => z.object({ ne: text(max), en: text(max) });
/** https/http links only (never javascript:). Empty = not set. */
const webUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((u) => u === "" || /^https?:\/\/[^\s]+$/i.test(u), "http वा https लिङ्क मात्र।");
const hex = z.string().regex(/^#[0-9a-f]{6}$/i, "रङ #RRGGBB ढाँचामा हुनुपर्छ।");

const settingsInput = z.object({
  name: localized(80),
  tagline: localized(160),
  description: localized(300),
  logoUrl: webUrl,
  faviconUrl: webUrl,
  ogImageUrl: webUrl,
  showFlag: z.boolean(),
  colors: z.object({ primary: hex, secondary: hex, ink: hex }),
  contact: z.object({
    address: localized(200),
    phone: text(40),
    email: z.string().trim().max(200).email("इमेल ठेगाना मिलेन।").or(z.literal("")),
  }),
  social: z.object({ facebook: webUrl, x: webUrl, instagram: webUrl, youtube: webUrl, tiktok: webUrl }),
  englishEdition: z.boolean(),
  print: z.object({ regNo: text(120), price: text(20), email: z.string().trim().max(200).email().or(z.literal("")) }),
});

adminSettingsRouter.get("/", async (_req, res) => {
  res.json(await getSettings());
});

adminSettingsRouter.put("/", async (req, res) => {
  res.json(await saveSettings(settingsInput.parse(req.body)));
});
