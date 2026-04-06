import type { TypedSupabaseClient } from '../client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExpenseFilters {
  dateRange?: { startDate: string; endDate: string };
  categoryId?: string;
  search?: string;
  type?: 'expense' | 'income';
  tags?: string[];
  minAmount?: number;
  maxAmount?: number;
  sortBy?: 'date' | 'amount';
  sortOrder?: 'asc' | 'desc';
  /**
   * When true, include voided expenses in the results.
   * Defaults to false (voided expenses are hidden by default).
   */
  includeVoided?: boolean;
}

export interface PaginationParams {
  offset: number;
  limit: number;
}

export interface ExpenseRow {
  id: string;
  workspace_id: string;
  user_id: string;
  category_id: string | null;
  subcategory_id: string | null;
  type: string;
  amount: number;
  currency: string;
  amount_inr: number | null;
  exchange_rate: number | null;
  description: string;
  notes: string | null;
  receipt_url: string | null;
  receipt_ocr_data: Record<string, unknown> | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  expense_date: string;
  tags: string[] | null;
  is_recurring: boolean;
  recurrence_interval: string | null;
  recurrence_end_date: string | null;
  parent_recurring_id: string | null;
  is_split: boolean;
  split_group_id: string | null;
  split_method: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  categories?: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  } | null;
}

export interface ExpenseStats {
  totalExpenses: number;
  totalIncome: number;
  transactionCount: number;
  avgExpense: number;
}

export interface DateGroupedExpenses {
  date: string;
  expenses: ExpenseRow[];
  totalAmount: number;
}

// ---------------------------------------------------------------------------
// getExpenses — full-featured query with all filters, sorting, pagination
// ---------------------------------------------------------------------------

