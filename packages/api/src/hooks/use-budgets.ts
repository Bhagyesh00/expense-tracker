import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { TypedSupabaseClient } from '../client';
import {
  getBudgets,
  getBudgetDetail,
  getBudgetAlerts,
  getBudgetHistory,
  getUnbudgetedSpending,
  getSavingsGoals,
  getSavingsGoalDetail,
  getCompletedGoals,
  type BudgetRow,
  type BudgetDetailRow,
  type BudgetHistoryPoint,
  type UnbudgetedCategory,
  type SavingsGoalRow,
  type SavingsGoalDetailRow,
} from '../queries/budgets';
import {
  createBudget,
  updateBudget,
  deleteBudget,
  createSavingsGoal,
  updateSavingsGoal,
  addFundsToGoal,
  markGoalCompleted,
  type CreateBudgetInput,
  type UpdateBudgetInput,
  type CreateSavingsGoalInput,
  type UpdateSavingsGoalInput,
  type AddFundsResult,
} from '../mutations/budgets';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const BUDGETS_KEY = ['budgets'] as const;
const BUDGET_DETAIL_KEY = ['budgets', 'detail'] as const;
const BUDGET_ALERTS_KEY = ['budgets', 'alerts'] as const;
const BUDGET_HISTORY_KEY = ['budgets', 'history'] as const;
const UNBUDGETED_KEY = ['budgets', 'unbudgeted'] as const;
const SAVINGS_KEY = ['savings-goals'] as const;
const SAVINGS_DETAIL_KEY = ['savings-goals', 'detail'] as const;
const COMPLETED_GOALS_KEY = ['savings-goals', 'completed'] as const;

// ---------------------------------------------------------------------------
// Option interfaces
// ---------------------------------------------------------------------------

interface UseBudgetsOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
}

interface UseBudgetDetailOptions {
  client: TypedSupabaseClient;
  budgetId: string | undefined;
}

interface UseBudgetAlertsOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
  thresholdPercent?: number;
}

interface UseBudgetHistoryOptions {
  client: TypedSupabaseClient;
  budgetId: string | undefined;
  months?: number;
}

interface UseUnbudgetedSpendingOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
  period?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

interface UseSavingsGoalDetailOptions {
  client: TypedSupabaseClient;
  goalId: string | undefined;
}

// ---------------------------------------------------------------------------
// Budget hooks
// ---------------------------------------------------------------------------

