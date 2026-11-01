/**
 * Advertisements: the public list, view/click counting, and dashboard management.
 */

import { api } from "@/lib/api";
import type { PromoPlacement, Promotion } from "@/types";

const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

/** Ads running now (all placements). */
export const getPromotions = () => api.get<Promotion[]>("/promotions");

/** Link that counts the click on the server, then opens the advertiser's page. */
export const promotionClickUrl = (id: string) => `${BASE}/api/promotions/${id}/click`;

/** Count one view; fire-and-forget, never throws. */
export function trackPromotionView(id: string): void {
  const url = `${BASE}/api/promotions/${id}/view`;
  try {
    if (navigator.sendBeacon?.(url)) return;
  } catch {
    // fall through to fetch
  }
  api.post(`/promotions/${id}/view`).catch(() => {});
}

/** Ask Cloudinary for a compressed, browser-suited format (never cropped). */
export function promotionImageUrl(url: string): string {
  if (url.includes("res.cloudinary.com") && url.includes("/upload/") && !url.includes("/upload/f_auto")) {
    return url.replace("/upload/", "/upload/f_auto,q_auto/");
  }
  return url;
}

/** Dashboard labels and recommended banner sizes per placement. */
export const PLACEMENTS: Array<{ value: PromoPlacement; label: string; size: string; mobileSize?: string }> = [
  { value: "header", label: "हेडरमुनि (सबै पेज)", size: "1200 × 120", mobileSize: "600 × 150" },
  { value: "home", label: "गृहपृष्ठ खण्डहरूबीच", size: "1200 × 150", mobileSize: "600 × 200" },
  { value: "sidebar", label: "साइडबार", size: "300 × 250" },
  { value: "article", label: "समाचारभित्र", size: "728 × 90", mobileSize: "600 × 200" },
  { value: "popup", label: "पपअप (पहिलो पटक खोल्दा)", size: "600 × 600", mobileSize: "400 × 600" },
];

export const placementLabel = (p: PromoPlacement) => PLACEMENTS.find((x) => x.value === p)?.label ?? p;

// ---------------------------------------------------------------- dashboard (admin)
export interface PromotionInput {
  title: string;
  imageUrl: string;
  mobileImageUrl?: string;
  linkUrl?: string;
  placement: PromoPlacement;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive?: boolean;
}

export const getPromotionsAdmin = () => api.get<Promotion[]>("/admin/promotions");
export const createPromotion = (data: PromotionInput) => api.post<Promotion>("/admin/promotions", data);
export const updatePromotion = (id: string, data: Partial<PromotionInput>) =>
  api.patch<Promotion>(`/admin/promotions/${id}`, data);
export const deletePromotion = (id: string) => api.delete(`/admin/promotions/${id}`);
