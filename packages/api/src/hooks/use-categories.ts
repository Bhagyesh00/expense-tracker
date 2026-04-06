import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useMemo } from 'react';
import type { TypedSupabaseClient } from '../client';
import { getCategories } from '../queries/categories';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from '../mutations/categories';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const CATEGORIES_KEY = ['categories'] as const;

// ---------------------------------------------------------------------------
// Option interfaces
// ---------------------------------------------------------------------------

interface UseCategoriesOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
  type?: 'expense' | 'income';
}

// ---------------------------------------------------------------------------
// useCategories — returns system + custom categories, properly sorted
// ---------------------------------------------------------------------------

export function useCategories({ client, workspaceId, type }: UseCategoriesOptions) {
  const query = useQuery({
    queryKey: [...CATEGORIES_KEY, workspaceId, type],
    queryFn: () => getCategories(client, workspaceId!),
    enabled: !!workspaceId,
    staleTime: 10 * 60 * 1000,
  });

  // Sort: system categories first (by sort_order), then custom (by sort_order)
  // Optionally filter by expense type
  const sortedCategories = useMemo(() => {
    if (!query.data) return [];

    let categories = [...query.data];

    // Filter by type if specified
    if (type) {
      categories = categories.filter((c) => c.type === type);
    }

    // Sort: system first, then by sort_order, then by name
    categories.sort((a, b) => {
      // System categories first
      if (a.is_system && !b.is_system) return -1;
      if (!a.is_system && b.is_system) return 1;

      // Then by sort_order
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;

      // Then alphabetically by name
      return a.name.localeCompare(b.name);
    });

    return categories;
  }, [query.data, type]);

  return {
    ...query,
    data: sortedCategories,
  };
}

// ---------------------------------------------------------------------------
// useCreateCategory
// ---------------------------------------------------------------------------

export function useCreateCategory({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      input,
    }: {
      workspaceId: string;
      input: CreateCategoryInput;
    }) => createCategory(client, workspaceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// useUpdateCategory
// ---------------------------------------------------------------------------

export function useUpdateCategory({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) =>
      updateCategory(client, id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// useDeleteCategory
// ---------------------------------------------------------------------------

export function useDeleteCategory({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCategory(client, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
      // Also invalidate expenses since category references may change
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

// ---------------------------------------------------------------------------
// useReorderCategories — batch update sort_order for drag-and-drop
// ---------------------------------------------------------------------------

export function useReorderCategories({
  client,
}: {
  client: TypedSupabaseClient;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      orderedIds: string[],
    ): Promise<void> => {
      // Update each category's sort_order based on its position
      const updates = orderedIds.map((id, index) =>
        client
          .from('categories')
          .update({ sort_order: index })
          .eq('id', id),
      );

      const results = await Promise.all(updates);

      // Check for any errors
      const firstError = results.find((r) => r.error);
      if (firstError?.error) {
        throw firstError.error;
      }
    },
    onMutate: async (orderedIds) => {
      // Optimistically reorder in cache
      await queryClient.cancelQueries({ queryKey: CATEGORIES_KEY });

      const previousData = queryClient.getQueriesData({
        queryKey: CATEGORIES_KEY,
      });

      // Update all category caches with new sort_order
      queryClient.setQueriesData(
        { queryKey: CATEGORIES_KEY },
        (old: unknown) => {
          if (!Array.isArray(old)) return old;
          return old.map((cat: Record<string, unknown>) => {
            const newIndex = orderedIds.indexOf(cat.id as string);
            if (newIndex >= 0) {
              return { ...cat, sort_order: newIndex };
            }
            return cat;
          });
        },
      );

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      // Rollback
      if (context?.previousData) {
        for (const [key, data] of context.previousData) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
    },
  });
}
