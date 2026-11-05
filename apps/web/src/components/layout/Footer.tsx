/**
 * Footer Component
 *
 * Phones: the about text takes the full width, then quick links, categories
 * and contact sit side by side in one row of three. md and up: four columns.
 */

import { Link } from "react-router-dom";
import { useT } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { SiteLogo } from "./SiteLogo";
import { SocialLinks, useRegNo } from "./SocialLinks";

// py-1 on phones gives each link a tap target of about 32px.
const LINK = "inline-block py-1 md:py-0 text-gray-300 hover:text-white";
// Phone columns are only about 100px wide, so headings and text are a size smaller there.
const HEADING = "text-sm md:text-lg font-semibold mb-2 md:mb-4";

export function Footer() {
  const { lang, t, to, num } = useT();
  const currentYear = num(new Date().getFullYear());
  // Contact and social links from Dashboard → साइट सेटिङ (empty ones are hidden).
  const { contact } = useSettings();
  const address = contact.address[lang];
  const regNo = useRegNo();

  return (
    <footer className="bg-secondary text-white mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-3 md:grid-cols-4 gap-x-4 md:gap-x-6 gap-y-8">
          {/* About */}
          <div className="col-span-3 md:col-span-1">
            <h2 className="mb-4">
              <SiteLogo variant="footer" />
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed">{t.about}</p>
          </div>

          {/* Quick Links */}
          <div>
            <h2 className={HEADING}>{t.quickLinks}</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to={to("/")} className={LINK}>
                  {t.home}
                </Link>
              </li>
              <li>
                <Link to={to("/category/all")} className={LINK}>
                  {t.allNews}
                </Link>
              </li>
              <li>
                <Link to={to("/search")} className={LINK}>
                  {t.search}
                </Link>
              </li>
              <li>
                <a href="/rss.xml" className={LINK}>
                  {t.rssFeed}
                </a>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h2 className={HEADING}>{t.newsCategories}</h2>
            <ul className="space-y-2 text-sm">
              {t.footerTopics.map(([slug, name]) => (
                <li key={slug}>
                  <Link to={to(`/category/${slug}`)} className={LINK}>
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact (only details that are filled in). In the narrow phone
              column a long email breaks anywhere rather than widening the page. */}
          <div className="min-w-0">
            <h2 className={HEADING}>{t.contact}</h2>
            <ul className="space-y-2 text-xs md:text-sm text-gray-300 [overflow-wrap:anywhere]">
              {address && <li>{address}</li>}
              {regNo && <li>{regNo}</li>}
              {contact.phone && (
                <li>
                  {t.phone}: <a href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`} className="hover:text-white">{contact.phone}</a>
                </li>
              )}
              {contact.email && (
                <li>
                  {t.email}: <a href={`mailto:${contact.email}`} className="hover:text-white">{contact.email}</a>
                </li>
              )}
            </ul>

            {/* flex-wrap: several icons don't fit one narrow phone column. */}
            <SocialLinks
              className="flex-wrap gap-2 mt-4"
              iconClass="w-5 h-5 md:w-6 md:h-6"
              linkClass="p-2 -m-1 text-gray-300 hover:text-white"
            />
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-600 mt-8 pt-6 text-center text-sm text-gray-300">
          <p>{t.rights(currentYear)}</p>
          <p className="mt-1 text-xs">
            Created and designed by{" "}
            <a href="https://amirlearner.me" target="_blank" rel="noopener" className="underline hover:text-white">
              Amir Shrestha
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
