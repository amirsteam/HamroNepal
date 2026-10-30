/**
 * BS Date Core Utilities
 *
 * Core conversion functions between AD and BS calendars.
 */

import {
  NEPALI_DIGITS,
  BS_CALENDAR_DATA,
  BS_REFERENCE,
  AD_REFERENCE,
} from "./constants";
import type { BSDate } from "./types";

/**
 * Convert a number or string to Nepali digits.
 *
 * @example
 * toNepaliDigits(2082) // "२०८२"
 * toNepaliDigits("15") // "१५"
 */
export function toNepaliDigits(num: number | string): string {
  return String(num)
    .split("")
    .map((char) => {
      const digit = parseInt(char, 10);
      return isNaN(digit) ? char : NEPALI_DIGITS[digit];
    })
    .join("");
}

/**
 * Get days in a BS month for a given year.
 */
export function getDaysInBSMonth(year: number, month: number): number {
  if (BS_CALENDAR_DATA[year]) {
    return BS_CALENDAR_DATA[year][month - 1] ?? 30;
  }
  // Default pattern if year not in lookup table
  const defaultDays = [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30];
  return defaultDays[month - 1] ?? 30;
}

/**
 * Get total days in a BS year.
 */
export function getDaysInBSYear(year: number): number {
  if (BS_CALENDAR_DATA[year]) {
    return BS_CALENDAR_DATA[year].reduce((a, b) => a + b, 0);
  }
  return 365;
}

/**
 * Convert AD date to BS date.
 *
 * @example
 * adToBS(new Date("2025-12-29")) // { year: 2082, month: 9, day: 14 }
 */
export function adToBS(adDate: Date): BSDate {
  // Calculate days from reference date
  const diffTime = adDate.getTime() - AD_REFERENCE.getTime();
  let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  let bsYear = BS_REFERENCE.year;
  let bsMonth = BS_REFERENCE.month;
  let bsDay = BS_REFERENCE.day;

  if (diffDays >= 0) {
    // Forward from reference date
    while (diffDays > 0) {
      const daysInMonth = getDaysInBSMonth(bsYear, bsMonth);
      const remainingDaysInMonth = daysInMonth - bsDay;

      if (diffDays <= remainingDaysInMonth) {
        bsDay += diffDays;
        diffDays = 0;
      } else {
        diffDays -= remainingDaysInMonth + 1;
        bsMonth++;
        bsDay = 1;

        if (bsMonth > 12) {
          bsMonth = 1;
          bsYear++;
        }
      }
    }
  } else {
    // Backward from reference date
    while (diffDays < 0) {
      bsDay--;
      diffDays++;

      if (bsDay < 1) {
        bsMonth--;
        if (bsMonth < 1) {
          bsMonth = 12;
          bsYear--;
        }
        bsDay = getDaysInBSMonth(bsYear, bsMonth);
      }
    }
  }

  return { year: bsYear, month: bsMonth, day: bsDay };
}

/**
 * Convert BS date to AD date.
 *
 * @example
 * bsToAD({ year: 2082, month: 9, day: 14 }) // Date object for 2025-12-28
 */
export function bsToAD(bsDate: BSDate): Date {
  let diffDays = 0;

  // Calculate days from BS reference to target BS date
  if (
    bsDate.year > BS_REFERENCE.year ||
    (bsDate.year === BS_REFERENCE.year && bsDate.month > BS_REFERENCE.month) ||
    (bsDate.year === BS_REFERENCE.year &&
      bsDate.month === BS_REFERENCE.month &&
      bsDate.day >= BS_REFERENCE.day)
  ) {
    // Target is after or equal to reference
    let year = BS_REFERENCE.year;
    let month = BS_REFERENCE.month;
    let day = BS_REFERENCE.day;

    while (year < bsDate.year || month < bsDate.month || day < bsDate.day) {
      const daysInMonth = getDaysInBSMonth(year, month);
      day++;
      diffDays++;

      if (day > daysInMonth) {
        day = 1;
        month++;
        if (month > 12) {
          month = 1;
          year++;
        }
      }
    }
  } else {
    // Target is before reference
    let year = BS_REFERENCE.year;
    let month = BS_REFERENCE.month;
    let day = BS_REFERENCE.day;

    while (year > bsDate.year || month > bsDate.month || day > bsDate.day) {
      day--;
      diffDays--;

      if (day < 1) {
        month--;
        if (month < 1) {
          month = 12;
          year--;
        }
        day = getDaysInBSMonth(year, month);
      }
    }
  }

  const adDate = new Date(AD_REFERENCE);
  adDate.setDate(adDate.getDate() + diffDays);
  return adDate;
}

/**
 * Get the current BS date.
 */
export function getCurrentBSDate(): BSDate {
  return adToBS(new Date());
}

/**
 * Check if a BS year is valid (has data).
 */
export function isValidBSYear(year: number): boolean {
  return year in BS_CALENDAR_DATA;
}

/**
 * Convert a moment in time to the BS date as seen in Nepal (Asia/Kathmandu),
 * regardless of the server or device time zone.
 */
export function adToBSNepal(date: Date = new Date()): BSDate {
  const [y, m, d] = date
    .toLocaleDateString("en-CA", { timeZone: "Asia/Kathmandu" })
    .split("-")
    .map(Number);
  return adToBS(new Date(y, m - 1, d));
}
