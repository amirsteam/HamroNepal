/**
 * Site settings (name, logo, colours, contact) from Dashboard → साइट सेटिङ.
 *
 * Cached in the browser so returning readers see the right colours at once
 * (index.html applies the cached colours before the page draws), then
 * refreshed from the API. Colours are CSS variables: every Tailwind colour
 * utility (text-primary, bg-secondary…) follows them.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_SITE_SETTINGS, darken, mergeSiteSettings, type SiteSettings } from "@hamronepal/shared";
import { getSiteSettings } from "@/services/settings.service";

export const SETTINGS_CACHE_KEY = "hn_site_settings";

function readCache(): SiteSettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    return raw ? mergeSiteSettings(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeCache(s: SiteSettings) {
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(s));
  } catch {
    // Private mode: settings still apply, just not cached.
  }
}

/** Colours, tab icon and browser theme colour from the settings. */
export function applyTheme(s: SiteSettings) {
  const root = document.documentElement.style;
  root.setProperty("--color-primary", s.colors.primary);
  root.setProperty("--color-primary-dark", darken(s.colors.primary, 0.2));
  root.setProperty("--color-secondary", s.colors.secondary);
  root.setProperty("--color-secondary-dark", darken(s.colors.secondary, 0.25));
  root.setProperty("--color-ink", s.colors.ink);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", s.colors.primary);
  if (s.faviconUrl) {
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (icon) {
      icon.href = s.faviconUrl;
      icon.removeAttribute("type");
    }
  }
}

const SettingsContext = createContext<{ settings: SiteSettings; update: (s: SiteSettings) => void }>({
  settings: DEFAULT_SITE_SETTINGS,
  update: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(() => readCache() ?? DEFAULT_SITE_SETTINGS);

  useEffect(() => applyTheme(settings), [settings]);

  useEffect(() => {
    getSiteSettings()
      .then((s) => {
        setSettings(s);
        writeCache(s);
      })
      .catch(() => {}); // keep the cached (or default) settings
  }, []);

  const update = (s: SiteSettings) => {
    setSettings(s);
    writeCache(s);
  };
  return <SettingsContext.Provider value={{ settings, update }}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext).settings;
/** After an admin saves: show the new settings everywhere at once. */
export const useUpdateSettings = () => useContext(SettingsContext).update;
