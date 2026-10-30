/**
 * News Card Component
 *
 * Displays a single news article in card format.
 */

import type { SyntheticEvent } from "react";
import { Link } from "react-router-dom";
import type { Article } from "@/types";
import { getRelativeTimeNepali } from "@/lib/bs-date";
import { getArticleImageUrl, PLACEHOLDER } from "@/services/news.service";

/** Swap a broken image for the placeholder (once, to avoid loops). */
function useFallbackImage(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (!img.src.endsWith(PLACEHOLDER)) img.src = PLACEHOLDER;
}

interface NewsCardProps {
  article: Article;
  variant?: "default" | "featured" | "compact" | "horizontal";
}

export function NewsCard({ article, variant = "default" }: NewsCardProps) {
  const imageUrl = getArticleImageUrl(article.featuredImage || "", 400, 250);

  if (variant === "featured") {
    return (
      <article className="group relative overflow-hidden rounded-lg bg-gray-900">
        <Link to={`/news/${article.slug}`}>
          <div className="aspect-video">
            <img
              src={imageUrl}
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              onError={useFallbackImage}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            {article.isBreaking && (
              <span className="inline-block bg-primary text-white text-xs font-bold px-2 py-1 rounded mb-2">
                ब्रेकिङ
              </span>
            )}
            <h2 className="text-white text-xl md:text-2xl font-bold leading-tight line-clamp-3 group-hover:underline">
              {article.title}
            </h2>
            <p className="text-gray-300 text-sm mt-2 line-clamp-2">
              {article.excerpt}
            </p>
            <div className="flex items-center mt-3 text-gray-300 text-sm">
              <span>{article.authorName}</span>
              <span className="mx-2">•</span>
              <span>
                {getRelativeTimeNepali(
                  article.publishedAt || article.$createdAt
                )}
              </span>
            </div>
          </div>
        </Link>
      </article>
    );
  }

  if (variant === "horizontal") {
    return (
      <article className="group flex gap-4 bg-white rounded-lg overflow-hidden hover:shadow-md transition-shadow">
        <Link to={`/news/${article.slug}`} className="flex-shrink-0">
          <img
            src={getArticleImageUrl(article.featuredImage || "", 200, 130)}
            alt={article.title}
            className="w-32 h-24 md:w-40 md:h-28 object-cover rounded-lg"
            loading="lazy"
            onError={useFallbackImage}
          />
        </Link>
        <div className="flex-1 py-1">
          <Link to={`/news/${article.slug}`}>
            <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-primary transition-colors">
              {article.title}
            </h3>
          </Link>
          <p className="text-gray-500 text-sm mt-1 line-clamp-2 hidden md:block">
            {article.excerpt}
          </p>
          <div className="text-gray-500 text-xs mt-2">
            {getRelativeTimeNepali(article.publishedAt || article.$createdAt)}
          </div>
        </div>
      </article>
    );
  }

  if (variant === "compact") {
    return (
      <article className="group flex gap-3 py-3 border-b border-gray-100 last:border-0">
        <Link to={`/news/${article.slug}`} className="flex-shrink-0">
          <img
            src={getArticleImageUrl(article.featuredImage || "", 120, 80)}
            alt={article.title}
            className="w-20 h-16 object-cover rounded"
            loading="lazy"
            onError={useFallbackImage}
          />
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/news/${article.slug}`}>
            <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-primary transition-colors">
              {article.title}
            </h3>
          </Link>
          <span className="text-gray-500 text-xs mt-1 block">
            {getRelativeTimeNepali(article.publishedAt || article.$createdAt)}
          </span>
        </div>
      </article>
    );
  }

  // Default variant
  return (
    <article className="group bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <Link to={`/news/${article.slug}`}>
        <div className="aspect-video overflow-hidden">
          <img
            src={imageUrl}
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={useFallbackImage}
          />
        </div>
      </Link>
      <div className="p-4">
        {article.isBreaking && (
          <span className="inline-block bg-primary text-white text-xs font-bold px-2 py-0.5 rounded mb-2">
            ब्रेकिङ
          </span>
        )}
        <Link to={`/news/${article.slug}`}>
          <h3 className="font-bold text-gray-900 line-clamp-2 group-hover:text-primary transition-colors">
            {article.title}
          </h3>
        </Link>
        <p className="text-gray-600 text-sm mt-2 line-clamp-2">
          {article.excerpt}
        </p>
        <div className="flex items-center mt-3 text-gray-500 text-xs">
          <span>{article.authorName}</span>
          <span className="mx-2">•</span>
          <span>
            {getRelativeTimeNepali(article.publishedAt || article.$createdAt)}
          </span>
        </div>
      </div>
    </article>
  );
}
