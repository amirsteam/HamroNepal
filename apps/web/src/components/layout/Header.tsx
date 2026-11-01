/**
 * Header Component
 *
 * Modern responsive header for news portal.
 * Mobile-first design with hamburger menu and slide-out navigation.
 */

import { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { AnimatePresence, m } from "motion/react";
import { NepalFlag } from "@/components/ui/NepalFlag";
import type { Category, Article } from "@/types";
import {
  getCategories,
  getLocationCategories,
  buildLocationTree,
  type LocationNode,
} from "@/services/categories.service";
import { getBreakingNews } from "@/services/news.service";
import { WeatherCompact, WeatherFull, useWeather } from "./WeatherWidget";
import {
  getCurrentBSDate,
  formatBSDate,
  BS_WEEKDAYS,
} from "@/lib/bs-date";

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
  const [provinces, setProvinces] = useState<LocationNode[]>([]);
  const [breakingNews, setBreakingNews] = useState<Article[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const weather = useWeather();

  useEffect(() => {
    async function loadData() {
      try {
        const [cats, breaking, locations] = await Promise.all([
          getCategories(),
          getBreakingNews(5),
          getLocationCategories().catch(() => [] as Category[]),
        ]);
        setCategories(cats);
        setProvinces(buildLocationTree(locations.filter((l) => l.showInMenu !== false)));
        setBreakingNews(breaking);
      } catch (error) {
        console.error("Failed to load header data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // While the mobile menu is open: no page scroll behind it, and Escape closes it.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
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
              aria-label={mobileMenuOpen ? "मेनु बन्द गर्नुहोस्" : "मेनु खोल्नुहोस्"}
              aria-expanded={mobileMenuOpen}
            >
              <HamburgerIcon isOpen={mobileMenuOpen} />
            </button>

            {/* Logo */}
            <Link to="/" className="absolute left-1/2 -translate-x-1/2" aria-label="हाम्रो नेपाल गृहपृष्ठ">
              <span className="flex items-center gap-1.5 font-display text-2xl font-extrabold tracking-tight">
                <NepalFlag className="h-7 w-auto -mt-0.5" />
                <span className="text-primary">हाम्रो</span>
                <span className="text-secondary ml-0.5">नेपाल</span>
              </span>
            </Link>

            {/* Search Icon */}
            <Link to="/search" className="p-2 -mr-2 text-gray-700 hover:text-primary transition-colors" aria-label="खोज्नुहोस्">
              <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Link>
          </div>

          {/* Date and Weather bar */}
          <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50 text-xs text-gray-600">
            <span className="font-medium">{bsWeekday}, {bsDateFormatted}</span>
            <WeatherCompact state={weather} />
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
                    <span className="flex items-center justify-center gap-3 font-display text-5xl xl:text-6xl font-extrabold tracking-tight">
                      <NepalFlag animated className="h-14 xl:h-16 w-auto -mt-1" />
                      <span className="text-primary transition-colors group-hover:text-primary/80">हाम्रो</span>
                      <span className="text-secondary transition-colors group-hover:text-secondary/80 ml-2">नेपाल</span>
                    </span>
                    <p className="text-sm text-gray-500 mt-1">तपाईंको ठाउँको, देशभरको समाचार</p>
                  </Link>
                </div>

                {/* RIGHT: Weather Section */}
                <div className="flex-1 text-right">
                  <WeatherFull state={weather} />
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="bg-secondary text-white" aria-label="मुख्य मेनु">
            <div className="container mx-auto px-4">
              <div className="relative flex items-center justify-between">
                <div className="flex items-center">
                  <NavLink
                    to="/"
                    className={({ isActive }) =>
                      `relative px-5 py-3 font-medium transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t after:bg-primary after:origin-left after:transition-transform after:duration-300 motion-reduce:after:transition-none hover:bg-secondary-dark hover:after:scale-x-100 ${
                        isActive ? "bg-secondary-dark after:scale-x-100" : "after:scale-x-0"
                      }`
                    }
                  >
                    गृहपृष्ठ
                  </NavLink>
                  {!isLoading &&
                    categories.slice(0, 7).map((category) => (
                      <NavLink
                        key={category.$id}
                        to={`/category/${category.slug}`}
                        className={({ isActive }) =>
                          `relative px-4 py-3 font-medium transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t after:bg-primary after:origin-left after:transition-transform after:duration-300 motion-reduce:after:transition-none hover:bg-secondary-dark hover:after:scale-x-100 ${
                            isActive ? "bg-secondary-dark after:scale-x-100" : "after:scale-x-0"
                          }`
                        }
                      >
                        {category.name}
                      </NavLink>
                    ))}
                  {provinces.length > 0 && (
                    <div className="group">
                      <button
                        type="button"
                        className="px-4 py-3 font-medium transition-colors hover:bg-secondary-dark flex items-center gap-1"
                        aria-haspopup="true"
                      >
                        स्थानीय
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div className="absolute left-0 right-0 top-full z-50 invisible opacity-0 -translate-y-1 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:visible group-focus-within:opacity-100 group-focus-within:translate-y-0 transition duration-200 ease-out motion-reduce:transition-none bg-white text-gray-800 shadow-2xl rounded-b-lg p-6">
                        <div className="grid grid-cols-4 xl:grid-cols-7 gap-6">
                          {provinces.map((province) => (
                            <div key={province.$id}>
                              <Link
                                to={`/category/${province.slug}`}
                                className="block font-bold text-secondary hover:text-primary mb-2 pb-1 border-b"
                              >
                                {province.name}
                              </Link>
                              <ul className="space-y-1 text-sm">
                                {province.children.map((district) => (
                                  <li key={district.$id}>
                                    <Link to={`/category/${district.slug}`} className="hover:text-primary">
                                      {district.name}
                                    </Link>
                                    {district.children.map((muni) => (
                                      <Link
                                        key={muni.$id}
                                        to={`/category/${muni.slug}`}
                                        className="block pl-3 text-gray-500 hover:text-primary"
                                      >
                                        ↳ {muni.name}
                                      </Link>
                                    ))}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <Link to="/search" className="p-3 hover:bg-secondary-dark transition-colors" aria-label="खोज्नुहोस्">
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
          <div className="ticker bg-primary text-white overflow-hidden">
            <div className="container mx-auto px-4 flex items-center">
              <span className="flex items-center gap-2 bg-primary-dark px-3 py-1.5 font-bold whitespace-nowrap text-xs sm:text-sm shrink-0">
                <span className="relative flex w-2 h-2" aria-hidden="true">
                  <span className="absolute inline-flex w-full h-full rounded-full bg-white opacity-75 motion-safe:animate-ping" />
                  <span className="relative inline-flex w-2 h-2 rounded-full bg-white" />
                </span>
                ब्रेकिङ
              </span>
              <div className="ticker-track overflow-hidden flex-1">
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
      <AnimatePresence>
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <m.div
            key="menu-backdrop"
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* Slide-out Panel */}
          <m.div
            key="menu-panel"
            role="dialog"
            aria-modal="true"
            aria-label="मेनु"
            className="fixed top-0 left-0 h-full w-72 bg-white z-50 lg:hidden shadow-2xl overflow-y-auto"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Menu Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-secondary text-white">
              <h2 className="text-lg font-bold">मेनु</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 hover:bg-secondary-dark rounded-lg transition-colors"
                aria-label="मेनु बन्द गर्नुहोस्"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Menu Items */}
            <nav className="py-2" aria-label="मोबाइल मेनु">
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

              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
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

              {provinces.length > 0 && (
                <>
                  <div className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    स्थानीय समाचार
                  </div>
                  {provinces.map((province) => (
                    <details key={province.$id} className="group">
                      <summary className="flex items-center justify-between px-4 py-3 text-gray-700 font-medium cursor-pointer hover:bg-gray-50 list-none">
                        {province.name}
                        <svg className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="pb-2">
                        <Link
                          to={`/category/${province.slug}`}
                          onClick={() => setMobileMenuOpen(false)}
                          className="block pl-8 pr-4 py-2 text-sm text-secondary font-medium hover:bg-gray-50"
                        >
                          सबै {province.name}
                        </Link>
                        {province.children.map((district) => (
                          <div key={district.$id}>
                            <Link
                              to={`/category/${district.slug}`}
                              onClick={() => setMobileMenuOpen(false)}
                              className="block pl-8 pr-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                            >
                              {district.name}
                            </Link>
                            {district.children.map((muni) => (
                              <Link
                                key={muni.$id}
                                to={`/category/${muni.slug}`}
                                onClick={() => setMobileMenuOpen(false)}
                                className="block pl-12 pr-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
                              >
                                ↳ {muni.name}
                              </Link>
                            ))}
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </>
              )}

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
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500 text-center">
                © हाम्रो नेपाल न्युज पोर्टल
              </p>
            </div>
          </m.div>
        </>
      )}
      </AnimatePresence>
    </>
  );
}
