/**
 * Main Layout Component
 */

import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { PromoPopup, PromoProvider, PromoSlot } from "@/components/promo";

export function Layout() {
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
    </PromoProvider>
  );
}
