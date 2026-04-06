/**
 * ExpenseFlow — Shared Types for Supabase Edge Functions
 *
 * These types mirror the database schema and are used by edge functions
 * for request/response typing and Supabase client generics.
 */

// ---------------------------------------------------------------------------
// Database Enum Types
// ---------------------------------------------------------------------------

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";
export type ExpenseType = "expense" | "income";
export type PaymentDirection = "give" | "receive";
export type PaymentStatus = "pending" | "partial" | "settled" | "overdue" | "cancelled";
export type RecurrenceInterval = "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
export type NotificationType = "payment_reminder" | "budget_alert" | "overdue_payment" | "workspace_invite" | "system";
export type BudgetPeriod = "weekly" | "monthly" | "quarterly" | "yearly";
export type SplitMethod = "equal" | "percentage" | "exact";
export type Theme = "light" | "dark" | "system";
export type Platform = "ios" | "android" | "web";

// ---------------------------------------------------------------------------
// Database Row Types
// ---------------------------------------------------------------------------

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  default_currency: string;
  locale: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  theme: Theme;
  pin_hash: string | null;
  pin_enabled: boolean;
  biometric_enabled: boolean;
  push_enabled: boolean;
  email_notifications: boolean;
  reminder_days_before: number;
  weekly_summary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  default_currency: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  joined_at: string;
}

