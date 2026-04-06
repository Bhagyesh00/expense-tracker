/**
 * Application-wide constants for ExpenseFlow.
 */

// ---------------------------------------------------------------------------
// App metadata
// ---------------------------------------------------------------------------

export const APP_NAME = 'ExpenseFlow';
export const APP_DESCRIPTION =
  'Track expenses, manage budgets, and settle payments — all in one place.';

// ---------------------------------------------------------------------------
// Default categories
// ---------------------------------------------------------------------------

export interface DefaultCategory {
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
}

/**
 * The 19 default categories seeded for every new workspace.
 * `icon` values reference the icon set used in the mobile / web UI
 * (e.g. Lucide or Material icons).
 */
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // ---- Expense categories ----
  { name: 'Food & Dining', icon: 'utensils', color: '#FF6B6B', type: 'expense' },
  { name: 'Transport', icon: 'car', color: '#4ECDC4', type: 'expense' },
  { name: 'Shopping', icon: 'shopping-bag', color: '#FF9F43', type: 'expense' },
  { name: 'Bills & Utilities', icon: 'receipt', color: '#54A0FF', type: 'expense' },
  { name: 'Entertainment', icon: 'film', color: '#A55EEA', type: 'expense' },
  { name: 'Health', icon: 'heart-pulse', color: '#EE5A6F', type: 'expense' },
  { name: 'Education', icon: 'graduation-cap', color: '#1DD1A1', type: 'expense' },
  { name: 'Groceries', icon: 'shopping-cart', color: '#10AC84', type: 'expense' },
  { name: 'Rent', icon: 'home', color: '#5F6C7B', type: 'expense' },
  { name: 'Travel', icon: 'plane', color: '#0ABDE3', type: 'expense' },
  { name: 'Personal Care', icon: 'sparkles', color: '#F368E0', type: 'expense' },
  { name: 'Gifts & Donations', icon: 'gift', color: '#FF6348', type: 'expense' },
  { name: 'Investments', icon: 'trending-up', color: '#2E86DE', type: 'expense' },
  { name: 'Other', icon: 'ellipsis', color: '#8395A7', type: 'expense' },

  // ---- Income categories ----
  { name: 'Salary', icon: 'banknote', color: '#27AE60', type: 'income' },
  { name: 'Freelance', icon: 'laptop', color: '#2ECC71', type: 'income' },
  { name: 'Investment Return', icon: 'bar-chart-2', color: '#3498DB', type: 'income' },
  { name: 'Gift Received', icon: 'gift', color: '#E74C3C', type: 'income' },
  { name: 'Other Income', icon: 'plus-circle', color: '#95A5A6', type: 'income' },
] as const;

// ---------------------------------------------------------------------------
// Currency codes
// ---------------------------------------------------------------------------

/** ISO 4217 codes for all supported currencies. */
export const CURRENCY_CODES = [
  'INR', 'USD', 'EUR', 'GBP', 'JPY',
  'AUD', 'CAD', 'SGD', 'AED', 'SAR',
  'CHF', 'CNY',
] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

// ---------------------------------------------------------------------------
// File / receipt constraints
// ---------------------------------------------------------------------------

/** Maximum receipt file size in bytes (10 MB). */
export const MAX_RECEIPT_SIZE = 10 * 1024 * 1024;

/** MIME types accepted for receipt uploads. */
export const SUPPORTED_RECEIPT_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
] as const;

// ---------------------------------------------------------------------------
// Budget alert thresholds
// ---------------------------------------------------------------------------

/**
 * Default percentage thresholds at which the app sends budget alerts.
 * For example, alerts fire when spending hits 50%, 80%, and 100% of the
 * budget limit.
 */
export const BUDGET_ALERT_THRESHOLDS = [50, 80, 100] as const;

// ---------------------------------------------------------------------------
// Payment methods
// ---------------------------------------------------------------------------

/** Payment methods available when recording settlements / expenses. */
export const PAYMENT_METHODS = [
  'cash',
  'upi',
  'bank_transfer',
  'card',
  'other',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
