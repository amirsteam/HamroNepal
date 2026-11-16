import { useEffect, useState } from "react";

/** Whether a CSS media query matches, following changes (rotation, resizing). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" && "matchMedia" in window ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);

  return matches;
}

/** Phones: below Tailwind's `md` breakpoint (768 px). */
export const PHONE_QUERY = "(max-width: 767.98px)";
