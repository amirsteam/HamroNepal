/**
 * Footer Component
 */

import { Link } from "react-router-dom";
import { useT } from "@/lib/i18n";
import { SITE_CONTACT } from "@/lib/site";
import { NepalFlag } from "@/components/ui/NepalFlag";

const SOCIAL_ICONS: Record<keyof typeof SITE_CONTACT.social, { label: string; path: string }> = {
  facebook: { label: "Facebook", path: "M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z" },
  x: { label: "X", path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
  instagram: { label: "Instagram", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" },
  youtube: { label: "YouTube", path: "M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" },
};

export function Footer() {
  const { lang, t, to, num } = useT();
  const currentYear = num(new Date().getFullYear());
  const address = lang === "en" ? SITE_CONTACT.addressEn : SITE_CONTACT.address;
  const socials = (Object.keys(SITE_CONTACT.social) as Array<keyof typeof SITE_CONTACT.social>).filter(
    (k) => SITE_CONTACT.social[k]
  );

  return (
    <footer className="bg-secondary text-white mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h2 className="flex items-center gap-2.5 text-xl font-bold mb-4">
              {/* White tile: the flag's blue border would vanish on the blue footer. */}
              <span className="inline-flex rounded-md bg-white p-1">
                <NepalFlag className="h-7 w-auto" />
              </span>
              {t.siteName}
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed">{t.about}</p>
          </div>

          {/* Quick Links */}
          <div>
            <h2 className="text-lg font-semibold mb-4">{t.quickLinks}</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to={to("/")} className="text-gray-300 hover:text-white">
                  {t.home}
                </Link>
              </li>
              <li>
                <Link to={to("/category/all")} className="text-gray-300 hover:text-white">
                  {t.allNews}
                </Link>
              </li>
              <li>
                <Link to={to("/search")} className="text-gray-300 hover:text-white">
                  {t.search}
                </Link>
              </li>
              <li>
                <a href="/rss.xml" className="text-gray-300 hover:text-white">
                  {t.rssFeed}
                </a>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h2 className="text-lg font-semibold mb-4">{t.newsCategories}</h2>
            <ul className="space-y-2 text-sm">
              {t.footerTopics.map(([slug, name]) => (
                <li key={slug}>
                  <Link to={to(`/category/${slug}`)} className="text-gray-300 hover:text-white">
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact (only details that are filled in lib/site.ts) */}
          <div>
            <h2 className="text-lg font-semibold mb-4">{t.contact}</h2>
            <ul className="space-y-2 text-sm text-gray-300">
              {address && <li>{address}</li>}
              {SITE_CONTACT.phone && (
                <li>
                  {t.phone}: <a href={`tel:${SITE_CONTACT.phone.replace(/[^+\d]/g, "")}`} className="hover:text-white">{SITE_CONTACT.phone}</a>
                </li>
              )}
              {SITE_CONTACT.email && (
                <li>
                  {t.email}: <a href={`mailto:${SITE_CONTACT.email}`} className="hover:text-white">{SITE_CONTACT.email}</a>
                </li>
              )}
            </ul>

            {socials.length > 0 && (
              <div className="flex gap-2 mt-4">
                {socials.map((k) => (
                  <a
                    key={k}
                    href={SITE_CONTACT.social[k]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 -m-1 text-gray-300 hover:text-white"
                    aria-label={SOCIAL_ICONS[k].label}
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d={SOCIAL_ICONS[k].path} />
                    </svg>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-600 mt-8 pt-6 text-center text-sm text-gray-300">
          <p>{t.rights(currentYear)}</p>
          <p className="mt-1 text-xs">
            {t.pexelsBefore}{" "}
            <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
              Pexels
            </a>
            {lang === "en" ? t.pexelsAfter : ` ${t.pexelsAfter}`}
          </p>
        </div>
      </div>
    </footer>
  );
}
