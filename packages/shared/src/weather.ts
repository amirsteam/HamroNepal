/**
 * Places the weather widget can show (used by the API and the website).
 * Panauti comes first: it is the site's home town and the default.
 */

export interface WeatherCity {
  slug: string;
  name: string;
  nameEn: string;
  lat: number;
  lon: number;
}

export const WEATHER_CITIES: WeatherCity[] = [
  { slug: "panauti", name: "पनौती", nameEn: "Panauti", lat: 27.5846, lon: 85.5147 },
  { slug: "dhulikhel", name: "धुलिखेल", nameEn: "Dhulikhel", lat: 27.6253, lon: 85.5561 },
  { slug: "banepa", name: "बनेपा", nameEn: "Banepa", lat: 27.6298, lon: 85.5214 },
  { slug: "kathmandu", name: "काठमाडौं", nameEn: "Kathmandu", lat: 27.7172, lon: 85.324 },
  { slug: "lalitpur", name: "ललितपुर", nameEn: "Lalitpur", lat: 27.6644, lon: 85.3188 },
  { slug: "bhaktapur", name: "भक्तपुर", nameEn: "Bhaktapur", lat: 27.671, lon: 85.4298 },
  { slug: "hetauda", name: "हेटौंडा", nameEn: "Hetauda", lat: 27.4287, lon: 85.0322 },
  { slug: "bharatpur", name: "भरतपुर", nameEn: "Bharatpur", lat: 27.6768, lon: 84.4359 },
  { slug: "pokhara", name: "पोखरा", nameEn: "Pokhara", lat: 28.2096, lon: 83.9856 },
  { slug: "butwal", name: "बुटवल", nameEn: "Butwal", lat: 27.7006, lon: 83.4484 },
  { slug: "nepalgunj", name: "नेपालगन्ज", nameEn: "Nepalgunj", lat: 28.05, lon: 81.6167 },
  { slug: "birendranagar", name: "वीरेन्द्रनगर", nameEn: "Birendranagar", lat: 28.6019, lon: 81.6339 },
  { slug: "dhangadhi", name: "धनगढी", nameEn: "Dhangadhi", lat: 28.6833, lon: 80.6 },
  { slug: "janakpur", name: "जनकपुर", nameEn: "Janakpur", lat: 26.7288, lon: 85.9254 },
  { slug: "birgunj", name: "वीरगञ्ज", nameEn: "Birgunj", lat: 27.0104, lon: 84.8821 },
  { slug: "biratnagar", name: "विराटनगर", nameEn: "Biratnagar", lat: 26.4525, lon: 87.2718 },
  { slug: "dharan", name: "धरान", nameEn: "Dharan", lat: 26.8125, lon: 87.2833 },
];

export const DEFAULT_WEATHER_CITY = WEATHER_CITIES[0];

export const findWeatherCity = (slug?: string | null): WeatherCity | undefined =>
  slug ? WEATHER_CITIES.find((c) => c.slug === slug) : undefined;

/** The listed place closest to a point (for "my location"). */
export function nearestWeatherCity(lat: number, lon: number): WeatherCity {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const distance = (c: WeatherCity) => {
    const dLat = toRad(c.lat - lat);
    const dLon = toRad(c.lon - lon) * Math.cos(toRad((c.lat + lat) / 2));
    return dLat * dLat + dLon * dLon;
  };
  return WEATHER_CITIES.reduce((best, c) => (distance(c) < distance(best) ? c : best));
}

/** Official city forecasts: Department of Hydrology and Meteorology (DHM), Nepal. */
export const OFFICIAL_WEATHER_URL = "https://dhm.gov.np/mfd/#/weather/city";
