/**
 * ExpenseFlow — Expense Comment Hooks
 *
 * Provides real-time threaded comments on expense entries.
 * Features:
 *   - List comments with author profile via join
 *   - Optimistic add with rollback on error
 *   - Soft delete (sets is_deleted = true)
 *   - Supabase Realtime subscription for live updates
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import type { TypedSupabaseClient } from '../client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CommentAuthor {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface ExpenseComment {
  id: string;
  expense_id: string;
  user_id: string;
  content: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  profiles?: CommentAuthor | null;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const COMMENTS_KEY = ['expense-comments'] as const;

// ---------------------------------------------------------------------------
// useExpenseComments — list comments with author profiles + realtime sync
// ---------------------------------------------------------------------------

interface UseExpenseCommentsOptions {
  client: TypedSupabaseClient;
  expenseId: string | undefined;
}

export function useExpenseComments({
  client,
  expenseId,
}: UseExpenseCommentsOptions) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof client.channel> | null>(null);

  const query = useQuery<ExpenseComment[]>({
    queryKey: [...COMMENTS_KEY, expenseId],
    queryFn: async (): Promise<ExpenseComment[]> => {
      const { data, error } = await client
        .from('expense_comments')
        .select('*, profiles(id, full_name, avatar_url)')
        .eq('expense_id', expenseId!)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as ExpenseComment[];
    },
    enabled: !!expenseId,
    staleTime: 60 * 1000, // 1 minute — realtime keeps it fresh
  });

  // Subscribe to realtime inserts, updates, and deletes for this expense's comments
  useEffect(() => {
    if (!expenseId) return;

    const channelName = `expense-comments:${expenseId}`;

    channelRef.current = client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expense_comments',
          filter: `expense_id=eq.${expenseId}`,
        },
        () => {
          // Invalidate the query to trigger a fresh fetch when any change occurs.
          // This is intentionally simple — for very active comment threads a
          // more granular merge could be implemented.
          queryClient.invalidateQueries({
            queryKey: [...COMMENTS_KEY, expenseId],
          });
        },
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        client.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [client, expenseId, queryClient]);

  return query;
}

// ---------------------------------------------------------------------------
// useAddComment — add a comment with optimistic update
// ---------------------------------------------------------------------------

interface AddCommentArgs {
  expenseId: string;
  content: string;
}

export function useAddComment({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      expenseId,
      content,
    }: AddCommentArgs): Promise<ExpenseComment> => {
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const trimmedContent = content.trim();
      if (!trimmedContent) throw new Error('Comment content cannot be empty');
      if (trimmedContent.length > 2000) {
        throw new Error('Comment must not exceed 2000 characters');
      }

      const { data, error } = await client
        .from('expense_comments')
        .insert({
          expense_id: expenseId,
          user_id: user.id,
          content: trimmedContent,
          is_deleted: false,
        } as any)
        .select('*, profiles(id, full_name, avatar_url)')
        .single();

      if (error) throw error;
      return data as unknown as ExpenseComment;
    },
    onMutate: async ({ expenseId, content }) => {
      // Cancel in-flight refetches so they don't overwrite the optimistic entry
      await queryClient.cancelQueries({
        queryKey: [...COMMENTS_KEY, expenseId],
      });

      const previousComments = queryClient.getQueryData<ExpenseComment[]>([
        ...COMMENTS_KEY,
        expenseId,
      ]);

      // Build a temporary optimistic comment
      const optimistic: ExpenseComment = {
        id: `optimistic-${Date.now()}`,
        expense_id: expenseId,
        user_id: 'current-user',
        content: content.trim(),
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        profiles: null,
      };

      queryClient.setQueryData<ExpenseComment[]>(
        [...COMMENTS_KEY, expenseId],
        (old) => [...(old ?? []), optimistic],
      );

      return { previousComments, expenseId };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousComments !== undefined) {
        queryClient.setQueryData(
          [...COMMENTS_KEY, context.expenseId],
          context.previousComments,
        );
      }
    },
    onSettled: (_data, _err, { expenseId }) => {
      queryClient.invalidateQueries({ queryKey: [...COMMENTS_KEY, expenseId] });
    },
  });
}

// ---------------------------------------------------------------------------
// useDeleteComment — soft delete: sets is_deleted = true
// ---------------------------------------------------------------------------

interface DeleteCommentArgs {
  commentId: string;
  expenseId: string;
}

export function useDeleteComment({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId }: DeleteCommentArgs): Promise<void> => {
      const { error } = await client
        .from('expense_comments')
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', commentId);

      if (error) throw error;
    },
    onMutate: async ({ commentId, expenseId }) => {
      await queryClient.cancelQueries({
        queryKey: [...COMMENTS_KEY, expenseId],
      });

      const previousComments = queryClient.getQueryData<ExpenseComment[]>([
        ...COMMENTS_KEY,
        expenseId,
      ]);

      // Optimistically remove the comment from the visible list
      queryClient.setQueryData<ExpenseComment[]>(
        [...COMMENTS_KEY, expenseId],
        (old) => (old ?? []).filter((c) => c.id !== commentId),
      );

      return { previousComments, expenseId };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousComments !== undefined) {
        queryClient.setQueryData(
          [...COMMENTS_KEY, context.expenseId],
          context.previousComments,
        );
      }
    },
    onSettled: (_data, _err, { expenseId }) => {
      queryClient.invalidateQueries({ queryKey: [...COMMENTS_KEY, expenseId] });
    },
  });
}
