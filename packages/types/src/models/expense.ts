import type {
  ExpenseType,
  RecurrenceInterval,
  SplitMethod,
} from '../enums';

export interface Expense {
  id: string;
  workspace_id: string;
  user_id: string;
  category_id: string | null;
  subcategory_id: string | null;
  type: ExpenseType;
  amount: number;
  currency: string;
  exchange_rate: number | null;
  base_amount: number | null;
  description: string;
  notes: string | null;
  date: string;
  receipt_url: string | null;
  ocr_data: Record<string, unknown> | null;
  tags: string[];
  is_split: boolean;
  split_method: SplitMethod | null;
  is_recurring: boolean;
  recurrence_interval: RecurrenceInterval | null;
  recurrence_end_date: string | null;
  parent_expense_id: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseHistory {
  id: string;
  expense_id: string;
  user_id: string;
  action: string;
  changes: Record<string, unknown>;
  created_at: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string | null;
  contact_id: string | null;
  amount: number;
  percentage: number | null;
  is_settled: boolean;
  settled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseFilters {
  workspace_id?: string;
  type?: ExpenseType;
  category_id?: string;
  subcategory_id?: string;
  tags?: string[];
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  currency?: string;
  is_recurring?: boolean;
  is_split?: boolean;
  search?: string;
  sort_by?: 'date' | 'amount' | 'created_at';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateExpenseInput {
  workspace_id: string;
  category_id?: string | null;
  subcategory_id?: string | null;
  type: ExpenseType;
  amount: number;
  currency: string;
  exchange_rate?: number | null;
  description: string;
  notes?: string | null;
  date: string;
  receipt_url?: string | null;
  tags?: string[];
  is_split?: boolean;
  split_method?: SplitMethod | null;
  splits?: CreateExpenseSplitInput[];
  is_recurring?: boolean;
  recurrence_interval?: RecurrenceInterval | null;
  recurrence_end_date?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface CreateExpenseSplitInput {
  user_id?: string | null;
  contact_id?: string | null;
  amount?: number;
  percentage?: number | null;
}

export interface UpdateExpenseInput {
  category_id?: string | null;
  subcategory_id?: string | null;
  type?: ExpenseType;
  amount?: number;
  currency?: string;
  exchange_rate?: number | null;
  description?: string;
  notes?: string | null;
  date?: string;
  receipt_url?: string | null;
  tags?: string[];
  is_split?: boolean;
  split_method?: SplitMethod | null;
  splits?: CreateExpenseSplitInput[];
  is_recurring?: boolean;
  recurrence_interval?: RecurrenceInterval | null;
  recurrence_end_date?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}
