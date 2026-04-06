"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCreatePending } from "@/hooks/use-pending-payments";
import { useUIStore } from "@/stores/ui-store";
import { PendingForm } from "@/components/pending/pending-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewPendingPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);
  const { createPending, isPending } = useCreatePending();

  const preselectedContactId = searchParams.get("contactId") ?? undefined;

  const handleSubmit = useCallback(
    async (data: {
      direction: "give" | "receive";
      contactId: string;
      amount: number;
      currency: string;
      description: string;
      dueDate?: Date | null;
      notes?: string;
    }) => {
      if (!workspaceId) return;
      await createPending({
        workspace_id: workspaceId,
        user_id: "", // Will be set server-side or via RLS
        contact_id: data.contactId,
        direction: data.direction,
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        due_date: data.dueDate
          ? data.dueDate.toISOString().split("T")[0]
          : null,
      });
      router.push("/dashboard/pending");
    },
    [workspaceId, createPending, router],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/pending"
          className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            New Pending Payment
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Record a new payment you owe or are owed
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-lg">
        <div className="rounded-xl border border-border bg-card p-6">
          <PendingForm
            mode="create"
            defaultValues={
              preselectedContactId
                ? { contactId: preselectedContactId }
                : undefined
            }
            onSubmit={handleSubmit}
            isSubmitting={isPending}
          />
        </div>
      </div>
    </div>
  );
}
