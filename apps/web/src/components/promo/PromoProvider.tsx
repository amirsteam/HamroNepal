/**
 * Loads the running advertisements once per visit and shares them with every
 * slot on the page. Ads are optional: while loading or on error, slots stay empty.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Promotion, WebPromoPlacement } from "@/types";
import { getPromotions } from "@/services/promotions.service";

const PromoContext = createContext<Promotion[]>([]);

export function PromoProvider({ children }: { children: ReactNode }) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  useEffect(() => {
    getPromotions()
      .then(setPromotions)
      .catch(() => setPromotions([]));
  }, []);
  return <PromoContext.Provider value={promotions}>{children}</PromoContext.Provider>;
}

/** Random once per page load, so several ads in one placement take turns between visits. */
const rotation = Math.floor(Math.random() * 1000);

/**
 * The ad for a placement. `nth` picks a different ad for a second slot of the
 * same placement on one page (e.g. two home-page banners).
 */
export function usePromotion(placement: WebPromoPlacement, nth = 0): Promotion | undefined {
  const list = useContext(PromoContext).filter((p) => p.placement === placement);
  if (!list.length || nth >= list.length) return undefined;
  return list[(rotation + nth) % list.length];
}
