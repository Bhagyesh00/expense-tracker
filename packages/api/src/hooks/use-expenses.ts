import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import type { TypedSupabaseClient } from '../client';
import {
  getExpenses,
  getExpenseById,
  getExpenseStats,
  getExpensesByDateGrouped,
  searchExpenses,
  type ExpenseFilters,
  type PaginationParams,
  type ExpenseRow,
  type ExpenseStats,
  type DateGroupedExpenses,
} from '../queries/expenses';
import {
  createExpense,
  updateExpense,
  deleteExpense,
  duplicateExpense,
  bulkDeleteExpenses,
  bulkExportExpenses,
  voidExpense,
  unvoidExpense,
  type CreateExpenseInput,
  type UpdateExpenseInput,
  type CreateSplitInput,
  type ExportedExpense,
  type VoidExpenseInput,
} from '../mutations/expenses';
import {
  detectDuplicate,
  type ExpenseInput,
  type DuplicateResult,
} from '@expenseflow/ai';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const EXPENSES_KEY = ['expenses'] as const;

// ---------------------------------------------------------------------------
// Option interfaces
// ---------------------------------------------------------------------------

interface UseExpensesOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
  filters?: ExpenseFilters;
  pageSize?: number;
}

interface UseExpenseOptions {
  client: TypedSupabaseClient;
  id: string | undefined;
}

interface UseExpenseStatsOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
  dateRange: { startDate: string; endDate: string } | undefined;
}

interface UseExpensesByDateOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
  dateRange: { startDate: string; endDate: string } | undefined;
}

interface UseSearchExpensesOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
  query: string;
}

interface UseExpenseExportOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
  filters?: ExpenseFilters;
}

// ---------------------------------------------------------------------------
// useExpenses — infinite query with cursor pagination
// ---------------------------------------------------------------------------

