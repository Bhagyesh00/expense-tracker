"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  useBudgets as useBudgetsApi,
  useCreateBudget as useCreateBudgetApi,
  useUpdateBudget as useUpdateBudgetApi,
  useDeleteBudget as useDeleteBudgetApi,
  useSavingsGoals as useSavingsGoalsApi,
  useCreateSavingsGoal as useCreateSavingsGoalApi,
  useUpdateSavingsGoal as useUpdateSavingsGoalApi,
} from "@expenseflow/api";
import type { CreateBudgetInput, UpdateBudgetInput, CreateSavingsGoalInput, UpdateSavingsGoalInput } from "@expenseflow/api";
import type { BudgetRow } from "@expenseflow/api";
import { useUIStore } from "@/stores/ui-store";

function getClient() {
  return createBrowserClient();
}

// ---------------------------------------------------------------------------
// Budget list
// ---------------------------------------------------------------------------

export function useBudgetsList() {
  const client = getClient();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);

  return useBudgetsApi({
    client,
    workspaceId: workspaceId ?? undefined,
  });
}

// ---------------------------------------------------------------------------
// Create budget
// ---------------------------------------------------------------------------

export function useCreateBudget() {
  const client = getClient();
  const mutation = useCreateBudgetApi({ client });

  const createWithToast = useCallback(
    async (input: CreateBudgetInput) => {
      try {
        const result = await mutation.mutateAsync(input);
        toast.success("Budget created successfully");
        return result;
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to create budget";
        toast.error(message);
        throw error;
      }
    },
    [mutation],
  );

  return {
    ...mutation,
    createBudget: createWithToast,
  };
}

// ---------------------------------------------------------------------------
// Update budget
// ---------------------------------------------------------------------------

export function useUpdateBudget() {
  const client = getClient();
  const mutation = useUpdateBudgetApi({ client });

  const updateWithToast = useCallback(
    async (id: string, input: UpdateBudgetInput) => {
      try {
        const result = await mutation.mutateAsync({ id, input });
        toast.success("Budget updated successfully");
        return result;
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to update budget";
        toast.error(message);
        throw error;
      }
    },
    [mutation],
  );

  return {
    ...mutation,
    updateBudget: updateWithToast,
  };
}

// ---------------------------------------------------------------------------
// Delete budget
// ---------------------------------------------------------------------------

export function useDeleteBudget() {
  const client = getClient();
  const mutation = useDeleteBudgetApi({ client });

  const deleteWithToast = useCallback(
    async (id: string) => {
      try {
        await mutation.mutateAsync(id);
        toast.success("Budget deleted successfully");
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to delete budget";
        toast.error(message);
        throw error;
      }
    },
    [mutation],
  );

  return {
    ...mutation,
    deleteBudget: deleteWithToast,
  };
}

// ---------------------------------------------------------------------------
// Savings goals list
// ---------------------------------------------------------------------------

export function useSavingsGoalsList() {
  const client = getClient();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);

  return useSavingsGoalsApi({
    client,
    workspaceId: workspaceId ?? undefined,
  });
}

// ---------------------------------------------------------------------------
// Create savings goal
// ---------------------------------------------------------------------------

export function useCreateGoal() {
  const client = getClient();
  const mutation = useCreateSavingsGoalApi({ client });

  const createWithToast = useCallback(
    async (input: CreateSavingsGoalInput) => {
      try {
        const result = await mutation.mutateAsync(input);
        toast.success("Savings goal created successfully");
        return result;
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to create goal";
        toast.error(message);
        throw error;
      }
    },
    [mutation],
  );

  return {
    ...mutation,
    createGoal: createWithToast,
  };
}

// ---------------------------------------------------------------------------
// Update savings goal
// ---------------------------------------------------------------------------

export function useUpdateGoal() {
  const client = getClient();
  const mutation = useUpdateSavingsGoalApi({ client });

  const updateWithToast = useCallback(
    async (id: string, input: UpdateSavingsGoalInput) => {
      try {
        const result = await mutation.mutateAsync({ id, input });
        toast.success("Savings goal updated successfully");
        return result;
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to update goal";
        toast.error(message);
        throw error;
      }
    },
    [mutation],
  );

  return {
    ...mutation,
    updateGoal: updateWithToast,
  };
}

// ---------------------------------------------------------------------------
// Add funds to savings goal
// ---------------------------------------------------------------------------

export function useAddFunds() {
  const client = getClient();
  const mutation = useUpdateSavingsGoalApi({ client });

  const addFundsWithToast = useCallback(
    async (goalId: string, amount: number, currentAmount: number) => {
      try {
        const newAmount = currentAmount + amount;
        const result = await mutation.mutateAsync({
          id: goalId,
          input: { current_amount: newAmount },
        });
        toast.success(`Added ${amount.toLocaleString()} to your goal`);
        return result;
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to add funds";
        toast.error(message);
        throw error;
      }
    },
    [mutation],
  );

  return {
    ...mutation,
    addFunds: addFundsWithToast,
  };
}

// ---------------------------------------------------------------------------
// Budget alerts — budgets exceeding threshold
// ---------------------------------------------------------------------------

export function useBudgetAlerts(threshold = 80) {
  const { data: budgets, ...rest } = useBudgetsList();

  const alerts = (budgets ?? [])
    .filter((b) => {
      const spent = b.spent ?? 0;
      const percent = b.amount > 0 ? (spent / b.amount) * 100 : 0;
      return percent >= threshold;
    })
    .sort((a, b) => {
      const pA = a.amount > 0 ? ((a.spent ?? 0) / a.amount) * 100 : 0;
      const pB = b.amount > 0 ? ((b.spent ?? 0) / b.amount) * 100 : 0;
      return pB - pA;
    });

  return { data: alerts, ...rest };
}

export type { BudgetRow };
