/**
 * The phone article body: the story's key points first, the full text behind
 * "पूरा लेख पढ्नुहोस्". Scrolling back up to the key points closes it again.
 *
 * The full text stays in the page while closed (height 0, inert), so search
 * engines and the browser's find still see it.
 */

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { m, useReducedMotion } from "motion/react";
import type { Article } from "@/types";
import { useT } from "@/lib/i18n";

const EASE = [0.16, 1, 0.3, 1] as const;

interface Props {
  article: Article;
  /** The body HTML, already sanitized. */
  html: string;
  /** Shown after the text inside the full story (ad, AI note, tags, share bar), full card width. */
  footer?: ReactNode;
}

export function MobileArticleBody({ article, html, footer }: Props) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const fullRef = useRef<HTMLDivElement>(null);
  const fullId = useId();
  const points = (article.keyPoints ?? []).filter(Boolean).slice(0, 3);
  const hasPoints = points.length > 0;

  // Close when the reader scrolls back up to the key points. Only after they
  // have scrolled into the story, so a small scroll right after opening
  // doesn't snap it shut.
  useEffect(() => {
    if (!open) return;
    let lastY = window.scrollY;
    let reading = false;
    let frame = 0;
    const check = () => {
      frame = 0;
      const el = fullRef.current;
      if (!el) return;
      const y = window.scrollY;
      const goingUp = y < lastY - 1;
      lastY = y;
      const top = el.getBoundingClientRect().top;
      if (top < window.innerHeight * 0.35) reading = true;
      if (reading && goingUp && top > window.innerHeight * 0.6) setOpen(false);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [open]);

  return (
    <div className="pt-4">
      <div className="px-6 pb-2">
        {/* Key points (or, until a story has them, its excerpt) */}
        <section className="rounded-2xl bg-secondary/[0.07] ring-1 ring-secondary/15 px-4 py-4">
          {hasPoints ? (
            <>
              <h2 className="text-sm font-bold text-secondary tracking-wide">{t.keyPoints}</h2>
              <ul className="mt-3 space-y-3">
                {points.map((point) => (
                  <li key={point} className="flex gap-3 text-[1.0625rem] leading-relaxed text-ink">
                    <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-[1.0625rem] leading-relaxed text-ink font-medium">{article.excerpt}</p>
          )}
        </section>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={fullId}
          className="mt-2 -ml-1 inline-flex items-center gap-2 rounded-lg px-1 py-2.5 font-semibold text-secondary hover:text-secondary-dark focus-visible:outline-2 focus-visible:outline-secondary"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.04A8.97 8.97 0 0 0 6 3.75c-1.05 0-2.06.18-3 .51v14.25A8.99 8.99 0 0 1 6 18c2.3 0 4.4.87 6 2.29m0-14.25a8.97 8.97 0 0 1 6-2.29c1.05 0 2.06.18 3 .51v14.25A8.99 8.99 0 0 0 18 18a8.97 8.97 0 0 0-6 2.29m0-14.25v14.25"
            />
          </svg>
          {open ? t.hideFull : t.readFull}
          <svg
            className={`h-4 w-4 transition-transform duration-300 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* The full story, then the footer */}
      <m.div
        id={fullId}
        ref={fullRef}
        initial={false}
        animate={open ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.45, ease: EASE }}
        inert={!open}
        className="overflow-hidden"
      >
        <div className="px-6">
          <div className="mt-2 mb-6 rounded-2xl bg-reading ring-1 ring-black/5 px-4 pt-5 pb-1">
            {hasPoints && article.excerpt && (
              <p className="mb-4 text-lg leading-relaxed text-ink font-medium border-l-4 border-primary pl-4">
                {article.excerpt}
              </p>
            )}
            <div className="article-content" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
        {footer}
      </m.div>
    </div>
  );
}
