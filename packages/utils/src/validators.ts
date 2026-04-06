/**
 * Zod validation schemas for every form in ExpenseFlow.
 *
 * Each schema is exported individually so tree-shaking works, and also
 * re-exported from the barrel `index.ts`.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Reusable field helpers
// ---------------------------------------------------------------------------

const emailField = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email address')
  .max(255);

const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const positiveAmount = z
  .number({ required_error: 'Amount is required', invalid_type_error: 'Amount must be a number' })
  .positive('Amount must be greater than zero')
  .finite('Amount must be a finite number');

const currencyField = z
  .string()
  .min(3, 'Currency code is required')
  .max(3)
  .toUpperCase();

const optionalString = z.string().max(500).optional();
const optionalNotes = z.string().max(2000).optional();

// ---------------------------------------------------------------------------
// Auth schemas
// ---------------------------------------------------------------------------

/** Login form schema. */
export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required').max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Registration form schema. */
export const registerSchema = z
  .object({
    email: emailField,
    password: passwordField,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    fullName: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must not exceed 100 characters')
      .trim(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/** Profile / settings form schema. */
export const profileSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100)
    .trim(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{6,14}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  timezone: z.string().min(1, 'Timezone is required'),
  defaultCurrency: currencyField,
});
export type ProfileInput = z.infer<typeof profileSchema>;

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

/** Recurrence interval for recurring expenses. */
export const recurrenceIntervalEnum = z.enum([
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
]);
export type RecurrenceInterval = z.infer<typeof recurrenceIntervalEnum>;

/** Full expense form schema. */
export const expenseSchema = z.object({
  amount: positiveAmount,
  currency: currencyField,
  categoryId: z.string().min(1, 'Category is required'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(255, 'Description must not exceed 255 characters')
    .trim(),
  notes: optionalNotes,
  expenseDate: z.coerce.date({ required_error: 'Date is required' }),
  tags: z.array(z.string().max(50)).max(10, 'Maximum 10 tags allowed').optional(),
  isRecurring: z.boolean().default(false),
  recurrenceInterval: recurrenceIntervalEnum.optional(),
}).refine(
  (data) => !data.isRecurring || data.recurrenceInterval != null,
  {
    message: 'Recurrence interval is required for recurring expenses',
    path: ['recurrenceInterval'],
  },
);
export type ExpenseInput = z.infer<typeof expenseSchema>;

/** Quick-add expense schema (minimal fields). */
export const quickAddExpenseSchema = z.object({
  amount: positiveAmount,
  description: z.string().min(1, 'Description is required').max(255).trim(),
  categoryId: z.string().min(1, 'Category is required'),
});
export type QuickAddExpenseInput = z.infer<typeof quickAddExpenseSchema>;

// ---------------------------------------------------------------------------
// Pending payments (Udhar)
// ---------------------------------------------------------------------------

/** Direction of a pending payment. */
export const paymentDirectionEnum = z.enum(['lent', 'borrowed']);

/** Schema for creating / editing a pending payment. */
export const pendingPaymentSchema = z.object({
  contactId: z.string().min(1, 'Contact is required'),
  direction: paymentDirectionEnum,
  totalAmount: positiveAmount,
  currency: currencyField,
  description: z.string().min(1, 'Description is required').max(255).trim(),
  dueDate: z.coerce.date().optional(),
});
export type PendingPaymentInput = z.infer<typeof pendingPaymentSchema>;

/** Schema for recording a partial / full settlement. */
export const paymentHistorySchema = z.object({
  amount: positiveAmount,
  paymentMethod: z.enum(['cash', 'upi', 'bank_transfer', 'card', 'other']).default('cash'),
  notes: optionalNotes,
});
export type PaymentHistoryInput = z.infer<typeof paymentHistorySchema>;

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

/** Contact form schema. */
export const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{6,14}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  email: emailField.optional().or(z.literal('')),
  upiId: z
    .string()
    .regex(/^[\w.-]+@[\w.-]+$/, 'Invalid UPI ID')
    .optional()
    .or(z.literal('')),
});
export type ContactInput = z.infer<typeof contactSchema>;

// ---------------------------------------------------------------------------
// Budgets
// ---------------------------------------------------------------------------

/** Budget period granularity. */
export const budgetPeriodEnum = z.enum(['weekly', 'monthly', 'quarterly', 'yearly']);

/** Budget form schema. */
export const budgetSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  amount: positiveAmount,
  currency: currencyField,
  period: budgetPeriodEnum,
  alertThresholdPercent: z
    .number()
    .int()
    .min(1, 'Threshold must be at least 1%')
    .max(100, 'Threshold cannot exceed 100%')
    .default(80),
  startDate: z.coerce.date({ required_error: 'Start date is required' }),
});
export type BudgetInput = z.infer<typeof budgetSchema>;

// ---------------------------------------------------------------------------
// Savings goals
// ---------------------------------------------------------------------------

/** Savings goal form schema. */
export const savingsGoalSchema = z.object({
  name: z.string().min(1, 'Goal name is required').max(100).trim(),
  targetAmount: positiveAmount,
  currency: currencyField,
  targetDate: z.coerce.date({ required_error: 'Target date is required' }),
  icon: z.string().max(50).optional(),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color')
    .optional(),
});
export type SavingsGoalInput = z.infer<typeof savingsGoalSchema>;

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

/** Category type discriminator. */
export const categoryTypeEnum = z.enum(['expense', 'income']);

/** Category form schema. */
export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50).trim(),
  icon: z.string().min(1, 'Icon is required').max(50),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color'),
  type: categoryTypeEnum,
});
export type CategoryInput = z.infer<typeof categorySchema>;

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------

/** Workspace creation / rename schema. */
export const workspaceSchema = z.object({
  name: z
    .string()
    .min(2, 'Workspace name must be at least 2 characters')
    .max(50, 'Workspace name must not exceed 50 characters')
    .trim(),
});
export type WorkspaceInput = z.infer<typeof workspaceSchema>;

// ---------------------------------------------------------------------------
// PIN / App lock
// ---------------------------------------------------------------------------

/** PIN entry schema (4-6 digit numeric PIN). */
export const pinSchema = z.object({
  pin: z
    .string()
    .regex(/^\d{4,6}$/, 'PIN must be 4 to 6 digits'),
});
export type PinInput = z.infer<typeof pinSchema>;
