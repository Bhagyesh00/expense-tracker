"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  usePendingDetail,
  useRecordPayment,
  useSettlePending,
} from "@/hooks/use-pending-payments";
import { useFormatCurrency } from "@/hooks/use-currency";
import { PaymentTimeline } from "@/components/pending/payment-timeline";
import { SettleModal } from "@/components/pending/settle-modal";
import { UPILink } from "@/components/pending/upi-link";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Edit,
  Trash2,
  Banknote,
  Bell,
  Smartphone,
  Share2,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  Copy,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  partial: {
    label: "Partial",
    className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  overdue: {
    label: "Overdue",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  settled: {
    label: "Settled",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-gray-100 text-gray-500 dark:bg-gray-800/30 dark:text-gray-400",
  },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

const AVATAR_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#3b82f6",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6",
];

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

export default function PendingPaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { formatCurrency } = useFormatCurrency();

  const { data: payment, isLoading } = usePendingDetail(id);
  const { recordPayment } = useRecordPayment();
  const { settlePending } = useSettlePending();

  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleRecordPayment = useCallback(
    async (data: { amount: number; method: string; notes?: string }) => {
      await recordPayment(id, {
        amount: data.amount,
        method: data.method,
        notes: data.notes,
        paid_at: new Date().toISOString(),
      });
    },
    [id, recordPayment],
  );

  const handleMarkSettled = useCallback(async () => {
    await settlePending(id);
  }, [id, settlePending]);

  const handleShareLink = useCallback(async () => {
    const url = `${window.location.origin}/dashboard/pending/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Payment link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  }, [id]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
          <div className="h-7 w-48 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-40 rounded-xl border border-border bg-card animate-pulse" />
        <div className="h-60 rounded-xl border border-border bg-card animate-pulse" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Banknote className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-base font-semibold text-foreground">
          Payment not found
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          This pending payment may have been deleted.
        </p>
        <Link
          href="/dashboard/pending"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Back to Payments
        </Link>
      </div>
    );
  }

  const isReceive = payment.direction === "receive";
  const contactName = payment.contacts?.name ?? "Unknown";
  const remaining = payment.total_amount - payment.paid_amount;
  const progressPercent =
    payment.total_amount > 0
      ? Math.min((payment.paid_amount / payment.total_amount) * 100, 100)
      : 0;
  const isSettled = payment.status === "settled";
  const isCancelled = payment.status === "cancelled";
  const isOverdue =
    payment.due_date &&
    new Date(payment.due_date) < new Date() &&
    !isSettled &&
    !isCancelled;

  const displayStatus = isOverdue ? "overdue" : payment.status;
  const statusConfig = STATUS_CONFIG[displayStatus] ?? STATUS_CONFIG.pending!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/pending"
            className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Payment Details
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {payment.description || `Payment ${isReceive ? "from" : "to"} ${contactName}`}
            </p>
          </div>
        </div>
        {!isSettled && !isCancelled && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content - left 2 cols */}
        <div className="space-y-6 lg:col-span-2">
          {/* Amount display */}
          <div
            className={cn(
              "rounded-xl border bg-card p-6",
              isOverdue
                ? "border-l-4 border-l-red-500 border-border"
                : "border-border",
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {isReceive ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-xs font-semibold text-green-700 dark:text-green-400">
                    <ArrowDownLeft className="h-3.5 w-3.5" />
                    Receive
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 px-3 py-1 text-xs font-semibold text-red-700 dark:text-red-400">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    Give
                  </span>
                )}
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    statusConfig.className,
                  )}
                >
                  {isOverdue ? "Overdue" : statusConfig.label}
                </span>
              </div>
              {payment.due_date && (
                <span
                  className={cn(
                    "text-sm",
                    isOverdue
                      ? "text-red-600 font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  Due:{" "}
                  {new Date(payment.due_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>

            {/* Large amount */}
            <div className="text-center py-4">
              <p
                className={cn(
                  "text-4xl font-bold",
                  isReceive
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400",
                )}
              >
                {formatCurrency(payment.total_amount, payment.currency)}
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Paid: {formatCurrency(payment.paid_amount, payment.currency)}
                </span>
                <span className="text-muted-foreground">
                  Remaining: {formatCurrency(remaining, payment.currency)}
                </span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isReceive ? "bg-green-500" : "bg-red-500",
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {Math.round(progressPercent)}% complete
              </p>
            </div>
          </div>

          {/* Action buttons */}
          {!isSettled && !isCancelled && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowSettleModal(true)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors",
                  isReceive
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700",
                )}
              >
                <Banknote className="h-4 w-4" />
                Record Payment
              </button>
              <button
                type="button"
                onClick={() =>
                  toast.info("Reminder feature coming soon!")
                }
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Bell className="h-4 w-4" />
                Send Reminder
              </button>
              <button
                type="button"
                onClick={handleShareLink}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Share2 className="h-4 w-4" />
                Share Link
              </button>
              <button
                type="button"
                onClick={handleMarkSettled}
                className="inline-flex items-center gap-2 rounded-lg border border-green-300 dark:border-green-700 px-4 py-2.5 text-sm font-medium text-green-700 dark:text-green-400 transition-colors hover:bg-green-50 dark:hover:bg-green-900/20"
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark as Settled
              </button>
            </div>
          )}

          {/* Payment Timeline */}
          <div className="rounded-xl border border-border bg-card p-6">
            <PaymentTimeline
              records={payment.payment_records ?? []}
              totalAmount={payment.total_amount}
              currency={payment.currency}
              createdAt={payment.created_at}
              direction={payment.direction}
            />
          </div>
        </div>

        {/* Sidebar - right col */}
        <div className="space-y-6">
          {/* Contact card */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">
              Contact
            </h3>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold"
                style={{ backgroundColor: getColorForName(contactName) }}
              >
                {getInitials(contactName)}
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">
                  {contactName}
                </p>
                <Link
                  href={`/dashboard/contacts?id=${payment.contact_id}`}
                  className="text-xs text-primary hover:underline"
                >
                  View ledger
                </Link>
              </div>
            </div>
            <div className="space-y-2">
              {payment.contacts?.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  {payment.contacts.phone}
                </div>
              )}
              {payment.contacts?.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  {payment.contacts.email}
                </div>
              )}
            </div>
          </div>

          {/* UPI Payment (for Give direction) */}
          {payment.direction === "give" && !isSettled && !isCancelled && (
            <UPILink
              upiId={null}
              name={contactName}
              amount={remaining}
              currency={payment.currency}
              description={payment.description}
            />
          )}

          {/* Notes */}
          {payment.description && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold text-foreground mb-2 uppercase tracking-wider">
                Description
              </h3>
              <p className="text-sm text-muted-foreground">
                {payment.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Settle Modal */}
      {showSettleModal && payment && (
        <SettleModal
          payment={payment}
          open={showSettleModal}
          onClose={() => setShowSettleModal(false)}
          onSubmit={handleRecordPayment}
        />
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl mx-4">
            <h3 className="text-base font-semibold text-foreground">
              Delete this payment?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This action cannot be undone. The payment and all its records
              will be permanently removed.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  toast.info("Delete functionality coming soon");
                }}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
