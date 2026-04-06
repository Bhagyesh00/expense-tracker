import type { TypedSupabaseClient } from '../client';
import type { BudgetRow, FundAddition } from '../queries/budgets';

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface CreateBudgetInput {
  workspace_id: string;
  category_id?: string | null;
  amount: number;
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  currency: string;
  start_date?: string | null;
  end_date?: string | null;
}

export interface UpdateBudgetInput {
  category_id?: string | null;
  amount?: number;
  period?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  currency?: string;
  is_active?: boolean;
  start_date?: string | null;
  end_date?: string | null;
}

export interface CreateSavingsGoalInput {
  workspace_id: string;
  name: string;
  target_amount: number;
  current_amount?: number;
  currency: string;
  target_date?: string | null;
  icon?: string | null;
  color?: string | null;
}

export interface UpdateSavingsGoalInput {
  name?: string;
  target_amount?: number;
  current_amount?: number;
  currency?: string;
  target_date?: string | null;
  icon?: string | null;
  color?: string | null;
  is_completed?: boolean;
}

export interface AddFundsResult {
  id: string;
  current_amount: number;
  is_completed: boolean;
  fund_additions: FundAddition[];
}

// ---------------------------------------------------------------------------
// createBudget — validates no duplicate active budget for same category+period
// ---------------------------------------------------------------------------

export async function createBudget(
  client: TypedSupabaseClient,
  input: CreateBudgetInput,
): Promise<BudgetRow> {
  // Check for duplicate active budget with same category + period
  if (input.category_id) {
    let duplicateQuery = client
      .from('budgets')
      .select('id')
      .eq('workspace_id', input.workspace_id)
      .eq('category_id', input.category_id)
      .eq('period', input.period)
      .eq('is_active', true);

    const { data: existing, error: checkError } = await duplicateQuery;
    if (checkError) throw checkError;

    if (existing && existing.length > 0) {
      throw new Error(
        `An active budget already exists for this category and period. Deactivate it first or update the existing budget.`,
      );
    }
  }

  const { data, error } = await client
    .from('budgets')
    .insert({
      workspace_id: input.workspace_id,
      category_id: input.category_id ?? null,
      amount: input.amount,
      period: input.period,
      currency: input.currency,
      is_active: true,
      start_date: input.start_date ?? null,
      end_date: input.end_date ?? null,
    } as any)
    .select('*, categories(id, name, icon, color)')
    .single();

  if (error) throw error;
  return data as unknown as BudgetRow;
}

// ---------------------------------------------------------------------------
// updateBudget
// ---------------------------------------------------------------------------

export async function updateBudget(
  client: TypedSupabaseClient,
  id: string,
  input: UpdateBudgetInput,
): Promise<BudgetRow> {
  const { data, error } = await client
    .from('budgets')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', id)
    .select('*, categories(id, name, icon, color)')
    .single();

  if (error) throw error;
  return data as unknown as BudgetRow;
}

// ---------------------------------------------------------------------------
// deleteBudget — soft-deactivate (is_active = false)
// ---------------------------------------------------------------------------

export async function deleteBudget(
  client: TypedSupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await client
    .from('budgets')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// createSavingsGoal
// ---------------------------------------------------------------------------

export async function createSavingsGoal(
  client: TypedSupabaseClient,
  input: CreateSavingsGoalInput,
) {
  const { data, error } = await client
    .from('savings_goals')
    .insert({
      workspace_id: input.workspace_id,
      name: input.name,
      target_amount: input.target_amount,
      current_amount: input.current_amount ?? 0,
      currency: input.currency,
      target_date: input.target_date ?? null,
      icon: input.icon ?? null,
      color: input.color ?? null,
      is_completed: false,
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// updateSavingsGoal
// ---------------------------------------------------------------------------

export async function updateSavingsGoal(
  client: TypedSupabaseClient,
  id: string,
  input: UpdateSavingsGoalInput,
) {
  const { data, error } = await client
    .from('savings_goals')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// addFundsToGoal — increment current_amount, track in fund_additions, auto-complete
// ---------------------------------------------------------------------------

export async function addFundsToGoal(
  client: TypedSupabaseClient,
  goalId: string,
  amount: number,
  notes?: string,
): Promise<AddFundsResult> {
  if (amount <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  // Fetch current goal state
  const { data: goal, error: fetchError } = await client
    .from('savings_goals')
    .select('*')
    .eq('id', goalId)
    .single();

  if (fetchError) throw fetchError;
  if (!goal) throw new Error('Savings goal not found');

  const g = goal as any;
  if (g.is_completed) {
    throw new Error('Cannot add funds to a completed goal');
  }

  const newAmount = (g.current_amount as number) + amount;
  const isNowCompleted = newAmount >= (g.target_amount as number);

  // Build new fund_additions entry
  const newEntry: FundAddition = {
    amount,
    notes: notes ?? null,
    added_at: new Date().toISOString(),
  };

  const existingAdditions: FundAddition[] = g.fund_additions ?? [];
  const updatedAdditions = [...existingAdditions, newEntry];

  const updatePayload: Record<string, unknown> = {
    current_amount: newAmount,
    fund_additions: updatedAdditions,
    updated_at: new Date().toISOString(),
  };

  if (isNowCompleted) {
    updatePayload.is_completed = true;
  }

  const { data: updated, error: updateError } = await client
    .from('savings_goals')
    .update(updatePayload)
    .eq('id', goalId)
    .select()
    .single();

  if (updateError) throw updateError;

  const u = updated as any;
  return {
    id: u.id,
    current_amount: u.current_amount,
    is_completed: u.is_completed,
    fund_additions: u.fund_additions ?? [],
  };
}

// ---------------------------------------------------------------------------
// markGoalCompleted — explicitly set is_completed = true
// ---------------------------------------------------------------------------

export async function markGoalCompleted(
  client: TypedSupabaseClient,
  goalId: string,
): Promise<void> {
  const { error } = await client
    .from('savings_goals')
    .update({
      is_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', goalId);

  if (error) throw error;
}
