/**
 * News sources and AI ingestion runs (dashboard).
 */

import { api } from "@/lib/api";
import type { IngestRun, NewsSource } from "@/types";

export interface SourceInput {
  name: string;
  url: string;
  categoryId?: string | null;
  locationId?: string | null;
  isActive?: boolean;
}

export const getSources = () => api.get<NewsSource[]>("/admin/sources");
export const createSource = (data: SourceInput) => api.post<NewsSource>("/admin/sources", data);
export const updateSource = (id: string, data: Partial<SourceInput>) =>
  api.patch<NewsSource>(`/admin/sources/${id}`, data);
export const deleteSource = (id: string) => api.delete(`/admin/sources/${id}`);
export const testSource = (id: string) =>
  api.post<{ ok: boolean; count?: number; sample?: string[]; error?: string }>(`/admin/sources/${id}/test`);

export const getIngestRuns = () => api.get<IngestRun[]>("/admin/ingest/runs");

export interface IngestReport {
  dryRun: boolean;
  stats: IngestRun["stats"];
  errorLog: string[];
  drafts: Array<{ title: string; category: string; location?: string; sourceUrl: string; articleId?: string }>;
}

export const runIngestNow = (dryRun: boolean) => api.post<IngestReport>("/admin/ingest/run", { dryRun });
