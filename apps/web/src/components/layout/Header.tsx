/**
 * Header Component
 *
 * Modern responsive header for news portal.
 * Mobile-first design with hamburger menu and slide-out navigation.
 */

import React, { useState, useEffect } from "react";
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

// Weather icon component
function WeatherIcon({ condition, className = "w-6 h-6" }: { condition: WeatherData["condition"]; className?: string }) {
  const icons: Record<WeatherData["condition"], React.ReactNode> = {
    sunny: (
      <svg className={`${className} text-yellow-500`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
      </svg>
    ),
    cloudy: (
      <svg className={`${className} text-gray-400`} fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" d="M4.5 9.75a6 6 0 0111.573-2.226 3.75 3.75 0 014.133 4.303A4.5 4.5 0 0118 20.25H6.75a5.25 5.25 0 01-2.23-10.004 6.072 6.072 0 01-.02-.496z" clipRule="evenodd" />
      </svg>
    ),
    rainy: (
      <svg className={`${className} text-blue-500`} fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" d="M4.5 9.75a6 6 0 0111.573-2.226 3.75 3.75 0 014.133 4.303A4.5 4.5 0 0118 20.25H6.75a5.25 5.25 0 01-2.23-10.004 6.072 6.072 0 01-.02-.496zM9 13.5a.75.75 0 00-.75.75v2.25a.75.75 0 001.5 0v-2.25A.75.75 0 009 13.5zm3.75.75a.75.75 0 011.5 0v2.25a.75.75 0 01-1.5 0v-2.25zm4.5-.75a.75.75 0 00-.75.75v2.25a.75.75 0 001.5 0v-2.25a.75.75 0 00-.75-.75z" clipRule="evenodd" />
      </svg>
    ),
    snowy: (
      <svg className={`${className} text-cyan-400`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l1.09 3.41L16.5 4.5l-.91 3.41L19 9l-3.41 1.09.91 3.41-3.41-.91L12 16l-1.09-3.41L7.5 13.5l.91-3.41L5 9l3.41-1.09-.91-3.41 3.41.91L12 2z" />
      </svg>
    ),
    foggy: (
      <svg className={`${className} text-gray-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeWidth="2" d="M4 8h16M4 12h16M4 16h12" />
      </svg>
    ),
  };
  return icons[condition] || icons.sunny;
}

// Hamburger icon component
function HamburgerIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <div className="w-6 h-5 relative flex flex-col justify-between">
      <span className={`block h-0.5 w-full bg-current rounded transition-all duration-300 ${isOpen ? "rotate-45 translate-y-2" : ""}`} />
      <span className={`block h-0.5 w-full bg-current rounded transition-all duration-300 ${isOpen ? "opacity-0" : ""}`} />
      <span className={`block h-0.5 w-full bg-current rounded transition-all duration-300 ${isOpen ? "-rotate-45 -translate-y-2" : ""}`} />
    </div>
  );
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

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Get current dates
  const now = new Date();
  const bsDate = getCurrentBSDate();
  const bsDateFormatted = formatBSDate(bsDate);
  const bsWeekday = BS_WEEKDAYS[now.getDay()];
  const adDateFormatted = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <header className="sticky top-0 z-50 bg-white shadow-md">
        {/* Mobile Header */}
        <div className="lg:hidden">
          {/* Top bar with hamburger, logo, and search */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            {/* Hamburger Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 -ml-2 text-gray-700 hover:text-primary transition-colors"
              aria-label="Toggle menu"
            >
              <HamburgerIcon isOpen={mobileMenuOpen} />
            </button>

            {/* Logo */}
            <Link to="/" className="absolute left-1/2 -translate-x-1/2">
              <h1 className="text-2xl font-black tracking-tight">
                <span className="text-primary">हाम्रो</span>
                <span className="text-secondary ml-0.5">नेपाल</span>
              </h1>
            </Link>

            {/* Search Icon */}
            <Link to="/search" className="p-2 -mr-2 text-gray-700 hover:text-primary transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Link>
          </div>

          {/* Date and Weather bar */}
          <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50 text-xs text-gray-600">
            <span className="font-medium">{bsWeekday}, {bsDateFormatted}</span>
            <div className="flex items-center gap-1">
              <WeatherIcon condition={weather.condition} className="w-4 h-4" />
              <span className="font-semibold">{toNepaliDigits(weather.temp)}°C</span>
              <span className="text-gray-400">|</span>
              <span>{weather.location}</span>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block">
          {/* Top Header Bar - Newspaper Style */}
          <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
            <div className="container mx-auto px-4">
              <div className="relative flex items-center justify-between py-6">
                {/* LEFT: Date Section */}
                <div className="flex-1 text-left">
                  <p className="text-lg font-semibold text-gray-800">
                    {bsWeekday}, {bsDateFormatted}
                  </p>
                  <p className="text-sm text-gray-500">{adDateFormatted}</p>
                </div>

                {/* CENTER: Logo */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <Link to="/" className="block text-center group">
                    <h1 className="text-5xl xl:text-6xl font-black tracking-tight">
                      <span className="text-primary transition-colors group-hover:text-primary/80">हाम्रो</span>
                      <span className="text-secondary transition-colors group-hover:text-secondary/80 ml-2">नेपाल</span>
                    </h1>
                    <p className="text-xs text-gray-500 tracking-[0.2em] uppercase mt-0.5">
                      Nepali News Portal
                    </p>
                  </Link>
                </div>

                {/* RIGHT: Weather Section */}
                <div className="flex-1 text-right">
                  <div className="inline-flex items-center gap-3">
                    <WeatherIcon condition={weather.condition} className="w-10 h-10" />
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-800">{toNepaliDigits(weather.temp)}°C</p>
                      <p className="text-sm text-gray-500">{weather.location}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="bg-secondary text-white">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <NavLink
                    to="/"
                    className={({ isActive }) =>
                      `px-5 py-3 font-medium transition-colors ${
                        isActive ? "bg-primary" : "hover:bg-secondary-dark"
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
                          `px-4 py-3 font-medium transition-colors ${
                            isActive ? "bg-primary" : "hover:bg-secondary-dark"
                          }`
                        }
                      >
                        {category.name}
                      </NavLink>
                    ))}
                </div>
                <Link to="/search" className="p-3 hover:bg-secondary-dark transition-colors" aria-label="Search">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </Link>
              </div>
            </div>
          </nav>
        </div>

        {/* Breaking News Ticker */}
        {breakingNews.length > 0 && (
          <div className="bg-primary text-white overflow-hidden">
            <div className="container mx-auto px-4 flex items-center">
              <span className="bg-red-700 px-3 py-1.5 font-bold whitespace-nowrap text-xs sm:text-sm shrink-0">
                ब्रेकिङ
              </span>
              <div className="overflow-hidden flex-1">
                <div className="animate-ticker flex whitespace-nowrap py-1.5">
                  {[...breakingNews, ...breakingNews].map((news, index) => (
                    <Link
                      key={`${news.$id}-${index}`}
                      to={`/news/${news.slug}`}
                      className="mx-6 hover:underline text-xs sm:text-sm"
                    >
                      {news.title}
                      <span className="mx-4 opacity-50">●</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Slide-out Menu */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Slide-out Panel */}
          <div className="fixed top-0 left-0 h-full w-72 bg-white z-50 lg:hidden shadow-2xl transform transition-transform duration-300 overflow-y-auto">
            {/* Menu Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-secondary text-white">
              <h2 className="text-lg font-bold">मेनु</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 hover:bg-secondary-dark rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Menu Items */}
            <nav className="py-2">
              <NavLink
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 text-gray-800 font-medium transition-colors ${
                    isActive ? "bg-primary/10 text-primary border-l-4 border-primary" : "hover:bg-gray-50"
                  }`
                }
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                गृहपृष्ठ
              </NavLink>

              <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                श्रेणीहरू
              </div>

              {categories.map((category) => (
                <NavLink
                  key={category.$id}
                  to={`/category/${category.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 text-gray-700 font-medium transition-colors ${
                      isActive ? "bg-primary/10 text-primary border-l-4 border-primary" : "hover:bg-gray-50"
                    }`
                  }
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {category.name}
                </NavLink>
              ))}

              <div className="border-t border-gray-100 mt-2 pt-2">
                <Link
                  to="/search"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  खोज्नुहोस्
                </Link>
              </div>
            </nav>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500 text-center">
                © हाम्रो नेपाल न्युज पोर्टल
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
