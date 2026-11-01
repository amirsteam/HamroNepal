/**
 * The site's mark: the double pennant of the Nepali flag (crimson with a blue
 * border). Used beside the logo and every section title.
 */
export function Pennant({ className = "w-3 h-4" }: { className?: string }) {
  return (
    <svg className={`shrink-0 ${className}`} viewBox="0 0 14 17" aria-hidden="true">
      <path
        d="M1.2 1.2 L12.4 8.3 H6.2 L12.4 15.8 H1.2 Z"
        fill="var(--color-primary)"
        stroke="var(--color-secondary)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
