import { useEffect, useState } from "react";

/**
 * The value, held back until it stops changing for `delayMs`. Use it to keep a
 * text box responsive while the request it drives fires only once the typing
 * settles.
 */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}
