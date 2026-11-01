/**
 * The site's name, logo, colours and contact details (Dashboard → साइट सेटिङ).
 * Read through a short cache: every page, feed and print issue uses them.
 */

import { mergeSiteSettings, type SiteSettings } from "@hamronepal/shared";
import { SiteSettingsModel } from "../models";

const CACHE_MS = 60_000;
let cached: { at: number; value: SiteSettings } | null = null;

export async function getSettings(): Promise<SiteSettings> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  const doc = await SiteSettingsModel.findOne({ key: "site" }).lean();
  const value = mergeSiteSettings(doc as Partial<SiteSettings> | null);
  cached = { at: Date.now(), value };
  return value;
}

export async function saveSettings(input: Partial<SiteSettings>): Promise<SiteSettings> {
  await SiteSettingsModel.findOneAndUpdate({ key: "site" }, { $set: input }, { upsert: true, runValidators: true });
  cached = null;
  return getSettings();
}

/** For tests. */
export function clearSettingsCache() {
  cached = null;
}
