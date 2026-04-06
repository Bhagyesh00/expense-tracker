import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { TypedSupabaseClient } from '../client';
import {
  getPendingPayments,
  getPendingPaymentById,
  getContactLedger,
  getPendingSummary,
  getOverduePayments,
  getUpcomingDueDates,
  type PendingPaymentFilters,
  type PendingSummary,
} from '../queries/pending-payments';
import {
  createPendingPayment,
  recordPayment,
  cancelPendingPayment,
  updatePendingPayment,
  bulkSettlePayments,
  sendReminder,
  type CreatePendingPaymentInput,
  type RecordPaymentInput,
  type UpdatePendingPaymentInput,
} from '../mutations/pending-payments';

const PENDING_KEY = ['pending-payments'] as const;
const LEDGER_KEY = ['contact-ledger'] as const;
const SUMMARY_KEY = ['pending-summary'] as const;
const OVERDUE_KEY = ['overdue-payments'] as const;
const CONTACTS_KEY = ['contacts'] as const;
const NOTIFICATIONS_KEY = ['notifications'] as const;

interface UsePendingPaymentsOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
  filters?: PendingPaymentFilters;
}

interface UsePendingPaymentOptions {
  client: TypedSupabaseClient;
  id: string | undefined;
}

interface UseContactLedgerOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
  contactId: string | undefined;
}

interface UseWorkspaceOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
}

/**
 * Fetch pending payments with filtering by direction, status, contactId, dateRange, overdue.
 */
export function usePendingPayments({
  client,
  workspaceId,
  filters,
}: UsePendingPaymentsOptions) {
  return useQuery({
    queryKey: [...PENDING_KEY, workspaceId, filters],
    queryFn: () => getPendingPayments(client, workspaceId!, filters),
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch a single pending payment by ID with contact and payment records.
 */
export function usePendingPayment({ client, id }: UsePendingPaymentOptions) {
  return useQuery({
    queryKey: [...PENDING_KEY, 'detail', id],
    queryFn: () => getPendingPaymentById(client, id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Aggregate summary: totalGive, totalReceive, netBalance, overdueCount, overdueAmount.
 */
export function usePendingSummary({ client, workspaceId }: UseWorkspaceOptions) {
  return useQuery<PendingSummary>({
    queryKey: [...SUMMARY_KEY, workspaceId],
    queryFn: () => getPendingSummary(client, workspaceId!),
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch only overdue payments.
 */
export function useOverduePayments({ client, workspaceId }: UseWorkspaceOptions) {
  return useQuery({
    queryKey: [...OVERDUE_KEY, workspaceId],
    queryFn: () => getOverduePayments(client, workspaceId!),
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch payments with due dates in the next N days.
 */
export function useUpcomingDueDates({
  client,
  workspaceId,
  days = 7,
}: UseWorkspaceOptions & { days?: number }) {
  return useQuery({
    queryKey: [...PENDING_KEY, 'upcoming', workspaceId, days],
    queryFn: () => getUpcomingDueDates(client, workspaceId!, days),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new pending payment.
 */
export function useCreatePendingPayment({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePendingPaymentInput) =>
      createPendingPayment(client, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PENDING_KEY });
      queryClient.invalidateQueries({ queryKey: LEDGER_KEY });
      queryClient.invalidateQueries({ queryKey: SUMMARY_KEY });
      queryClient.invalidateQueries({ queryKey: OVERDUE_KEY });
      queryClient.invalidateQueries({ queryKey: CONTACTS_KEY });
    },
  });
}

/**
 * Record a payment (partial or full) against a pending payment.
 * Handles proof_url upload, auto-status update to partial/settled.
 */
export function useRecordPayment({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      pendingPaymentId,
      input,
    }: {
      pendingPaymentId: string;
      input: RecordPaymentInput;
    }) => recordPayment(client, pendingPaymentId, input),
    onSuccess: (_data, { pendingPaymentId }) => {
      queryClient.invalidateQueries({ queryKey: PENDING_KEY });
      queryClient.invalidateQueries({
        queryKey: [...PENDING_KEY, 'detail', pendingPaymentId],
      });
      queryClient.invalidateQueries({ queryKey: LEDGER_KEY });
      queryClient.invalidateQueries({ queryKey: SUMMARY_KEY });
      queryClient.invalidateQueries({ queryKey: OVERDUE_KEY });
      queryClient.invalidateQueries({ queryKey: CONTACTS_KEY });
    },
  });
}

/**
 * Mark a single pending payment as settled.
 */
export function useSettlePendingPayment({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await client
        .from('pending_payments')
        .update({ status: 'settled', settled_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PENDING_KEY });
      queryClient.invalidateQueries({ queryKey: LEDGER_KEY });
      queryClient.invalidateQueries({ queryKey: SUMMARY_KEY });
      queryClient.invalidateQueries({ queryKey: OVERDUE_KEY });
      queryClient.invalidateQueries({ queryKey: CONTACTS_KEY });
    },
  });
}

/**
 * Bulk settle multiple payments at once.
 */
export function useBulkSettle({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentIds: string[]) =>
      bulkSettlePayments(client, paymentIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PENDING_KEY });
      queryClient.invalidateQueries({ queryKey: LEDGER_KEY });
      queryClient.invalidateQueries({ queryKey: SUMMARY_KEY });
      queryClient.invalidateQueries({ queryKey: OVERDUE_KEY });
      queryClient.invalidateQueries({ queryKey: CONTACTS_KEY });
    },
  });
}

/**
 * Update editable fields on a pending payment.
 */
export function useUpdatePendingPayment({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePendingPaymentInput }) =>
      updatePendingPayment(client, id, input),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: PENDING_KEY });
      queryClient.invalidateQueries({
        queryKey: [...PENDING_KEY, 'detail', id],
      });
      queryClient.invalidateQueries({ queryKey: LEDGER_KEY });
      queryClient.invalidateQueries({ queryKey: SUMMARY_KEY });
    },
  });
}

