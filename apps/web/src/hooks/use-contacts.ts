"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  useContacts as useContactsApi,
  useCreateContact as useCreateContactApi,
  useUpdateContact as useUpdateContactApi,
} from "@expenseflow/api";
import { useUIStore } from "@/stores/ui-store";

function getClient() {
  return createBrowserClient();
}

export function useContactsList() {
  const client = getClient();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);

  return useContactsApi({
    client,
    workspaceId: workspaceId ?? undefined,
  });
}

export function useCreateContact() {
  const client = getClient();
  const mutation = useCreateContactApi({ client });

  const createWithToast = useCallback(
    async (input: {
      workspace_id: string;
      name: string;
      email?: string;
      phone?: string;
      notes?: string;
    }) => {
      try {
        const { data: { user } } = await client.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        const result = await mutation.mutateAsync({ ...input, user_id: user.id });
        toast.success("Contact created successfully");
        return result;
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to create contact";
        toast.error(message);
        throw error;
      }
    },
    [mutation],
  );

  return {
    ...mutation,
    createContact: createWithToast,
  };
}

export function useUpdateContact() {
  const client = getClient();
  const mutation = useUpdateContactApi({ client });

  const updateWithToast = useCallback(
    async (
      id: string,
      input: {
        name?: string;
        email?: string | null;
        phone?: string | null;
        notes?: string | null;
      },
    ) => {
      try {
        const result = await mutation.mutateAsync({ id, input });
        toast.success("Contact updated successfully");
        return result;
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update contact";
        toast.error(message);
        throw error;
      }
    },
    [mutation],
  );

  return {
    ...mutation,
    updateContact: updateWithToast,
  };
}
