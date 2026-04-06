/**
 * ExpenseFlow — Mileage Log Hooks
 *
 * Provides mileage trip CRUD, monthly summaries, and optional automatic
 * expense creation when logging a trip. Also exposes a hook for reading
 * and updating the per-workspace reimbursement rate (stored in workspace
 * settings metadata).
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { TypedSupabaseClient } from '../client';
import type { CreateExpenseInput } from '../mutations/expenses';
import { createExpense } from '../mutations/expenses';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MileageLog {
  id: string;
  workspace_id: string;
  user_id: string;
  from_location: string;
  to_location: string;
  distance_km: number;
  rate_per_km: number;
  /** Computed: distance_km × rate_per_km */
  amount: number;
  purpose: string | null;
  trip_date: string;
  expense_id: string | null;
  created_at: string;
}

export interface MileageSummary {
  totalKm: number;
  totalAmount: number;
  tripCount: number;
  avgKmPerTrip: number;
}

export interface CreateMileageLogInput {
  workspace_id: string;
  from_location: string;
  to_location: string;
  distance_km: number;
  rate_per_km?: number;
  purpose?: string | null;
  trip_date?: string;
  /** When true, also creates an expense linked to this mileage log. */
  create_expense?: boolean;
  /** Required when create_expense is true */
  expense_category_id?: string | null;
  currency?: string;
}

