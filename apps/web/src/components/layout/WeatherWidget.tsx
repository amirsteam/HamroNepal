/**
 * Header weather: current weather for a city the reader picks (remembered in
 * this browser), or the nearest listed city to their location. The weather
 * itself links to the official forecast (DHM, Nepal).
 */

import { useEffect, useState, type ReactNode } from "react";
import type { WeatherData } from "@/types";
import {
  OFFICIAL_WEATHER_URL,
  WEATHER_CITIES,
  getSavedWeatherCity,
  getWeather,
  nearestWeatherCity,
  saveWeatherCity,
} from "@/services/weather.service";
import { toNepaliDigits } from "@/lib/bs-date";
import { m } from "motion/react";

/** The new reading fades in when the city changes. */
const fadeIn = { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } } as const;

const MY_LOCATION = "__here";

/** Sun or moon behind a cloud (partly cloudy). */
function PartlyCloudy({ isDay, className }: { isDay: boolean; className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      {isDay ? (
        <circle cx="8" cy="7.5" r="4.5" fill="#eab308" />
      ) : (
        <path d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" fill="#94a3b8" transform="translate(1 0) scale(0.6)" />
      )}
      <path d="M4.5 9.75a6 6 0 0111.573-2.226 3.75 3.75 0 014.133 4.303A4.5 4.5 0 0118 20.25H6.75a5.25 5.25 0 01-2.23-10.004 6.072 6.072 0 01-.02-.496z" fill="#9ca3af" transform="translate(4.5 5) scale(0.82)" />
    </svg>
  );
}

/**
 * Icon for the reported condition. "sunny" is a clear sky: a moon at night.
 * Anything unknown shows a cloud, never a sun.
 */
