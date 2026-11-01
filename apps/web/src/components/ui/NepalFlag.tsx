/**
 * The national flag beside the logo. Decorative: the site name is next to it.
 *
 * `animated` waves the flag on desktop (~100 KB). Phones get the still flag
 * (~13 KB, saves mobile data), and so does anyone who asks for reduced motion.
 */

const STILL = "/brand/nepal-flag-still.png";
const WAVING = "/brand/nepal-flag.webp";

export function NepalFlag({ animated = false, className = "h-6 w-auto" }: { animated?: boolean; className?: string }) {
  const img = (
    <img
      src={animated ? WAVING : STILL}
      alt=""
      aria-hidden="true"
      width={90}
      height={100}
      decoding="async"
      className={`shrink-0 select-none ${className}`}
      draggable={false}
    />
  );
  if (!animated) return img;
  return (
    <picture className="shrink-0">
      <source media="(prefers-reduced-motion: reduce)" srcSet={STILL} />
      <source media="(max-width: 1023px)" srcSet={STILL} />
      {img}
    </picture>
  );
}
