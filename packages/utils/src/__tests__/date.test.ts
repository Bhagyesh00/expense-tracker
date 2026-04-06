import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  formatDate,
  getMonthRange,
  isOverdue,
  getDaysUntil,
  formatRelativeTime,
  formatDateForDB,
  getDateRange,
} from '../date';

describe('formatDate', () => {
  it('formats a date with default format (dd MMM yyyy)', () => {
    const result = formatDate(new Date(2025, 0, 15));
    expect(result).toBe('15 Jan 2025');
  });

  it('formats a date with custom format yyyy-MM-dd', () => {
    const result = formatDate(new Date(2025, 5, 1), 'yyyy-MM-dd');
    expect(result).toBe('2025-06-01');
  });

  it('accepts an ISO string', () => {
    const result = formatDate('2025-03-20T00:00:00.000Z', 'yyyy-MM-dd');
    expect(result).toBe('2025-03-20');
  });

  it('accepts a timestamp number', () => {
    const timestamp = new Date(2025, 11, 25).getTime();
    const result = formatDate(timestamp, 'dd/MM/yyyy');
    expect(result).toBe('25/12/2025');
  });

  it('formats with time components', () => {
    const result = formatDate(new Date(2025, 0, 1, 14, 30), 'HH:mm');
    expect(result).toBe('14:30');
  });
});

describe('getMonthRange', () => {
  it('returns correct start and end for January 2025', () => {
    const { start, end } = getMonthRange(2025, 1);
    expect(start.getFullYear()).toBe(2025);
    expect(start.getMonth()).toBe(0); // 0-indexed
    expect(start.getDate()).toBe(1);
    expect(end.getDate()).toBe(31);
  });

  it('returns correct end for February in a non-leap year', () => {
    const { end } = getMonthRange(2025, 2);
    expect(end.getDate()).toBe(28);
  });

  it('returns correct end for February in a leap year', () => {
    const { end } = getMonthRange(2024, 2);
    expect(end.getDate()).toBe(29);
  });

  it('returns correct range for December', () => {
    const { start, end } = getMonthRange(2025, 12);
    expect(start.getMonth()).toBe(11);
    expect(end.getDate()).toBe(31);
  });
});

describe('isOverdue', () => {
  it('returns true for a past date', () => {
    const pastDate = new Date(2020, 0, 1);
    expect(isOverdue(pastDate)).toBe(true);
  });

  it('returns false for a future date', () => {
    const futureDate = new Date(2099, 11, 31);
    expect(isOverdue(futureDate)).toBe(false);
  });

  it('accepts a string date', () => {
    expect(isOverdue('2020-01-01')).toBe(true);
  });

  it('accepts a timestamp number', () => {
    const pastTimestamp = new Date(2020, 0, 1).getTime();
    expect(isOverdue(pastTimestamp)).toBe(true);
  });
});

describe('getDaysUntil', () => {
  it('returns positive for future dates', () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    expect(getDaysUntil(future)).toBe(10);
  });

  it('returns negative for past dates', () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    expect(getDaysUntil(past)).toBe(-5);
  });

  it('returns 0 for today', () => {
    expect(getDaysUntil(new Date())).toBe(0);
  });

  it('accepts a string date', () => {
    const future = new Date();
    future.setDate(future.getDate() + 7);
    expect(getDaysUntil(future.toISOString())).toBe(7);
  });
});

describe('formatDateForDB', () => {
  it('returns an ISO string', () => {
    const result = formatDateForDB(new Date(2025, 0, 15, 12, 0, 0));
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });

  it('defaults to current date when no argument given', () => {
    const result = formatDateForDB();
    const now = new Date().toISOString();
    // Should be within the same second
    expect(result.slice(0, 16)).toBe(now.slice(0, 16));
  });
});

describe('getDateRange', () => {
  it('returns start and end for month period', () => {
    const { start, end } = getDateRange('month');
    expect(start.getDate()).toBe(1);
    expect(end.getMonth()).toBe(start.getMonth());
  });

  it('returns start and end for year period', () => {
    const { start, end } = getDateRange('year');
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
    expect(end.getMonth()).toBe(11);
  });
});
