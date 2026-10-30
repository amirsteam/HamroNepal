/**
 * BS Date Types
 */

/** Bikram Sambat date structure */
export interface BSDate {
  year: number;
  month: number;
  day: number;
}

/** Dual date display with both BS and AD */
export interface DualDate {
  /** Bikram Sambat date string (e.g., "१५ पुष २०८२") */
  bs: string;
  /** AD date in Nepali (e.g., "२९ डिसेम्बर २०२५") */
  ad: string;
  /** Short BS format (e.g., "२०८२-०९-१५") */
  bsShort: string;
  /** Weekday in Nepali (e.g., "आइतबार") */
  weekday: string;
  /** Relative time (e.g., "३ घण्टा अघि") */
  relative: string;
}

/** Format options for BS date display */
export type BSDateFormat = "full" | "short" | "long";
