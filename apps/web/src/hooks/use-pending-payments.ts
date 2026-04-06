"use client";

import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  usePendingPayments as usePendingPaymentsApi,
  usePendingPayment as usePendingPaymentApi,
  useCreatePendingPayment as useCreatePendingPaymentApi,
  useRecordPayment as useRecordPaymentApi,
  useSettlePendingPayment as useSettlePendingPaymentApi,
  useContactLedger as useContactLedgerApi,
} from "@expenseflow/api";
import type { PendingPaymentFilters } from "@expenseflow/api";
import type {
  CreatePendingPaymentInput,
  RecordPaymentInput,
} from "@expenseflow/api";
import { useUIStore } from "@/stores/ui-store";

function getClient() {
  return createBrowserClient();
}

export function usePendingList(filters?: PendingPaymentFilters) {
  const client = getClient();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);

  return usePendingPaymentsApi({
    client,
    workspaceId: workspaceId ?? undefined,
    filters,
  });
}

export function usePendingDetail(id: string | undefined) {
  const client = getClient();
  return usePendingPaymentApi({ client, id });
}

export function useCreatePending() {
  const client = getClient();
  const mutation = useCreatePendingPaymentApi({ client });

  const createWithToast = useCallback(
    async (input: CreatePendingPaymentInput) => {
      try {
        const result = await mutation.mutateAsync(input);
        toast.success("Pending payment created successfully");
        return result;
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to create pending payment";
        toast.error(message);
        throw error;
      }
    },
    [mutation],
  );

  return {
    ...mutation,
    createPending: createWithToast,
  };
}

export function useRecordPayment() {
  const client = getClient();
  const mutation = useRecordPaymentApi({ client });

  const recordWithToast = useCallback(
    async (pendingPaymentId: string, input: RecordPaymentInput) => {
      try {
        const result = await mutation.mutateAsync({
          pendingPaymentId,
          input,
        });
        toast.success("Payment recorded successfully");
        return result;
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to record payment";
        toast.error(message);
        throw error;
      }
    },
    [mutation],
  );

  return {
    ...mutation,
    recordPayment: recordWithToast,
  };
}

export function useSettlePending() {
  const client = getClient();
  const mutation = useSettlePendingPaymentApi({ client });

  const settleWithToast = useCallback(
    async (id: string) => {
      try {
        const result = await mutation.mutateAsync(id);
        toast.success("Payment marked as settled");
        return result;
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to settle payment";
        toast.error(message);
        throw error;
      }
    },
    [mutation],
  );

  return {
    ...mutation,
    settlePending: settleWithToast,
  };
}

export function usePendingSummary() {
  const { data: payments, isLoading } = usePendingList();

  const summary = useMemo(() => {
    if (!payments)
      return { totalGive: 0, totalReceive: 0, netBalance: 0 };

    let totalGive = 0;
    let totalReceive = 0;

    for (const p of payments) {
      if (p.status === "cancelled" || p.status === "settled") continue;
      const remaining = p.amount - p.paid_amount;
      if (p.direction === "give") {
        totalGive += remaining;
      } else {
        totalReceive += remaining;
      }
    }

    return {
      totalGive,
      totalReceive,
      netBalance: totalReceive - totalGive,
    };
  }, [payments]);

  return { ...summary, isLoading };
}

export function useContactLedgerData(contactId: string | undefined) {
  const client = getClient();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);

  return useContactLedgerApi({
    client,
    workspaceId: workspaceId ?? undefined,
    contactId,
  });
}
