/**
 * Contact details and social links from Dashboard → साइट सेटिङ, shown in the
 * header's top bar, the mobile menu and the footer. Empty ones are hidden.
 */

import type { SiteSettings } from "@hamronepal/shared";
import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";

type Social = keyof SiteSettings["social"];

const SOCIAL_ICONS: Record<Social, { label: string; path: string }> = {
  facebook: { label: "Facebook", path: "M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z" },
  x: { label: "X", path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
  instagram: { label: "Instagram", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" },
  tiktok: { label: "TikTok", path: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" },
  youtube: { label: "YouTube", path: "M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" },
};

/** The social icons that have a link. */
export function SocialLinks({ iconClass = "w-6 h-6", linkClass = "", className = "" }: { iconClass?: string; linkClass?: string; className?: string }) {
  const { social } = useSettings();
  const shown = (Object.keys(SOCIAL_ICONS) as Social[]).filter((k) => social[k]);
  if (!shown.length) return null;
  return (
    <div className={`flex items-center ${className}`}>
      {shown.map((k) => (
        <a key={k} href={social[k]} target="_blank" rel="noopener noreferrer" className={linkClass} aria-label={SOCIAL_ICONS[k].label}>
          <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d={SOCIAL_ICONS[k].path} />
          </svg>
        </a>
      ))}
    </div>
  );
}

const PhoneIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);
const MailIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

/**
 * The registration number from the print settings, e.g. "दर्ता नं. १२३४५६".
 * If the editor already typed a label ("जि.प्र.का. द. नं. …"), it is shown as typed.
 */
export function useRegNo(): string {
  const { print } = useSettings();
  const { t, num } = useT();
  const value = print.regNo.trim();
  if (!value) return "";
  return /नं|no\b/i.test(value) ? value : `${t.regNo} ${num(value)}`;
}

/** Phone and email links and the registration number (each only if set). */
export function ContactLinks({ className = "", linkClass = "" }: { className?: string; linkClass?: string }) {
  const { contact } = useSettings();
  const { t } = useT();
  const regNo = useRegNo();
  if (!contact.phone && !contact.email && !regNo) return null;
  return (
    <div className={`flex flex-wrap items-center ${className}`}>
      {regNo && <span>{regNo}</span>}
      {contact.phone && (
        <a href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`} className={`inline-flex items-center gap-1.5 ${linkClass}`} aria-label={`${t.phone}: ${contact.phone}`}>
          <PhoneIcon />
          {contact.phone}
        </a>
      )}
      {contact.email && (
        <a href={`mailto:${contact.email}`} className={`inline-flex items-center gap-1.5 ${linkClass}`} aria-label={`${t.email}: ${contact.email}`}>
          <MailIcon />
          {contact.email}
        </a>
      )}
    </div>
  );
}

/** The slim bar above the desktop header (only when there is something to show). */
export function ContactBar() {
  const { contact, social, print } = useSettings();
  if (!contact.phone && !contact.email && !print.regNo.trim() && !Object.values(social).some(Boolean)) return null;
  return (
    <div className="bg-ink text-white/85 text-xs">
      <div className="container mx-auto px-4 flex items-center justify-between gap-4 py-1.5">
        <ContactLinks className="gap-5" linkClass="hover:text-white" />
        <SocialLinks className="gap-1 ml-auto" iconClass="w-4 h-4" linkClass="p-1 rounded hover:text-white hover:bg-white/10" />
      </div>
    </div>
  );
}
