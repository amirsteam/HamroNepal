import { findWeatherCity, type WeatherData } from "@hamronepal/shared";
import { config } from "../config";

/** OpenWeather refreshes about every 10 minutes; don't keep it longer. */
export const WEATHER_CACHE_SECONDS = 600;
const CACHE_MS = WEATHER_CACHE_SECONDS * 1000;
/** Per place, so each city costs at most one OpenWeather call per 10 minutes. */
const cache = new Map<string, { at: number; data: WeatherData | null }>();

/** OpenWeather condition codes: https://openweathermap.org/weather-conditions */
export function mapCondition(id: number): WeatherData["condition"] {
  if (id >= 200 && id < 300) return "stormy";
  if (id >= 300 && id < 600) return "rainy";
  if (id >= 600 && id < 700) return "snowy";
  if (id >= 700 && id < 800) return "foggy";
  if (id === 800) return "sunny";
  if (id === 801 || id === 802) return "partly-cloudy"; // few (11–25%) / scattered (25–50%)
  return "cloudy"; // broken (51–84%) / overcast (85–100%)
}

/** The condition in Nepali, as readers would say it. */
export function nepaliSummary(id: number): string {
  if (id >= 200 && id < 300) return "मेघगर्जनसहित वर्षा";
  if (id >= 300 && id < 400) return "सिमसिमे पानी";
  if (id === 500) return "हल्का वर्षा";
  if (id === 501) return "मध्यम वर्षा";
  if (id > 501 && id < 600) return "भारी वर्षा";
  if (id >= 600 && id < 700) return "हिमपात";
  if (id === 701) return "तुवाँलो";
  if (id === 711) return "धुवाँ";
  if (id === 721) return "धुम्मिएको";
  if (id === 741) return "हुस्सु";
  if (id >= 700 && id < 800) return "धुलो/धुवाँ";
  if (id === 800) return "सफा आकाश";
  if (id === 801) return "थोरै बादल";
  if (id === 802) return "आंशिक बादल";
  if (id === 803) return "बादल लागेको";
  return "पूर्ण बादल";
}

/**
 * Current weather for a listed city (WEATHER_CITIES), or for the configured
 * default place (WEATHER_LAT/LON/LABEL, Panauti) when none or an unknown one
 * is asked for. Cached 15 minutes.
 */
export async function getWeather(citySlug?: string): Promise<WeatherData | null> {
  if (!config.weather.apiKey) return null;
  const city = findWeatherCity(citySlug);
  const place = city
    ? { key: city.slug, lat: city.lat, lon: city.lon, label: city.name }
    : { key: "", lat: config.weather.lat, lon: config.weather.lon, label: config.weather.label };

  const hit = cache.get(place.key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${place.lat}&lon=${place.lon}&appid=${config.weather.apiKey}&units=metric`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error(`Weather API ${res.status}`);
    const data = await res.json();
    const id: number = data.weather?.[0]?.id ?? 800;
    const icon: string = data.weather?.[0]?.icon ?? "";
    const result: WeatherData = {
      temp: Math.round(data.main.temp),
      condition: mapCondition(id),
      // Icon codes end in "d" (day) or "n" (night).
      isDay: !icon.endsWith("n"),
      summary: nepaliSummary(id),
      description: data.weather?.[0]?.description ?? "",
      icon,
      location: place.label,
      city: place.key,
      humidity: data.main.humidity,
      feelsLike: Math.round(data.main.feels_like),
    };
    cache.set(place.key, { at: Date.now(), data: result });
    return result;
  } catch (err) {
    console.warn("Weather fetch failed:", (err as Error).message);
    cache.set(place.key, { at: Date.now(), data: null });
    return null;
  }
}
