/**
 * Footer Component
 */

import { Link } from "react-router-dom";
import { useT } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { SiteLogo } from "./SiteLogo";
import { SocialLinks, useRegNo } from "./SocialLinks";

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h2 className="mb-4">
              <SiteLogo variant="footer" />
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

          {/* Contact (only details that are filled in) */}
          <div>
            <h2 className="text-lg font-semibold mb-4">{t.contact}</h2>
            <ul className="space-y-2 text-sm text-gray-300">
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

            <SocialLinks className="gap-2 mt-4" linkClass="p-2 -m-1 text-gray-300 hover:text-white" />
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
