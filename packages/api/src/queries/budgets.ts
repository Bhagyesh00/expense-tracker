import type { TypedSupabaseClient } from '../client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BudgetRow {
  id: string;
  workspace_id: string;
  category_id: string | null;
  amount: number;
  period: string;
  currency: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  last_alert_percent: number;
  created_at: string;
  updated_at: string;
  categories?: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  } | null;
  spent?: number;
}

export interface BudgetDetailRow extends BudgetRow {
  expenses: BudgetExpenseItem[];
  remaining: number;
  spent_percent: number;
}

export interface BudgetExpenseItem {
  id: string;
  amount: number;
  description: string;
  expense_date: string;
  currency: string;
}

export interface BudgetHistoryPoint {
  month: string; // YYYY-MM
  spent: number;
  budget_amount: number;
}

export interface UnbudgetedCategory {
  category_id: string;
  category_name: string;
  category_icon: string | null;
  category_color: string | null;
  total_spent: number;
}

export interface SavingsGoalRow {
  id: string;
  workspace_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  target_date: string | null;
  icon: string | null;
  color: string | null;
  is_completed: boolean;
  fund_additions: FundAddition[];
  progress_percent: number;
  created_at: string;
  updated_at: string;
}

export interface FundAddition {
  amount: number;
  notes: string | null;
  added_at: string;
}

export interface SavingsGoalDetailRow extends SavingsGoalRow {
  days_remaining: number | null;
  daily_target: number | null;
}

// ---------------------------------------------------------------------------
// Period helpers
// ---------------------------------------------------------------------------