/**
 * Send a manual reminder notification for a specific payment.
 */
export function useSendReminder({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentId: string) => sendReminder(client, paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

/**
 * Call the settlement-calc edge function for smart settlement.
 */
export function useSmartSettlement({ client, workspaceId }: UseWorkspaceOptions) {
  return useQuery({
    queryKey: ['smart-settlement', workspaceId],
    queryFn: async () => {
      // Get the session token for authentication
      const { data: { session } } = await client.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const supabaseUrl = (client as any).supabaseUrl
        ?? (client as any).rest?.url?.replace('/rest/v1', '')
        ?? '';

      // Detect the Supabase URL from the client
      let baseUrl = supabaseUrl;
      if (!baseUrl) {
        // Fallback: try to extract from client internals
        const url = (client as any)?.['supabaseUrl'] ?? '';
        baseUrl = url;
      }

      const response = await fetch(`${baseUrl}/functions/v1/settlement-calc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ workspaceId }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Settlement calculation failed' }));
        throw new Error(err.error ?? 'Settlement calculation failed');
      }

      const result = await response.json();
      return result.data as {
        settlements: Array<{
          from: string;
          to: string;
          amount: number;
          currency: string;
          fromName: string;
          toName: string;
        }>;
        totalTransactions: number;
        originalDebts: number;
      };
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Contact ledger: full payment history with a specific contact.
 */
export function useContactLedger({
  client,
  workspaceId,
  contactId,
}: UseContactLedgerOptions) {
  return useQuery({
    queryKey: [...LEDGER_KEY, workspaceId, contactId],
    queryFn: () => getContactLedger(client, workspaceId!, contactId!),
    enabled: !!workspaceId && !!contactId,
    staleTime: 2 * 60 * 1000,
  });
}
