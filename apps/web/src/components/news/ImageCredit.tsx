import type { ImageCredit as Credit } from "@/types";
import { useT } from "@/lib/i18n";

/**
 * Caption under a photo: "प्रतीकात्मक तस्बिर · फोटो: Name / Pexels".
 * Pexels asks for a photographer credit and a link back to Pexels.
 */
export function ImageCredit({ credit, className = "" }: { credit?: Credit | null; className?: string }) {
  const { t } = useT();
  if (!credit?.name) return null;
  const link = "underline underline-offset-2 hover:text-primary";
  return (
    <figcaption className={`text-xs text-gray-600 ${className}`}>
      {credit.symbolic && <span className="font-medium">{t.symbolicPhoto} · </span>}
      {t.photo}{" "}
      {credit.url ? (
        <a href={credit.url} target="_blank" rel="noopener noreferrer nofollow" className={link}>
          {credit.name}
        </a>
      ) : (
        credit.name
      )}
      {credit.provider && (
        <>
          {" / "}
          {credit.pageUrl ? (
            <a href={credit.pageUrl} target="_blank" rel="noopener noreferrer nofollow" className={link}>
              {credit.provider}
            </a>
          ) : (
            credit.provider
          )}
        </>
      )}
    </figcaption>
  );
}
