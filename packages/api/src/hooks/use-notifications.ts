import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import type { TypedSupabaseClient } from '../client';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const NOTIFICATIONS_KEY = ['notifications'] as const;
const NOTIFICATION_PREFS_KEY = ['notification-preferences'] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationType =
  | 'payment_reminder'
  | 'budget_alert'
  | 'overdue_payment'
  | 'workspace_invite'
  | 'system';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  push_enabled: boolean;
  email_notifications: boolean;
  reminder_days_before: number;
  weekly_summary: boolean;
}

interface UseNotificationsOptions {
  client: TypedSupabaseClient;
  userId: string | undefined;
  /** Filter by notification type */
  type?: NotificationType;
  /** Only return unread notifications */
  unreadOnly?: boolean;
  /** Maximum notifications to return (default 50) */
  limit?: number;
}

interface UseNotificationPrefsOptions {
  client: TypedSupabaseClient;
  userId: string | undefined;
}

// ---------------------------------------------------------------------------
// useNotifications — fetch with optional type and unread filters
// ---------------------------------------------------------------------------

export function useNotifications({
  client,
  userId,
  type,
  unreadOnly = false,
  limit = 50,
}: UseNotificationsOptions) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, userId, type, unreadOnly, limit],
    queryFn: async (): Promise<Notification[]> => {
      let query = client
        .from('notifications')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (type) {
        query = query.eq('type', type);
      }

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Notification[];
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useUnreadCount — count of unread notifications with realtime subscription
// ---------------------------------------------------------------------------

export function useUnreadCount({
  client,
  userId,
}: {
  client: TypedSupabaseClient;
  userId: string | undefined;
}) {
  const queryClient = useQueryClient();
  const unreadCountKey = [...NOTIFICATIONS_KEY, 'unread-count', userId] as const;

  // Subscribe to realtime inserts/updates for the user's notifications
  useEffect(() => {
    if (!userId) return;

    const channel: any = client
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          // Invalidate both the count and the list
          queryClient.invalidateQueries({ queryKey: unreadCountKey });
          queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
        },
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [userId, client, queryClient]);

  return useQuery({
    queryKey: unreadCountKey,
    queryFn: async (): Promise<number> => {
      const { count, error } = await client
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId!)
        .eq('is_read', false);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useMarkRead — mark a single notification as read (optimistic)
// ---------------------------------------------------------------------------

export function useMarkRead({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await client
        .from('notifications')
        .update({ is_read: true } as any)
        .eq('id', id)
        .eq('is_read', false); // No-op if already read

      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });

      // Snapshot for rollback
      const previous = queryClient.getQueriesData<Notification[]>({
        queryKey: NOTIFICATIONS_KEY,
      });

      // Optimistic update
      queryClient.setQueriesData<Notification[]>(
        { queryKey: NOTIFICATIONS_KEY },
        (old) =>
          old?.map((n) =>
            n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
          ),
      );

      return { previous };
    },
    onError: (_err, _id, context) => {
      // Rollback on failure
      if (context?.previous) {
        for (const [queryKey, data] of context.previous) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// useMarkAllRead — mark all unread notifications as read
// ---------------------------------------------------------------------------

export function useMarkAllRead({
  client,
  userId,
}: {
  client: TypedSupabaseClient;
  userId: string | undefined;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      if (!userId) throw new Error('User ID is required');

      const { error } = await client
        .from('notifications')
        .update({ is_read: true } as any)
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });

      const readAt = new Date().toISOString();
      queryClient.setQueriesData<Notification[]>(
        { queryKey: NOTIFICATIONS_KEY },
        (old) =>
          old?.map((n) => ({
            ...n,
            read_at: n.read_at ?? readAt,
          })),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// useDismissNotification — soft-delete a notification
// ---------------------------------------------------------------------------

export function useDismissNotification({
  client,
}: {
  client: TypedSupabaseClient;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await client
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });

      // Optimistic: remove from all notification lists
      queryClient.setQueriesData<Notification[]>(
        { queryKey: NOTIFICATIONS_KEY },
        (old) => old?.filter((n) => n.id !== id),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// useNotificationPreferences — fetch and update user notification settings
// ---------------------------------------------------------------------------

export function useNotificationPreferences({
  client,
  userId,
}: UseNotificationPrefsOptions) {
  return useQuery({
    queryKey: [...NOTIFICATION_PREFS_KEY, userId],
    queryFn: async (): Promise<NotificationPreferences | null> => {
      const { data, error } = await client
        .from('user_settings')
        .select(
          'user_id, push_enabled, email_notifications, reminder_days_before, weekly_summary',
        )
        .eq('user_id', userId!)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return (data as unknown as NotificationPreferences | null) ?? null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateNotificationPreferences({
  client,
  userId,
}: UseNotificationPrefsOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      prefs: Partial<Omit<NotificationPreferences, 'user_id'>>,
    ): Promise<void> => {
      if (!userId) throw new Error('User ID is required');

      const { error } = await client
        .from('user_settings')
        .upsert(
          { user_id: userId, ...prefs },
          { onConflict: 'user_id' },
        );

      if (error) throw error;
    },
    onMutate: async (updates) => {
      const key = [...NOTIFICATION_PREFS_KEY, userId];
      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData<NotificationPreferences>(key);

      queryClient.setQueryData<NotificationPreferences>(key, (old) =>
        old ? { ...old, ...updates } : (old as unknown as NotificationPreferences),
      );

      return { previous };
    },
    onError: (_err, _updates, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          [...NOTIFICATION_PREFS_KEY, userId],
          context.previous,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [...NOTIFICATION_PREFS_KEY, userId],
      });
    },
  });
}
