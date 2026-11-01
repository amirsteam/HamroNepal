/**
 * Weather Service – the API proxies OpenWeatherMap so the key stays private.
 */

import { api } from "@/lib/api";
import { langQuery } from "@/lib/i18n";
import type { Lang, WeatherData } from "@/types";
export { WEATHER_CITIES, OFFICIAL_WEATHER_URL, nearestWeatherCity, findWeatherCity } from "@hamronepal/shared";

export type { WeatherData };

/** Weather for a listed city (slug), or the site's default place (Panauti). "en": English place and summary. */
export async function getWeather(city?: string, lang?: Lang): Promise<WeatherData | null> {
  try {
    return await api.get<WeatherData | null>("/weather", { city, lang: langQuery(lang) });
  } catch {
    return null;
  }
}

const CITY_KEY = "hn_weather_city";

/** The reader's chosen city, remembered in this browser ("" = default). */
export function getSavedWeatherCity(): string {
  try {
    return localStorage.getItem(CITY_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveWeatherCity(slug: string): void {
  try {
    if (slug) localStorage.setItem(CITY_KEY, slug);
    else localStorage.removeItem(CITY_KEY);
  } catch {
    // Private mode etc.: the choice just isn't remembered.
  }
}
