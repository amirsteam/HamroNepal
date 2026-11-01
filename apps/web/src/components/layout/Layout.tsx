/**
 * Main Layout Component
 */

import { useEffect } from "react";
import { Outlet, ScrollRestoration } from "react-router-dom";
import { useLang } from "@/lib/i18n";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { PromoPopup, PromoProvider, PromoSlot } from "@/components/promo";

export function Layout() {
  const lang = useLang();
  // Screen readers, fonts and translators follow the page language.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <PromoProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <PromoSlot placement="header" className="container mx-auto px-4 pt-4" />
        <main className="flex-1">
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
