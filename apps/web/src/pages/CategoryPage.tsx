/**
 * Category Page
 *
 * Displays articles filtered by category.
 */

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import type { Article, Category } from "@/types";
import { getArticlesByCategory, getPublishedArticles } from "@/services/news.service";
import {
  getCategoryBySlug,
  getCategories,
} from "@/services/categories.service";
import { NewsGrid } from "@/components/news/NewsGrid";
import { NewsGridSkeleton, SidebarSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { STRINGS, useT, type Lang } from "@/lib/i18n";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { PromoSlot } from "@/components/promo";
import { Pennant } from "@/components/ui/Pennant";
import { SectionTitle } from "@/components/ui/SectionTitle";

/** "/category/all" lists every published article. */
const allNews = (lang: Lang): Category => ({
  $id: "all",
  $createdAt: "",
  $updatedAt: "",
  name: STRINGS[lang].latestNews,
  slug: "all",
  sortOrder: 0,
  isActive: true,
  type: "topic",
});

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 12;
  const { lang, t, to, num } = useT();

  function fetchPage(cat: Category, offset: number) {
    const page = { limit: ITEMS_PER_PAGE, offset };
    return cat.$id === "all" ? getPublishedArticles(page, lang) : getArticlesByCategory(cat.$id, page, lang);
  }

  async function loadCategory() {
    if (!slug) return;

    setIsLoading(true);
    setError(null);
    setPage(0);
    setArticles([]);

    try {
      const [cat, cats] = await Promise.all([
        slug === "all" ? Promise.resolve(allNews(lang)) : getCategoryBySlug(slug, lang),
        getCategories(lang),
      ]);

      if (!cat) {
        setError(t.categoryNotFound);
        setIsLoading(false);
        return;
      }

      setCategory(cat);
      setAllCategories(cats);

      const result = await fetchPage(cat, 0);

      setArticles(result.documents);
      setTotal(result.total);
    } catch (err) {
      console.error("Failed to load category:", err);
      setError(t.categoryError);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMore() {
    if (!category || isLoadingMore) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;

    try {
      const result = await fetchPage(category, nextPage * ITEMS_PER_PAGE);

      setArticles((prev) => [...prev, ...result.documents]);
      setPage(nextPage);
    } catch (err) {
      console.error("Failed to load more:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }

  useEffect(() => {
    loadCategory();
  }, [slug, lang]);

  useDocumentTitle(isLoading ? null : category?.name);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState message={error} onRetry={loadCategory} />
      </div>
    );
  }

  const hasMore = articles.length < total;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-4" aria-label={t.breadcrumb}>
        <Link to={to("/")} className="hover:text-primary">
          {t.home}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{category?.name || "..."}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Category Header */}
          <div className="bg-white rounded-xl p-6 mb-6 ring-1 ring-gray-200/80 border-t-4 border-primary">
            <h1 className="flex items-center gap-3 text-3xl md:text-4xl font-bold text-ink">
              <Pennant className="w-4 h-5" />
              {isLoading ? t.loading : category?.name}
            </h1>
            {category?.description && (
              <p className="text-gray-600 mt-3">{category.description}</p>
            )}
            {!isLoading && (
              <p className="text-sm text-gray-500 mt-2">
                {t.totalNews(num(total))}
              </p>
            )}
          </div>

          {/* Articles Grid */}
          {isLoading ? (
            <NewsGridSkeleton count={6} />
          ) : articles.length > 0 ? (
            <>
              <h2 className="sr-only">{t.newsHeading}</h2>
              <NewsGrid articles={articles} columns={3} />

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center mt-8">
                  <button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingMore ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        {t.loading}
                      </>
                    ) : (
                      t.loadMoreNews
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-lg p-12 text-center text-gray-500">
              {t.categoryEmpty}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <PromoSlot placement="sidebar" className="mb-6" />

          {/* Categories List */}
          <div className="bg-white rounded-xl p-4 ring-1 ring-gray-200/80 sticky top-24">
            <SectionTitle title={t.categories} size="small" />

            {isLoading ? (
              <SidebarSkeleton />
            ) : (
              <ul className="space-y-2">
                {allCategories.map((cat) => (
                  <li key={cat.$id}>
                    <Link
                      to={to(`/category/${cat.slug}`)}
                      className={`block px-3 py-2 rounded-md transition-colors ${
                        cat.slug === slug
                          ? "bg-primary text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {cat.icon && <span className="mr-2">{cat.icon}</span>}
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