export async function getExpenses(
  client: TypedSupabaseClient,
  workspaceId: string,
  filters?: ExpenseFilters,
  pagination?: PaginationParams,
): Promise<ExpenseRow[]> {
  const sortBy = filters?.sortBy ?? 'date';
  const sortOrder = filters?.sortOrder ?? 'desc';
  const ascending = sortOrder === 'asc';

  // Map sortBy to actual column names
  const sortColumn = sortBy === 'amount' ? 'amount' : 'expense_date';

  let query = client
    .from('expenses')
    .select('*, categories(id, name, icon, color)')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order(sortColumn, { ascending });

  // Filter out voided expenses unless explicitly requested
  if (!filters?.includeVoided) {
    query = query.eq('is_voided', false);
  }

  // Secondary sort for stability
  if (sortColumn !== 'expense_date') {
    query = query.order('expense_date', { ascending: false });
  }

  // Date range filter
  if (filters?.dateRange) {
    query = query
      .gte('expense_date', filters.dateRange.startDate)
      .lte('expense_date', filters.dateRange.endDate);
  }

  // Category filter
  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  // Text search (description ILIKE)
  if (filters?.search) {
    query = query.ilike('description', `%${filters.search}%`);
  }

  // Type filter
  if (filters?.type) {
    query = query.eq('type', filters.type);
  }

  // Tags filter (overlaps)
  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags);
  }

  // Amount range filter
  if (filters?.minAmount !== undefined) {
    query = query.gte('amount', filters.minAmount);
  }

  if (filters?.maxAmount !== undefined) {
    query = query.lte('amount', filters.maxAmount);
  }

  // Cursor-based pagination using offset/limit
  if (pagination) {
    query = query.range(
      pagination.offset,
      pagination.offset + pagination.limit - 1,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as ExpenseRow[];
}

// ---------------------------------------------------------------------------
// getExpenseById
// ---------------------------------------------------------------------------

export async function getExpenseById(
  client: TypedSupabaseClient,
  id: string,
): Promise<ExpenseRow> {
  const { data, error } = await client
    .from('expenses')
    .select('*, categories(id, name, icon, color)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as unknown as ExpenseRow;
}

// ---------------------------------------------------------------------------
// getExpensesByCategory — used for reports
// ---------------------------------------------------------------------------

export async function getExpensesByCategory(
  client: TypedSupabaseClient,
  workspaceId: string,
  dateRange: { startDate: string; endDate: string },
): Promise<ExpenseRow[]> {
  const { data, error } = await client
    .from('expenses')
    .select('*, categories(id, name, icon, color)')
    .eq('workspace_id', workspaceId)
    .eq('type', 'expense')
    .gte('expense_date', dateRange.startDate)
    .lte('expense_date', dateRange.endDate)
    .is('deleted_at', null)
    .order('category_id');

  if (error) throw error;
  return data as unknown as ExpenseRow[];
}

// ---------------------------------------------------------------------------
// getExpenseStats — aggregate stats for a workspace in a date range
// ---------------------------------------------------------------------------

export async function getExpenseStats(
  client: TypedSupabaseClient,
  workspaceId: string,
  startDate: string,
  endDate: string,
): Promise<ExpenseStats> {
  // Fetch all non-deleted, non-voided expenses in the date range
  const { data, error } = await client
    .from('expenses')
    .select('type, amount')
    .eq('workspace_id', workspaceId)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .is('deleted_at', null)
    .eq('is_voided', false);

  if (error) throw error;

  const rows = (data ?? []) as Array<{ type: string; amount: number }>;

  let totalExpenses = 0;
  let totalIncome = 0;
  let expenseCount = 0;

  for (const row of rows) {
    if (row.type === 'expense') {
      totalExpenses += row.amount;
      expenseCount++;
    } else if (row.type === 'income') {
      totalIncome += row.amount;
    }
  }

  return {
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    totalIncome: Math.round(totalIncome * 100) / 100,
    transactionCount: rows.length,
    avgExpense: expenseCount > 0
      ? Math.round((totalExpenses / expenseCount) * 100) / 100
      : 0,
  };
}

// ---------------------------------------------------------------------------
// getExpensesByDateGrouped — groups expenses by date for section lists
// ---------------------------------------------------------------------------

export async function getExpensesByDateGrouped(
  client: TypedSupabaseClient,
  workspaceId: string,
  dateRange: { startDate: string; endDate: string },
): Promise<DateGroupedExpenses[]> {
  const { data, error } = await client
    .from('expenses')
    .select('*, categories(id, name, icon, color)')
    .eq('workspace_id', workspaceId)
    .gte('expense_date', dateRange.startDate)
    .lte('expense_date', dateRange.endDate)
    .is('deleted_at', null)
    .eq('is_voided', false)
    .order('expense_date', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as unknown as ExpenseRow[];

  // Group by date (expense_date is YYYY-MM-DD)
  const groupMap = new Map<string, ExpenseRow[]>();

  for (const row of rows) {
    const dateKey = row.expense_date;
    const existing = groupMap.get(dateKey);
    if (existing) {
      existing.push(row);
    } else {
      groupMap.set(dateKey, [row]);
    }
  }

  // Convert to sorted array
  const groups: DateGroupedExpenses[] = [];
  for (const [date, expenses] of groupMap) {
    const totalAmount = expenses.reduce((sum, e) => {
      return sum + (e.type === 'expense' ? -e.amount : e.amount);
    }, 0);

    groups.push({
      date,
      expenses,
      totalAmount: Math.round(totalAmount * 100) / 100,
    });
  }

  // Sort by date descending
  groups.sort((a, b) => b.date.localeCompare(a.date));

  return groups;
}

// ---------------------------------------------------------------------------
// searchExpenses — full-text search using pg_trgm similarity
// ---------------------------------------------------------------------------

export async function searchExpenses(
  client: TypedSupabaseClient,
  workspaceId: string,
  query: string,
): Promise<ExpenseRow[]> {
  if (!query.trim()) return [];

  // Use ILIKE for broad matching (pg_trgm index accelerates this)
  // Search across description, notes, and location fields
  const searchTerm = `%${query.trim()}%`;

  const { data, error } = await client
    .from('expenses')
    .select('*, categories(id, name, icon, color)')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .or(`description.ilike.${searchTerm},notes.ilike.${searchTerm},location.ilike.${searchTerm}`)
    .order('expense_date', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data as unknown as ExpenseRow[];
}
