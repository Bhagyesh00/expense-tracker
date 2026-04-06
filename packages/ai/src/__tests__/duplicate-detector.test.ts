import { describe, it, expect } from 'vitest';
import { detectDuplicate, type ExpenseInput } from '../suggestions/duplicate-detector';

describe('detectDuplicate', () => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  it('returns no duplicate when recent expenses list is empty', () => {
    const newExpense: ExpenseInput = {
      amount: 500,
      description: 'Lunch',
      date: now.toISOString(),
    };
    const result = detectDuplicate(newExpense, []);
    expect(result.isDuplicate).toBe(false);
    expect(result.matchingExpenseId).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it('detects identical expenses as duplicates', () => {
    const newExpense: ExpenseInput = {
      amount: 500,
      description: 'Coffee shop',
      date: now.toISOString(),
    };
    const existing: ExpenseInput[] = [
      {
        id: 'exp-1',
        amount: 500,
        description: 'Coffee shop',
        date: oneHourAgo.toISOString(),
      },
    ];

    const result = detectDuplicate(newExpense, existing);
    expect(result.isDuplicate).toBe(true);
    expect(result.matchingExpenseId).toBe('exp-1');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('detects similar descriptions with same amount as duplicates', () => {
    const newExpense: ExpenseInput = {
      amount: 500,
      description: 'Coffee Shop Downtown',
      date: now.toISOString(),
    };
    const existing: ExpenseInput[] = [
      {
        id: 'exp-1',
        amount: 500,
        description: 'Coffee shop downtown',
        date: oneHourAgo.toISOString(),
      },
    ];

    const result = detectDuplicate(newExpense, existing);
    expect(result.isDuplicate).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('does not flag different expenses', () => {
    const newExpense: ExpenseInput = {
      amount: 500,
      description: 'Coffee shop',
      date: now.toISOString(),
    };
    const existing: ExpenseInput[] = [
      {
        id: 'exp-1',
        amount: 200,
        description: 'Grocery store',
        date: oneHourAgo.toISOString(),
      },
    ];

    const result = detectDuplicate(newExpense, existing);
    expect(result.isDuplicate).toBe(false);
  });

  it('does not flag expenses more than 24 hours apart', () => {
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const newExpense: ExpenseInput = {
      amount: 500,
      description: 'Coffee shop',
      date: now.toISOString(),
    };
    const existing: ExpenseInput[] = [
      {
        id: 'exp-1',
        amount: 500,
        description: 'Coffee shop',
        date: twoDaysAgo.toISOString(),
      },
    ];

    const result = detectDuplicate(newExpense, existing);
    expect(result.isDuplicate).toBe(false);
  });

  it('skips self-comparison by ID', () => {
    const newExpense: ExpenseInput = {
      id: 'exp-1',
      amount: 500,
      description: 'Coffee shop',
      date: now.toISOString(),
    };
    const existing: ExpenseInput[] = [
      {
        id: 'exp-1',
        amount: 500,
        description: 'Coffee shop',
        date: now.toISOString(),
      },
    ];

    const result = detectDuplicate(newExpense, existing);
    expect(result.isDuplicate).toBe(false);
  });

  it('gives higher confidence when merchant also matches', () => {
    const newExpense: ExpenseInput = {
      amount: 500,
      description: 'Coffee',
      date: now.toISOString(),
      merchant: 'Starbucks',
    };
    const withMerchant: ExpenseInput[] = [
      {
        id: 'exp-1',
        amount: 500,
        description: 'Coffee',
        date: oneHourAgo.toISOString(),
        merchant: 'Starbucks',
      },
    ];
    const withoutMerchant: ExpenseInput[] = [
      {
        id: 'exp-2',
        amount: 500,
        description: 'Coffee',
        date: oneHourAgo.toISOString(),
      },
    ];

    const resultWith = detectDuplicate(newExpense, withMerchant);
    const resultWithout = detectDuplicate(newExpense, withoutMerchant);

    expect(resultWith.confidence).toBeGreaterThanOrEqual(
      resultWithout.confidence,
    );
  });

  it('gives time proximity bonus for very recent expenses', () => {
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const twentyHoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000);

    const newExpense: ExpenseInput = {
      amount: 500,
      description: 'Coffee shop',
      date: now.toISOString(),
    };

    const veryRecent: ExpenseInput[] = [
      {
        id: 'exp-1',
        amount: 500,
        description: 'Coffee shop',
        date: fiveMinAgo.toISOString(),
      },
    ];
    const lessRecent: ExpenseInput[] = [
      {
        id: 'exp-2',
        amount: 500,
        description: 'Coffee shop',
        date: twentyHoursAgo.toISOString(),
      },
    ];

    const resultRecent = detectDuplicate(newExpense, veryRecent);
    const resultLess = detectDuplicate(newExpense, lessRecent);

    expect(resultRecent.confidence).toBeGreaterThanOrEqual(
      resultLess.confidence,
    );
  });

  it('picks the best match among multiple candidates', () => {
    const newExpense: ExpenseInput = {
      amount: 500,
      description: 'Coffee shop',
      date: now.toISOString(),
    };
    const existing: ExpenseInput[] = [
      {
        id: 'exp-1',
        amount: 200,
        description: 'Grocery',
        date: oneHourAgo.toISOString(),
      },
      {
        id: 'exp-2',
        amount: 500,
        description: 'Coffee shop',
        date: oneHourAgo.toISOString(),
      },
    ];

    const result = detectDuplicate(newExpense, existing);
    expect(result.isDuplicate).toBe(true);
    expect(result.matchingExpenseId).toBe('exp-2');
  });

  it('handles close but not exact amounts with low confidence', () => {
    const newExpense: ExpenseInput = {
      amount: 500,
      description: 'Something unique here',
      date: now.toISOString(),
    };
    const existing: ExpenseInput[] = [
      {
        id: 'exp-1',
        amount: 502,
        description: 'Something completely different',
        date: oneHourAgo.toISOString(),
      },
    ];

    const result = detectDuplicate(newExpense, existing);
    // Different description + slightly different amount = low confidence
    expect(result.isDuplicate).toBe(false);
  });

  it('caps confidence at 1.0', () => {
    const newExpense: ExpenseInput = {
      amount: 500,
      description: 'Coffee shop',
      date: now.toISOString(),
      merchant: 'Starbucks',
    };
    const existing: ExpenseInput[] = [
      {
        id: 'exp-1',
        amount: 500,
        description: 'Coffee shop',
        date: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
        merchant: 'Starbucks',
      },
    ];

    const result = detectDuplicate(newExpense, existing);
    expect(result.confidence).toBeLessThanOrEqual(1.0);
  });
});