function getPeriodStart(period: string, now: Date): Date {
  switch (period) {
    case 'weekly': {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday start
      const start = new Date(now);
      start.setDate(now.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case 'monthly':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'quarterly': {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      return new Date(now.getFullYear(), quarterMonth, 1);
    }
    case 'yearly':
      return new Date(now.getFullYear(), 0, 1);
    default:
      return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}

function getPeriodEnd(period: string, now: Date): Date {
  switch (period) {
    case 'weekly': {
      const start = getPeriodStart(period, now);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return end;
    }
    case 'monthly':
      return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    case 'quarterly': {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      return new Date(now.getFullYear(), quarterMonth + 3, 0, 23, 59, 59, 999);
    }
    case 'yearly':
      return new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    default:
      return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }
}

function formatDateStr(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

// ---------------------------------------------------------------------------
// Helper: compute spent for a budget
// ---------------------------------------------------------------------------

async function computeSpent(
  client: TypedSupabaseClient,
  workspaceId: string,
  categoryId: string | null,
  periodStart: string,
  periodEnd: string,
): Promise<number> {
  let query = client
    .from('expenses')
    .select('amount')
    .eq('workspace_id', workspaceId)
    .eq('type', 'expense')
    .gte('expense_date', periodStart)
    .lte('expense_date', periodEnd)
    .is('deleted_at', null);

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data: expenses, error } = await query;
  if (error) throw error;

  return (expenses ?? []).reduce(
    (sum, e) => sum + (e.amount as number),
    0,
  );
}

// ---------------------------------------------------------------------------
// getBudgets — list with computed spent amounts
// ---------------------------------------------------------------------------

export async function getBudgets(
  client: TypedSupabaseClient,
  workspaceId: string,
): Promise<BudgetRow[]> {
  const { data: budgets, error: budgetsError } = await client
    .from('budgets')
    .select('*, categories(id, name, icon, color)')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (budgetsError) throw budgetsError;

  const now = new Date();
  const results = await Promise.all(
    (budgets ?? []).map(async (budget) => {
      const periodStart = getPeriodStart(budget.period as string, now);
      const periodEnd = getPeriodEnd(budget.period as string, now);

      const spent = await computeSpent(
        client,
        workspaceId,
        budget.category_id,
        formatDateStr(periodStart),
        formatDateStr(periodEnd),
      );

      return { ...budget, spent } as unknown as BudgetRow;
    }),
  );

  return results;
}

// ---------------------------------------------------------------------------
// getBudgetWithSpent — single budget (backward compat)
// ---------------------------------------------------------------------------

export async function getBudgetWithSpent(
  client: TypedSupabaseClient,
  budgetId: string,
): Promise<BudgetRow> {
  const { data: budget, error } = await client
    .from('budgets')
    .select('*, categories(id, name, icon, color)')
    .eq('id', budgetId)
    .single();

  if (error) throw error;

  const now = new Date();
  const periodStart = getPeriodStart(budget.period as string, now);
  const periodEnd = getPeriodEnd(budget.period as string, now);

  const spent = await computeSpent(
    client,
    budget.workspace_id as string,
    budget.category_id,
    formatDateStr(periodStart),
    formatDateStr(periodEnd),
  );

  return { ...budget, spent } as unknown as BudgetRow;
}

// ---------------------------------------------------------------------------
// getBudgetDetail — single budget with expenses list
// ---------------------------------------------------------------------------

export async function getBudgetDetail(
  client: TypedSupabaseClient,
  budgetId: string,
): Promise<BudgetDetailRow> {
  const { data: budget, error } = await client
    .from('budgets')
    .select('*, categories(id, name, icon, color)')
    .eq('id', budgetId)
    .single();

  if (error) throw error;

  const now = new Date();
  const periodStart = getPeriodStart(budget.period as string, now);
  const periodEnd = getPeriodEnd(budget.period as string, now);
  const startStr = formatDateStr(periodStart);
  const endStr = formatDateStr(periodEnd);

  // Fetch individual expenses for the period
  let expQuery = client
    .from('expenses')
    .select('id, amount, description, expense_date, currency')
    .eq('workspace_id', budget.workspace_id as string)
    .eq('type', 'expense')
    .gte('expense_date', startStr)
    .lte('expense_date', endStr)
    .is('deleted_at', null)
    .order('expense_date', { ascending: false });

  if (budget.category_id) {
    expQuery = expQuery.eq('category_id', budget.category_id);
  }

  const { data: expenses, error: expError } = await expQuery;
  if (expError) throw expError;

  const expenseItems: BudgetExpenseItem[] = (expenses ?? []).map((e: any) => ({
    id: e.id,
    amount: e.amount,
    description: e.description,
    expense_date: e.expense_date,
    currency: e.currency,
  }));

  const spent = expenseItems.reduce((sum, e) => sum + e.amount, 0);
  const remaining = Math.max(0, (budget.amount as number) - spent);
  const spent_percent =
    (budget.amount as number) > 0
      ? Math.round((spent / (budget.amount as number)) * 100)
      : 0;

  return {
    ...budget,
    spent,
    expenses: expenseItems,
    remaining,
    spent_percent,
  } as unknown as BudgetDetailRow;
}

// ---------------------------------------------------------------------------
// getBudgetAlerts — budgets exceeding a threshold
// ---------------------------------------------------------------------------

export async function getBudgetAlerts(
  client: TypedSupabaseClient,
  workspaceId: string,
  thresholdPercent = 80,
): Promise<(BudgetRow & { spent_percent: number })[]> {
  const budgets = await getBudgets(client, workspaceId);

  return budgets
    .map((b) => {
      const spentPct = b.amount > 0 ? Math.round(((b.spent ?? 0) / b.amount) * 100) : 0;
      return { ...b, spent_percent: spentPct };
    })
    .filter((b) => b.spent_percent >= thresholdPercent)
    .sort((a, b) => b.spent_percent - a.spent_percent);
}

// ---------------------------------------------------------------------------
// getBudgetHistory — monthly spent vs budget for trend chart
// ---------------------------------------------------------------------------

export async function getBudgetHistory(
  client: TypedSupabaseClient,
  budgetId: string,
  months = 6,
): Promise<BudgetHistoryPoint[]> {
  const { data: budget, error } = await client
    .from('budgets')
    .select('*')
    .eq('id', budgetId)
    .single();

  if (error) throw error;

  const now = new Date();
  const results: BudgetHistoryPoint[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

    const spent = await computeSpent(
      client,
      budget.workspace_id as string,
      budget.category_id,
      formatDateStr(monthStart),
      formatDateStr(monthEnd),
    );

    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
    results.push({
      month: monthKey,
      spent,
      budget_amount: budget.amount as number,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// getUnbudgetedSpending — categories with expenses but no budget
// ---------------------------------------------------------------------------

export async function getUnbudgetedSpending(
  client: TypedSupabaseClient,
  workspaceId: string,
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly',
): Promise<UnbudgetedCategory[]> {
  const now = new Date();
  const periodStart = getPeriodStart(period, now);
  const periodEnd = getPeriodEnd(period, now);

  // Get all active budget category IDs
  const { data: budgets, error: budgetError } = await client
    .from('budgets')
    .select('category_id')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true);

  if (budgetError) throw budgetError;

  const budgetedCategoryIds = new Set(
    (budgets ?? []).map((b) => b.category_id).filter(Boolean) as string[],
  );

  // Get all expenses grouped by category for the period
  const { data: expenses, error: expError } = await client
    .from('expenses')
    .select('category_id, amount, categories(id, name, icon, color)')
    .eq('workspace_id', workspaceId)
    .eq('type', 'expense')
    .gte('expense_date', formatDateStr(periodStart))
    .lte('expense_date', formatDateStr(periodEnd))
    .is('deleted_at', null)
    .not('category_id', 'is', null);

  if (expError) throw expError;

  // Group by category and filter out budgeted ones
  const categoryMap = new Map<string, UnbudgetedCategory>();

  for (const exp of expenses ?? []) {
    const catId = exp.category_id as string;
    if (budgetedCategoryIds.has(catId)) continue;

    const existing = categoryMap.get(catId);
    const cat = exp.categories as any;

    if (existing) {
      existing.total_spent += exp.amount as number;
    } else {
      categoryMap.set(catId, {
        category_id: catId,
        category_name: cat?.name ?? 'Unknown',
        category_icon: cat?.icon ?? null,
        category_color: cat?.color ?? null,
        total_spent: exp.amount as number,
      });
    }
  }

  return Array.from(categoryMap.values()).sort(
    (a, b) => b.total_spent - a.total_spent,
  );
}

// ---------------------------------------------------------------------------
// getSavingsGoals — with progress percentage
// ---------------------------------------------------------------------------

export async function getSavingsGoals(
  client: TypedSupabaseClient,
  workspaceId: string,
): Promise<SavingsGoalRow[]> {
  const { data, error } = await client
    .from('savings_goals')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((goal: any) => ({
    ...goal,
    fund_additions: goal.fund_additions ?? [],
    progress_percent:
      goal.target_amount > 0
        ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
        : 0,
  })) as SavingsGoalRow[];
}

// ---------------------------------------------------------------------------
// getSavingsGoalDetail — with fund addition history and daily target
// ---------------------------------------------------------------------------

export async function getSavingsGoalDetail(
  client: TypedSupabaseClient,
  goalId: string,
): Promise<SavingsGoalDetailRow> {
  const { data: goal, error } = await client
    .from('savings_goals')
    .select('*')
    .eq('id', goalId)
    .single();

  if (error) throw error;

  const g = goal as any;
  const fundAdditions: FundAddition[] = g.fund_additions ?? [];
  const progressPercent =
    g.target_amount > 0
      ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100))
      : 0;

  let daysRemaining: number | null = null;
  let dailyTarget: number | null = null;

  if (g.target_date && !g.is_completed) {
    const targetDate = new Date(g.target_date);
    const now = new Date();
    const diffMs = targetDate.getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    const remaining = Math.max(0, g.target_amount - g.current_amount);
    dailyTarget = daysRemaining > 0 ? remaining / daysRemaining : remaining;
  }

  return {
    ...g,
    fund_additions: fundAdditions,
    progress_percent: progressPercent,
    days_remaining: daysRemaining,
    daily_target: dailyTarget,
  } as SavingsGoalDetailRow;
}

// ---------------------------------------------------------------------------
// getCompletedGoals — goals where current >= target
// ---------------------------------------------------------------------------

export async function getCompletedGoals(
  client: TypedSupabaseClient,
  workspaceId: string,
): Promise<SavingsGoalRow[]> {
  const { data, error } = await client
    .from('savings_goals')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_completed', true)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((goal: any) => ({
    ...goal,
    fund_additions: goal.fund_additions ?? [],
    progress_percent: 100,
  })) as SavingsGoalRow[];
}
