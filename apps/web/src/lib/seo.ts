/**
 * Head tags that change as readers move between pages in the app. Crawlers
 * get the same tags from the server on a direct load (apps/api routes/seo.ts).
 */

function headLink(rel: string): HTMLLinkElement {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]:not([hreflang])`);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  return el;
}

/** The address search engines should index for this page (a site path). */
export function setCanonical(path: string): void {
  headLink("canonical").href = new URL(path, window.location.origin).href;
}

/** "noindex, follow" for pages that shouldn't appear in search results; null removes it. */
export function setRobots(content: string | null): void {
  let el = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (!el) {
    el = document.createElement("meta");
    el.name = "robots";
    document.head.appendChild(el);
  }
  el.content = content ?? "index, follow";
}
