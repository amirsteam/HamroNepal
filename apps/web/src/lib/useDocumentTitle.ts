import { useEffect } from "react";
import { STRINGS, useLang } from "./i18n";

export const SITE_NAME = STRINGS.ne.siteName;

/** Sets the browser tab title. Pass nothing (or null while loading) for the site default. */
export function useDocumentTitle(title?: string | null) {
  const t = STRINGS[useLang()];
  useEffect(() => {
    document.title = title ? `${title} - ${t.siteName}` : t.defaultTitle;
  }, [title, t]);
}
