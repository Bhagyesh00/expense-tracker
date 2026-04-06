import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { TypedSupabaseClient } from '../client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IntegrationProvider =
  | 'google_sheets'
  | 'slack'
  | 'teams'
  | 'quickbooks'
  | 'xero'
  | 'zoho';

export interface Integration {
  id: string;
  workspace_id: string;
  provider: IntegrationProvider;
  config: Record<string, unknown>;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Sanitized integration info without sensitive tokens. */
export interface IntegrationSummary {
  id: string;
  workspace_id: string;
  provider: IntegrationProvider;
  config: Record<string, unknown>;
  is_active: boolean;
  is_connected: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectIntegrationInput {
  workspace_id: string;
  provider: IntegrationProvider;
  config: Record<string, unknown>;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
}

export interface UpdateIntegrationInput {
  config?: Record<string, unknown>;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  is_active?: boolean;
}

export interface GoogleSheetsSyncResult {
  synced_count: number;
  spreadsheet_id: string;
  sheet_name: string;
  mode: string;
  date_range: { from: string; to: string };
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const INTEGRATIONS_KEY = ['integrations'] as const;

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

interface UseIntegrationsOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
}

/** List all integrations for a workspace (tokens redacted). */
export function useIntegrations({ client, workspaceId }: UseIntegrationsOptions) {
  return useQuery<IntegrationSummary[]>({
    queryKey: [...INTEGRATIONS_KEY, workspaceId],
    queryFn: async () => {
      const { data, error } = await client
        .from('integrations')
        .select('id, workspace_id, provider, config, is_active, expires_at, access_token, created_at, updated_at')
        .eq('workspace_id', workspaceId!)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return ((data ?? []) as unknown as Integration[]).map((i) => ({
        id: i.id,
        workspace_id: i.workspace_id,
        provider: i.provider,
        config: i.config,
        is_active: i.is_active,
        is_connected: !!i.access_token,
        expires_at: i.expires_at,
        created_at: i.created_at,
        updated_at: i.updated_at,
      }));
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Get a specific integration by provider. */
export function useIntegration({
  client,
  workspaceId,
  provider,
}: {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
  provider: IntegrationProvider | undefined;
}) {
  return useQuery<IntegrationSummary | null>({
    queryKey: [...INTEGRATIONS_KEY, workspaceId, provider],
    queryFn: async () => {
      const { data, error } = await client
        .from('integrations')
        .select('id, workspace_id, provider, config, is_active, expires_at, access_token, created_at, updated_at')
        .eq('workspace_id', workspaceId!)
        .eq('provider', provider!)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      const i = data as unknown as Integration;
      return {
        id: i.id,
        workspace_id: i.workspace_id,
        provider: i.provider,
        config: i.config,
        is_active: i.is_active,
        is_connected: !!i.access_token,
        expires_at: i.expires_at,
        created_at: i.created_at,
        updated_at: i.updated_at,
      };
    },
    enabled: !!workspaceId && !!provider,
    staleTime: 5 * 60 * 1000,
  });
}

/** Connect (create) a new integration. */
export function useConnectIntegration({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<Integration, Error, ConnectIntegrationInput>({
    mutationFn: async (input) => {
      const { data, error } = await client
        .from('integrations')
        .upsert(
          {
            workspace_id: input.workspace_id,
            provider: input.provider,
            config: input.config as unknown as import('@expenseflow/types').Json,
            access_token: input.access_token ?? null,
            refresh_token: input.refresh_token ?? null,
            expires_at: input.expires_at ?? null,
            is_active: true,
          } as any,
          { onConflict: 'workspace_id,provider' },
        )
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Integration;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: [...INTEGRATIONS_KEY, input.workspace_id] });
    },
  });
}

/** Update an integration's config or tokens. */
export function useUpdateIntegration({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; workspaceId: string; input: UpdateIntegrationInput }>({
    mutationFn: async ({ id, input }) => {
      const { error } = await client
        .from('integrations')
        .update(input as any)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: [...INTEGRATIONS_KEY, workspaceId] });
    },
  });
}

/** Disconnect (deactivate) an integration. */
export function useDisconnectIntegration({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; workspaceId: string }>({
    mutationFn: async ({ id }) => {
      const { error } = await client
        .from('integrations')
        .update({
          is_active: false,
          access_token: null,
          refresh_token: null,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: [...INTEGRATIONS_KEY, workspaceId] });
    },
  });
}

/** Trigger Google Sheets sync for the workspace. */
export function useGoogleSheetsSync({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<GoogleSheetsSyncResult, Error, { workspaceId: string; days?: number; mode?: 'append' | 'replace' }>({
    mutationFn: async ({ workspaceId, days = 30, mode = 'replace' }) => {
      const {
        data: { session },
      } = await client.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const supabaseUrl = (client as unknown as { supabaseUrl?: string }).supabaseUrl;
      if (!supabaseUrl) throw new Error('Supabase URL not available');

      const res = await fetch(`${supabaseUrl}/functions/v1/google-sheets-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ workspace_id: workspaceId, days, mode }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err?.error ?? 'Google Sheets sync failed');
      }

      const result = await res.json();
      return result.data as GoogleSheetsSyncResult;
    },
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: [...INTEGRATIONS_KEY, workspaceId] });
    },
  });
}
