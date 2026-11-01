/**
 * Site settings: the public copy (every page) and the admin form.
 */

import { api } from "@/lib/api";
import { mergeSiteSettings, type SiteSettings } from "@hamronepal/shared";

export type { SiteSettings };

export const getSiteSettings = async () => mergeSiteSettings(await api.get<SiteSettings>("/settings"));

export const getSettingsAdmin = async () => mergeSiteSettings(await api.get<SiteSettings>("/admin/settings"));

export const saveSiteSettings = async (s: SiteSettings) => mergeSiteSettings(await api.put<SiteSettings>("/admin/settings", s));
