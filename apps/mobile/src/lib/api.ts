/**
 * HamroNepal API client for the mobile app (read-only, no login needed).
 */

import Constants from "expo-constants";

const configured =
  (Constants.expoConfig?.extra?.API_URL as string | undefined) || process.env.EXPO_PUBLIC_API_URL;

const API_URL = (configured || "http://localhost:4000").replace(/\/$/, "");

if (!configured) {
  console.warn("⚠️ EXPO_PUBLIC_API_URL is not set – using http://localhost:4000");
}

type Query = Record<string, string | number | boolean | undefined>;

export async function apiGet<T>(path: string, query?: Query): Promise<T> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  const res = await fetch(`${API_URL}/api${path}${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const err = new Error(body?.error || `HTTP ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

export async function apiPost(path: string): Promise<void> {
  await fetch(`${API_URL}/api${path}`, { method: "POST" });
}

/** Cloudinary URLs get a resize transform; other URLs are used as-is. */
export function getImageUrl(url: string, width?: number, height?: number): string {
  if (!url) return "";
  if (url.includes("res.cloudinary.com") && url.includes("/upload/") && (width || height)) {
    const t = ["c_fill", "g_auto", "f_auto", "q_auto", width && `w_${width}`, height && `h_${height}`]
      .filter(Boolean)
      .join(",");
    return url.replace("/upload/", `/upload/${t}/`);
  }
  // Pexels stock photos: request the displayed size from their CDN.
  if (url.includes("images.pexels.com") && (width || height)) {
    const base = url.split("?")[0];
    const q = ["auto=compress", "cs=tinysrgb", "fit=crop", width && `w=${width}`, height && `h=${height}`].filter(Boolean).join("&");
    return `${base}?${q}`;
  }
  return url;
}
