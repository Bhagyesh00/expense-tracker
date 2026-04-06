"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  useCategories as useCategoriesApi,
  useCreateCategory as useCreateCategoryApi,
  useUpdateCategory as useUpdateCategoryApi,
  useDeleteCategory as useDeleteCategoryApi,
} from "@expenseflow/api";
import type { CreateCategoryInput, UpdateCategoryInput } from "@expenseflow/api";
import { useUIStore } from "@/stores/ui-store";

function getClient() {
  return createBrowserClient();
}

export function useCategoriesList() {
  const client = getClient();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);

  return useCategoriesApi({
    client,
    workspaceId: workspaceId ?? undefined,
  });
}

export function useCreateCategory() {
  const client = getClient();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);
  const mutation = useCreateCategoryApi({ client });

  const createWithToast = useCallback(
    async (input: CreateCategoryInput) => {
      if (!workspaceId) {
        toast.error("No workspace selected");
        throw new Error("No workspace selected");
      }
      try {
        const result = await mutation.mutateAsync({ workspaceId, input });
        toast.success("Category created successfully");
        return result;
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to create category";
        toast.error(message);
        throw error;
      }
    },
    [mutation, workspaceId],
  );

  return {
    ...mutation,
    createCategory: createWithToast,
  };
}

export function useUpdateCategory() {
  const client = getClient();
  const mutation = useUpdateCategoryApi({ client });

  const updateWithToast = useCallback(
    async (id: string, input: UpdateCategoryInput) => {
      try {
        const result = await mutation.mutateAsync({ id, input });
        toast.success("Category updated successfully");
        return result;
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to update category";
        toast.error(message);
        throw error;
      }
    },
    [mutation],
  );

  return {
    ...mutation,
    updateCategory: updateWithToast,
  };
}

export function useDeleteCategory() {
  const client = getClient();
  const mutation = useDeleteCategoryApi({ client });

  const deleteWithToast = useCallback(
    async (id: string) => {
      try {
        await mutation.mutateAsync(id);
        toast.success("Category deleted successfully");
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to delete category";
        toast.error(message);
        throw error;
      }
    },
    [mutation],
  );

  return {
    ...mutation,
    deleteCategory: deleteWithToast,
  };
}