export function useExpenses({
  client,
  workspaceId,
  filters,
  pageSize = 20,
}: UseExpensesOptions) {
  return useInfiniteQuery({
    queryKey: [...EXPENSES_KEY, workspaceId, filters],
    queryFn: async ({ pageParam = 0 }) => {
      const pagination: PaginationParams = {
        offset: pageParam as number,
        limit: pageSize,
      };
      return getExpenses(client, workspaceId!, filters, pagination);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, page) => sum + page.length, 0);
      return lastPage.length === pageSize ? totalFetched : undefined;
    },
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useExpense — single expense detail
// ---------------------------------------------------------------------------

export function useExpense({ client, id }: UseExpenseOptions) {
  return useQuery({
    queryKey: [...EXPENSES_KEY, 'detail', id],
    queryFn: () => getExpenseById(client, id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useExpenseStats — aggregate statistics for a date range
// ---------------------------------------------------------------------------

export function useExpenseStats({
  client,
  workspaceId,
  dateRange,
}: UseExpenseStatsOptions) {
  return useQuery<ExpenseStats>({
    queryKey: [...EXPENSES_KEY, 'stats', workspaceId, dateRange],
    queryFn: () =>
      getExpenseStats(
        client,
        workspaceId!,
        dateRange!.startDate,
        dateRange!.endDate,
      ),
    enabled: !!workspaceId && !!dateRange,
    staleTime: 2 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useExpensesByDate — grouped by date for section lists
// ---------------------------------------------------------------------------

export function useExpensesByDate({
  client,
  workspaceId,
  dateRange,
}: UseExpensesByDateOptions) {
  return useQuery<DateGroupedExpenses[]>({
    queryKey: [...EXPENSES_KEY, 'byDate', workspaceId, dateRange],
    queryFn: () =>
      getExpensesByDateGrouped(client, workspaceId!, dateRange!),
    enabled: !!workspaceId && !!dateRange,
    staleTime: 2 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useSearchExpenses — full-text search
// ---------------------------------------------------------------------------

export function useSearchExpenses({
  client,
  workspaceId,
  query,
}: UseSearchExpensesOptions) {
  return useQuery<ExpenseRow[]>({
    queryKey: [...EXPENSES_KEY, 'search', workspaceId, query],
    queryFn: () => searchExpenses(client, workspaceId!, query),
    enabled: !!workspaceId && query.trim().length >= 2,
    staleTime: 30 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useCreateExpense — with optimistic updates
// ---------------------------------------------------------------------------

export function useCreateExpense({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      input,
      splits,
    }: {
      input: CreateExpenseInput;
      splits?: CreateSplitInput[];
    }) => createExpense(client, input, splits),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSES_KEY });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

// ---------------------------------------------------------------------------
// useUpdateExpense — with optimistic updates and rollback
// ---------------------------------------------------------------------------

export function useUpdateExpense({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateExpenseInput }) =>
      updateExpense(client, id, input),
    onMutate: async ({ id, input }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: [...EXPENSES_KEY, 'detail', id],
      });

      // Snapshot previous value
      const previousExpense = queryClient.getQueryData([
        ...EXPENSES_KEY,
        'detail',
        id,
      ]);

      // Optimistically update detail cache
      queryClient.setQueryData(
        [...EXPENSES_KEY, 'detail', id],
        (old: unknown) => {
          if (!old || typeof old !== 'object') return old;
          return { ...old, ...input };
        },
      );

      return { previousExpense };
    },
    onError: (_err, { id }, context) => {
      // Rollback on error
      if (context?.previousExpense) {
        queryClient.setQueryData(
          [...EXPENSES_KEY, 'detail', id],
          context.previousExpense,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSES_KEY });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

// ---------------------------------------------------------------------------
// useDeleteExpense
// ---------------------------------------------------------------------------

export function useDeleteExpense({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteExpense(client, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSES_KEY });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

// ---------------------------------------------------------------------------
// useDuplicateExpense — copies an expense with today's date
// ---------------------------------------------------------------------------

export function useDuplicateExpense({
  client,
}: {
  client: TypedSupabaseClient;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expenseId: string) => duplicateExpense(client, expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSES_KEY });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

// ---------------------------------------------------------------------------
// useBulkDeleteExpenses — soft delete multiple
// ---------------------------------------------------------------------------

export function useBulkDeleteExpenses({
  client,
}: {
  client: TypedSupabaseClient;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => bulkDeleteExpenses(client, ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSES_KEY });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

// ---------------------------------------------------------------------------
// useVoidExpense — mark an expense as voided
// ---------------------------------------------------------------------------

export function useVoidExpense({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      expenseId,
      input,
    }: {
      expenseId: string;
      input?: VoidExpenseInput;
    }) => voidExpense(client, expenseId, input),
    onSuccess: (_data, { expenseId }) => {
      queryClient.invalidateQueries({ queryKey: EXPENSES_KEY });
      queryClient.invalidateQueries({
        queryKey: [...EXPENSES_KEY, 'detail', expenseId],
      });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

// ---------------------------------------------------------------------------
// useUnvoidExpense — reverse a void operation
// ---------------------------------------------------------------------------

export function useUnvoidExpense({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expenseId: string) => unvoidExpense(client, expenseId),
    onSuccess: (_data, expenseId) => {
      queryClient.invalidateQueries({ queryKey: EXPENSES_KEY });
      queryClient.invalidateQueries({
        queryKey: [...EXPENSES_KEY, 'detail', expenseId],
      });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

// ---------------------------------------------------------------------------
// useDuplicateCheck — checks for duplicates before saving
// ---------------------------------------------------------------------------

export function useDuplicateCheck({
  client,
  workspaceId,
}: {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
}) {
  const checkDuplicate = useCallback(
    async (expense: ExpenseInput): Promise<DuplicateResult> => {
      if (!workspaceId) {
        return { isDuplicate: false, matchingExpenseId: null, confidence: 0 };
      }

      // Fetch recent expenses (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentExpenses = await getExpenses(client, workspaceId, {
        dateRange: {
          startDate: sevenDaysAgo.toISOString().split('T')[0]!,
          endDate: new Date().toISOString().split('T')[0]!,
        },
      });

      const recentInputs: ExpenseInput[] = recentExpenses.map((e) => ({
        id: e.id,
        amount: e.amount,
        description: e.description,
        date: e.expense_date,
      }));

      return detectDuplicate(expense, recentInputs);
    },
    [client, workspaceId],
  );

  return { checkDuplicate };
}

// ---------------------------------------------------------------------------
// useExpenseExport — generates CSV data from filtered expenses
// ---------------------------------------------------------------------------

export function useExpenseExport({
  client,
  workspaceId,
  filters,
}: UseExpenseExportOptions) {
  const exportMutation = useMutation({
    mutationFn: async (): Promise<Blob> => {
      if (!workspaceId) throw new Error('Workspace ID required');

      const rows = await bulkExportExpenses(client, workspaceId, filters);
      return generateCsvBlob(rows);
    },
  });

  return exportMutation;
}

// ---------------------------------------------------------------------------
// CSV generation helper
// ---------------------------------------------------------------------------

function generateCsvBlob(rows: ExportedExpense[]): Blob {
  const headers = ['Date', 'Type', 'Description', 'Category', 'Amount', 'Currency', 'Tags', 'Notes'];
  const csvLines = [headers.join(',')];

  for (const row of rows) {
    const line = [
      row.date,
      row.type,
      escapeCsv(row.description),
      escapeCsv(row.category),
      row.amount.toString(),
      row.currency,
      escapeCsv(row.tags),
      escapeCsv(row.notes),
    ].join(',');
    csvLines.push(line);
  }

  const csvContent = csvLines.join('\n');
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
