/**
 * One advertisement banner, labelled "विज्ञापन". Renders nothing when no ad
 * runs in this placement. A view is counted once it is half on screen.
 */

import { useEffect, useRef } from "react";
import type { Promotion, WebPromoPlacement } from "@/types";
import { promotionClickUrl, promotionImageUrl, trackPromotionView } from "@/services/promotions.service";
import { usePromotion } from "./PromoProvider";

/** Count a view when at least half the banner has been visible. */
function useViewOnce(promo: Promotion | undefined) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!promo || !el) return;
    if (typeof IntersectionObserver === "undefined") {
      trackPromotionView(promo.$id);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          trackPromotionView(promo.$id);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [promo]);
  return ref;
}

/** The banner image, with the phone version below 768px when there is one. */
export function PromoImage({ promo, eager = false, className = "" }: { promo: Promotion; eager?: boolean; className?: string }) {
  const img = (
    <picture>
      {promo.mobileImageUrl && <source media="(max-width: 767px)" srcSet={promotionImageUrl(promo.mobileImageUrl)} />}
      <img
        src={promotionImageUrl(promo.imageUrl)}
        alt={`विज्ञापन: ${promo.title}`}
        loading={eager ? "eager" : "lazy"}
        className={`block w-full h-auto ${className}`}
      />
    </picture>
  );
  if (!promo.linkUrl) return img;
  return (
    <a href={promotionClickUrl(promo.$id)} target="_blank" rel="sponsored noopener" className="block">
      {img}
    </a>
  );
}

export function PromoSlot({
  placement,
  nth = 0,
  className = "",
}: {
  placement: Exclude<WebPromoPlacement, "popup">;
  nth?: number;
  className?: string;
}) {
  const promo = usePromotion(placement, nth);
  const ref = useViewOnce(promo);
  if (!promo) return null;
  const narrow = placement === "sidebar";
  return (
    <div ref={ref} className={`${narrow ? "max-w-[300px] mx-auto" : ""} ${className}`}>
      <p className="text-[11px] leading-none text-gray-500 mb-1 text-center">विज्ञापन</p>
      <PromoImage promo={promo} eager={placement === "header"} className="rounded" />
    </div>
  );
}
