/**
 * Main Layout Component
 */

import { useEffect } from "react";
import { Outlet, ScrollRestoration, useLocation } from "react-router-dom";
import { STRINGS, useLang } from "@/lib/i18n";
import { setCanonical, setRobots } from "@/lib/seo";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { PromoPopup, PromoProvider, PromoSlot } from "@/components/promo";

export function Layout() {
  const lang = useLang();
  // Screen readers, fonts and translators follow the page language.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Canonical address per page; search results stay out of search engines.
  const { pathname } = useLocation();
  useEffect(() => {
    setCanonical(pathname);
    setRobots(/^\/(en\/)?search\/?$/.test(pathname) ? "noindex, follow" : null);
  }, [pathname]);

  return (
    <PromoProvider>
      <div className="min-h-screen flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:bg-white focus:text-primary focus:px-4 focus:py-2 focus:rounded focus:shadow-lg"
        >
          {STRINGS[lang].skipToContent}
        </a>
        <Header />
        <PromoSlot placement="header" className="container mx-auto px-4 pt-4" />
        <main id="main" tabIndex={-1} className="flex-1 outline-none">
          <Outlet />
        </main>
        <Footer />
      </div>
      <PromoPopup />
      {/* New pages open at the top; Back returns to where the reader was. */}
      <ScrollRestoration />
    </PromoProvider>
  );
}
