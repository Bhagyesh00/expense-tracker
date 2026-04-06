import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { TypedSupabaseClient } from '../client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Webhook {
  id: string;
  workspace_id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'success' | 'failed';
  response_code: number | null;
  response_body: string | null;
  attempts: number;
  next_retry_at: string | null;
  created_at: string;
}

export interface CreateWebhookInput {
  workspace_id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
}

export interface UpdateWebhookInput {
  name?: string;
  url?: string;
  secret?: string;
  events?: string[];
  is_active?: boolean;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const WEBHOOKS_KEY = ['webhooks'] as const;
const WEBHOOK_DELIVERIES_KEY = ['webhook-deliveries'] as const;

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

interface UseWebhooksOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
}

/** List all webhooks for a workspace. */
export function useWebhooks({ client, workspaceId }: UseWebhooksOptions) {
  return useQuery<Webhook[]>({
    queryKey: [...WEBHOOKS_KEY, workspaceId],
    queryFn: async () => {
      const { data, error } = await client
        .from('webhooks')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as Webhook[];
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

/** List delivery history for a specific webhook. */
export function useWebhookDeliveries({
  client,
  webhookId,
  limit = 50,
}: {
  client: TypedSupabaseClient;
  webhookId: string | undefined;
  limit?: number;
}) {
  return useQuery<WebhookDelivery[]>({
    queryKey: [...WEBHOOK_DELIVERIES_KEY, webhookId],
    queryFn: async () => {
      const { data, error } = await client
        .from('webhook_deliveries')
        .select('*')
        .eq('webhook_id', webhookId!)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as unknown as WebhookDelivery[];
    },
    enabled: !!webhookId,
    staleTime: 30 * 1000,
  });
}

/** Create a new webhook. */
export function useCreateWebhook({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<Webhook, Error, CreateWebhookInput>({
    mutationFn: async (input) => {
      const { data, error } = await client
        .from('webhooks')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Webhook;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: [...WEBHOOKS_KEY, input.workspace_id] });
    },
  });
}

/** Update an existing webhook. */
export function useUpdateWebhook({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; workspaceId: string; input: UpdateWebhookInput }>({
    mutationFn: async ({ id, input }) => {
      const { error } = await client
        .from('webhooks')
        .update(input)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: [...WEBHOOKS_KEY, workspaceId] });
    },
  });
}

/** Delete a webhook. */
export function useDeleteWebhook({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; workspaceId: string }>({
    mutationFn: async ({ id }) => {
      const { error } = await client
        .from('webhooks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: [...WEBHOOKS_KEY, workspaceId] });
    },
  });
}

/** Test a webhook by sending a test payload. */
export function useTestWebhook({ client }: { client: TypedSupabaseClient }) {
  return useMutation<{ status: string }, Error, { webhookId: string; workspaceId: string }>({
    mutationFn: async ({ webhookId, workspaceId }) => {
      const {
        data: { session },
      } = await client.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const supabaseUrl = (client as unknown as { supabaseUrl?: string }).supabaseUrl;
      if (!supabaseUrl) throw new Error('Supabase URL not available');

      const res = await fetch(`${supabaseUrl}/functions/v1/webhook-dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          event_type: 'test.ping',
          payload: {
            message: 'Test webhook delivery from ExpenseFlow',
            timestamp: new Date().toISOString(),
            webhook_id: webhookId,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err?.error ?? 'Webhook test failed');
      }

      return res.json().then((r: { data: { status: string } }) => r.data);
    },
  });
}
