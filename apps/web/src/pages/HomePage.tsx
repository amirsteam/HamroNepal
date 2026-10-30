/**
 * Home Page
 *
 * Displays featured news, breaking news, and latest articles.
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { Article, Category } from "@/types";
import { getHomeData } from "@/services/news.service";
import { NewsCard } from "@/components/news/NewsCard";
import { NewsGrid } from "@/components/news/NewsGrid";
import {
  FeaturedSkeleton,
  NewsGridSkeleton,
  SidebarSkeleton,
} from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";

interface HomeData {
  featured: Article[];
  latest: Article[];
  categories: Category[];
  categoryArticles: Record<string, Article[]>;
  local: Array<{ category: Category; articles: Article[] }>;
}

export function HomePage() {
  const [data, setData] = useState<HomeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setIsLoading(true);
    setError(null);

    try {
      const home = await getHomeData();
      const sections = home.sections.slice(0, 3);
      const categoryArticles: Record<string, Article[]> = {};
      for (const s of sections) categoryArticles[s.category.$id] = s.articles;

      setData({
        // Fall back to the latest news when nothing is marked featured.
        featured: home.featured.length ? home.featured : home.latest.slice(0, 5),
        latest: home.latest,
        categories: sections.map((s) => s.category),
        categoryArticles,
        local: home.local,
      });
    } catch (err) {
      console.error("Failed to load home page:", err);
      setError("गृहपृष्ठ लोड गर्न सकिएन।");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState message={error} onRetry={loadData} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Featured Section */}
      <section className="mb-8">
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <FeaturedSkeleton />
            </div>
            <div>
              <SidebarSkeleton />
            </div>
          </div>
        ) : (
          data?.featured &&
          data.featured.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Featured */}
              <div className="lg:col-span-2">
                <NewsCard article={data.featured[0]} variant="featured" />
              </div>

              {/* Side Featured List */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-primary">
                  मुख्य समाचार
                </h3>
                <div className="space-y-0">
                  {data.featured.slice(1, 6).map((article) => (
                    <NewsCard
                      key={article.$id}
                      article={article}
                      variant="compact"
                    />
                  ))}
                </div>
              </div>
            </div>
          )
        )}
      </section>

      {/* Latest News Section */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 relative">
            <span className="border-b-4 border-primary pb-2">ताजा समाचार</span>
          </h2>
          <Link
            to="/category/all"
            className="text-primary hover:underline font-medium"
          >
            सबै हेर्नुहोस् →
          </Link>
        </div>

        {isLoading ? (
          <NewsGridSkeleton count={6} />
        ) : (
          data?.latest && (
            <NewsGrid articles={data.latest.slice(0, 6)} columns={3} />
          )
        )}
      </section>

      {/* Local News (priority locations such as Kavre / Panauti) */}
      {!isLoading &&
        data?.local.map(({ category, articles }) => (
          <section key={category.$id} className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 relative">
                <span className="border-b-4 border-secondary pb-2">स्थानीय: {category.name}</span>
              </h2>
              <Link to={`/category/${category.slug}`} className="text-primary hover:underline font-medium">
                थप हेर्नुहोस् →
              </Link>
            </div>
            <NewsGrid articles={articles.slice(0, 4)} columns={4} />
          </section>
        ))}

      {/* Category Sections */}
      {!isLoading &&
        data?.categories.slice(0, 3).map((category) => {
          const articles = data.categoryArticles[category.$id] || [];
          if (articles.length === 0) return null;

          return (
            <section key={category.$id} className="mb-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 relative">
                  <span className="border-b-4 border-primary pb-2">
                    {category.name}
                  </span>
                </h2>
                <Link
                  to={`/category/${category.slug}`}
                  className="text-primary hover:underline font-medium"
                >
                  थप हेर्नुहोस् →
                </Link>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Main article */}
                {articles[0] && (
                  <div className="lg:col-span-2">
                    <NewsCard article={articles[0]} variant="default" />
                  </div>
                )}

                {/* Side articles */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {articles.slice(1, 5).map((article) => (
                    <NewsCard
                      key={article.$id}
                      article={article}
                      variant="horizontal"
                    />
                  ))}
                </div>
              </div>
            </section>
          );
        })}

      {/* More Latest News */}
      {!isLoading && data?.latest && data.latest.length > 6 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 relative">
              <span className="border-b-4 border-primary pb-2">
                अन्य समाचार
              </span>
            </h2>
          </div>
          <NewsGrid articles={data.latest.slice(6)} columns={4} />
        </section>
      )}
    </div>
  );
}
