"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  useRecurringPayments,
  type RecurringPayment,
  type CreateRecurringPaymentInput,
} from "@/hooks/use-import";
import { useFormatCurrency } from "@/hooks/use-currency";
import { RecurringPaymentForm } from "@/components/pending/recurring-payment-form";
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Play,
  Pause,
  Trash2,
  Edit,
  CalendarClock,
  Loader2,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const INTERVAL_LABELS: Record<RecurringPayment["interval"], string> = {
  weekly: "Weekly",
  "bi-weekly": "Bi-Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

function isOverdue(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

function formatNextDue(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)}d`;
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays <= 7) return `Due in ${diffDays}d`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

function RecurringRow({
  payment,
  onEdit,
  onDelete,
  onToggleStatus,
  onGenerateNext,
}: {
  payment: RecurringPayment;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  onGenerateNext: () => void;
}) {
  const { formatCurrency } = useFormatCurrency();
  const [menuOpen, setMenuOpen] = useState(false);
  const overdue = isOverdue(payment.next_due_date);
  const isGive = payment.direction === "give";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center">
      {/* Direction icon */}
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          isGive ? "bg-red-100 dark:bg-red-900/30" : "bg-green-100 dark:bg-green-900/30",
        )}
      >
        {isGive ? (
          <ArrowUpRight className="h-5 w-5 text-red-600" />
        ) : (
          <ArrowDownLeft className="h-5 w-5 text-green-600" />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-sm font-semibold text-foreground">
          {payment.description}
        </p>
        <p className="text-xs text-muted-foreground">
          {payment.contacts?.name ?? "Unknown contact"} ·{" "}
          {INTERVAL_LABELS[payment.interval]}
        </p>
      </div>

      {/* Amount + due */}
      <div className="shrink-0 text-right">
        <p className={cn("text-sm font-bold", isGive ? "text-red-600" : "text-green-600")}>
          {formatCurrency(payment.amount, payment.currency)}
        </p>
        <p
          className={cn(
            "text-xs",
            overdue ? "font-medium text-destructive" : "text-muted-foreground",
          )}
        >
          {formatNextDue(payment.next_due_date)}
        </p>
      </div>

      {/* Status badge */}
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
          payment.status === "active"
            ? "bg-success/10 text-success"
            : "bg-muted text-muted-foreground",
        )}
      >
        {payment.status === "active" ? "Active" : "Paused"}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onGenerateNext}
          title="Generate pending payment now"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          <ChevronRight className="h-3.5 w-3.5" />
          Generate
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-50 mt-1 w-40 rounded-lg border border-border bg-popover py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => { onEdit(); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => { onToggleStatus(); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent"
                >
                  {payment.status === "active" ? (
                    <>
                      <Pause className="h-3.5 w-3.5" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      Resume
                    </>
                  )}
                </button>
                <hr className="my-1 border-border" />
                <button
                  type="button"
                  onClick={() => { onDelete(); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RecurringPaymentsPage() {
  const {
    payments,
    isLoading,
    createPayment,
    updatePayment,
    deletePayment,
    generateNext,
    isCreating,
  } = useRecurringPayments();

  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<RecurringPayment | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");

  const handleCreate = useCallback(
    async (data: CreateRecurringPaymentInput) => {
      await createPayment(data);
      setShowForm(false);
    },
    [createPayment],
  );

  const handleEdit = useCallback(
    async (data: CreateRecurringPaymentInput) => {
      if (!editingPayment) return;
      await updatePayment({ id: editingPayment.id, input: data });
      setEditingPayment(null);
    },
    [editingPayment, updatePayment],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this recurring payment template?")) return;
      await deletePayment(id);
    },
    [deletePayment],
  );

  const handleToggleStatus = useCallback(
    async (payment: RecurringPayment) => {
      const newStatus = payment.status === "active" ? "paused" : "active";
      await updatePayment({ id: payment.id, input: { status: newStatus } });
      toast.success(`Payment ${newStatus}`);
    },
    [updatePayment],
  );

  const filteredPayments = payments.filter((p) =>
    statusFilter === "all" ? true : p.status === statusFilter,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/pending"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Back to pending"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Recurring Payments</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Manage recurring payables and receivables
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Recurring
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-1 rounded-lg border border-input bg-muted/30 p-1 w-fit">
        {(["all", "active", "paused"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
              statusFilter === s
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredPayments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <RefreshCw className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No recurring payments</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Set up recurring payment templates to automatically track regular bills, rent, and other periodic payments.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create your first recurring payment
          </button>
        </div>
      )}

      {/* List */}
      {!isLoading && filteredPayments.length > 0 && (
        <div className="space-y-3">
          {filteredPayments.map((payment) => (
            <RecurringRow
              key={payment.id}
              payment={payment}
              onEdit={() => setEditingPayment(payment)}
              onDelete={() => handleDelete(payment.id)}
              onToggleStatus={() => handleToggleStatus(payment)}
              onGenerateNext={() => generateNext(payment)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <RecurringPaymentForm
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
          isSubmitting={isCreating}
        />
      )}
      {editingPayment && (
        <RecurringPaymentForm
          payment={editingPayment}
          onSubmit={handleEdit}
          onClose={() => setEditingPayment(null)}
        />
      )}
    </div>
  );
}
