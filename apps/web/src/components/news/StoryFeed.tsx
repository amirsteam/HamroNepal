/**
 * Phones: the article page as a continuous feed. The story the reader opened
 * comes first; as they scroll on, the next stories (latest news, from
 * GET /articles/:id/next) follow below with the same card: photo, title, key
 * points, "पूरा लेख पढ्नुहोस्".
 *
 * The address bar, tab title and canonical link follow the story on screen
 * (history.replaceState, so Back still leaves the feed in one step), and each
 * story counts one view when it is first read. After MAX_STORIES the feed ends
 * and the related list and footer follow as usual.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { m } from "motion/react";
import type { Article, Category } from "@/types";
import { getNextArticle, incrementViewCount } from "@/services/news.service";
import { getCategoryById } from "@/services/categories.service";
import { ArticleCard } from "@/components/news/ArticleCard";
import { ArticleDetailSkeleton } from "@/components/ui";
import { Pennant } from "@/components/ui/Pennant";
import { useT } from "@/lib/i18n";
import { setCanonical } from "@/lib/seo";

/** Stories in one feed, the opened one included. */
const MAX_STORIES = 10;
/** Start loading the next story this far before the reader reaches the end. */
const PRELOAD = "1200px";

interface Story {
  article: Article;
  category: Category | null;
}

interface Props {
  first: Article;
  firstCategory: Category | null;
}

export function StoryFeed({ first, firstCategory }: Props) {
  const { lang, t, to } = useT();
  const [extra, setExtra] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(false);
  const [nearEnd, setNearEnd] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef(new Map<string, HTMLElement>());
  /** The opened story's view is counted by the page. */
  const viewed = useRef(new Set([first.$id]));
  const currentId = useRef(first.$id);

  const stories: Story[] = [{ article: first, category: firstCategory }, ...extra];

  // ---- loading the next story -------------------------------------------
  const loadNext = useCallback(async () => {
    const last = extra.length ? extra[extra.length - 1].article : first;
    setLoading(true);
    setFailed(false);
    try {
      const next = await getNextArticle(last.$id, lang);
      // null, or back round to a story already shown (the feed wrapped): stop.
      if (!next || next.$id === first.$id || extra.some((s) => s.article.$id === next.$id)) {
        setDone(true);
        return;
      }
      const category = await getCategoryById(next.categoryId, lang).catch(() => null);
      setExtra((list) => [...list, { article: next, category }]);
      if (extra.length + 2 >= MAX_STORIES) setDone(true);
    } catch (err) {
      console.error("Failed to load the next story:", err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [extra, first, lang]);

  // The sentinel after the last card says when the reader is getting close.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || done) return;
    const io = new IntersectionObserver(([entry]) => setNearEnd(entry.isIntersecting), {
      rootMargin: `${PRELOAD} 0px ${PRELOAD} 0px`,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [done]);

  // Runs again after each story is added, in case the sentinel is still near.
  useEffect(() => {
    if (nearEnd && !loading && !failed && !done) loadNext();
  }, [nearEnd, loading, failed, done, loadNext]);

  // ---- the story on screen ---------------------------------------------
  const onCurrent = useCallback(
    (article: Article) => {
      if (currentId.current === article.$id) return;
      currentId.current = article.$id;
      const path = to(`/news/${article.slug}`);
      // Keep the router's own state (idx/key) so Back leaves the feed in one step.
      window.history.replaceState(window.history.state, "", path);
      document.title = `${article.title} - ${t.siteName}`;
      // An untranslated story on the English site is indexed at its Nepali address.
      setCanonical(lang === "en" && article.lang === "ne" ? `/news/${encodeURIComponent(article.slug)}` : path);
      if (!viewed.current.has(article.$id)) {
        viewed.current.add(article.$id);
        incrementViewCount(article.$id);
      }
    },
    [lang, t, to]
  );

  // A thin line at 40% of the screen: the card crossing it is the one being read.
  useEffect(() => {
    const byId = new Map(stories.map((s) => [s.article.$id, s.article]));
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const article = byId.get((entry.target as HTMLElement).dataset.storyId ?? "");
          if (article) onCurrent(article);
        }
      },
      { rootMargin: "-40% 0px -59% 0px" }
    );
    for (const el of cardsRef.current.values()) io.observe(el);
    return () => io.disconnect();
    // stories is rebuilt every render; the ids are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extra.length, onCurrent]);

  const cardRef = (id: string) => (el: HTMLElement | null) => {
    if (el) cardsRef.current.set(id, el);
    else cardsRef.current.delete(id);
  };

  return (
    <div>
      {stories.map(({ article, category }, i) =>
        i === 0 ? (
          <div key={article.$id} ref={cardRef(article.$id)} data-story-id={article.$id}>
            <ArticleCard article={article} category={category} isPhone />
          </div>
        ) : (
          <m.div
            key={article.$id}
            ref={cardRef(article.$id)}
            data-story-id={article.$id}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -10% 0px" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Where one story ends and the next begins */}
            <div className="flex items-center gap-3 py-6" aria-hidden="true">
              <span className="h-px flex-1 bg-gray-300" />
              <span className="flex items-center gap-2 text-sm font-bold text-secondary">
                <Pennant className="w-3 h-3.5" />
                {t.nextStory}
              </span>
              <span className="h-px flex-1 bg-gray-300" />
            </div>
            <ArticleCard article={article} category={category} isPhone />
          </m.div>
        )
      )}

      {!done && (
        <div ref={sentinelRef} className="pt-6">
          {failed ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={loadNext}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-secondary ring-1 ring-gray-200"
              >
                {t.nextStory}: {t.retry}
              </button>
            </div>
          ) : (
            loading && <ArticleDetailSkeleton />
          )}
        </div>
      )}
    </div>
  );
}
