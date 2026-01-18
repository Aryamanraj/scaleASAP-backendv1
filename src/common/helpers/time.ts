/**
 * Time Utility Functions
 * All functions use UTC to ensure consistent time-based analytics across timezones
 */

/**
 * Extract UTC hour (0-23) from a Date object
 * Use this for time-of-day analytics to ensure consistent bucketing
 */
export function getUtcHour(date: Date): number {
  return date.getUTCHours();
}

/**
 * Extract UTC day of week (0=Sunday, 6=Saturday) from a Date object
 * Use this for day-of-week analytics to ensure consistent bucketing
 */
export function getUtcDayOfWeek(date: Date): number {
  return date.getUTCDay();
}

/**
 * Extract UTC year from a Date object
 */
export function getUtcYear(date: Date): number {
  return date.getUTCFullYear();
}

/**
 * Extract UTC month (0-11) from a Date object
 */
export function getUtcMonth(date: Date): number {
  return date.getUTCMonth();
}

/**
 * Extract UTC date (1-31) from a Date object
 */
export function getUtcDate(date: Date): number {
  return date.getUTCDate();
}

/**
 * Create a Date object representing the start of a UTC month
 */
export function getUtcMonthStart(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
}

/**
 * Create a Date object representing the end of a UTC month
 */
export function getUtcMonthEnd(year: number, month: number): Date {
  // Last day of month is day 0 of next month
  return new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
}

/**
 * Format UTC date as YYYY-MM string
 */
export function formatUtcYearMonth(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
