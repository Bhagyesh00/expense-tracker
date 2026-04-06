/**
 * ExpenseFlow — Net Worth React Query Hooks
 *
 * Provides hooks for managing net worth entries (assets & liabilities) and
 * historical snapshots.
 *
 * Tables used:
 *   net_worth_entries   — individual asset / liability records
 *   net_worth_snapshots — monthly point-in-time snapshots
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { TypedSupabaseClient } from '../client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NetWorthEntryType = 'asset' | 'liability';

export type NetWorthCategory =
  | 'cash'
  | 'bank'
  | 'investment'
  | 'property'
  | 'loan'
  | 'credit_card'
  | 'other';

export interface NetWorthEntry {
  id: string;
  user_id: string;
  workspace_id: string;
  entry_type: NetWorthEntryType;
  category: NetWorthCategory;
  name: string;
  value: number;
  currency: string;
  value_inr: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NetWorthSnapshot {
  id: string;
  user_id: string;
  workspace_id: string;
  snapshot_date: string;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  created_at: string;
}

export interface NetWorthTotal {
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  asset_count: number;
  liability_count: number;
}

export interface CreateNetWorthEntryInput {
  workspace_id: string;
  entry_type: NetWorthEntryType;
  category: NetWorthCategory;
  name: string;
  value: number;
  currency?: string;
  value_inr?: number;
  notes?: string | null;
}

export interface UpdateNetWorthEntryInput {
  name?: string;
  value?: number;
  currency?: string;
  value_inr?: number;
  category?: NetWorthCategory;
  notes?: string | null;
  is_active?: boolean;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const NET_WORTH_KEY           = ['net-worth'] as const;
const NET_WORTH_ENTRIES_KEY   = ['net-worth', 'entries'] as const;
const NET_WORTH_ASSETS_KEY    = ['net-worth', 'assets'] as const;
const NET_WORTH_LIABILITIES_KEY = ['net-worth', 'liabilities'] as const;
const NET_WORTH_TOTAL_KEY     = ['net-worth', 'total'] as const;
const NET_WORTH_HISTORY_KEY   = ['net-worth', 'history'] as const;

// ---------------------------------------------------------------------------
// Option interfaces
// ---------------------------------------------------------------------------

interface UseNetWorthOptions {
  client: TypedSupabaseClient;
  userId: string | undefined;
  workspaceId: string | undefined;
}

interface UseNetWorthHistoryOptions {
  client: TypedSupabaseClient;
  userId: string | undefined;
  months?: number;
}

// ---------------------------------------------------------------------------
// Data fetchers
// ---------------------------------------------------------------------------

async function fetchEntries(
  client: TypedSupabaseClient,
  userId: string,
  workspaceId: string,
  type?: NetWorthEntryType,
): Promise<NetWorthEntry[]> {
  let query = client
    .from('net_worth_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('entry_type')
    .order('category')
    .order('name');

  if (type) {
    query = query.eq('entry_type', type);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as NetWorthEntry[];
}

async function fetchSnapshots(
  client: TypedSupabaseClient,
  userId: string,
  months: number,
): Promise<NetWorthSnapshot[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const sinceDate = since.toISOString().slice(0, 10);

  const { data, error } = await client
    .from('net_worth_snapshots')
    .select('*')
    .eq('user_id', userId)
    .gte('snapshot_date', sinceDate)
    .order('snapshot_date', { ascending: true });

  if (error) throw error;
  return (data ?? []) as NetWorthSnapshot[];
}

function computeTotal(entries: NetWorthEntry[]): NetWorthTotal {
  let totalAssets = 0;
  let totalLiabilities = 0;
  let assetCount = 0;
  let liabilityCount = 0;

  for (const entry of entries) {
    if (entry.entry_type === 'asset') {
      totalAssets += entry.value_inr;
      assetCount++;
    } else {
      totalLiabilities += entry.value_inr;
      liabilityCount++;
    }
  }

  return {
    total_assets: Math.round(totalAssets * 100) / 100,
    total_liabilities: Math.round(totalLiabilities * 100) / 100,
    net_worth: Math.round((totalAssets - totalLiabilities) * 100) / 100,
    asset_count: assetCount,
    liability_count: liabilityCount,
  };
}

// ---------------------------------------------------------------------------
// Read hooks
// ---------------------------------------------------------------------------

/** All active assets and liabilities for the user's workspace. */
export function useNetWorthEntries({
  client,
  userId,
  workspaceId,
}: UseNetWorthOptions): UseQueryResult<NetWorthEntry[]> {
  return useQuery({
    queryKey: [...NET_WORTH_ENTRIES_KEY, userId, workspaceId],
    queryFn: () => fetchEntries(client, userId!, workspaceId!),
    enabled: !!userId && !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Assets only (entry_type = 'asset'). */
export function useNetWorthAssets({
  client,
  userId,
  workspaceId,
}: UseNetWorthOptions): UseQueryResult<NetWorthEntry[]> {
  return useQuery({
    queryKey: [...NET_WORTH_ASSETS_KEY, userId, workspaceId],
    queryFn: () => fetchEntries(client, userId!, workspaceId!, 'asset'),
    enabled: !!userId && !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Liabilities only (entry_type = 'liability'). */
export function useNetWorthLiabilities({
  client,
  userId,
  workspaceId,
}: UseNetWorthOptions): UseQueryResult<NetWorthEntry[]> {
  return useQuery({
    queryKey: [...NET_WORTH_LIABILITIES_KEY, userId, workspaceId],
    queryFn: () => fetchEntries(client, userId!, workspaceId!, 'liability'),
    enabled: !!userId && !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Computed net worth totals.
 * Derives from the all-entries query cache to avoid a separate DB call.
 */
export function useNetWorthTotal({
  client,
  userId,
  workspaceId,
}: UseNetWorthOptions): UseQueryResult<NetWorthTotal> {
  return useQuery({
    queryKey: [...NET_WORTH_TOTAL_KEY, userId, workspaceId],
    queryFn: async () => {
      const entries = await fetchEntries(client, userId!, workspaceId!);
      return computeTotal(entries);
    },
    enabled: !!userId && !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Monthly net worth snapshots for a trend chart.
 * @param months Number of months of history to return (default 12).
 */
export function useNetWorthHistory({
  client,
  userId,
  months = 12,
}: UseNetWorthHistoryOptions): UseQueryResult<NetWorthSnapshot[]> {
  return useQuery({
    queryKey: [...NET_WORTH_HISTORY_KEY, userId, months],
    queryFn: () => fetchSnapshots(client, userId!, months),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/** Create a new asset or liability entry. */
export function useCreateNetWorthEntry({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateNetWorthEntryInput): Promise<NetWorthEntry> => {
      const { data: user } = await client.auth.getUser();
      if (!user?.user?.id) throw new Error('Not authenticated');

      const { data, error } = await client
        .from('net_worth_entries')
        .insert({
          user_id: user.user.id,
          workspace_id: input.workspace_id,
          entry_type: input.entry_type,
          category: input.category,
          name: input.name,
          value: input.value,
          currency: input.currency ?? 'INR',
          value_inr: input.value_inr ?? input.value,
          notes: input.notes ?? null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as NetWorthEntry;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: NET_WORTH_KEY });
      // Invalidate specific type-filtered caches
      queryClient.invalidateQueries({
        queryKey: [
          'net-worth',
          input.entry_type === 'asset' ? 'assets' : 'liabilities',
        ],
      });
    },
  });
}

/** Update value, name, category, notes, or active status of an entry. */
export function useUpdateNetWorthEntry({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateNetWorthEntryInput;
    }): Promise<NetWorthEntry> => {
      const { data, error } = await client
        .from('net_worth_entries')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as NetWorthEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NET_WORTH_KEY });
    },
  });
}

/**
 * Soft-delete a net worth entry (sets is_active = false).
 * Hard delete is intentionally not exposed from the client.
 */
export function useDeleteNetWorthEntry({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await client
        .from('net_worth_entries')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NET_WORTH_KEY });
    },
  });
}

/**
 * Snapshot current net worth — writes (or upserts) today's totals into
 * net_worth_snapshots.  Typically called once per month by the UI or a
 * scheduled trigger.
 */
export function useSnapshotNetWorth({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      workspaceId,
    }: {
      userId: string;
      workspaceId: string;
    }): Promise<NetWorthSnapshot> => {
      // Compute current totals
      const entries = await fetchEntries(client, userId, workspaceId);
      const totals = computeTotal(entries);

      const today = new Date().toISOString().slice(0, 10);

      const { data, error } = await client
        .from('net_worth_snapshots')
        .upsert(
          {
            user_id: userId,
            workspace_id: workspaceId,
            snapshot_date: today,
            total_assets: totals.total_assets,
            total_liabilities: totals.total_liabilities,
          },
          { onConflict: 'user_id,snapshot_date' },
        )
        .select()
        .single();

      if (error) throw error;
      return data as NetWorthSnapshot;
    },
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: [...NET_WORTH_HISTORY_KEY, userId],
      });
    },
  });
}
