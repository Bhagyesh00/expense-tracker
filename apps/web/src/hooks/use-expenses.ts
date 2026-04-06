"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  useExpenses as useExpensesApi,
  useExpense as useExpenseApi,
  useCreateExpense as useCreateExpenseApi,
  useUpdateExpense as useUpdateExpenseApi,
  useDeleteExpense as useDeleteExpenseApi,
} from "@expenseflow/api";
import type { ExpenseFilters } from "@expenseflow/api";
import type { CreateExpenseInput, UpdateExpenseInput } from "@expenseflow/api";
import { useUIStore } from "@/stores/ui-store";

function getClient() {
  return createBrowserClient();
}

export function useExpensesList(
  filters?: ExpenseFilters,
  pageSize?: number,
) {
  const client = getClient();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);

  return useExpensesApi({
    client,
    workspaceId: workspaceId ?? undefined,
    filters,
    pageSize,
  });
}

export function useExpenseDetail(id: string | undefined) {
  const client = getClient();
  return useExpenseApi({ client, id });
}

export function useCreateExpense() {
  const client = getClient();
  const mutation = useCreateExpenseApi({ client });

  const createWithToast = useCallback(
    async (input: CreateExpenseInput) => {
      try {
        const result = await mutation.mutateAsync({ input });
        toast.success("Expense created successfully");
        return result;
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to create expense";
        toast.error(message);
        throw error;
      }
    },
    [mutation],
  );

  return {
    ...mutation,
    createExpense: createWithToast,
  };
}

export function useUpdateExpense() {
  const client = getClient();
  const mutation = useUpdateExpenseApi({ client });

  const updateWithToast = useCallback(
    async (id: string, input: UpdateExpenseInput) => {
      try {
        const result = await mutation.mutateAsync({ id, input });
        toast.success("Expense updated successfully");
        return result;
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to update expense";
        toast.error(message);
        throw error;
      }
    },
    [mutation],
  );

  return {
    ...mutation,
    updateExpense: updateWithToast,
  };
}

export function useDeleteExpense() {
  const client = getClient();
  const mutation = useDeleteExpenseApi({ client });

  const deleteWithToast = useCallback(
    async (id: string) => {
      try {
        await mutation.mutateAsync(id);
        toast.success("Expense deleted successfully");
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to delete expense";
        toast.error(message);
        throw error;
      }
    },
    [mutation],
  );

  return {
    ...mutation,
    deleteExpense: deleteWithToast,
  };
}