/** List all active budgets with computed spent amounts for current period. */
export function useBudgets({ client, workspaceId }: UseBudgetsOptions) {
  return useQuery({
    queryKey: [...BUDGETS_KEY, workspaceId],
    queryFn: () => getBudgets(client, workspaceId!),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Single budget with full spending data and expense list. */
export function useBudgetDetail({ client, budgetId }: UseBudgetDetailOptions) {
  return useQuery<BudgetDetailRow>({
    queryKey: [...BUDGET_DETAIL_KEY, budgetId],
    queryFn: () => getBudgetDetail(client, budgetId!),
    enabled: !!budgetId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Budgets exceeding a given threshold percentage. */
export function useBudgetAlerts({
  client,
  workspaceId,
  thresholdPercent = 80,
}: UseBudgetAlertsOptions) {
  return useQuery({
    queryKey: [...BUDGET_ALERTS_KEY, workspaceId, thresholdPercent],
    queryFn: () => getBudgetAlerts(client, workspaceId!, thresholdPercent),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Monthly spent vs budget for trend chart. */
export function useBudgetHistory({
  client,
  budgetId,
  months = 6,
}: UseBudgetHistoryOptions) {
  return useQuery<BudgetHistoryPoint[]>({
    queryKey: [...BUDGET_HISTORY_KEY, budgetId, months],
    queryFn: () => getBudgetHistory(client, budgetId!, months),
    enabled: !!budgetId,
    staleTime: 10 * 60 * 1000,
  });
}

/** Categories with expenses but no active budget. */
export function useUnbudgetedSpending({
  client,
  workspaceId,
  period = 'monthly',
}: UseUnbudgetedSpendingOptions) {
  return useQuery<UnbudgetedCategory[]>({
    queryKey: [...UNBUDGETED_KEY, workspaceId, period],
    queryFn: () => getUnbudgetedSpending(client, workspaceId!, period),
    enabled: !!workspaceId,
    staleTime: 10 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Budget mutations
// ---------------------------------------------------------------------------

export function useCreateBudget({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBudgetInput) => createBudget(client, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGETS_KEY });
      queryClient.invalidateQueries({ queryKey: BUDGET_ALERTS_KEY });
      queryClient.invalidateQueries({ queryKey: UNBUDGETED_KEY });
    },
  });
}

export function useUpdateBudget({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBudgetInput }) =>
      updateBudget(client, id, input),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: BUDGETS_KEY });
      queryClient.invalidateQueries({ queryKey: [...BUDGET_DETAIL_KEY, id] });
      queryClient.invalidateQueries({ queryKey: BUDGET_ALERTS_KEY });
    },
  });
}

export function useDeleteBudget({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteBudget(client, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGETS_KEY });
      queryClient.invalidateQueries({ queryKey: BUDGET_ALERTS_KEY });
      queryClient.invalidateQueries({ queryKey: UNBUDGETED_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// Savings goals hooks
// ---------------------------------------------------------------------------

/** List all savings goals with progress percentages. */
export function useSavingsGoals({ client, workspaceId }: UseBudgetsOptions) {
  return useQuery<SavingsGoalRow[]>({
    queryKey: [...SAVINGS_KEY, workspaceId],
    queryFn: () => getSavingsGoals(client, workspaceId!),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Single savings goal with fund addition history and daily target. */
export function useSavingsGoalDetail({
  client,
  goalId,
}: UseSavingsGoalDetailOptions) {
  return useQuery<SavingsGoalDetailRow>({
    queryKey: [...SAVINGS_DETAIL_KEY, goalId],
    queryFn: () => getSavingsGoalDetail(client, goalId!),
    enabled: !!goalId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Completed savings goals. */
export function useCompletedGoals({ client, workspaceId }: UseBudgetsOptions) {
  return useQuery<SavingsGoalRow[]>({
    queryKey: [...COMPLETED_GOALS_KEY, workspaceId],
    queryFn: () => getCompletedGoals(client, workspaceId!),
    enabled: !!workspaceId,
    staleTime: 10 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Savings goals mutations
// ---------------------------------------------------------------------------

export function useCreateSavingsGoal({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSavingsGoalInput) => createSavingsGoal(client, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAVINGS_KEY });
    },
  });
}

export function useUpdateSavingsGoal({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSavingsGoalInput }) =>
      updateSavingsGoal(client, id, input),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: SAVINGS_KEY });
      queryClient.invalidateQueries({ queryKey: [...SAVINGS_DETAIL_KEY, id] });
      queryClient.invalidateQueries({ queryKey: COMPLETED_GOALS_KEY });
    },
  });
}

/** Add funds to a savings goal. Auto-completes if target is reached. */
export function useAddFundsToGoal({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<
    AddFundsResult,
    Error,
    { goalId: string; amount: number; notes?: string }
  >({
    mutationFn: ({ goalId, amount, notes }) =>
      addFundsToGoal(client, goalId, amount, notes),
    onSuccess: (_data, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: SAVINGS_KEY });
      queryClient.invalidateQueries({ queryKey: [...SAVINGS_DETAIL_KEY, goalId] });
      queryClient.invalidateQueries({ queryKey: COMPLETED_GOALS_KEY });
    },
  });
}

/** Explicitly mark a savings goal as completed. */
export function useMarkGoalCompleted({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (goalId: string) => markGoalCompleted(client, goalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAVINGS_KEY });
      queryClient.invalidateQueries({ queryKey: COMPLETED_GOALS_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// Rollover settings
// ---------------------------------------------------------------------------

export interface BudgetRolloverSettings {
  rollover_enabled: boolean;
  rollover_type?: 'full' | 'partial' | 'capped';
  rollover_percentage?: number;
  rollover_cap?: number | null;
}

/**
 * Update rollover configuration for a single budget.
 * Invalidates the budget detail and list caches.
 */
export function useUpdateBudgetRollover({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { budgetId: string; settings: BudgetRolloverSettings }
  >({
    mutationFn: async ({ budgetId, settings }) => {
      const { error } = await client
        .from('budgets')
        .update({
          rollover_enabled:    settings.rollover_enabled,
          rollover_type:       settings.rollover_type       ?? 'full',
          rollover_percentage: settings.rollover_percentage ?? 100,
          rollover_cap:        settings.rollover_cap        ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', budgetId);

      if (error) throw error;
    },
    onSuccess: (_data, { budgetId }) => {
      queryClient.invalidateQueries({ queryKey: BUDGETS_KEY });
      queryClient.invalidateQueries({ queryKey: [...BUDGET_DETAIL_KEY, budgetId] });
    },
  });
}

/**
 * Return the effective budget amount for a single budget:
 * budget.amount + budget.rollover_amount.
 *
 * Uses the existing budget-detail query cache if available.
 */
export function useBudgetEffectiveAmount({
  client,
  budgetId,
}: {
  client: TypedSupabaseClient;
  budgetId: string | undefined;
}) {
  return useQuery<number>({
    queryKey: ['budgets', 'effective-amount', budgetId],
    queryFn: async (): Promise<number> => {
      const { data, error } = await client
        .from('budgets')
        .select('amount, rollover_amount')
        .eq('id', budgetId!)
        .single();

      if (error) throw error;

      const amount         = Number((data as Record<string, unknown>).amount)         || 0;
      const rolloverAmount = Number((data as Record<string, unknown>).rollover_amount) || 0;
      return Math.round((amount + rolloverAmount) * 100) / 100;
    },
    enabled: !!budgetId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Manually trigger the budget-rollover edge function for a workspace.
 * Accepts an optional `month` override (format: "YYYY-MM").
 */
export function useProcessRollover({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<
    unknown,
    Error,
    { workspaceId: string; month?: string }
  >({
    mutationFn: async ({ workspaceId, month }) => {
      const {
        data: { session },
      } = await client.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const supabaseUrl = (client as unknown as { supabaseUrl?: string })
        .supabaseUrl;

      if (!supabaseUrl) {
        throw new Error(
          'Supabase URL not available on client.',
        );
      }

      const res = await fetch(
        `${supabaseUrl}/functions/v1/budget-rollover`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            workspace_id: workspaceId,
            ...(month ? { month } : {}),
          }),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err?.error ?? 'budget-rollover edge function failed');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGETS_KEY });
      queryClient.invalidateQueries({ queryKey: BUDGET_DETAIL_KEY });
    },
  });
}
