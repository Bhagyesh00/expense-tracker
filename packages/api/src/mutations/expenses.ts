import type { TypedSupabaseClient } from '../client';
import type { ExpenseRow, ExpenseFilters } from '../queries/expenses';

// ---------------------------------------------------------------------------
// Void support types
// ---------------------------------------------------------------------------

export interface VoidExpenseInput {
  /** A brief explanation for why the expense is being voided. */
  reason?: string | null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateExpenseInput {
  workspace_id: string;
  user_id: string;
  category_id?: string | null;
  subcategory_id?: string | null;
  type: 'expense' | 'income';
  amount: number;
  currency: string;
  amount_inr?: number | null;
  exchange_rate?: number | null;
  description: string;
  notes?: string | null;
  date: string;
  tags?: string[] | null;
  receipt_url?: string | null;
  receipt_ocr_data?: Record<string, unknown> | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_recurring?: boolean;
  recurrence_interval?: string | null;
  recurrence_end_date?: string | null;
  parent_recurring_id?: string | null;
  is_split?: boolean;
  split_group_id?: string | null;
  split_method?: 'equal' | 'percentage' | 'exact' | null;
}

export interface UpdateExpenseInput {
  category_id?: string | null;
  subcategory_id?: string | null;
  type?: 'expense' | 'income';
  amount?: number;
  currency?: string;
  amount_inr?: number | null;
  exchange_rate?: number | null;
  description?: string;
  notes?: string | null;
  date?: string;
  tags?: string[] | null;
  receipt_url?: string | null;
  receipt_ocr_data?: Record<string, unknown> | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_recurring?: boolean;
  recurrence_interval?: string | null;
  recurrence_end_date?: string | null;
  is_split?: boolean;
  split_group_id?: string | null;
  split_method?: 'equal' | 'percentage' | 'exact' | null;
}

export interface CreateSplitInput {
  user_id?: string | null;
  contact_id?: string | null;
  amount: number;
  percentage?: number | null;
}

export interface ExportedExpense {
  date: string;
  type: string;
  description: string;
  category: string;
  amount: number;
  currency: string;
  tags: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// createExpense — handles receipt, tags, recurring, splits
// ---------------------------------------------------------------------------

export async function createExpense(
  client: TypedSupabaseClient,
  input: CreateExpenseInput,
  splits?: CreateSplitInput[],
): Promise<ExpenseRow> {
  const { data, error } = await client
    .from('expenses')
    .insert({
      workspace_id: input.workspace_id,
      user_id: input.user_id,
      category_id: input.category_id ?? null,
      subcategory_id: input.subcategory_id ?? null,
      type: input.type,
      amount: input.amount,
      currency: input.currency,
      amount_inr: input.amount_inr ?? null,
      exchange_rate: input.exchange_rate ?? null,
      description: input.description,
      notes: input.notes ?? null,
      expense_date: input.date,
      tags: input.tags ?? [],
      receipt_url: input.receipt_url ?? null,
      receipt_ocr_data: (input.receipt_ocr_data ?? null) as any,
      location: input.location ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      is_recurring: input.is_recurring ?? false,
      recurrence_interval: input.recurrence_interval ?? null,
      recurrence_end_date: input.recurrence_end_date ?? null,
      parent_recurring_id: input.parent_recurring_id ?? null,
      is_split: input.is_split ?? (splits && splits.length > 0) ?? false,
      split_group_id: input.split_group_id ?? null,
      split_method: input.split_method ?? null,
    })
    .select('*, categories(id, name, icon, color)')
    .single();

  if (error) throw error;

  const expense = data as unknown as ExpenseRow;

  // Create splits if provided
  if (splits && splits.length > 0) {
    const splitRows = splits.map((s) => ({
      expense_id: expense.id,
      user_id: s.user_id ?? null,
      contact_id: s.contact_id ?? null,
      amount: s.amount,
      percentage: s.percentage ?? null,
      is_paid: false,
    }));

    const { error: splitError } = await client
      .from('expense_splits')
      .insert(splitRows);

    if (splitError) {
      console.error('Failed to create splits:', splitError);
      // Don't fail the entire operation — expense was created
    }
  }

  return expense;
}

// ---------------------------------------------------------------------------
// updateExpense
// ---------------------------------------------------------------------------

export async function updateExpense(
  client: TypedSupabaseClient,
  id: string,
  input: UpdateExpenseInput,
): Promise<ExpenseRow> {
  // Build update payload, mapping `date` to `expense_date`
  const updatePayload: Record<string, unknown> = {
    ...input,
    updated_at: new Date().toISOString(),
  };

  if ('date' in input) {
    updatePayload.expense_date = input.date;
    delete updatePayload.date;
  }

  const { data, error } = await client
    .from('expenses')
    .update(updatePayload)
    .eq('id', id)
    .select('*, categories(id, name, icon, color)')
    .single();

  if (error) throw error;
  return data as unknown as ExpenseRow;
}

// ---------------------------------------------------------------------------
// deleteExpense — soft delete
// ---------------------------------------------------------------------------

export async function deleteExpense(
  client: TypedSupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await client
    .from('expenses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// restoreExpense
// ---------------------------------------------------------------------------

export async function restoreExpense(
  client: TypedSupabaseClient,
  id: string,
): Promise<ExpenseRow> {
  const { data, error } = await client
    .from('expenses')
    .update({ deleted_at: null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, categories(id, name, icon, color)')
    .single();

  if (error) throw error;
  return data as unknown as ExpenseRow;
}

// ---------------------------------------------------------------------------
// duplicateExpense — copies an expense with a new date (today)
// ---------------------------------------------------------------------------

export async function duplicateExpense(
  client: TypedSupabaseClient,
  expenseId: string,
): Promise<ExpenseRow> {
  // Fetch original
  const { data: original, error: fetchError } = await client
    .from('expenses')
    .select('*')
    .eq('id', expenseId)
    .single();

  if (fetchError || !original) {
    throw fetchError ?? new Error('Expense not found');
  }

  const now = new Date();
  const today = now.toISOString().split('T')[0]!;

  const { data, error } = await client
    .from('expenses')
    .insert({
      workspace_id: original.workspace_id,
      user_id: original.user_id,
      category_id: original.category_id,
      subcategory_id: original.subcategory_id,
      type: original.type,
      amount: original.amount,
      currency: original.currency,
      amount_inr: original.amount_inr,
      exchange_rate: original.exchange_rate,
      description: original.description,
      notes: original.notes,
      expense_date: today,
      tags: original.tags ?? [],
      receipt_url: null, // Don't copy receipt
      receipt_ocr_data: null,
      location: original.location,
      latitude: original.latitude,
      longitude: original.longitude,
      is_recurring: false, // Duplicate is a one-off
      recurrence_interval: null,
      recurrence_end_date: null,
      parent_recurring_id: null,
      is_split: false,
      split_group_id: null,
      split_method: null,
    })
    .select('*, categories(id, name, icon, color)')
    .single();

  if (error) throw error;
  return data as unknown as ExpenseRow;
}

// ---------------------------------------------------------------------------
// bulkDeleteExpenses — soft delete multiple expenses
// ---------------------------------------------------------------------------

export async function bulkDeleteExpenses(
  client: TypedSupabaseClient,
  ids: string[],
): Promise<{ deletedCount: number }> {
  if (ids.length === 0) return { deletedCount: 0 };

  const { error, count } = await client
    .from('expenses')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', ids)
    .is('deleted_at', null);

  if (error) throw error;
  return { deletedCount: count ?? ids.length };
}

// ---------------------------------------------------------------------------
// voidExpense — marks an expense as voided (non-destructive, audit-safe)
// ---------------------------------------------------------------------------

export async function voidExpense(
  client: TypedSupabaseClient,
  expenseId: string,
  input?: VoidExpenseInput,
): Promise<ExpenseRow> {
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) throw new Error('Not authenticated');

  const now = new Date().toISOString();

  const { data, error } = await client
    .from('expenses')
    .update({
      is_voided: true,
      voided_at: now,
      void_reason: input?.reason ?? null,
      voided_by: user.id,
      updated_at: now,
    } as Record<string, unknown>)
    .eq('id', expenseId)
    .is('deleted_at', null)     // Prevent voiding already-deleted expenses
    .eq('is_voided', false)      // Prevent double-voiding
    .select('*, categories(id, name, icon, color)')
    .single();

  if (error) throw error;
  if (!data) throw new Error('Expense not found or already voided');

  return data as unknown as ExpenseRow;
}

// ---------------------------------------------------------------------------
// unvoidExpense — reverses a void operation
// ---------------------------------------------------------------------------

export async function unvoidExpense(
  client: TypedSupabaseClient,
  expenseId: string,
): Promise<ExpenseRow> {
  const now = new Date().toISOString();

  const { data, error } = await client
    .from('expenses')
    .update({
      is_voided: false,
      voided_at: null,
      void_reason: null,
      voided_by: null,
      updated_at: now,
    } as Record<string, unknown>)
    .eq('id', expenseId)
    .eq('is_voided', true)       // Only un-void currently voided expenses
    .select('*, categories(id, name, icon, color)')
    .single();

  if (error) throw error;
  if (!data) throw new Error('Expense not found or not currently voided');

  return data as unknown as ExpenseRow;
}

// ---------------------------------------------------------------------------
// bulkExportExpenses — returns formatted data for CSV export
// ---------------------------------------------------------------------------

export async function bulkExportExpenses(
  client: TypedSupabaseClient,
  workspaceId: string,
  filters?: ExpenseFilters,
): Promise<ExportedExpense[]> {
  let query = client
    .from('expenses')
    .select('*, categories(id, name, icon, color)')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('expense_date', { ascending: false });

  if (filters?.dateRange) {
    query = query
      .gte('expense_date', filters.dateRange.startDate)
      .lte('expense_date', filters.dateRange.endDate);
  }

  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }

  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags);
  }

  if (filters?.minAmount !== undefined) {
    query = query.gte('amount', filters.minAmount);
  }

  if (filters?.maxAmount !== undefined) {
    query = query.lte('amount', filters.maxAmount);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as ExpenseRow[];

  return rows.map((row) => ({
    date: row.expense_date ?? row.date,
    type: row.type,
    description: row.description,
    category: row.categories?.name ?? 'Uncategorized',
    amount: row.amount,
    currency: row.currency,
    tags: (row.tags ?? []).join(', '),
    notes: row.notes ?? '',
  }));
}
