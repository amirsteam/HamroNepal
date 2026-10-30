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
import { toNepaliDigits } from "@/lib/bs-date";

/** "/category/all" lists every published article. */
const ALL_NEWS: Category = {
  $id: "all",
  $createdAt: "",
  $updatedAt: "",
  name: "ताजा समाचार",
  slug: "all",
  sortOrder: 0,
  isActive: true,
  type: "topic",
};

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

  function fetchPage(cat: Category, offset: number) {
    const page = { limit: ITEMS_PER_PAGE, offset };
    return cat.$id === ALL_NEWS.$id ? getPublishedArticles(page) : getArticlesByCategory(cat.$id, page);
  }

  async function loadCategory() {
    if (!slug) return;

    setIsLoading(true);
    setError(null);
    setPage(0);
    setArticles([]);

    try {
      const [cat, cats] = await Promise.all([
        slug === "all" ? Promise.resolve(ALL_NEWS) : getCategoryBySlug(slug),
        getCategories(),
      ]);

      if (!cat) {
        setError("श्रेणी भेटिएन।");
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
      setError("श्रेणी लोड गर्न सकिएन।");
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
  }, [slug]);

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
      <nav className="text-sm text-gray-500 mb-4">
        <Link to="/" className="hover:text-primary">
          गृहपृष्ठ
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{category?.name || "..."}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Category Header */}
          <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
            <h1 className="text-3xl font-bold text-gray-900 border-b-4 border-primary pb-2 inline-block">
              {isLoading ? "लोड हुँदैछ..." : category?.name}
            </h1>
            {category?.description && (
              <p className="text-gray-600 mt-3">{category.description}</p>
            )}
            {!isLoading && (
              <p className="text-sm text-gray-500 mt-2">
                कुल {toNepaliDigits(total)} समाचार
              </p>
            )}
          </div>

          {/* Articles Grid */}
          {isLoading ? (
            <NewsGridSkeleton count={6} />
          ) : articles.length > 0 ? (
            <>
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
                        लोड हुँदैछ...
                      </>
                    ) : (
                      "थप समाचार हेर्नुहोस्"
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-lg p-12 text-center text-gray-500">
              यस श्रेणीमा कुनै समाचार छैन।
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Categories List */}
          <div className="bg-white rounded-lg p-4 shadow-sm sticky top-24">
            <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-primary">
              श्रेणीहरू
            </h3>

            {isLoading ? (
              <SidebarSkeleton />
            ) : (
              <ul className="space-y-2">
                {allCategories.map((cat) => (
                  <li key={cat.$id}>
                    <Link
                      to={`/category/${cat.slug}`}
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
