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
import { useT } from "@/lib/i18n";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

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
  const { lang, t, num } = useT();

  async function run(q: string) {
    setInput(q);
    setArticles([]);
    setTotal(0);
    setError(null);
    if (q.length < 2) return;
    setIsLoading(true);
    try {
      const res = await searchArticles(q, { limit: PAGE_SIZE }, lang);
      setArticles(res.documents);
      setTotal(res.total);
    } catch {
      setError(t.searchError);
    } finally {
      setIsLoading(false);
    }
  }

  useDocumentTitle(query ? `${t.searchTitle}: ${query}` : t.searchTitle);
  useEffect(() => {
    run(query);
  }, [query, lang]);

  async function loadMore() {
    setIsLoadingMore(true);
    try {
      const res = await searchArticles(query, { limit: PAGE_SIZE, offset: articles.length }, lang);
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
      <h1 className="sr-only">{t.searchHeading}</h1>
      <form onSubmit={onSubmit} className="max-w-2xl mx-auto mb-8 flex gap-2" role="search">
        <label htmlFor="search" className="sr-only">
          {t.searchLabel}
        </label>
        <input
          id="search"
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.searchPlaceholder}
          autoFocus
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
        />
        <button type="submit" className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90">
          {t.search}
        </button>
      </form>

      {error && <ErrorState message={error} onRetry={() => run(query)} />}

      {query.length >= 2 && !isLoading && !error && (
        <h2 className="text-gray-600 mb-6 font-normal">
          {t.searchFound(query, num(total))}
        </h2>
      )}

      {isLoading ? (
        <NewsGridSkeleton count={6} />
      ) : articles.length > 0 ? (
        <NewsGrid articles={articles} columns={3} />
      ) : (
        query.length >= 2 &&
        !error && <p className="text-center text-gray-500 py-12">{t.searchNone}</p>
      )}

      {articles.length < total && (
        <div className="text-center mt-8">
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {isLoadingMore ? t.loading : t.moreResults}
          </button>
        </div>
      )}
    </div>
  );
}
