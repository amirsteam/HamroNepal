/**
 * Print edition: generated issues and the preview of the next one.
 */

import { api } from "@/lib/api";
import type { PrintIssue } from "@/types";

const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export const getPrintIssues = () => api.get<PrintIssue[]>("/admin/print/issues");

/** The next issue as a print-ready page (opens in a new tab; uses the login cookie). */
export const printPreviewUrl = (date?: string) =>
  `${BASE}/api/admin/print/preview${date ? `?date=${encodeURIComponent(date)}` : ""}`;
