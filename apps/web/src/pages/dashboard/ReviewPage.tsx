/**
 * AI समीक्षा – review queue for AI-written drafts (editor/admin).
 * Nothing the AI writes is public until an editor approves it here.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Article, Category } from "@/types";
import { getArticlesAdmin, updateArticleStatus } from "@/services/admin.service";
import { getCategories, getLocationCategories } from "@/services/categories.service";
import { getIngestRuns } from "@/services/sources.service";
import { formatDualDate, toNepaliDigits } from "@/lib/bs-date";
import { getArticleImageUrl } from "@/services/news.service";
import { ImageCredit } from "@/components/news/ImageCredit";
import type { IngestRun } from "@/types";

const PAGE_SIZE = 20;

export function ReviewPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [lastRun, setLastRun] = useState<IngestRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const names = useMemo(() => new Map(categories.map((c) => [c.$id, c.name])), [categories]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, topics, locations, runs] = await Promise.all([
        getArticlesAdmin({ status: "pending", source: "ai" }, { limit: PAGE_SIZE }),
        getCategories(),
        getLocationCategories(),
        getIngestRuns().catch(() => [] as IngestRun[]),
      ]);
      setArticles(res.documents);
      setTotal(res.total);
      setCategories([...topics, ...locations]);
      setLastRun(runs.find((r) => !r.dryRun) ?? null);
    } catch {
      setError("समीक्षा सूची लोड गर्न सकिएन।");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(article: Article, status: "published" | "archived") {
    setBusy(article.$id);
    try {
      await updateArticleStatus(article.$id, status);
      setArticles((prev) => prev.filter((a) => a.$id !== article.$id));
      setTotal((t) => t - 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : "परिवर्तन गर्न सकिएन।");
    } finally {
      setBusy(null);
    }
  }

  /** Most specific location name (district/municipality rather than province). */
  function locationLabel(a: Article) {
    const ids = a.locationIds ?? [];
    const locs = categories.filter((c) => ids.includes(c.$id));
    const parents = new Set(locs.map((l) => l.parentId));
    return locs.find((l) => !parents.has(l.$id))?.name;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">AI समीक्षा</h1>
          <p className="text-gray-600 mt-1">
            AI ले अरू सञ्चारमाध्यमका समाचारबाट तयार पारेका मस्यौदा। स्रोतसँग मिलाएर मात्र प्रकाशित गर्नुहोस्।
          </p>
        </div>
        <div className="text-sm text-gray-600 text-right">
          <div>समीक्षामा: {toNepaliDigits(total)}</div>
          {lastRun && (
            <div>
              अन्तिम संकलन: {formatDualDate(lastRun.startedAt).relative} ·{" "}
              {toNepaliDigits(lastRun.stats.drafted)} नयाँ मस्यौदा
            </div>
          )}
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">{error}</div>}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white rounded-lg shadow-sm animate-pulse" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-10 text-center text-gray-500">
          समीक्षा गर्न बाँकी AI समाचार छैनन्। नयाँ समाचार हरेक घण्टा संकलन हुन्छन्।
        </div>
      ) : (
        <ul className="space-y-4">
          {articles.map((a) => {
            const loc = locationLabel(a);
            const confidence = a.source?.aiConfidence;
            return (
              <li key={a.$id} className="bg-white rounded-lg shadow-sm p-5">
                <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                    {names.get(a.categoryId) ?? "श्रेणी?"}
                  </span>
                  {loc && <span className="px-2 py-0.5 rounded bg-secondary/10 text-secondary font-medium">📍 {loc}</span>}
                  {typeof confidence === "number" && (
                    <span
                      className={`px-2 py-0.5 rounded font-medium ${
                        confidence >= 0.8 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      विश्वास {toNepaliDigits(Math.round(confidence * 100))}%
                    </span>
                  )}
                  <span className="text-gray-500">{formatDualDate(a.$createdAt).relative}</span>
                </div>

                <div className="flex gap-4">
                  {a.featuredImage && (
                    <figure className="shrink-0 w-32 sm:w-44">
                      <img
                        src={getArticleImageUrl(a.featuredImage, 352, 198)}
                        alt=""
                        className="w-full aspect-video object-cover rounded bg-gray-100"
                      />
                      <ImageCredit credit={a.imageCredit} className="mt-1 hidden sm:block" />
                    </figure>
                  )}
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900">{a.title}</h2>
                    <p className="text-gray-600 mt-1 line-clamp-2">{a.excerpt}</p>
                  </div>
                </div>

                {a.source?.url && (
                  <p className="text-sm text-gray-500 mt-2">
                    स्रोत:{" "}
                    <a href={a.source.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {a.source.name}
                    </a>
                    {a.source.title && <span> – “{a.source.title}”</span>}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    onClick={() => decide(a, "published")}
                    disabled={busy === a.$id}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    ✓ स्वीकृत र प्रकाशित
                  </button>
                  <Link
                    to={`/dashboard/articles/${a.$id}`}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
                  >
                    ✎ सम्पादन
                  </Link>
                  <button
                    onClick={() => decide(a, "archived")}
                    disabled={busy === a.$id}
                    className="px-4 py-2 bg-white border border-red-200 text-red-600 text-sm rounded-lg hover:bg-red-50 disabled:opacity-50"
                  >
                    ✕ अस्वीकार
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {total > articles.length && !loading && (
        <p className="text-center text-sm text-gray-500">
          पहिलो {toNepaliDigits(articles.length)} देखाइएको छ। निर्णय गरेपछि थप देखिन्छन्।{" "}
          <button onClick={load} className="text-primary hover:underline">
            ताजा गर्नुहोस्
          </button>
        </p>
      )}
    </div>
  );
}
