import { format, parseISO, differenceInCalendarDays, differenceInCalendarWeeks, startOfWeek } from 'date-fns';

/**
 * Returns today's date formatted as YYYY-MM-DD in the user's specific IANA timezone (e.g. 'Asia/Kolkata', 'UTC')
 */
export function getNormalizedToday(timezone = 'UTC') {
  try {
    const options = { timeZone: timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' };
    const formatter = new Intl.DateTimeFormat('en-CA', options); // 'en-CA' outputs YYYY-MM-DD
    return formatter.format(new Date());
  } catch (err) {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Formats a Date object to YYYY-MM-DD
 */
export function formatNormalizedDate(date = new Date(), timezone = 'UTC') {
  try {
    const options = { timeZone: timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' };
    const formatter = new Intl.DateTimeFormat('en-CA', options);
    return formatter.format(date instanceof Date ? date : new Date(date));
  } catch (err) {
    return format(date instanceof Date ? date : new Date(date), 'yyyy-MM-dd');
  }
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
 * Calculates calendar week difference between two YYYY-MM-DD date strings (Monday-based weeks)
 */
export function getWeekDifference(dateStrA, dateStrB) {
  if (!dateStrA || !dateStrB) return Infinity;
  const dA = parseISO(dateStrA);
  const dB = parseISO(dateStrB);
  const weekA = startOfWeek(dA, { weekStartsOn: 1 });
  const weekB = startOfWeek(dB, { weekStartsOn: 1 });
  return Math.abs(differenceInCalendarWeeks(weekA, weekB));
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
