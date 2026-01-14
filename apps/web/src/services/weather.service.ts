/**
 * Weather Service
 *
 * Fetches real-time weather data from OpenWeatherMap API.
 * Location: Panauti, Nepal
 */

const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const PANAUTI_COORDS = { lat: 27.5846, lon: 85.5147 }; // Panauti, Kavrepalanchok

export interface WeatherData {
  temp: number;
  condition: "sunny" | "cloudy" | "rainy" | "snowy" | "foggy";
  description: string;
  icon: string;
  location: string;
  humidity: number;
  feelsLike: number;
}

// Map OpenWeatherMap weather codes to our condition types
function mapWeatherCondition(weatherId: number): WeatherData["condition"] {
  // Weather condition codes: https://openweathermap.org/weather-conditions
  if (weatherId >= 200 && weatherId < 600) {
    return "rainy"; // Thunderstorm, Drizzle, Rain
  }
  if (weatherId >= 600 && weatherId < 700) {
    return "snowy"; // Snow
  }
  if (weatherId >= 700 && weatherId < 800) {
    return "foggy"; // Atmosphere (mist, fog, haze)
  }
  if (weatherId === 800) {
    return "sunny"; // Clear sky
  }
  return "cloudy"; // Clouds (801-804)
}

/**
 * Fetch current weather for Panauti, Nepal
 */
export async function getWeather(): Promise<WeatherData | null> {
  if (!OPENWEATHER_API_KEY) {
    console.warn("OpenWeather API key not configured");
    return null;
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${PANAUTI_COORDS.lat}&lon=${PANAUTI_COORDS.lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      temp: Math.round(data.main.temp),
      condition: mapWeatherCondition(data.weather[0].id),
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      location: "पनौती",
      humidity: data.main.humidity,
      feelsLike: Math.round(data.main.feels_like),
    };
  } catch (error) {
    console.error("Failed to fetch weather:", error);
    return null;
  }
}

/**
 * Get fallback weather data when API is unavailable
 */
export function getFallbackWeather(): WeatherData {
  return {
    temp: 18,
    condition: "sunny",
    description: "Clear sky",
    icon: "01d",
    location: "पनौती",
    humidity: 60,
    feelsLike: 18,
  };
}
