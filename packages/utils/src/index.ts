/**
 * @expenseflow/utils — shared utilities for the ExpenseFlow monorepo.
 *
 * Re-exports every public symbol from the individual modules so consumers
 * can import from a single entry point:
 *
 * ```ts
 * import { formatCurrency, expenseSchema, generateId } from '@expenseflow/utils';
 * ```
 */

// Currency helpers
export {
  SUPPORTED_CURRENCIES,
  formatCurrency,
  getCurrencySymbol,
  convertCurrency,
  parseCurrencyInput,
} from './currency';
export type { CurrencyInfo } from './currency';

// Date helpers
export {
  formatDate,
  formatRelativeTime,
  getMonthRange,
  getDateRange,
  isOverdue,
  getDaysUntil,
  formatDateForDB,
  getGreeting,
} from './date';
export type { DatePeriod, DateRange } from './date';

// Zod validation schemas
export {
  loginSchema,
  registerSchema,
  profileSchema,
  expenseSchema,
  quickAddExpenseSchema,
  pendingPaymentSchema,
  paymentHistorySchema,
  contactSchema,
  budgetSchema,
  savingsGoalSchema,
  categorySchema,
  workspaceSchema,
  pinSchema,
  recurrenceIntervalEnum,
  paymentDirectionEnum,
  budgetPeriodEnum,
  categoryTypeEnum,
} from './validators';
export type {
  LoginInput,
  RegisterInput,
  ProfileInput,
  ExpenseInput,
  QuickAddExpenseInput,
  PendingPaymentInput,
  PaymentHistoryInput,
  ContactInput,
  BudgetInput,
  SavingsGoalInput,
  CategoryInput,
  WorkspaceInput,
  PinInput,
  RecurrenceInterval,
} from './validators';

// Constants
export {
  APP_NAME,
  APP_DESCRIPTION,
  DEFAULT_CATEGORIES,
  CURRENCY_CODES,
  MAX_RECEIPT_SIZE,
  SUPPORTED_RECEIPT_TYPES,
  BUDGET_ALERT_THRESHOLDS,
  PAYMENT_METHODS,
} from './constants';
export type {
  DefaultCategory,
  CurrencyCode,
  PaymentMethod,
} from './constants';

// ID generation
export { generateId, generateSlug } from './id';

// Storage path utilities
export {
  getReceiptUrl,
  getAvatarUrl,
  getFileExtension,
  isValidReceiptType,
  formatFileSize,
  isWithinReceiptSizeLimit,
} from './storage';

// Settlement algorithm
export { calculateSettlements } from './settlement';
export type { Debt, Settlement } from './settlement';
