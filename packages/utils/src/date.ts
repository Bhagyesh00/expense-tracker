/**
 * Date utilities for ExpenseFlow.
 *
 * All helpers are thin wrappers around `date-fns` so that the rest of the
 * codebase has a single, consistent API for date manipulation and formatting.
 */

import {
  format,
  formatDistanceToNow,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  isPast,
  differenceInCalendarDays,
} from 'date-fns';

/** Supported shorthand period identifiers. */
export type DatePeriod = 'week' | 'month' | 'quarter' | 'year';

/** A pair of start / end dates (inclusive). */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Format a date using a `date-fns` format string.
 *
 * @param date   - The date to format (Date object, ISO string, or timestamp).
 * @param fmt    - `date-fns` format tokens. Defaults to `"dd MMM yyyy"`.
 * @returns Formatted string.
 *
 * @example
 * formatDate(new Date(2025, 0, 15)); // "15 Jan 2025"
 * formatDate(new Date(), 'yyyy-MM-dd'); // "2025-06-01"
 */
export function formatDate(
  date: Date | string | number,
  fmt: string = 'dd MMM yyyy',
): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return format(d, fmt);
}

/**
 * Return a human-friendly relative time string.
 *
 * @param date - The reference date.
 * @returns e.g. "2 hours ago", "yesterday", "3 days ago".
 *
 * @example
 * formatRelativeTime(new Date(Date.now() - 3600_000)); // "about 1 hour ago"
 */
export function formatRelativeTime(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Get the start and end dates for a specific calendar month.
 *
 * @param year  - Full year (e.g. 2025).
 * @param month - 1-indexed month (1 = January, 12 = December).
 * @returns `{ start, end }` covering the full month.
 *
 * @example
 * getMonthRange(2025, 3); // { start: 2025-03-01T00:00, end: 2025-03-31T23:59:59.999 }
 */
export function getMonthRange(year: number, month: number): DateRange {
  // month is 1-indexed; JS Date months are 0-indexed.
  const anchor = new Date(year, month - 1, 1);
  return {
    start: startOfMonth(anchor),
    end: endOfMonth(anchor),
  };
}

/**
 * Get the start and end dates for the current period relative to today.
 *
 * @param period - One of `'week'`, `'month'`, `'quarter'`, `'year'`.
 * @returns `{ start, end }` for the requested period.
 *
 * @example
 * getDateRange('month'); // current month boundaries
 */
export function getDateRange(period: DatePeriod): DateRange {
  const now = new Date();

  switch (period) {
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'quarter':
      return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now) };
  }
}

/**
 * Check whether a due date has passed.
 *
 * @param dueDate - The deadline to check.
 * @returns `true` if the due date is strictly in the past.
 */
export function isOverdue(dueDate: Date | string | number): boolean {
  const d = typeof dueDate === 'string' || typeof dueDate === 'number' ? new Date(dueDate) : dueDate;
  return isPast(d);
}

/**
 * Calculate the number of calendar days from today until the given date.
 *
 * A positive value means the date is in the future; negative means it has
 * already passed.
 *
 * @param date - Target date.
 * @returns Integer day count.
 */
export function getDaysUntil(date: Date | string | number): number {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return differenceInCalendarDays(d, new Date());
}

/**
 * Serialise a date into an ISO 8601 string suitable for database storage.
 *
 * @param date - The date to serialise. Defaults to `new Date()`.
 * @returns ISO string, e.g. `"2025-06-01T12:30:00.000Z"`.
 */
export function formatDateForDB(date: Date | string | number = new Date()): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return d.toISOString();
}

/**
 * Return a time-of-day greeting suitable for a dashboard header.
 *
 * - 05:00 – 11:59 → "Good morning"
 * - 12:00 – 16:59 → "Good afternoon"
 * - 17:00 – 04:59 → "Good evening"
 *
 * @returns Greeting string.
 */
export function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}
