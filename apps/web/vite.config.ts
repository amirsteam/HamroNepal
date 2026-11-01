import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const API = process.env.API_PROXY_TARGET || "http://localhost:4000";
// Public site address for the share-preview tags in index.html.
const SITE_URL = (process.env.PUBLIC_SITE_URL || "").replace(/\/+$/, "");

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "site-url",
      transformIndexHtml: (html) => html.replaceAll("%SITE_URL%", SITE_URL),
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": API,
      "/sitemap.xml": API,
      "/news-sitemap.xml": API,
      "/rss.xml": API,
      // Print-edition QR links (/n/<article id>); a plain "/n" would also catch /news.
      "^/n/[0-9a-f]{24}$": API,
    },
  },
});
