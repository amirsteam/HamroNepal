import type { WeatherData } from "@hamronepal/shared";
import { config } from "../config";

const CACHE_MS = 15 * 60 * 1000;
let cached: { at: number; data: WeatherData | null } | null = null;

function mapCondition(id: number): WeatherData["condition"] {
  if (id >= 200 && id < 600) return "rainy";
  if (id >= 600 && id < 700) return "snowy";
  if (id >= 700 && id < 800) return "foggy";
  if (id === 800) return "sunny";
  return "cloudy";
}

/** Current weather for the configured town (default: Panauti), cached 15 min. */
export async function getWeather(): Promise<WeatherData | null> {
  if (!config.weather.apiKey) return null;
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.data;

  try {
    const { lat, lon, apiKey, label } = config.weather;
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error(`Weather API ${res.status}`);
    const data = await res.json();
    const result: WeatherData = {
      temp: Math.round(data.main.temp),
      condition: mapCondition(data.weather?.[0]?.id ?? 800),
      description: data.weather?.[0]?.description ?? "",
      icon: data.weather?.[0]?.icon ?? "",
      location: label,
      humidity: data.main.humidity,
      feelsLike: Math.round(data.main.feels_like),
    };
    cached = { at: Date.now(), data: result };
    return result;
  } catch (err) {
    console.warn("Weather fetch failed:", (err as Error).message);
    cached = { at: Date.now(), data: null };
    return null;
  }
}
