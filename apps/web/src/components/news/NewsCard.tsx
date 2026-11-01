/**
 * News Card Component
 *
 * Displays a single news article in card format.
 */

import { Link } from "react-router-dom";
import { m } from "motion/react";
import type { Article } from "@/types";
import { getRelativeTimeNepali } from "@/lib/bs-date";
import { authorLabel, useT } from "@/lib/i18n";
import { getArticleImageSrcSet, getArticleImageUrl } from "@/services/news.service";
import { FadeImage } from "@/components/ui/FadeImage";

interface NewsCardProps {
  article: Article;
  variant?: "default" | "featured" | "compact" | "horizontal";
}

const EASE = [0.16, 1, 0.3, 1] as const;

function BreakingTag({ className = "" }: { className?: string }) {
  const { t } = useT();
  return (
    <span className={`inline-flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-2 py-0.5 rounded ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-white" aria-hidden="true" />
      {t.breaking}
    </span>
  );
}

function When({ article, className = "" }: { article: Article; className?: string }) {
  const iso = article.publishedAt || article.$createdAt;
  const { lang } = useT();
  return (
    <time dateTime={iso} className={className}>
      {getRelativeTimeNepali(iso, lang)}
    </time>
  );
}

export function NewsCard({ article, variant = "default" }: NewsCardProps) {
  const { lang, to } = useT();
  const imageUrl = getArticleImageUrl(article.featuredImage || "", 400, 250);
  const href = to(`/news/${article.slug}`);

  if (variant === "featured") {
    // The page's one load moment: the photo settles, then the headline rises in.
    return (
      <article lang={article.lang} className="group relative overflow-hidden rounded-xl bg-ink">
        <Link to={href} className="block">
          <m.div
            className="aspect-[16/10] md:aspect-video overflow-hidden"
            initial={{ scale: 1.06 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.4, ease: EASE }}
          >
            <FadeImage
              src={getArticleImageUrl(article.featuredImage || "", 1000, 560)}
              srcSet={getArticleImageSrcSet(article.featuredImage || "", [480, 768, 1000, 1400], 0.56)}
              sizes="(min-width: 1024px) 66vw, 100vw"
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
              fetchPriority="high"
            />
          </m.div>
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-transparent" />
          <m.div
            className="absolute bottom-0 left-0 right-0 p-5 md:p-7"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: EASE }}
          >
            {article.isBreaking && <BreakingTag className="mb-3" />}
            <h2 className="text-white text-2xl md:text-[2.1rem] font-bold leading-[1.25] line-clamp-3 decoration-2 underline-offset-4 group-hover:underline">
              {article.title}
            </h2>
            <p className="text-white/80 text-sm md:text-base mt-2 line-clamp-2 max-w-2xl">{article.excerpt}</p>
            <div className="flex items-center gap-3 mt-3 text-white/70 text-sm">
              {article.authorName && <span>{authorLabel(article.authorName, lang)}</span>}
              <When article={article} />
            </div>
          </m.div>
        </Link>
      </article>
    );
  }

  if (variant === "horizontal") {
    return (
      <article lang={article.lang} className="group flex gap-4">
        <Link to={href} className="flex-shrink-0 overflow-hidden rounded-lg" tabIndex={-1} aria-hidden="true">
          <FadeImage
            src={getArticleImageUrl(article.featuredImage || "", 200, 130)}
            alt=""
            className="w-32 h-24 md:w-40 md:h-28 object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
            loading="lazy"
          />
        </Link>
        <div className="flex-1 min-w-0 py-0.5">
          <Link to={href}>
            <h3 className="text-ink font-semibold text-[1.05rem] line-clamp-2 transition-colors group-hover:text-primary">{article.title}</h3>
          </Link>
          <p className="text-gray-600 text-sm mt-1 line-clamp-2 hidden md:block">{article.excerpt}</p>
          <When article={article} className="block text-gray-500 text-xs mt-1.5" />
        </div>
      </article>
    );
  }

  if (variant === "compact") {
    return (
      <article lang={article.lang} className="group flex gap-3 py-3 border-b border-gray-100 last:border-0">
        <Link to={href} className="flex-shrink-0 overflow-hidden rounded-md" tabIndex={-1} aria-hidden="true">
          <FadeImage
            src={getArticleImageUrl(article.featuredImage || "", 120, 80)}
            alt=""
            className="w-20 h-16 object-cover"
            loading="lazy"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={href}>
            <h3 className="text-ink text-[0.95rem] font-semibold line-clamp-2 transition-colors group-hover:text-primary">{article.title}</h3>
          </Link>
          <When article={article} className="block text-gray-500 text-xs mt-1" />
        </div>
      </article>
    );
  }

  // Default variant
  return (
    <article lang={article.lang} className="group bg-white rounded-lg overflow-hidden ring-1 ring-gray-200/80">
      <Link to={href} tabIndex={-1} aria-hidden="true" className="block">
        <div className="aspect-video overflow-hidden">
          <FadeImage
            src={imageUrl}
            srcSet={getArticleImageSrcSet(article.featuredImage || "", [320, 400, 640, 800], 0.5625)}
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
            loading="lazy"
          />
        </div>
      </Link>
      <div className="p-4">
        {article.isBreaking && <BreakingTag className="mb-2" />}
        <Link to={href}>
          <h3 className="text-ink font-bold text-lg line-clamp-2 transition-colors group-hover:text-primary">{article.title}</h3>
        </Link>
        <p className="text-gray-600 text-sm mt-2 line-clamp-2">{article.excerpt}</p>
        <When article={article} className="block mt-3 text-gray-500 text-xs" />
      </div>
    </article>
  );
}
