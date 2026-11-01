/**
 * Popup advertisement, shown once per browser session on the first public
 * page a visitor opens. Closes with the button, Escape, a click outside the
 * banner, or by itself after 15 seconds.
 */

import { useEffect, useState } from "react";
import { trackPromotionView } from "@/services/promotions.service";
import { PromoImage } from "./PromoSlot";
import { usePromotion } from "./PromoProvider";

const SEEN_KEY = "hn_popup_seen";
const SHOW_AFTER_MS = 1500;
const AUTO_CLOSE_MS = 15_000;

function seenThisSession(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Private mode etc.: the popup may show again, which is acceptable.
  }
}

export function PromoPopup() {
  const promo = usePromotion("popup");
  const [open, setOpen] = useState(false);

  // Open once the ad has loaded, unless already seen this session.
  useEffect(() => {
    if (!promo || seenThisSession()) return;
    const timer = setTimeout(() => {
      markSeen();
      setOpen(true);
      trackPromotionView(promo.$id);
    }, SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [promo]);

  // Escape closes it; it also closes by itself.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const timer = setTimeout(() => setOpen(false), AUTO_CLOSE_MS);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(timer);
    };
  }, [open]);

  if (!promo || !open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`विज्ञापन: ${promo.title}`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onClick={() => setOpen(false)}
    >
      <div className="relative w-full max-w-[600px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2 text-white text-sm">
          <span>विज्ञापन</span>
          <button
            type="button"
            autoFocus
            onClick={() => setOpen(false)}
            className="px-3 py-1 rounded bg-white/20 hover:bg-white/30 font-medium"
          >
            ✕ बन्द गर्नुहोस्
          </button>
        </div>
        <div className="max-h-[80vh] overflow-auto rounded-lg bg-white">
          <PromoImage promo={promo} eager />
        </div>
      </div>
    </div>
  );
}
