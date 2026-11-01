/**
 * Home Page
 *
 * Displays featured news, breaking news, and latest articles.
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useT } from "@/lib/i18n";
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
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { PromoSlot } from "@/components/promo";
import { SectionTitle } from "@/components/ui/SectionTitle";

interface HomeData {
  featured: Article[];
  /** Up to 5 articles for the side list next to the top story. */
  side: Article[];
  latest: Article[];
  categories: Category[];
  categoryArticles: Record<string, Article[]>;
  local: Array<{ category: Category; articles: Article[] }>;
}

export function HomePage() {
  const [data, setData] = useState<HomeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { lang, t, to } = useT();

  async function loadData() {
    setIsLoading(true);
    setError(null);

    try {
      const home = await getHomeData(lang);
      const sections = home.sections.slice(0, 3);
      const categoryArticles: Record<string, Article[]> = {};
      for (const s of sections) categoryArticles[s.category.$id] = s.articles;

      // Fall back to the latest news when nothing is marked featured.
      const featured = home.featured.length ? home.featured : home.latest.slice(0, 5);
      // Side list: other featured stories first, topped up with the latest news.
      const seen = new Set([featured[0]?.$id]);
      const side: Article[] = [];
      for (const a of [...featured.slice(1), ...home.latest]) {
        if (side.length >= 5) break;
        if (!seen.has(a.$id)) {
          seen.add(a.$id);
          side.push(a);
        }
      }

      setData({
        featured,
        side,
        latest: home.latest,
        categories: sections.map((s) => s.category),
        categoryArticles,
        local: home.local,
      });
    } catch (err) {
      console.error("Failed to load home page:", err);
      setError(t.homeError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [lang]);

  useDocumentTitle();

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState message={error} onRetry={loadData} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="sr-only">{t.homeHeading}</h1>

      {/* The English site before any story has been translated. */}
      {!isLoading && data && data.latest.length === 0 && (
        <div className="bg-white rounded-xl p-10 ring-1 ring-gray-200/80 text-center text-gray-600 mb-8">
          <p>{t.homeEmpty}</p>
          {t.homeEmptyLink && (
            <Link to="/" lang="ne" className="inline-block mt-3 font-semibold text-primary hover:text-primary-dark">
              {t.homeEmptyLink}
            </Link>
          )}
        </div>
      )}

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
              <div className={data.side.length ? "lg:col-span-2" : "lg:col-span-3"}>
                <NewsCard article={data.featured[0]} variant="featured" />
              </div>

              {/* Side list (hidden when there is nothing else to show) */}
              {data.side.length > 0 && (
              <div className="bg-white rounded-xl p-4 ring-1 ring-gray-200/80">
                <SectionTitle title={t.topStories} size="small" />
                <div className="space-y-0">
                  {data.side.map((article) => (
                    <NewsCard
                      key={article.$id}
                      article={article}
                      variant="compact"
                    />
                  ))}
                </div>
              </div>
              )}
            </div>
          )
        )}
      </section>

      {/* Latest News Section */}
      {(isLoading || !!data?.latest.length) && (
      <section className="mb-10">
        <SectionTitle title={t.latestNews} to={to("/category/all")} linkLabel={t.seeAll} />

        {isLoading ? (
          <NewsGridSkeleton count={6} />
        ) : (
          data?.latest && (
            <NewsGrid articles={data.latest.slice(0, 6)} columns={3} />
          )
        )}
      </section>
      )}

      <PromoSlot placement="home" className="mb-10" />

      {/* Local News (priority locations such as Kavre / Panauti) */}
      {!isLoading &&
        data?.local.map(({ category, articles }) => (
          <section key={category.$id} className="mb-10">
            <SectionTitle title={t.localPrefix(category.name)} to={to(`/category/${category.slug}`)} />
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
              <SectionTitle title={category.name} to={to(`/category/${category.slug}`)} />

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

      {/* A second home banner (a different ad, if there is more than one) */}
      <PromoSlot placement="home" nth={1} className="mb-10" />

      {/* More Latest News */}
      {!isLoading && data?.latest && data.latest.length > 6 && (
        <section className="mb-10">
          <SectionTitle title={t.moreNews} />
          <NewsGrid articles={data.latest.slice(6)} columns={4} />
        </section>
      )}
    </div>
  );
}
