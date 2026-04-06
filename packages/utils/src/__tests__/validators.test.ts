import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  expenseSchema,
  pendingPaymentSchema,
  budgetSchema,
  categorySchema,
} from '../validators';

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'mypassword',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'mypassword',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty email', () => {
    const result = loginSchema.safeParse({
      email: '',
      password: 'mypassword',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  const validRegistration = {
    email: 'user@example.com',
    password: 'StrongPass1',
    confirmPassword: 'StrongPass1',
    fullName: 'John Doe',
  };

  it('accepts valid registration', () => {
    const result = registerSchema.safeParse(validRegistration);
    expect(result.success).toBe(true);
  });

  it('rejects password mismatch', () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      confirmPassword: 'DifferentPass1',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('confirmPassword');
    }
  });

  it('rejects password without uppercase letter', () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      password: 'nouppercase1',
      confirmPassword: 'nouppercase1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password without number', () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      password: 'NoNumberHere',
      confirmPassword: 'NoNumberHere',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short password (less than 8 chars)', () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      password: 'Ab1',
      confirmPassword: 'Ab1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short full name', () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      fullName: 'A',
    });
    expect(result.success).toBe(false);
  });
});

describe('expenseSchema', () => {
  const validExpense = {
    amount: 100,
    currency: 'INR',
    categoryId: 'cat-1',
    description: 'Lunch',
    expenseDate: new Date().toISOString(),
  };

  it('accepts valid expense', () => {
    const result = expenseSchema.safeParse(validExpense);
    expect(result.success).toBe(true);
  });

  it('rejects zero amount', () => {
    const result = expenseSchema.safeParse({ ...validExpense, amount: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative amount', () => {
    const result = expenseSchema.safeParse({ ...validExpense, amount: -50 });
    expect(result.success).toBe(false);
  });

  it('rejects missing description', () => {
    const result = expenseSchema.safeParse({
      ...validExpense,
      description: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing categoryId', () => {
    const result = expenseSchema.safeParse({
      ...validExpense,
      categoryId: '',
    });
    expect(result.success).toBe(false);
  });

  it('requires recurrenceInterval when isRecurring is true', () => {
    const result = expenseSchema.safeParse({
      ...validExpense,
      isRecurring: true,
    });
    expect(result.success).toBe(false);
  });

  it('accepts recurring expense with interval', () => {
    const result = expenseSchema.safeParse({
      ...validExpense,
      isRecurring: true,
      recurrenceInterval: 'monthly',
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional tags', () => {
    const result = expenseSchema.safeParse({
      ...validExpense,
      tags: ['food', 'office'],
    });
    expect(result.success).toBe(true);
  });
});

describe('pendingPaymentSchema', () => {
  const validPayment = {
    contactId: 'contact-1',
    direction: 'lent' as const,
    totalAmount: 500,
    currency: 'INR',
    description: 'Dinner split',
  };

  it('accepts valid pending payment', () => {
    const result = pendingPaymentSchema.safeParse(validPayment);
    expect(result.success).toBe(true);
  });

  it('rejects missing contact', () => {
    const result = pendingPaymentSchema.safeParse({
      ...validPayment,
      contactId: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid direction', () => {
    const result = pendingPaymentSchema.safeParse({
      ...validPayment,
      direction: 'unknown',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional dueDate', () => {
    const result = pendingPaymentSchema.safeParse({
      ...validPayment,
      dueDate: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });
});

describe('budgetSchema', () => {
  const validBudget = {
    categoryId: 'cat-1',
    amount: 5000,
    currency: 'INR',
    period: 'monthly' as const,
    startDate: new Date().toISOString(),
  };

  it('accepts valid budget', () => {
    const result = budgetSchema.safeParse(validBudget);
    expect(result.success).toBe(true);
  });

  it('rejects zero amount', () => {
    const result = budgetSchema.safeParse({ ...validBudget, amount: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid period', () => {
    const result = budgetSchema.safeParse({
      ...validBudget,
      period: 'biweekly',
    });
    expect(result.success).toBe(false);
  });

  it('rejects alert threshold above 100', () => {
    const result = budgetSchema.safeParse({
      ...validBudget,
      alertThresholdPercent: 150,
    });
    expect(result.success).toBe(false);
  });

  it('rejects alert threshold below 1', () => {
    const result = budgetSchema.safeParse({
      ...validBudget,
      alertThresholdPercent: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('categorySchema', () => {
  const validCategory = {
    name: 'Food',
    icon: 'utensils',
    color: '#FF5733',
    type: 'expense' as const,
  };

  it('accepts valid category', () => {
    const result = categorySchema.safeParse(validCategory);
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = categorySchema.safeParse({ ...validCategory, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid hex color', () => {
    const result = categorySchema.safeParse({
      ...validCategory,
      color: 'red',
    });
    expect(result.success).toBe(false);
  });

  it('accepts 3-digit hex color', () => {
    const result = categorySchema.safeParse({
      ...validCategory,
      color: '#F00',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid type', () => {
    const result = categorySchema.safeParse({
      ...validCategory,
      type: 'transfer',
    });
    expect(result.success).toBe(false);
  });

  it('accepts income type', () => {
    const result = categorySchema.safeParse({
      ...validCategory,
      type: 'income',
    });
    expect(result.success).toBe(true);
  });
});
