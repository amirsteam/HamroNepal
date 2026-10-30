import { useEffect } from "react";

export const SITE_NAME = "हाम्रो नेपाल";
const DEFAULT_TITLE = `${SITE_NAME} - नेपालको विश्वसनीय समाचार पोर्टल`;

/** Sets the browser tab title. Pass nothing (or null while loading) for the site default. */
export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} - ${SITE_NAME}` : DEFAULT_TITLE;
  }, [title]);
}
