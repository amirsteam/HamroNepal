/**
 * News Detail Page
 *
 * Displays a single article with full content.
 */

import { useState, useEffect } from "react";
import DOMPurify from "dompurify";

// Links to other sites (e.g. the "स्रोत:" credit) open in a new tab.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A" && /^https?:\/\//i.test(node.getAttribute("href") || "")) {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer nofollow");
  }
});
import { useParams, Link } from "react-router-dom";
import type { Article, Category } from "@/types";
import {
  getArticleBySlug,
  getRelatedArticles,
  incrementViewCount,
  getArticleImageUrl,
  getArticleImageSrcSet,
} from "@/services/news.service";
import { getCategoryById } from "@/services/categories.service";
import { NewsCard } from "@/components/news/NewsCard";
import { ArticleDetailSkeleton, SidebarSkeleton } from "@/components/ui";
import { ErrorState } from "@/components/ui/ErrorState";
import { ImageCredit } from "@/components/news/ImageCredit";
import { PromoSlot } from "@/components/promo";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Pennant } from "@/components/ui/Pennant";
import { formatDualDate } from "@/lib/bs-date";
import { STRINGS, useT } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { setCanonical } from "@/lib/seo";

/**
 * Whole months since publishing, for the notice on a retired story. Measured
 * from publishedAt rather than retiredAt so the number keeps growing with the
 * story's real age.
 */
function monthsSince(publishedAt: string): number {
  const then = new Date(publishedAt);
  const now = new Date();
  const months =
    (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth());
  return Math.max(1, now.getDate() < then.getDate() ? months - 1 : months);
}

export function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { lang, t, to, num, author } = useT();
  const settings = useSettings();

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

  const dates = article?.publishedAt
    ? formatDualDate(article.publishedAt, lang)
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
              <div lang={article.lang} className="bg-white rounded-xl ring-1 ring-gray-200/80 overflow-hidden">
                {untranslated && (
                  <p lang="en" className="px-6 py-3 bg-secondary/10 text-sm text-secondary-dark border-b border-secondary/20">
                    {t.notTranslated}{" "}
                    <Link to={`/news/${article.slug}`} className="font-semibold underline underline-offset-2">
                      {t.readInNepali}
                    </Link>
                  </p>
                )}
                {/* Article Header */}
                <div className="p-6 pb-0 text-center">
                  {/* Category Badge. tracking-wide, not uppercase: Devanagari has no case. */}
                  {category && (
                    <Link
                      to={to(`/category/${category.slug}`)}
                      lang={lang}
                      className="inline-block bg-primary text-white text-xs font-bold tracking-wide px-4 py-1.5 rounded-full mb-4"
                    >
                      {category.name}
                    </Link>
                  )}

                  {/* Title. font-extrabold is 800, the top of the Anek 87.5% range;
                      the width itself comes from the base h1 rule, so don't set it here. */}
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-ink leading-tight mb-5">
                    {article.title}
                  </h1>

                  {/* Byline: the site's mark, the writer, and when it ran */}
                  <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-gray-500 mb-6">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full ring-2 ring-primary/15 bg-white overflow-hidden">
                        {settings.logoUrl ? (
                          <img src={settings.logoUrl} alt="" className="w-full h-full object-contain p-1" />
                        ) : (
                          <Pennant className="w-3.5 h-4" />
                        )}
                      </span>
                      <span className="font-medium text-ink">{author(article.authorName)}</span>
                    </div>

                    {dates && (
                      <div className="flex items-center flex-wrap justify-center gap-x-1">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="font-medium text-gray-800">
                          {dates.weekday}, {dates.bs}
                        </span>
                        <span className="text-gray-400 mx-1">•</span>
                        <span className="text-gray-500">{dates.ad}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Retired by the monthly archive job: say so, so an old story
                    arriving from a search result isn't mistaken for today's news. */}
                {article.retiredAt && article.publishedAt && (
                  <div className="px-6 mb-4">
                    <p
                      role="note"
                      className="border-l-4 border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600"
                    >
                      {t.olderStory(num(monthsSince(article.publishedAt)))}
                    </p>
                  </div>
                )}

                {/* Featured Image */}
                {article.featuredImage && (
                  <figure className="px-6">
                    <img
                      src={getArticleImageUrl(article.featuredImage, 800, 450)}
                      srcSet={getArticleImageSrcSet(article.featuredImage, [480, 800, 1200], 0.5625)}
                      sizes="(min-width: 1024px) 760px, 100vw"
                      fetchPriority="high"
                      decoding="async"
                      alt={article.title}
                      width={800}
                      height={450}
                      className="w-full h-auto aspect-video object-cover rounded-lg bg-gray-100"
                    />
                    <ImageCredit credit={article.imageCredit} className="mt-2" />
                  </figure>
                )}

                {/* Excerpt */}
                <div className="px-6 py-4">
                  <p className="text-lg md:text-xl leading-relaxed text-ink font-medium border-l-4 border-primary pl-4">
                    {article.excerpt}
                  </p>
                </div>

                {/* Content */}
                <div
                  className="px-6 pb-6 article-content"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content, { ADD_ATTR: ["target"] }) }}
                />

                <PromoSlot placement="article" className="px-6 pb-6" />

                {article.source?.type === "ai" && (
                  <p lang={untranslated ? "ne" : lang} className="px-6 pb-4 text-xs text-gray-500">
                    {(untranslated ? STRINGS.ne : t).aiNote(article.source.name)}
                  </p>
                )}

                {/* Tags (Nepali words: shown on the Nepali site only) */}
                {lang === "ne" && article.tags && article.tags.length > 0 && (
                  <div className="px-6 pb-6 pt-4 border-t">
                    <span className="text-gray-500 text-sm mr-2">
                      {t.tags}
                    </span>
                    {article.tags.map((tag) => (
                      <Link
                        key={tag}
                        to={`/search?q=${encodeURIComponent(tag)}`}
                        className="inline-block bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full mr-2 mb-2 hover:bg-gray-200"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Share Buttons */}
                {/* The view count lives here rather than in the byline, which the
                    design keeps to the writer and the date. */}
                <div className="px-6 py-4 bg-gray-50 border-t flex flex-wrap items-center gap-4">
                  <span lang={lang} className="text-gray-600 font-medium">
                    {t.share}
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

                  <div className="flex items-center gap-1 text-sm text-gray-500 sm:ml-auto">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
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
                    {t.views(num(article.viewCount))}
                  </div>
                </div>
              </div>
            )
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
