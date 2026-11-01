/**
 * Section heading with the pennant mark and an optional "see more" link.
 */

import { Link } from "react-router-dom";
import { Pennant } from "./Pennant";

export function SectionTitle({
  title,
  to,
  linkLabel = "थप हेर्नुहोस्",
  size = "large",
  className = "",
}: {
  title: string;
  to?: string;
  linkLabel?: string;
  /** "small" for sidebars. */
  size?: "large" | "small";
  className?: string;
}) {
  const large = size === "large";
  return (
    <div className={`flex items-center justify-between gap-4 ${large ? "mb-5" : "mb-3"} ${className}`}>
      <h2 className={`flex items-center gap-2.5 font-bold text-ink ${large ? "text-2xl md:text-[1.75rem]" : "text-lg"}`}>
        <Pennant className={large ? "w-3.5 h-[1.1rem]" : "w-3 h-[0.9rem]"} />
        {title}
      </h2>
      {to && (
        <Link
          to={to}
          className="group/more inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark"
        >
          {linkLabel}
          <svg
            className="w-4 h-4 transition-transform duration-200 group-hover/more:translate-x-0.5 motion-reduce:transition-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </div>
  );
}
