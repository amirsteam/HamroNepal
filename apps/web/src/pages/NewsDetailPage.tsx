/**
 * News Detail Page
 *
 * Displays a single article with full content. On phones the story is the
 * first of a continuous feed (StoryFeed): the next stories follow below it.
 */

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import type { Article, Category } from "@/types";
import { getArticleBySlug, getRelatedArticles, incrementViewCount } from "@/services/news.service";
import { getCategoryById } from "@/services/categories.service";
import { NewsCard } from "@/components/news/NewsCard";
import { ArticleCard } from "@/components/news/ArticleCard";
import { StoryFeed } from "@/components/news/StoryFeed";
import { ArticleDetailSkeleton, SidebarSkeleton } from "@/components/ui";
import { ErrorState } from "@/components/ui/ErrorState";
import { PromoSlot } from "@/components/promo";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useT } from "@/lib/i18n";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { setCanonical } from "@/lib/seo";
import { PHONE_QUERY, useMediaQuery } from "@/lib/useMediaQuery";

export function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { lang, t } = useT();
  const isPhone = useMediaQuery(PHONE_QUERY);

  async function loadArticle() {
    if (!slug) return;

    setIsLoading(true);
    setError(null);

    try {
      const art = await getArticleBySlug(slug, lang);

      if (!art) {
        setError(t.articleNotFound);
        setIsLoading(false);
        return;
      }

      setArticle(art);

      // Increment view count (fire and forget)
      incrementViewCount(art.$id);

      // Load category and related articles
      const [cat, related] = await Promise.all([
        getCategoryById(art.categoryId, lang),
        getRelatedArticles(art.$id, art.categoryId, 5, lang),
      ]);

      setCategory(cat);
      setRelatedArticles(related);
    } catch (err) {
      console.error("Failed to load article:", err);
      setError(t.articleError);
    } finally {
      setIsLoading(false);
    }
  }

  // Scrolling to the top on a new article is done by <ScrollRestoration /> in Layout.
  useEffect(() => {
    loadArticle();
  }, [slug, lang]);

  useDocumentTitle(article?.title);

  // On the English site, a story not translated yet comes back in Nepali.
  const untranslated = lang === "en" && article?.lang === "ne";
  // Its English address shows the Nepali text, so the Nepali page is the one to index.
  useEffect(() => {
    if (untranslated && article) setCanonical(`/news/${encodeURIComponent(article.slug)}`);
  }, [untranslated, article]);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState message={error} onRetry={loadArticle} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <article className="lg:col-span-2">
          {isLoading ? (
            <ArticleDetailSkeleton />
          ) : (
            article &&
            (isPhone ? (
              // Phones: this story, then the next ones as the reader scrolls on.
              <StoryFeed key={`${lang}:${article.$id}`} first={article} firstCategory={category} />
            ) : (
              <ArticleCard article={article} category={category} isPhone={false} />
            ))
          )}
        </article>

        {/* Sidebar */}
        <aside className="lg:col-span-1">
          <PromoSlot placement="sidebar" className="mb-6" />

          {/* Related Articles */}
          <div className="bg-white rounded-xl p-4 ring-1 ring-gray-200/80 sticky top-24">
            <SectionTitle title={t.related} size="small" />

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
                {t.noRelated}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
