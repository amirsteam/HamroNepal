/**
 * Search Page – /search?q=...
 */

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import type { Article } from "@/types";
import { searchArticles } from "@/services/news.service";
import { NewsGrid } from "@/components/news/NewsGrid";
import { NewsGridSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { toNepaliDigits } from "@/lib/bs-date";

const PAGE_SIZE = 12;

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const [input, setInput] = useState(query);
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(q: string) {
    setInput(q);
    setArticles([]);
    setTotal(0);
    setError(null);
    if (q.length < 2) return;
    setIsLoading(true);
    try {
      const res = await searchArticles(q, { limit: PAGE_SIZE });
      setArticles(res.documents);
      setTotal(res.total);
    } catch {
      setError("खोज्न सकिएन।");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    document.title = query ? `खोज: ${query} - हाम्रो नेपाल` : "खोज - हाम्रो नेपाल";
    run(query);
  }, [query]);

  async function loadMore() {
    setIsLoadingMore(true);
    try {
      const res = await searchArticles(query, { limit: PAGE_SIZE, offset: articles.length });
      setArticles((prev) => [...prev, ...res.documents]);
    } finally {
      setIsLoadingMore(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setParams(input.trim() ? { q: input.trim() } : {});
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <form onSubmit={onSubmit} className="max-w-2xl mx-auto mb-8 flex gap-2" role="search">
        <label htmlFor="search" className="sr-only">
          समाचार खोज्नुहोस्
        </label>
        <input
          id="search"
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="समाचार खोज्नुहोस्..."
          autoFocus
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
        />
        <button type="submit" className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90">
          खोज्नुहोस्
        </button>
      </form>

      {error && <ErrorState message={error} onRetry={() => run(query)} />}

      {query.length >= 2 && !isLoading && !error && (
        <p className="text-gray-600 mb-6">
          “{query}” को लागि {toNepaliDigits(total)} समाचार भेटिए
        </p>
      )}

      {isLoading ? (
        <NewsGridSkeleton count={6} />
      ) : articles.length > 0 ? (
        <NewsGrid articles={articles} columns={3} />
      ) : (
        query.length >= 2 &&
        !error && <p className="text-center text-gray-500 py-12">कुनै समाचार भेटिएन। अर्को शब्दले खोज्नुहोस्।</p>
      )}

      {articles.length < total && (
        <div className="text-center mt-8">
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {isLoadingMore ? "लोड हुँदैछ..." : "थप समाचार"}
          </button>
        </div>
      )}
    </div>
  );
}
