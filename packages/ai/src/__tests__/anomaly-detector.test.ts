import { describe, it, expect } from 'vitest';
import {
  detectAnomalies,
  type ExpenseRecord,
  type HistoricalAverage,
} from '../anomaly/detector';

function makeExpense(
  overrides: Partial<ExpenseRecord> & { id: string },
): ExpenseRecord {
  return {
    amount: 100,
    description: 'Test expense',
    category_id: 'cat-1',
    date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('detectAnomalies', () => {
  describe('z-score anomalies', () => {
    it('flags high spend when z-score > 3 as high severity', () => {
      const expenses: ExpenseRecord[] = [
        makeExpense({ id: '1', amount: 5000, category_id: 'food' }),
      ];
      const averages: HistoricalAverage[] = [
        {
          categoryId: 'food',
          categoryName: 'Food',
          mean: 1000,
          stddev: 200,
          count: 10,
        },
      ];

      const anomalies = detectAnomalies(expenses, averages);
      const highSpend = anomalies.filter((a) => a.type === 'high_spend');

      expect(highSpend.length).toBeGreaterThanOrEqual(1);
      // z = (5000 - 1000) / 200 = 20, definitely > 3
      expect(highSpend[0]!.severity).toBe('high');
    });

    it('flags medium severity when z-score between 2 and 3', () => {
      const expenses: ExpenseRecord[] = [
        makeExpense({ id: '1', amount: 1450, category_id: 'food' }),
      ];
      const averages: HistoricalAverage[] = [
        {
          categoryId: 'food',
          categoryName: 'Food',
          mean: 1000,
          stddev: 200,
          count: 10,
        },
      ];

      const anomalies = detectAnomalies(expenses, averages);
      const highSpend = anomalies.filter((a) => a.type === 'high_spend');

      // z = (1450 - 1000) / 200 = 2.25
      expect(highSpend.length).toBeGreaterThanOrEqual(1);
      expect(highSpend[0]!.severity).toBe('medium');
    });

    it('does not flag normal spending', () => {
      const expenses: ExpenseRecord[] = [
        makeExpense({ id: '1', amount: 1100, category_id: 'food' }),
      ];
      const averages: HistoricalAverage[] = [
        {
          categoryId: 'food',
          categoryName: 'Food',
          mean: 1000,
          stddev: 200,
          count: 10,
        },
      ];

      const anomalies = detectAnomalies(expenses, averages);
      const highSpend = anomalies.filter((a) => a.type === 'high_spend');
      expect(highSpend).toHaveLength(0);
    });

    it('skips categories with stddev of 0', () => {
      const expenses: ExpenseRecord[] = [
        makeExpense({ id: '1', amount: 5000, category_id: 'food' }),
      ];
      const averages: HistoricalAverage[] = [
        {
          categoryId: 'food',
          categoryName: 'Food',
          mean: 1000,
          stddev: 0,
          count: 10,
        },
      ];

      const anomalies = detectAnomalies(expenses, averages);
      const highSpend = anomalies.filter((a) => a.type === 'high_spend');
      expect(highSpend).toHaveLength(0);
    });

    it('skips categories with count < 3', () => {
      const expenses: ExpenseRecord[] = [
        makeExpense({ id: '1', amount: 5000, category_id: 'food' }),
      ];
      const averages: HistoricalAverage[] = [
        {
          categoryId: 'food',
          categoryName: 'Food',
          mean: 1000,
          stddev: 200,
          count: 2,
        },
      ];

      const anomalies = detectAnomalies(expenses, averages);
      const highSpend = anomalies.filter((a) => a.type === 'high_spend');
      expect(highSpend).toHaveLength(0);
    });
  });

  describe('velocity spike detection', () => {
    it('detects high velocity spike (>2.5x)', () => {
      const now = new Date();
      const expenses: ExpenseRecord[] = [
        makeExpense({
          id: '1',
          amount: 5000,
          date: now.toISOString(),
        }),
        makeExpense({
          id: '2',
          amount: 5000,
          date: now.toISOString(),
        }),
        makeExpense({
          id: '3',
          amount: 5000,
          date: now.toISOString(),
        }),
        makeExpense({
          id: '4',
          amount: 5000,
          date: now.toISOString(),
        }),
        makeExpense({
          id: '5',
          amount: 5000,
          date: now.toISOString(),
        }),
      ];
      const averages: HistoricalAverage[] = [
        {
          categoryId: 'food',
          categoryName: 'Food',
          mean: 1000,
          stddev: 200,
          count: 10,
        },
      ];

      const anomalies = detectAnomalies(expenses, averages);
      const velocity = anomalies.filter((a) => a.type === 'velocity_spike');
      // Daily rate = 25000/3 = 8333; avg daily = 1000/30 = 33.3; ratio >> 2.5
      expect(velocity.length).toBeGreaterThanOrEqual(1);
      expect(velocity[0]!.severity).toBe('high');
    });
  });

  describe('duplicate detection', () => {
    it('detects duplicate transactions within 24 hours', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const expenses: ExpenseRecord[] = [
        makeExpense({
          id: '1',
          amount: 500,
          description: 'Coffee shop',
          date: now.toISOString(),
        }),
        makeExpense({
          id: '2',
          amount: 500,
          description: 'Coffee shop',
          date: oneHourAgo.toISOString(),
        }),
        makeExpense({
          id: '3',
          amount: 200,
          description: 'Different thing',
          date: now.toISOString(),
        }),
        makeExpense({
          id: '4',
          amount: 100,
          description: 'Grocery',
          date: now.toISOString(),
        }),
        makeExpense({
          id: '5',
          amount: 150,
          description: 'Transport',
          date: now.toISOString(),
        }),
      ];

      const anomalies = detectAnomalies(expenses, []);
      const duplicates = anomalies.filter((a) => a.type === 'duplicate');

      expect(duplicates.length).toBeGreaterThanOrEqual(1);
      expect(duplicates[0]!.relatedExpenseIds).toContain('1');
      expect(duplicates[0]!.relatedExpenseIds).toContain('2');
    });

    it('does not flag different amounts as duplicates', () => {
      const now = new Date();
      const expenses: ExpenseRecord[] = [
        makeExpense({
          id: '1',
          amount: 500,
          description: 'Coffee shop',
          date: now.toISOString(),
        }),
        makeExpense({
          id: '2',
          amount: 300,
          description: 'Coffee shop',
          date: now.toISOString(),
        }),
        makeExpense({
          id: '3',
          amount: 200,
          description: 'Other',
          date: now.toISOString(),
        }),
        makeExpense({
          id: '4',
          amount: 100,
          description: 'Misc',
          date: now.toISOString(),
        }),
        makeExpense({
          id: '5',
          amount: 150,
          description: 'Transport',
          date: now.toISOString(),
        }),
      ];

      const anomalies = detectAnomalies(expenses, []);
      const duplicates = anomalies.filter((a) => a.type === 'duplicate');
      expect(duplicates).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('returns empty array for empty expenses', () => {
      const anomalies = detectAnomalies([], []);
      expect(anomalies).toEqual([]);
    });

    it('returns empty array for single expense with no averages', () => {
      const expenses: ExpenseRecord[] = [
        makeExpense({ id: '1', amount: 100 }),
      ];
      const anomalies = detectAnomalies(expenses, []);
      expect(anomalies).toEqual([]);
    });

    it('sorts anomalies by severity (high first)', () => {
      const now = new Date();
      const expenses: ExpenseRecord[] = [
        makeExpense({
          id: '1',
          amount: 10000,
          category_id: 'food',
          date: now.toISOString(),
        }),
        makeExpense({
          id: '2',
          amount: 10000,
          category_id: 'food',
          date: now.toISOString(),
        }),
        makeExpense({
          id: '3',
          amount: 10000,
          category_id: 'food',
          date: now.toISOString(),
        }),
        makeExpense({
          id: '4',
          amount: 10000,
          category_id: 'food',
          date: now.toISOString(),
        }),
        makeExpense({
          id: '5',
          amount: 10000,
          category_id: 'food',
          date: now.toISOString(),
        }),
      ];
      const averages: HistoricalAverage[] = [
        {
          categoryId: 'food',
          categoryName: 'Food',
          mean: 1000,
          stddev: 200,
          count: 10,
        },
      ];

      const anomalies = detectAnomalies(expenses, averages);

      for (let i = 1; i < anomalies.length; i++) {
        const order: Record<string, number> = {
          high: 0,
          medium: 1,
          low: 2,
        };
        expect(order[anomalies[i]!.severity]).toBeGreaterThanOrEqual(
          order[anomalies[i - 1]!.severity],
        );
      }
    });
  });
});
