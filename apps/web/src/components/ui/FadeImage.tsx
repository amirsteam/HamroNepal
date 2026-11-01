/**
 * A photo that fades in once loaded (instead of popping in), over a soft grey
 * placeholder. Broken images are swapped for the site placeholder once.
 */

import { useEffect, useRef, useState, type ImgHTMLAttributes, type SyntheticEvent } from "react";
import { PLACEHOLDER } from "@/services/news.service";

export function FadeImage({ className = "", onLoad, onError, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  // A cached image can finish before React attaches onLoad.
  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <img
      ref={ref}
      {...props}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      onError={(e: SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        if (!img.src.endsWith(PLACEHOLDER)) img.src = PLACEHOLDER;
        onError?.(e);
      }}
      className={`bg-gray-100 transition-opacity duration-500 motion-reduce:transition-none ${
        loaded ? "opacity-100" : "opacity-0"
      } ${className}`}
    />
  );
}
