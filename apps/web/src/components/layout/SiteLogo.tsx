/**
 * The site's mark from Dashboard → साइट सेटिङ: the uploaded logo, or else
 * the flag (if switched on) and the name in the two brand colours.
 */

import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { NepalFlag } from "@/components/ui/NepalFlag";

type Variant = "desktop" | "mobile" | "footer" | "sidebar" | "login";

const LOGO_HEIGHT: Record<Variant, string> = {
  desktop: "h-16 xl:h-20",
  mobile: "h-9",
  footer: "h-10",
  sidebar: "h-8",
  login: "h-16",
};

export function SiteLogo({ variant }: { variant: Variant }) {
  const s = useSettings();
  const { t, lang } = useT();
  // On dark backgrounds the logo and flag sit on a white tile.
  const onDark = variant === "footer" || variant === "sidebar";

  if (s.logoUrl) {
    const img = <img src={s.logoUrl} alt={t.siteName} className={`${LOGO_HEIGHT[variant]} w-auto max-w-[16rem] object-contain`} />;
    return onDark ? <span className="inline-flex rounded-md bg-white p-1.5">{img}</span> : img;
  }

  const flag = s.showFlag ? (
    variant === "desktop" ? (
      <NepalFlag animated className="h-14 xl:h-16 w-auto -mt-1" />
    ) : onDark ? (
      <span className="inline-flex rounded-md bg-white p-1">
        <NepalFlag className={variant === "sidebar" ? "h-5 w-auto" : "h-7 w-auto"} />
      </span>
    ) : (
      <NepalFlag className={variant === "login" ? "h-12 w-auto" : "h-7 w-auto -mt-0.5"} />
    )
  ) : null;

  if (onDark) {
    return (
      <span className={`flex items-center gap-2.5 font-bold ${variant === "sidebar" ? "text-lg" : "text-xl"}`}>
        {flag}
        {t.siteName}
      </span>
    );
  }

  const size =
    variant === "desktop"
      ? "text-5xl xl:text-6xl gap-3"
      : variant === "login"
        ? "text-4xl gap-2.5"
        : // The English name is wider: one size smaller on phones.
          `${lang === "en" ? "text-xl" : "text-2xl"} gap-1.5`;
  return (
    <span className={`flex items-center justify-center font-display font-extrabold tracking-tight ${size}`}>
      {flag}
      <span className="text-primary">{t.brand[0]}</span>
      {t.brand[1] && <span className={`text-secondary ${variant === "desktop" ? "ml-2" : "ml-0.5"}`}>{t.brand[1]}</span>}
    </span>
  );
}
