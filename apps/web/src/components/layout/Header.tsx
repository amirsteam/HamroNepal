/**
 * Header Component
 *
 * Newspaper-style header inspired by ekantipur.com.
 * Three sections: Left (BS/AD dates), Center (logo), Right (weather).
 */

import { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import type { Category, Article } from "@/types";
import { getCategories } from "@/services/categories.service";
import { getBreakingNews } from "@/services/news.service";
import { getWeather, getFallbackWeather, type WeatherData } from "@/services/weather.service";
import {
  getCurrentBSDate,
  formatBSDate,
  BS_WEEKDAYS,
  toNepaliDigits,
} from "@/lib/bs-date";

// Weather icon component (supports all conditions)
function WeatherIcon({ condition }: { condition: WeatherData["condition"] }) {
  const iconClasses = "w-8 h-8";
  
  switch (condition) {
    case "sunny":
      return (
        <svg className={`${iconClasses} text-yellow-500`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
        </svg>
      );
    case "cloudy":
      return (
        <svg className={`${iconClasses} text-gray-400`} fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M4.5 9.75a6 6 0 0111.573-2.226 3.75 3.75 0 014.133 4.303A4.5 4.5 0 0118 20.25H6.75a5.25 5.25 0 01-2.23-10.004 6.072 6.072 0 01-.02-.496z" clipRule="evenodd" />
        </svg>
      );
    case "rainy":
      return (
        <svg className={`${iconClasses} text-blue-500`} fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M4.5 9.75a6 6 0 0111.573-2.226 3.75 3.75 0 014.133 4.303A4.5 4.5 0 0118 20.25H6.75a5.25 5.25 0 01-2.23-10.004 6.072 6.072 0 01-.02-.496zM9 13.5a.75.75 0 00-.75.75v2.25a.75.75 0 001.5 0v-2.25A.75.75 0 009 13.5zm3.75.75a.75.75 0 011.5 0v2.25a.75.75 0 01-1.5 0v-2.25zm4.5-.75a.75.75 0 00-.75.75v2.25a.75.75 0 001.5 0v-2.25a.75.75 0 00-.75-.75z" clipRule="evenodd" />
        </svg>
      );
    case "snowy":
      return (
        <svg className={`${iconClasses} text-cyan-400`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l1.09 3.41L16.5 4.5l-.91 3.41L19 9l-3.41 1.09.91 3.41-3.41-.91L12 16l-1.09-3.41L7.5 13.5l.91-3.41L5 9l3.41-1.09-.91-3.41 3.41.91L12 2z" />
          <path d="M12 18v4M9 20h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
      );
    case "foggy":
      return (
        <svg className={`${iconClasses} text-gray-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeWidth="2" d="M4 8h16M4 12h16M4 16h12" />
        </svg>
      );
    default:
      return (
        <svg className={`${iconClasses} text-yellow-500`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0z" />
        </svg>
      );
  }
}

export function Header() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [breakingNews, setBreakingNews] = useState<Article[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [weather, setWeather] = useState<WeatherData>(getFallbackWeather());

  useEffect(() => {
    async function loadData() {
      try {
        const [cats, breaking, weatherData] = await Promise.all([
          getCategories(),
          getBreakingNews(5),
          getWeather(),
        ]);
        setCategories(cats);
        setBreakingNews(breaking);
        if (weatherData) {
          setWeather(weatherData);
        }
      } catch (error) {
        console.error("Failed to load header data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Get current dates
  const now = new Date();
  const bsDate = getCurrentBSDate();
  const dayOfWeek = now.getDay();
  const bsDateFormatted = formatBSDate(bsDate);
  const bsWeekday = BS_WEEKDAYS[dayOfWeek];

  // Format AD date in English
  const adDateFormatted = now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      {/* Top Header Bar - Newspaper Style */}
      <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          {/* Three-column layout with centered logo */}
          <div className="relative flex items-center justify-between py-4 md:py-6">
            {/* LEFT: Date Section */}
            <div className="flex-1 text-left">
              <div className="inline-block">
                <p className="text-base md:text-lg font-semibold text-gray-800">
                  {bsWeekday}, {bsDateFormatted}
                </p>
                <p className="text-xs md:text-sm text-gray-500">
                  {adDateFormatted}
                </p>
              </div>
            </div>

            {/* CENTER: Logo - Absolutely positioned for perfect centering */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <Link to="/" className="block text-center group">
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight">
                  <span className="text-primary transition-colors group-hover:text-primary/80">
                    हाम्रो
                  </span>
                  <span className="text-secondary transition-colors group-hover:text-secondary/80 ml-1 md:ml-2">
                    नेपाल
                  </span>
                </h1>
                <p className="text-[10px] md:text-xs text-gray-500 tracking-[0.2em] uppercase mt-0.5">
                  Nepali News Portal
                </p>
              </Link>
            </div>

            {/* RIGHT: Weather Section */}
            <div className="flex-1 text-right">
              <div className="inline-flex items-center gap-2 md:gap-3">
                <WeatherIcon condition={weather.condition} />
                <div className="text-right">
                  <p className="text-xl md:text-2xl font-bold text-gray-800">
                    {toNepaliDigits(weather.temp)}°C
                  </p>
                  <p className="text-xs md:text-sm text-gray-500">
                    {weather.location}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Breaking News Ticker */}
      {breakingNews.length > 0 && (
        <div className="bg-primary text-white overflow-hidden">
          <div className="container mx-auto px-4 flex items-center">
            <span className="bg-red-700 px-3 py-1.5 font-bold whitespace-nowrap text-sm animate-pulse">
              ब्रेकिङ
            </span>
            <div className="overflow-hidden flex-1">
              <div className="animate-ticker flex whitespace-nowrap py-1.5">
                {breakingNews.map((news, index) => (
                  <Link
                    key={news.$id}
                    to={`/news/${news.slug}`}
                    className="mx-8 hover:underline text-sm"
                  >
                    {news.title}
                    {index < breakingNews.length - 1 && (
                      <span className="mx-4 opacity-50">●</span>
                    )}
                  </Link>
                ))}
                {/* Duplicate for seamless loop */}
                {breakingNews.map((news, index) => (
                  <Link
                    key={`dup-${news.$id}`}
                    to={`/news/${news.slug}`}
                    className="mx-8 hover:underline text-sm"
                  >
                    {news.title}
                    {index < breakingNews.length - 1 && (
                      <span className="mx-4 opacity-50">●</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="bg-secondary text-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `px-4 py-3 font-medium transition-colors border-b-2 ${
                    isActive
                      ? "border-primary bg-secondary-dark"
                      : "border-transparent hover:bg-secondary-dark"
                  }`
                }
              >
                गृहपृष्ठ
              </NavLink>

              {!isLoading &&
                categories.slice(0, 8).map((category) => (
                  <NavLink
                    key={category.$id}
                    to={`/category/${category.slug}`}
                    className={({ isActive }) =>
                      `px-4 py-3 font-medium transition-colors border-b-2 ${
                        isActive
                          ? "border-primary bg-secondary-dark"
                          : "border-transparent hover:bg-secondary-dark"
                      }`
                    }
                  >
                    {category.name}
                  </NavLink>
                ))}
            </div>

            {/* Search Icon (Desktop) */}
            <div className="hidden lg:flex items-center gap-2">
              <Link
                to="/search"
                className="p-2 hover:bg-secondary-dark rounded transition-colors"
                aria-label="Search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-3 hover:bg-secondary-dark transition-colors w-full flex items-center justify-between"
              aria-label="Toggle menu"
            >
              <span className="font-medium">मेनु</span>
              <svg
                className={`w-5 h-5 transition-transform ${mobileMenuOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-secondary-dark py-2">
              <NavLink
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-2 font-medium ${
                    isActive
                      ? "bg-secondary-dark border-l-4 border-primary"
                      : "hover:bg-secondary-dark"
                  }`
                }
              >
                गृहपृष्ठ
              </NavLink>

              {categories.map((category) => (
                <NavLink
                  key={category.$id}
                  to={`/category/${category.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `block px-4 py-2 font-medium ${
                      isActive
                        ? "bg-secondary-dark border-l-4 border-primary"
                        : "hover:bg-secondary-dark"
                    }`
                  }
                >
                  {category.name}
                </NavLink>
              ))}

              {/* Mobile Search */}
              <Link
                to="/search"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2 font-medium hover:bg-secondary-dark"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                खोज्नुहोस्
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
