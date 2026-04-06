import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { TypedSupabaseClient } from '../client';
import {
  getContacts,
  getContactWithBalance,
  searchContacts,
  getContactPaymentSummary,
  type ContactRow,
  type ContactSearchOptions,
  type ContactWithBalance,
  type ContactPaymentSummary,
} from '../queries/contacts';
import { getPaymentsByContact, type PendingPaymentRow } from '../queries/pending-payments';

const CONTACTS_KEY = ['contacts'] as const;
const PENDING_KEY = ['pending-payments'] as const;
const LEDGER_KEY = ['contact-ledger'] as const;

interface UseContactsOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
  search?: string;
  sortBy?: 'name' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

interface UseContactDetailOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
  contactId: string | undefined;
}

interface CreateContactInput {
  workspace_id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
}

interface UpdateContactInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

/**
 * Fetch all contacts with optional search and sort.
 */
export function useContacts({
  client,
  workspaceId,
  search,
  sortBy,
  sortOrder,
}: UseContactsOptions) {
  const options: ContactSearchOptions = {
    query: search,
    sortBy,
    sortOrder,
  };

  return useQuery<ContactRow[]>({
    queryKey: [...CONTACTS_KEY, workspaceId, search, sortBy, sortOrder],
    queryFn: () => getContacts(client, workspaceId!, options),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get a single contact with computed net balance (totalGive, totalReceive, netBalance).
 */
export function useContactDetail({
  client,
  workspaceId,
  contactId,
}: UseContactDetailOptions) {
  return useQuery<ContactWithBalance>({
    queryKey: [...CONTACTS_KEY, 'detail', workspaceId, contactId],
    queryFn: () => getContactWithBalance(client, workspaceId!, contactId!),
    enabled: !!workspaceId && !!contactId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Computed net balance for a single contact: sum(receive) - sum(give).
 */
export function useContactNetBalance({
  client,
  workspaceId,
  contactId,
}: UseContactDetailOptions) {
  return useQuery<{ netBalance: number; totalGive: number; totalReceive: number }>({
    queryKey: [...CONTACTS_KEY, 'net-balance', workspaceId, contactId],
    queryFn: async () => {
      const summary = await getContactPaymentSummary(client, workspaceId!, contactId!);
      return {
        netBalance: summary.netBalance,
        totalGive: summary.totalGive,
        totalReceive: summary.totalReceive,
      };
    },
    enabled: !!workspaceId && !!contactId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get all pending payments with a specific contact.
 */
export function useContactPaymentHistory({
  client,
  workspaceId,
  contactId,
}: UseContactDetailOptions) {
  return useQuery<PendingPaymentRow[]>({
    queryKey: [...CONTACTS_KEY, 'payment-history', workspaceId, contactId],
    queryFn: () => getPaymentsByContact(client, workspaceId!, contactId!),
    enabled: !!workspaceId && !!contactId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Search contacts by name, phone, or email.
 */
export function useSearchContacts({
  client,
  workspaceId,
  query,
}: {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
  query: string;
}) {
  return useQuery({
    queryKey: [...CONTACTS_KEY, 'search', workspaceId, query],
    queryFn: () => searchContacts(client, workspaceId!, query),
    enabled: !!workspaceId && query.trim().length > 0,
    staleTime: 30 * 1000,
  });
}

/**
 * Get payment summary (totalGive, totalReceive, pendingCount, overdueCount) for a contact.
 */
export function useContactPaymentSummary({
  client,
  workspaceId,
  contactId,
}: UseContactDetailOptions) {
  return useQuery<ContactPaymentSummary>({
    queryKey: [...CONTACTS_KEY, 'payment-summary', workspaceId, contactId],
    queryFn: () => getContactPaymentSummary(client, workspaceId!, contactId!),
    enabled: !!workspaceId && !!contactId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Create a new contact.
 */
export function useCreateContact({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateContactInput) => {
      const { data, error } = await client
        .from('contacts')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTACTS_KEY });
    },
  });
}

/**
 * Update an existing contact.
 */
export function useUpdateContact({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateContactInput }) => {
      const { data, error } = await client
        .from('contacts')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: CONTACTS_KEY });
      queryClient.invalidateQueries({ queryKey: PENDING_KEY });
      queryClient.invalidateQueries({ queryKey: LEDGER_KEY });
    },
  });
}

/**
 * Delete a contact.
 */
export function useDeleteContact({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTACTS_KEY });
      queryClient.invalidateQueries({ queryKey: PENDING_KEY });
      queryClient.invalidateQueries({ queryKey: LEDGER_KEY });
    },
  });
}
