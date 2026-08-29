import { format, subDays, parseISO, isSameDay, differenceInCalendarDays, startOfWeek } from 'date-fns';

/**
 * Returns today's date formatted as YYYY-MM-DD in normalized local time
 */
export function getNormalizedToday() {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Formats a Date object to YYYY-MM-DD
 */
export function formatNormalizedDate(date) {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Calculates calendar day difference between two YYYY-MM-DD date strings
 */
export function getDayDifference(dateStrA, dateStrB) {
  if (!dateStrA || !dateStrB) return Infinity;
  const dA = parseISO(dateStrA);
  const dB = parseISO(dateStrB);
  return Math.abs(differenceInCalendarDays(dA, dB));
}

/**
 * Returns start of current week (Monday 00:00:00) formatted as Date or YYYY-MM-DD
 */
export function getStartOfUserWeek(date = new Date()) {
  return startOfWeek(date, { weekStartsOn: 1 });
}

/**
 * Checks whether two dates/strings fall in the exact same completion period (day or week)
 */
export function isSameCompletionPeriod(dateStrA, dateStrB, frequency = 'DAILY') {
  if (!dateStrA || !dateStrB) return false;
  if (frequency === 'DAILY') {
    return dateStrA === dateStrB;
  }
  const dA = parseISO(dateStrA);
  const dB = parseISO(dateStrB);
  const weekA = format(startOfWeek(dA, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekB = format(startOfWeek(dB, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  return weekA === weekB;
}