export interface Category {
  id: string;
  workspace_id: string | null;
  name: string;
  icon: string;
  color: string;
  type: ExpenseType;
  is_system: boolean;
  sort_order: number;
  created_at: string;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export interface Contact {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  upi_id: string | null;
  avatar_url: string | null;
  notes: string | null;
  linked_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  workspace_id: string;
  user_id: string;
  type: ExpenseType;
  amount: number;
  currency: string;
  amount_inr: number | null;
  exchange_rate: number | null;
  category_id: string | null;
  subcategory_id: string | null;
  description: string;
  notes: string | null;
  receipt_url: string | null;
  receipt_ocr_data: Record<string, unknown> | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  expense_date: string;
  tags: string[];
  is_recurring: boolean;
  recurrence_interval: RecurrenceInterval | null;
  recurrence_end_date: string | null;
  parent_recurring_id: string | null;
  is_split: boolean;
  split_group_id: string | null;
  split_method: SplitMethod | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ExpenseHistory {
  id: string;
  expense_id: string;
  user_id: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  created_at: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string | null;
  contact_id: string | null;
  amount: number;
  percentage: number | null;
  is_paid: boolean;
  created_at: string;
}

export interface PendingPayment {
  id: string;
  workspace_id: string;
  user_id: string;
  contact_id: string;
  direction: PaymentDirection;
  total_amount: number;
  paid_amount: number;
  currency: string;
  status: PaymentStatus;
  description: string | null;
  notes: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  settled_at: string | null;
}

export interface PaymentHistoryRecord {
  id: string;
  pending_payment_id: string;
  amount: number;
  payment_method: string | null;
  proof_url: string | null;
  notes: string | null;
  paid_at: string;
  created_at: string;
}

export interface Budget {
  id: string;
  workspace_id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  currency: string;
  period: BudgetPeriod;
  alert_threshold_percent: number;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoal {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  target_date: string | null;
  icon: string;
  color: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  workspace_id: string | null;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface PushToken {
  id: string;
  user_id: string;
  token: string;
  platform: Platform;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  workspace_id: string | null;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface CurrencyRate {
  base_currency: string;
  target_currency: string;
  rate: number;
  fetched_at: string;
}

export interface AiCache {
  id: string;
  cache_key: string;
  cache_type: string;
  data: Record<string, unknown>;
  expires_at: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Supabase Database Type (for createClient<Database>)
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & Pick<Profile, "id">;
        Update: Partial<Profile>;
      };
      user_settings: {
        Row: UserSettings;
        Insert: Partial<UserSettings> & Pick<UserSettings, "user_id">;
        Update: Partial<UserSettings>;
      };
      workspaces: {
        Row: Workspace;
        Insert: Partial<Workspace> & Pick<Workspace, "name" | "slug" | "owner_id">;
        Update: Partial<Workspace>;
      };
      workspace_members: {
        Row: WorkspaceMember;
        Insert: Partial<WorkspaceMember> & Pick<WorkspaceMember, "workspace_id" | "user_id">;
        Update: Partial<WorkspaceMember>;
      };
      categories: {
        Row: Category;
        Insert: Partial<Category> & Pick<Category, "name">;
        Update: Partial<Category>;
      };
      subcategories: {
        Row: Subcategory;
        Insert: Partial<Subcategory> & Pick<Subcategory, "category_id" | "name">;
        Update: Partial<Subcategory>;
      };
      contacts: {
        Row: Contact;
        Insert: Partial<Contact> & Pick<Contact, "workspace_id" | "user_id" | "name">;
        Update: Partial<Contact>;
      };
      expenses: {
        Row: Expense;
        Insert: Partial<Expense> & Pick<Expense, "workspace_id" | "user_id" | "amount" | "description">;
        Update: Partial<Expense>;
      };
      expense_history: {
        Row: ExpenseHistory;
        Insert: Partial<ExpenseHistory> & Pick<ExpenseHistory, "expense_id" | "user_id" | "changes">;
        Update: Partial<ExpenseHistory>;
      };
      expense_splits: {
        Row: ExpenseSplit;
        Insert: Partial<ExpenseSplit> & Pick<ExpenseSplit, "expense_id" | "amount">;
        Update: Partial<ExpenseSplit>;
      };
      pending_payments: {
        Row: PendingPayment;
        Insert: Partial<PendingPayment> & Pick<PendingPayment, "workspace_id" | "user_id" | "contact_id" | "direction" | "total_amount">;
        Update: Partial<PendingPayment>;
      };
      payment_history: {
        Row: PaymentHistoryRecord;
        Insert: Partial<PaymentHistoryRecord> & Pick<PaymentHistoryRecord, "pending_payment_id" | "amount">;
        Update: Partial<PaymentHistoryRecord>;
      };
      budgets: {
        Row: Budget;
        Insert: Partial<Budget> & Pick<Budget, "workspace_id" | "user_id" | "amount">;
        Update: Partial<Budget>;
      };
      savings_goals: {
        Row: SavingsGoal;
        Insert: Partial<SavingsGoal> & Pick<SavingsGoal, "workspace_id" | "user_id" | "name" | "target_amount">;
        Update: Partial<SavingsGoal>;
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification> & Pick<Notification, "user_id" | "type" | "title" | "body">;
        Update: Partial<Notification>;
      };
      push_tokens: {
        Row: PushToken;
        Insert: Partial<PushToken> & Pick<PushToken, "user_id" | "token" | "platform">;
        Update: Partial<PushToken>;
      };
      audit_log: {
        Row: AuditLogEntry;
        Insert: Partial<AuditLogEntry> & Pick<AuditLogEntry, "user_id" | "action" | "entity_type">;
        Update: Partial<AuditLogEntry>;
      };
      currency_rates: {
        Row: CurrencyRate;
        Insert: CurrencyRate;
        Update: Partial<CurrencyRate>;
      };
      ai_cache: {
        Row: AiCache;
        Insert: Partial<AiCache> & Pick<AiCache, "cache_key" | "cache_type" | "data" | "expires_at">;
        Update: Partial<AiCache>;
      };
    };
    Functions: {
      is_workspace_member: {
        Args: { ws_id: string };
        Returns: boolean;
      };
      get_workspace_role: {
        Args: { ws_id: string };
        Returns: WorkspaceRole | null;
      };
      mark_overdue_payments: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
    Enums: {
      workspace_role: WorkspaceRole;
      expense_type: ExpenseType;
      payment_direction: PaymentDirection;
      payment_status: PaymentStatus;
      recurrence_interval: RecurrenceInterval;
      notification_type: NotificationType;
      budget_period: BudgetPeriod;
      split_method: SplitMethod;
    };
  };
}

// ---------------------------------------------------------------------------
// Common Edge Function Request/Response Types
// ---------------------------------------------------------------------------

/** Standard JSON error body returned by edge functions. */
export interface ApiError {
  error: string;
  details?: string;
}

/** Standard JSON success wrapper. */
export interface ApiSuccess<T = unknown> {
  data: T;
}
