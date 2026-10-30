import { adToBSNepal, formatBSDate } from "@hamronepal/shared";

/** Today's (or `date`'s) BS date as shown in Nepal, e.g. "१३ कात्तिक २०८३". */
export function bsDateString(date: Date = new Date()): string {
  return formatBSDate(adToBSNepal(date));
}