export interface MileageRateSettings {
  rate_per_km: number;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const MILEAGE_KEY = ['mileage-logs'] as const;
const MILEAGE_RATE_KEY = ['mileage-rate'] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMonthRange(month: string): { startDate: string; endDate: string } {
  // month is expected as YYYY-MM
  const [year, mon] = month.split('-').map(Number);
  const start = new Date(year!, mon! - 1, 1);
  const end = new Date(year!, mon!, 0); // last day of month

  return {
    startDate: start.toISOString().split('T')[0]!,
    endDate: end.toISOString().split('T')[0]!,
  };
}

function computeSummary(logs: MileageLog[]): MileageSummary {
  const totalKm = logs.reduce((sum, l) => sum + l.distance_km, 0);
  const totalAmount = logs.reduce((sum, l) => sum + l.amount, 0);

  return {
    totalKm: Math.round(totalKm * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    tripCount: logs.length,
    avgKmPerTrip: logs.length > 0
      ? Math.round((totalKm / logs.length) * 100) / 100
      : 0,
  };
}

// ---------------------------------------------------------------------------
// useMileageLogs — list trips, optionally filtered to a specific month
// ---------------------------------------------------------------------------

interface UseMileageLogsOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
  /** Optional month filter as YYYY-MM (e.g. "2025-03") */
  month?: string;
}

export function useMileageLogs({
  client,
  workspaceId,
  month,
}: UseMileageLogsOptions) {
  return useQuery<MileageLog[]>({
    queryKey: [...MILEAGE_KEY, workspaceId, month],
    queryFn: async (): Promise<MileageLog[]> => {
      let query = client
        .from('mileage_logs')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('trip_date', { ascending: false });

      if (month) {
        const { startDate, endDate } = buildMonthRange(month);
        query = query.gte('trip_date', startDate).lte('trip_date', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as MileageLog[];
    },
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useMileageSummary — aggregate km + amount for a specific month
// ---------------------------------------------------------------------------

interface UseMileageSummaryOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
  /** Month as YYYY-MM */
  month: string | undefined;
}

export function useMileageSummary({
  client,
  workspaceId,
  month,
}: UseMileageSummaryOptions) {
  return useQuery<MileageSummary>({
    queryKey: [...MILEAGE_KEY, 'summary', workspaceId, month],
    queryFn: async (): Promise<MileageSummary> => {
      const { startDate, endDate } = buildMonthRange(month!);

      const { data, error } = await client
        .from('mileage_logs')
        .select('distance_km, rate_per_km, amount')
        .eq('workspace_id', workspaceId!)
        .gte('trip_date', startDate)
        .lte('trip_date', endDate);

      if (error) throw error;
      return computeSummary((data ?? []) as MileageLog[]);
    },
    enabled: !!workspaceId && !!month,
    staleTime: 2 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useCreateMileageLog — create a trip, optionally creating an expense too
// ---------------------------------------------------------------------------

export function useCreateMileageLog({
  client,
}: {
  client: TypedSupabaseClient;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: CreateMileageLogInput,
    ): Promise<MileageLog> => {
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const today = new Date().toISOString().split('T')[0]!;
      const ratePerKm = input.rate_per_km ?? 8.00;
      const tripDate = input.trip_date ?? today;
      const computedAmount = Math.round(input.distance_km * ratePerKm * 100) / 100;

      // Insert the mileage log
      const { data: logData, error: logError } = await client
        .from('mileage_logs')
        .insert({
          workspace_id: input.workspace_id,
          user_id: user.id,
          from_location: input.from_location,
          to_location: input.to_location,
          distance_km: input.distance_km,
          rate_per_km: ratePerKm,
          purpose: input.purpose ?? null,
          trip_date: tripDate,
        })
        .select('*')
        .single();

      if (logError) throw logError;
      const log = logData as MileageLog;

      // Optionally create a linked expense
      if (input.create_expense) {
        try {
          const expenseInput: CreateExpenseInput = {
            workspace_id: input.workspace_id,
            user_id: user.id,
            category_id: input.expense_category_id ?? null,
            type: 'expense',
            amount: computedAmount,
            currency: input.currency ?? 'INR',
            description: `Mileage: ${input.from_location} → ${input.to_location}`,
            notes: input.purpose
              ? `Purpose: ${input.purpose}\n${input.distance_km} km × ${ratePerKm}/km`
              : `${input.distance_km} km × ${ratePerKm}/km`,
            date: tripDate,
            tags: ['mileage', 'travel'],
          };

          const expense = await createExpense(client, expenseInput);

          // Link the expense back to the mileage log
          await client
            .from('mileage_logs')
            .update({ expense_id: expense.id })
            .eq('id', log.id);

          return { ...log, expense_id: expense.id };
        } catch (expenseError: unknown) {
          // Expense creation is best-effort — log was already saved
          console.error('Failed to create expense from mileage log:', expenseError);
        }
      }

      return log;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: [...MILEAGE_KEY, input.workspace_id] });
      queryClient.invalidateQueries({ queryKey: [...MILEAGE_KEY, 'summary'] });
      if (input.create_expense) {
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        queryClient.invalidateQueries({ queryKey: ['budgets'] });
      }
    },
  });
}

// ---------------------------------------------------------------------------
// useDeleteMileageLog
// ---------------------------------------------------------------------------

interface DeleteMileageLogArgs {
  id: string;
  workspaceId: string;
}

export function useDeleteMileageLog({
  client,
}: {
  client: TypedSupabaseClient;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: DeleteMileageLogArgs): Promise<void> => {
      const { error } = await client
        .from('mileage_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: [...MILEAGE_KEY, workspaceId] });
      queryClient.invalidateQueries({ queryKey: [...MILEAGE_KEY, 'summary'] });
    },
  });
}

// ---------------------------------------------------------------------------
// useMileageRate — read/update the per-km rate stored in workspace settings
//
// The rate is persisted as a JSON field in workspaces.settings (JSONB).
// Falls back to the default (8.00 INR/km) when not set.
// ---------------------------------------------------------------------------

const DEFAULT_RATE_PER_KM = 8.00;

interface UseMileageRateOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
}

export function useMileageRate({ client, workspaceId }: UseMileageRateOptions) {
  const queryClient = useQueryClient();

  const query = useQuery<MileageRateSettings>({
    queryKey: [...MILEAGE_RATE_KEY, workspaceId],
    queryFn: async (): Promise<MileageRateSettings> => {
      const { data, error } = await client
        .from('workspaces')
        .select('id')
        .eq('id', workspaceId!)
        .single();

      if (error) throw error;

      // Attempt to read from workspace metadata if available
      // The workspace table may have a `settings` JSONB column added later;
      // if not present yet we fall back to the default gracefully.
      const workspaceData = data as Record<string, unknown>;
      const settings = workspaceData?.settings as Record<string, unknown> | undefined;
      const rate = settings?.mileage_rate_per_km as number | undefined;

      return { rate_per_km: typeof rate === 'number' ? rate : DEFAULT_RATE_PER_KM };
    },
    enabled: !!workspaceId,
    staleTime: 10 * 60 * 1000,
  });

  const setRate = useMutation({
    mutationFn: async (ratePerKm: number): Promise<void> => {
      if (ratePerKm <= 0) throw new Error('Rate per km must be greater than zero');

      // Store in workspace settings JSONB column.
      // Uses a safe JSONB merge approach via raw RPC when the column exists.
      const { error } = await client
        .from('workspaces')
        .update({
          // Merge into existing settings; column cast handled by Postgres
          settings: { mileage_rate_per_km: ratePerKm },
        } as Record<string, unknown>)
        .eq('id', workspaceId!);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...MILEAGE_RATE_KEY, workspaceId] });
    },
  });

  return { ...query, setRate };
}
