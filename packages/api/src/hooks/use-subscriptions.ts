/**
 * ExpenseFlow — Subscription Detection React Query Hooks
 *
 * Provides hooks for viewing, dismissing, and triggering subscription
 * detection based on the detected_subscriptions table populated by the
 * detect-subscriptions edge function.
 *
 * Table:           detected_subscriptions
 * Edge function:   /functions/v1/detect-subscriptions
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

export type DetectedInterval = 'weekly' | 'monthly' | 'yearly';

export interface DetectedSubscription {
  id: string;
  workspace_id: string;
  user_id: string;
  merchant_name: string;
  average_amount: number;
  currency: string;
  detected_interval: DetectedInterval;
  last_charged_at: string | null;
  next_expected_at: string | null;
  transaction_count: number;
  is_dismissed: boolean;
  linked_template_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DetectSubscriptionsResult {
  detected: DetectedSubscription[];
  count: number;
  newly_detected: number;
  analysed_expenses: number;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const SUBSCRIPTIONS_KEY = ['detected-subscriptions'] as const;

// ---------------------------------------------------------------------------
// Option interfaces
// ---------------------------------------------------------------------------

interface UseDetectedSubscriptionsOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
  /** Include already-dismissed subscriptions (default false) */
  includeDismissed?: boolean;
}

interface UseSubscriptionMutationOptions {
  client: TypedSupabaseClient;
}

// ---------------------------------------------------------------------------
// Read hooks
// ---------------------------------------------------------------------------

/**
 * List detected subscriptions for a workspace.
 * By default excludes dismissed entries.
 */
export function useDetectedSubscriptions({
  client,
  workspaceId,
  includeDismissed = false,
}: UseDetectedSubscriptionsOptions): UseQueryResult<DetectedSubscription[]> {
  return useQuery({
    queryKey: [...SUBSCRIPTIONS_KEY, workspaceId, { includeDismissed }],
    queryFn: async (): Promise<DetectedSubscription[]> => {
      let query = client
        .from('detected_subscriptions')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('next_expected_at', { ascending: true });

      if (!includeDismissed) {
        query = query.eq('is_dismissed', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as DetectedSubscription[];
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Dismiss a detected subscription — sets is_dismissed = true so it no
 * longer appears in the default list.
 */
export function useDismissSubscription({
  client,
}: UseSubscriptionMutationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await client
        .from('detected_subscriptions')
        .update({
          is_dismissed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY });
    },
  });
}

/**
 * Trigger the detect-subscriptions edge function for a workspace.
 * Returns the full detection result including newly detected items.
 */
export function useDetectSubscriptions({
  client,
}: UseSubscriptionMutationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      workspaceId: string,
    ): Promise<DetectSubscriptionsResult> => {
      // Retrieve the current session JWT to pass to the edge function
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
          'Supabase URL not available on client. Ensure TypedSupabaseClient exposes supabaseUrl.',
        );
      }

      const res = await fetch(
        `${supabaseUrl}/functions/v1/detect-subscriptions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ workspace_id: workspaceId }),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err?.error ?? 'detect-subscriptions failed');
      }

      return res.json() as Promise<DetectSubscriptionsResult>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY });
    },
  });
}

/**
 * Link a detected subscription to an expense template.
 * This allows the user to quickly add a recurring charge from the template.
 */
export function useLinkSubscriptionToTemplate({
  client,
}: UseSubscriptionMutationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subscriptionId,
      templateId,
    }: {
      subscriptionId: string;
      templateId: string | null;
    }): Promise<DetectedSubscription> => {
      const { data, error } = await client
        .from('detected_subscriptions')
        .update({
          linked_template_id: templateId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId)
        .select()
        .single();

      if (error) throw error;
      return data as DetectedSubscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY });
    },
  });
}

/**
 * Un-dismiss a previously dismissed subscription (sets is_dismissed = false).
 */
export function useUndismissSubscription({
  client,
}: UseSubscriptionMutationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await client
        .from('detected_subscriptions')
        .update({
          is_dismissed: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY });
    },
  });
}
