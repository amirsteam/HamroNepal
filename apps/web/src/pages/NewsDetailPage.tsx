/**
 * News Detail Page
 *
 * Displays a single article with full content.
 */

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import type { Article, Category } from "@/types";
import {
  getArticleBySlug,
  getRelatedArticles,
  incrementViewCount,
  getArticleImageUrl,
} from "@/services/news.service";
import { getCategoryById } from "@/services/categories.service";
import { NewsCard } from "@/components/news/NewsCard";
import { ArticleDetailSkeleton, SidebarSkeleton } from "@/components/ui";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDualDate, toNepaliDigits } from "@/lib/bs-date";

export function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadArticle() {
    if (!slug) return;

    setIsLoading(true);
    setError(null);

    try {
      const art = await getArticleBySlug(slug);

      if (!art) {
        setError("समाचार भेटिएन।");
        setIsLoading(false);
        return;
      }

      setArticle(art);

      // Increment view count (fire and forget)
      incrementViewCount(art.$id);

      // Load category and related articles
      const [cat, related] = await Promise.all([
        getCategoryById(art.categoryId),
        getRelatedArticles(art.$id, art.categoryId, 5),
      ]);

      setCategory(cat);
      setRelatedArticles(related);
    } catch (err) {
      console.error("Failed to load article:", err);
      setError("समाचार लोड गर्न सकिएन।");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadArticle();
    // Scroll to top on article change
    window.scrollTo(0, 0);
  }, [slug]);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState message={error} onRetry={loadArticle} />
      </div>
    );
  }

  const dates = article?.publishedAt
    ? formatDualDate(article.publishedAt)
    : null;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <article className="lg:col-span-2">
          {isLoading ? (
            <ArticleDetailSkeleton />
          ) : (
            article && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {/* Article Header */}
                <div className="p-6 pb-0">
                  {/* Category Badge */}
                  {category && (
                    <Link
                      to={`/category/${category.slug}`}
                      className="inline-block bg-primary text-white text-sm font-medium px-3 py-1 rounded mb-4"
                    >
                      {category.name}
                    </Link>
                  )}

                  {/* Title */}
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-4">
                    {article.title}
                  </h1>

                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6 pb-4 border-b">
                    <div className="flex items-center">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      {article.authorName}
                    </div>

                    {dates && (
                      <div className="flex items-center flex-wrap gap-x-1">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="font-medium text-gray-800">
                          {dates.bs}
                        </span>
                        <span className="text-gray-400 mx-1">•</span>
                        <span className="text-gray-500">{dates.ad}</span>
                      </div>
                    )}

                    <div className="flex items-center">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      {toNepaliDigits(article.viewCount)} पटक हेरिएको
                    </div>
                  </div>
                </div>

                {/* Featured Image */}
                {article.featuredImage && (
                  <div className="px-6">
                    <img
                      src={getArticleImageUrl(article.featuredImage, 800, 450)}
                      alt={article.title}
                      className="w-full rounded-lg"
                    />
                  </div>
                )}

                {/* Excerpt */}
                <div className="px-6 py-4">
                  <p className="text-lg text-gray-700 font-medium border-l-4 border-primary pl-4 italic">
                    {article.excerpt}
                  </p>
                </div>

                {/* Content */}
                <div
                  className="px-6 pb-6 article-content"
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />

                {/* Tags */}
                {article.tagIds && article.tagIds.length > 0 && (
                  <div className="px-6 pb-6 pt-4 border-t">
                    <span className="text-gray-500 text-sm mr-2">
                      ट्यागहरू:
                    </span>
                    {article.tagIds.map((tagId) => (
                      <span
                        key={tagId}
                        className="inline-block bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full mr-2 mb-2"
                      >
                        #{tagId}
                      </span>
                    ))}
                  </div>
                )}

                {/* Share Buttons */}
                <div className="px-6 py-4 bg-gray-50 border-t flex items-center gap-4">
                  <span className="text-gray-600 font-medium">
                    सेयर गर्नुहोस्:
                  </span>
                  <button
                    onClick={() =>
                      window.open(
                        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                          window.location.href
                        )}&quote=${encodeURIComponent(article.title + " - " + article.excerpt)}`,
                        "_blank"
                      )
                    }
                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                    aria-label="Share on Facebook"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z" />
                    </svg>
                  </button>
                  <button
                    onClick={() =>
                      window.open(
                        `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                          article.title + "\n\n" + article.excerpt + "\n\n" + window.location.href
                        )}`,
                        "_blank"
                      )
                    }
                    className="p-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
                    aria-label="Share on X"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </button>
                  <button
                    onClick={() =>
                      window.open(
                        `https://api.whatsapp.com/send?text=${encodeURIComponent(
                          article.title + "\n\n" + article.excerpt + "\n\n" + window.location.href
                        )}`,
                        "_blank"
                      )
                    }
                    className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                    aria-label="Share on WhatsApp"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          )}
        </article>

        {/* Sidebar */}
        <aside className="lg:col-span-1">
          {/* Related Articles */}
          <div className="bg-white rounded-lg p-4 shadow-sm sticky top-24">
            <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-primary">
              सम्बन्धित समाचार
            </h3>

            {isLoading ? (
              <SidebarSkeleton />
            ) : relatedArticles.length > 0 ? (
              <div className="space-y-0">
                {relatedArticles.map((art) => (
                  <NewsCard key={art.$id} article={art} variant="compact" />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                कुनै सम्बन्धित समाचार भेटिएन।
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
