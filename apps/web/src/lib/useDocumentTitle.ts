import { useEffect } from "react";
import { useT } from "./i18n";

/** Sets the browser tab title. Pass nothing (or null while loading) for the site default. */
export function useDocumentTitle(title?: string | null) {
  const { t } = useT();
  useEffect(() => {
    document.title = title ? `${title} - ${t.siteName}` : t.defaultTitle;
  }, [title, t]);
}
