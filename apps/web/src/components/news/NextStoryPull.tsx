/**
 * Phone reader: the next story. At the very bottom of the page, pulling up
 * (touch) or wheeling down a little further opens it; the card at the end of
 * the article is also a plain link to it.
 *
 * Only a fresh gesture counts: one that starts once the page is already at the
 * bottom, so a fast scroll down doesn't fly straight into the next story.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Article } from "@/types";
import { useT } from "@/lib/i18n";

/** Finger travel (px) past the bottom that opens the next story. */
const PULL = 90;
/** Wheel distance past the bottom, within one burst. */
const WHEEL = 250;
/** Wheel events further apart than this start a new burst. */
const WHEEL_GAP_MS = 600;
/** The page must sit at the bottom this long before a wheel burst counts. */
const SETTLE_MS = 350;

const atBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;

export function NextStoryPull({ next }: { next: Article }) {
  const { t, to } = useT();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const href = to(`/news/${next.slug}`);
  const gone = useRef(false);

  const go = useCallback(() => {
    if (gone.current) return;
    gone.current = true;
    // The arriving page slides the new story in (state.next).
    navigate(href, { state: { next: true } });
  }, [navigate, href]);

  useEffect(() => {
    gone.current = false;
    let startY: number | null = null;
    let pull = 0;
    let bottomSince = atBottom() ? performance.now() : 0;
    let wheel = 0;
    let lastWheel = 0;

    const onScroll = () => {
      if (!atBottom()) bottomSince = 0;
      else if (!bottomSince) bottomSince = performance.now();
    };
    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches.length === 1 && atBottom() ? e.touches[0].clientY : null;
      pull = 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (startY === null) return;
      pull = Math.max(0, startY - e.touches[0].clientY);
      setProgress(Math.min(1, pull / PULL));
    };
    const onTouchEnd = () => {
      if (startY !== null && pull >= PULL) go();
      startY = null;
      pull = 0;
      setProgress(0);
    };
    const onWheel = (e: WheelEvent) => {
      const now = performance.now();
      if (e.deltaY <= 0 || !bottomSince || now - bottomSince < SETTLE_MS) {
        wheel = 0;
        setProgress(0);
        return;
      }
      if (now - lastWheel > WHEEL_GAP_MS) wheel = 0;
      lastWheel = now;
      wheel += e.deltaY;
      setProgress(Math.min(1, wheel / WHEEL));
      if (wheel >= WHEEL) go();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("wheel", onWheel);
    };
  }, [go]);

  // A wheel burst that stops short shouldn't leave the indicator half full.
  useEffect(() => {
    if (!progress) return;
    const timer = setTimeout(() => setProgress(0), WHEEL_GAP_MS + 100);
    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <>
      {/* End of the story: what comes next */}
      <Link
        to={href}
        state={{ next: true }}
        className="mt-4 flex items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-gray-200/80"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m5 15 7-7 7 7" />
          </svg>
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-secondary">{t.nextStory}</span>
          <span className="block truncate font-display font-bold text-ink">{next.title}</span>
        </span>
      </Link>

      {/* While pulling at the bottom of the page */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center transition-[opacity,transform] duration-200 motion-reduce:transition-none"
        style={{ opacity: progress ? 1 : 0, transform: `translateY(${progress ? 0 : 16}px)` }}
      >
        <div className="relative flex max-w-[90%] items-center gap-2 overflow-hidden rounded-full bg-ink px-4 py-2.5 text-sm text-white shadow-lg">
          <span
            className="absolute inset-y-0 left-0 bg-secondary"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
          <svg className="relative h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m5 15 7-7 7 7" />
          </svg>
          <span className="relative truncate">
            {progress >= 1 ? t.nextStory : `${t.pullForNext}: ${t.nextStory}`}
          </span>
        </div>
      </div>
    </>
  );
}