export function WeatherIcon({
  condition,
  isDay = true,
  className = "w-6 h-6",
}: {
  condition: WeatherData["condition"];
  isDay?: boolean;
  className?: string;
}) {
  const icons: Record<WeatherData["condition"], ReactNode> = {
    sunny: isDay ? (
      <svg className={`${className} text-yellow-500`} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
      </svg>
    ) : (
      <svg className={`${className} text-slate-400`} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" />
      </svg>
    ),
    "partly-cloudy": <PartlyCloudy isDay={isDay} className={className} />,
    cloudy: (
      <svg className={`${className} text-gray-400`} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fillRule="evenodd" d="M4.5 9.75a6 6 0 0111.573-2.226 3.75 3.75 0 014.133 4.303A4.5 4.5 0 0118 20.25H6.75a5.25 5.25 0 01-2.23-10.004 6.072 6.072 0 01-.02-.496z" clipRule="evenodd" />
      </svg>
    ),
    rainy: (
      <svg className={`${className} text-blue-500`} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fillRule="evenodd" d="M4.5 9.75a6 6 0 0111.573-2.226 3.75 3.75 0 014.133 4.303A4.5 4.5 0 0118 20.25H6.75a5.25 5.25 0 01-2.23-10.004 6.072 6.072 0 01-.02-.496zM9 13.5a.75.75 0 00-.75.75v2.25a.75.75 0 001.5 0v-2.25A.75.75 0 009 13.5zm3.75.75a.75.75 0 011.5 0v2.25a.75.75 0 01-1.5 0v-2.25zm4.5-.75a.75.75 0 00-.75.75v2.25a.75.75 0 001.5 0v-2.25a.75.75 0 00-.75-.75z" clipRule="evenodd" />
      </svg>
    ),
    stormy: (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.5 9.75a6 6 0 0111.573-2.226 3.75 3.75 0 014.133 4.303A4.5 4.5 0 0118 20.25H6.75a5.25 5.25 0 01-2.23-10.004 6.072 6.072 0 01-.02-.496z" fill="#6b7280" transform="translate(0 -2)" />
        <path d="M13 12.5l-3 4.5h3l-2 5" fill="none" stroke="#eab308" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    snowy: (
      <svg className={`${className} text-cyan-400`} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2l1.09 3.41L16.5 4.5l-.91 3.41L19 9l-3.41 1.09.91 3.41-3.41-.91L12 16l-1.09-3.41L7.5 13.5l.91-3.41L5 9l3.41-1.09-.91-3.41 3.41.91L12 2z" />
      </svg>
    ),
    foggy: (
      <svg className={`${className} text-gray-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeWidth="2" d="M4 8h16M4 12h16M4 16h12" />
      </svg>
    ),
  };
  return <>{icons[condition] ?? icons.cloudy}</>;
}

/** One weather state for the whole header (it shows the weather twice: phone and desktop). */
export function useWeather() {
  const [city, setCity] = useState(getSavedWeatherCity);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getWeather(city || undefined).then((w) => {
      if (cancelled) return;
      setWeather(w);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [city]);

  function choose(slug: string) {
    setLocateError(null);
    if (slug !== MY_LOCATION) {
      saveWeatherCity(slug);
      setCity(slug);
      return;
    }
    if (!navigator.geolocation) {
      setLocateError("यो ब्राउजरमा स्थान पत्ता लगाउन मिल्दैन।");
      return;
    }
    // The position stays in the browser: only the nearest listed city is used.
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = nearestWeatherCity(pos.coords.latitude, pos.coords.longitude);
        saveWeatherCity(nearest.slug);
        setCity(nearest.slug);
        setLocating(false);
      },
      () => {
        setLocateError("स्थान पत्ता लाग्न सकेन। सूचीबाट सहर छान्नुहोस्।");
        setLocating(false);
      },
      { timeout: 10_000, maximumAge: 30 * 60_000 }
    );
  }

  return { city, weather, loading: loading || locating, locateError, choose };
}

type WeatherState = ReturnType<typeof useWeather>;

function CityPicker({ state, id, className = "" }: { state: WeatherState; id: string; className?: string }) {
  return (
    <>
      <label htmlFor={id} className="sr-only">
        मौसम हेर्ने सहर
      </label>
      <select
        id={id}
        value={state.city}
        onChange={(e) => state.choose(e.target.value)}
        className={`bg-transparent border border-gray-200 rounded px-1 py-0.5 text-gray-600 hover:border-gray-400 cursor-pointer ${className}`}
      >
        <option value="">{WEATHER_CITIES[0].name} (पूर्वनिर्धारित)</option>
        <option value={MY_LOCATION}>📍 मेरो स्थान</option>
        {WEATHER_CITIES.slice(1).map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
    </>
  );
}

const linkProps = {
  href: OFFICIAL_WEATHER_URL,
  target: "_blank",
  rel: "noopener noreferrer",
  title: "आधिकारिक मौसम पूर्वानुमान (जल तथा मौसम विज्ञान विभाग)",
} as const;

/** Small version for the phone header bar. */
export function WeatherCompact({ state }: { state: WeatherState }) {
  const { weather, loading } = state;
  return (
    <div className="flex items-center gap-1">
      <a {...linkProps} className="flex items-center gap-1 hover:text-primary">
        {weather && !loading ? (
          <m.span key={`${weather.city}-${weather.temp}`} className="flex items-center gap-1" {...fadeIn}>
            <WeatherIcon condition={weather.condition} isDay={weather.isDay} className="w-4 h-4" />
            <span className="font-semibold">{toNepaliDigits(weather.temp)}°C</span>
            {weather.summary && <span className="sr-only">, {weather.summary}</span>}
          </m.span>
        ) : (
          <span>{loading ? "…" : "मौसम"}</span>
        )}
      </a>
      <CityPicker state={state} id="weather-city-mobile" className="text-xs max-w-[6.5rem]" />
    </div>
  );
}

/** Large version for the desktop header. */
export function WeatherFull({ state }: { state: WeatherState }) {
  const { weather, loading, locateError } = state;
  return (
    <div className="inline-flex flex-col items-end gap-1">
      <a {...linkProps} className="inline-flex items-center gap-3 group">
        {weather && !loading ? (
          <m.span key={`${weather.city}-${weather.temp}`} className="inline-flex items-center gap-3" {...fadeIn}>
            <WeatherIcon condition={weather.condition} isDay={weather.isDay} className="w-10 h-10" />
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-800 group-hover:text-primary">
                {toNepaliDigits(weather.temp)}°C
                {weather.summary && <span className="ml-2 text-sm font-medium text-gray-600">{weather.summary}</span>}
              </p>
              <p className="text-xs text-gray-500">
                महसुस {toNepaliDigits(weather.feelsLike)}°C · आर्द्रता {toNepaliDigits(weather.humidity)}%
              </p>
            </div>
          </m.span>
        ) : (
          <span className="text-sm text-gray-500 group-hover:text-primary">{loading ? "मौसम लोड हुँदै…" : "मौसम पूर्वानुमान हेर्नुहोस् ↗"}</span>
        )}
      </a>
      <CityPicker state={state} id="weather-city" className="text-sm" />
      {locateError && <p className="text-xs text-red-600 max-w-[16rem]">{locateError}</p>}
    </div>
  );
}
