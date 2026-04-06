"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { useExpenseDetail, useDeleteExpense, useCreateExpense } from "@/hooks/use-expenses";
import { useFormatCurrency } from "@/hooks/use-currency";
import { useUIStore } from "@/stores/ui-store";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { ExpenseComments } from "@/components/expenses/expense-comments";
import { getCategoryIcon } from "@/components/expenses/category-selector";
import { createBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Loader2,
  Calendar,
  Tag,
  FileText,
  Repeat,
  Receipt,
  Clock,
  AlertCircle,
  Copy,
  Ban,
  MoreHorizontal,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Void reason modal
// ---------------------------------------------------------------------------

function VoidModal({
  expenseDescription,
  onConfirm,
  onClose,
  isVoiding,
}: {
  expenseDescription: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  isVoiding: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
        <h3 className="text-base font-semibold text-foreground">Void this expense?</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          &quot;{expenseDescription}&quot; will be marked as voided and excluded from reports.
        </p>
        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Reason (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this being voided?"
            rows={3}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            disabled={isVoiding}
            className="inline-flex items-center gap-2 rounded-lg bg-warning px-4 py-2 text-sm font-medium text-warning-foreground hover:bg-warning/90 disabled:opacity-50"
          >
            {isVoiding && <Loader2 className="h-4 w-4 animate-spin" />}
            Void Expense
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: expense, isLoading, error } = useExpenseDetail(id);
  const { deleteExpense, isPending: isDeleting } = useDeleteExpense();
  const { createExpense } = useCreateExpense();
  const { formatCurrency } = useFormatCurrency();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const handleDelete = useCallback(async () => {
    try {
      await deleteExpense(id);
      router.push("/dashboard/expenses");
    } catch {
      // Toast handled by hook
    }
  }, [id, deleteExpense, router]);

  const handleDuplicate = useCallback(async () => {
    if (!expense || !workspaceId) return;
    setIsDuplicating(true);
    try {
      const newExpense = await createExpense({
        workspace_id: workspaceId,
        user_id: "",
        category_id: expense.category_id,
        type: expense.type as "expense" | "income",
        amount: expense.amount,
        currency: expense.currency,
        description: `${expense.description} (copy)`,
        notes: expense.notes,
        date: new Date().toISOString().split("T")[0],
        tags: expense.tags,
        is_recurring: false,
      });
      router.push(`/dashboard/expenses/${newExpense.id}`);
    } catch {
      // Toast handled
    } finally {
      setIsDuplicating(false);
    }
  }, [expense, workspaceId, createExpense, router]);

  const handleVoid = useCallback(
    async (reason: string) => {
      if (!expense) return;
      setIsVoiding(true);
      const client = createBrowserClient();
      const voidNote = reason
        ? `[VOIDED: ${reason}]`
        : "[VOIDED]";
      const updatedNotes = expense.notes
        ? `${voidNote}\n\n${expense.notes}`
        : voidNote;

      const { error: updateError } = await client
        .from("expenses")
        .update({
          notes: updatedNotes,
          tags: [...(expense.tags ?? []), "voided"],
        } as any)
        .eq("id", id);

      setIsVoiding(false);
      setShowVoidModal(false);

      if (updateError) {
        toast.error(updateError.message);
      } else {
        toast.success("Expense voided");
      }
    },
    [expense, id],
  );

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 rounded bg-muted animate-pulse" />
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------

  if (error || !expense) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dashboard/expenses"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to expenses
        </Link>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="mb-3 h-10 w-10 text-destructive" />
          <h2 className="text-lg font-semibold text-foreground">Expense not found</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This expense may have been deleted or you do not have access.
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Edit mode
  // -------------------------------------------------------------------------

  if (isEditing) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Back to details"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Edit Expense</h1>
            <p className="text-sm text-muted-foreground">Update transaction details</p>
          </div>
        </div>
        <ExpenseForm
          mode="edit"
          initialData={{
            id: expense.id,
            amount: expense.amount,
            currency: expense.currency,
            type: expense.type as "expense" | "income",
            categoryId: expense.category_id ?? "",
            description: expense.description,
            notes: expense.notes ?? "",
            expenseDate: new Date(expense.expense_date),
            tags: expense.tags ?? [],
            receiptUrl: expense.receipt_url,
            isRecurring: expense.is_recurring,
            recurrenceInterval: expense.recurrence_interval,
          }}
          onSuccess={() => setIsEditing(false)}
        />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Detail view
  // -------------------------------------------------------------------------

  const isIncome = expense.type === "income";
  const isVoided = expense.tags?.includes("voided") || expense.notes?.startsWith("[VOIDED");
  const Icon = getCategoryIcon(expense.categories?.icon);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/expenses"
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Back to expenses"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Expense Details</h1>
              {isVoided && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  Voided
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">View transaction information</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Edit className="h-4 w-4" />
            Edit
          </button>

          {/* More actions */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActionsOpen(!actionsOpen)}
              className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {actionsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActionsOpen(false)} />
                <div className="absolute right-0 z-50 mt-1 w-44 rounded-lg border border-border bg-popover py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => { handleDuplicate(); setActionsOpen(false); }}
                    disabled={isDuplicating}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    {isDuplicating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    Duplicate expense
                  </button>
                  {!isVoided && (
                    <button
                      type="button"
                      onClick={() => { setShowVoidModal(true); setActionsOpen(false); }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-warning transition-colors hover:bg-warning/10"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Void expense
                    </button>
                  )}
                  <hr className="my-1 border-border" />
                  <button
                    type="button"
                    onClick={() => { setShowDeleteModal(true); setActionsOpen(false); }}
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

      {/* Amount card */}
      <div
        className={cn(
          "rounded-xl border p-6 text-center",
          isVoided
            ? "border-border bg-muted/30"
            : "border-border bg-card",
        )}
      >
        <div
          className={cn(
            "text-4xl font-bold",
            isVoided
              ? "text-muted-foreground line-through"
              : isIncome
              ? "text-success"
              : "text-foreground",
          )}
        >
          {isIncome ? "+" : "-"}
          {formatCurrency(expense.amount, expense.currency)}
        </div>
        <p className="mt-1 text-sm text-muted-foreground capitalize">{expense.type}</p>
      </div>

      {/* Details */}
      <div className="space-y-1 rounded-xl border border-border bg-card divide-y divide-border">
        {/* Description */}
        <div className="flex items-start gap-3 px-5 py-4">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Description</p>
            <p className="text-sm font-medium text-foreground">{expense.description}</p>
          </div>
        </div>

        {/* Category */}
        {expense.categories && (
          <div className="flex items-start gap-3 px-5 py-4">
            <Icon
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: expense.categories.color || "#6366f1" }}
            />
            <div>
              <p className="text-xs text-muted-foreground">Category</p>
              <span
                className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: `${expense.categories.color || "#6366f1"}20`,
                  color: expense.categories.color || "#6366f1",
                }}
              >
                {expense.categories.name}
              </span>
            </div>
          </div>
        )}

        {/* Date */}
        <div className="flex items-start gap-3 px-5 py-4">
          <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="text-sm font-medium text-foreground">
              {new Date(expense.expense_date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Tags */}
        {expense.tags && expense.tags.length > 0 && (
          <div className="flex items-start gap-3 px-5 py-4">
            <Tag className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Tags</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {expense.tags.map((tag) => (
                  <span
                    key={tag}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      tag === "voided"
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {expense.notes && (
          <div className="flex items-start gap-3 px-5 py-4">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{expense.notes}</p>
            </div>
          </div>
        )}

        {/* Recurring */}
        {expense.is_recurring && (
          <div className="flex items-start gap-3 px-5 py-4">
            <Repeat className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Recurring</p>
              <p className="text-sm font-medium capitalize text-foreground">
                {expense.recurrence_interval ?? "Yes"}
              </p>
            </div>
          </div>
        )}

        {/* Receipt */}
        {expense.receipt_url && (
          <div className="flex items-start gap-3 px-5 py-4">
            <Receipt className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Receipt</p>
              <div className="mt-2">
                <img
                  src={expense.receipt_url}
                  alt="Receipt"
                  className="max-h-48 rounded-lg border border-border object-contain"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">History</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-xs">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-muted-foreground">Created</span>
            <span className="font-medium text-foreground">
              {new Date(expense.created_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
          {expense.updated_at !== expense.created_at && (
            <div className="flex items-center gap-3 text-xs">
              <div className="h-2 w-2 rounded-full bg-warning" />
              <span className="text-muted-foreground">Last modified</span>
              <span className="font-medium text-foreground">
                {new Date(expense.updated_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Comments */}
      <ExpenseComments expenseId={expense.id} />

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-base font-semibold text-foreground">Delete this expense?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              &quot;{expense.description}&quot; for{" "}
              {formatCurrency(expense.amount, expense.currency)} will be permanently deleted.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void modal */}
      {showVoidModal && (
        <VoidModal
          expenseDescription={expense.description}
          onConfirm={handleVoid}
          onClose={() => setShowVoidModal(false)}
          isVoiding={isVoiding}
        />
      )}
    </div>
  );
}
