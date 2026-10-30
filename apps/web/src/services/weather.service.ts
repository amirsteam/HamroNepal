/**
 * Weather Service – the API proxies OpenWeatherMap so the key stays private.
 */

import { api } from "@/lib/api";
import type { WeatherData } from "@/types";

export type { WeatherData };

export async function getWeather(): Promise<WeatherData | null> {
  try {
    return await api.get<WeatherData | null>("/weather");
  } catch {
    return null;
  }
}

export function getFallbackWeather(): WeatherData {
  return {
    temp: 20,
    condition: "sunny",
    description: "clear sky",
    icon: "01d",
    location: "पनौती",
    humidity: 50,
    feelsLike: 20,
  };
}
