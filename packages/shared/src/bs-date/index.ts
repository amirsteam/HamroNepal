/**
 * @hamronepal/bs-date
 *
 * Bikram Sambat date utilities for HamroNepal.
 * Provides AD to BS conversion, formatting, and dual date display.
 */

// Types
export type { BSDate, DualDate, BSDateFormat } from "./types";

// Constants
export {
  BS_MONTHS,
  BS_WEEKDAYS,
  AD_MONTHS_NEPALI,
  NEPALI_DIGITS,
  BS_CALENDAR_DATA,
} from "./constants";

// Core conversion functions
export {
  toNepaliDigits,
  adToBS,
  bsToAD,
  getCurrentBSDate,
  getDaysInBSMonth,
  getDaysInBSYear,
  isValidBSYear,
  adToBSNepal,
} from "./core";

// Formatting functions
export {
  formatBSDate,
  formatADDateNepali,
  formatDualDate,
  formatBSWithAD,
  formatArticleDate,
  getWeekdayNepali,
  getRelativeTimeNepali,
  getCurrentBSDateString,
} from "./format";
