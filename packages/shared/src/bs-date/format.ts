/**
 * BS Date Formatting Utilities
 *
 * Format BS dates in various Nepali formats.
 */

import { BS_MONTHS, BS_WEEKDAYS, AD_MONTHS_NEPALI } from "./constants";
import { toNepaliDigits, adToBS } from "./core";
import type { BSDate, DualDate, BSDateFormat } from "./types";

/**
 * Format BS date as Nepali string.
 *
 * @param bsDate - The BS date object
 * @param format - Display format: "full", "short", or "long"
 *
 * @example
 * formatBSDate({ year: 2082, month: 9, day: 14 }, "full")
 * // "१४ पुष २०८२"
 *
 * formatBSDate({ year: 2082, month: 9, day: 14 }, "short")
 * // "२०८२-०९-१४"
 *
 * formatBSDate({ year: 2082, month: 9, day: 14 }, "long")
 * // "पुष १४, २०८२"
 */
export function formatBSDate(
  bsDate: BSDate,
  format: BSDateFormat = "full"
): string {
  const { year, month, day } = bsDate;
  const monthName = BS_MONTHS[month - 1] ?? "";

  switch (format) {
    case "short":
      return `${toNepaliDigits(year)}-${toNepaliDigits(
        month.toString().padStart(2, "0")
      )}-${toNepaliDigits(day.toString().padStart(2, "0"))}`;

    case "long":
      return `${monthName} ${toNepaliDigits(day)}, ${toNepaliDigits(year)}`;

    case "full":
    default:
      return `${toNepaliDigits(day)} ${monthName} ${toNepaliDigits(year)}`;
  }
}

/**
 * Format AD date in Nepali language.
 *
 * @example
 * formatADDateNepali(new Date("2025-12-29"))
 * // "२९ डिसेम्बर २०२५"
 */
export function formatADDateNepali(adDate: Date): string {
  const day = adDate.getDate();
  const month = adDate.getMonth();
  const year = adDate.getFullYear();

  return `${toNepaliDigits(day)} ${AD_MONTHS_NEPALI[month]} ${toNepaliDigits(
    year
  )}`;
}

/**
 * Get weekday name in Nepali for a date.
 */
export function getWeekdayNepali(date: Date): string {
  return BS_WEEKDAYS[date.getDay()];
}

/**
 * Get relative time in Nepali (e.g., "३ घण्टा अघि").
 *
 * @example
 * getRelativeTimeNepali("2025-12-29T10:00:00Z")
 * // "२ घण्टा अघि" (if current time is 12:00)
 */
export function getRelativeTimeNepali(dateString: string | Date): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // Handle future dates
  if (diffMs < 0) {
    return formatBSDate(adToBS(date));
  }

  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return "भर्खरै";
  if (diffMins < 60) return `${toNepaliDigits(diffMins)} मिनेट अघि`;
  if (diffHours < 24) return `${toNepaliDigits(diffHours)} घण्टा अघि`;
  if (diffDays === 1) return "हिजो";
  if (diffDays < 7) return `${toNepaliDigits(diffDays)} दिन अघि`;
  if (diffWeeks === 1) return "गत हप्ता";
  if (diffWeeks < 4) return `${toNepaliDigits(diffWeeks)} हप्ता अघि`;
  if (diffMonths === 1) return "गत महिना";
  if (diffMonths < 12) return `${toNepaliDigits(diffMonths)} महिना अघि`;

  // For older dates, show the full BS date
  return formatBSDate(adToBS(date));
}

/**
 * Format date with both BS and AD in Nepali.
 * This is the main function for displaying dual dates.
 *
 * @example
 * formatDualDate("2025-12-29")
 * // {
 * //   bs: "१४ पुष २०८२",
 * //   ad: "२९ डिसेम्बर २०२५",
 * //   bsShort: "२०८२-०९-१४",
 * //   weekday: "आइतबार",
 * //   relative: "३ दिन अघि"
 * // }
 */
export function formatDualDate(dateString: string | Date): DualDate {
  const adDate = new Date(dateString);
  const bsDate = adToBS(adDate);

  return {
    bs: formatBSDate(bsDate, "full"),
    ad: formatADDateNepali(adDate),
    bsShort: formatBSDate(bsDate, "short"),
    weekday: getWeekdayNepali(adDate),
    relative: getRelativeTimeNepali(dateString),
  };
}

/**
 * Get current BS date as formatted string.
 */
export function getCurrentBSDateString(format: BSDateFormat = "full"): string {
  return formatBSDate(adToBS(new Date()), format);
}

/**
 * Format a date showing "BS (AD)" together.
 *
 * @example
 * formatBSWithAD("2025-12-29")
 * // "१४ पुष २०८२ (२९ डिसेम्बर २०२५)"
 */
export function formatBSWithAD(dateString: string | Date): string {
  const dual = formatDualDate(dateString);
  return `${dual.bs} (${dual.ad})`;
}

/**
 * Format date for article display with relative time.
 *
 * @param dateString - The date to format
 * @param showBoth - If true, shows both BS and AD dates
 *
 * @example
 * formatArticleDate("2025-12-29", true)
 * // "१४ पुष २०८२ • २९ डिसेम्बर २०२५"
 *
 * formatArticleDate("2025-12-29", false)
 * // "१४ पुष २०८२"
 */
export function formatArticleDate(
  dateString: string | Date,
  showBoth: boolean = true
): string {
  const dual = formatDualDate(dateString);

  if (showBoth) {
    return `${dual.bs} • ${dual.ad}`;
  }

  return dual.bs;
}
