"use client";

import { useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { useFormatCurrency } from "@/hooks/use-currency";
import { useContactLedgerData } from "@/hooks/use-pending-payments";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Mail,
  Phone,
  Plus,
  Loader2,
  Banknote,
} from "lucide-react";
import type { PendingPaymentRow } from "@expenseflow/api";

interface ContactLedgerProps {
  contactId: string;
  onSettleAll?: () => void;
  className?: string;
}

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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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

export function ContactLedger({
  contactId,
  onSettleAll,
  className,
}: ContactLedgerProps) {
  const { data: ledger, isLoading } = useContactLedgerData(contactId);
  const { formatCurrency } = useFormatCurrency();

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-32 rounded bg-muted animate-pulse" />
              <div className="h-4 w-48 rounded bg-muted animate-pulse" />
            </div>
          </div>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl border border-border bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  if (!ledger) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">Contact not found.</p>
      </div>
    );
  }

  const { contact, totalGive, totalReceive, netBalance, payments } = ledger;
  const isPositiveBalance = netBalance >= 0;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Contact info card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white text-lg font-bold"
            style={{ backgroundColor: getColorForName(contact.name) }}
          >
            {getInitials(contact.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-foreground">
              {contact.name}
            </h2>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              {contact.email && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  {contact.email}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Net balance summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
            <ArrowUpRight className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">You Owe</p>
            <p className="text-lg font-bold text-red-600">
              {formatCurrency(totalGive, "INR")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
            <ArrowDownLeft className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">They Owe You</p>
            <p className="text-lg font-bold text-green-600">
              {formatCurrency(totalReceive, "INR")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              isPositiveBalance
                ? "bg-green-100 dark:bg-green-900/30"
                : "bg-red-100 dark:bg-red-900/30",
            )}
          >
            <Banknote
              className={cn(
                "h-5 w-5",
                isPositiveBalance ? "text-green-600" : "text-red-600",
              )}
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Net Balance</p>
            <p
              className={cn(
                "text-lg font-bold",
                isPositiveBalance ? "text-green-600" : "text-red-600",
              )}
            >
              {netBalance >= 0 ? "+" : ""}
              {formatCurrency(Math.abs(netBalance), "INR")}
            </p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-2">
        <Link
          href={`/dashboard/pending/new?contactId=${contactId}`}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New payment with {contact.name}
        </Link>
        {netBalance !== 0 && onSettleAll && (
          <button
            type="button"
            onClick={onSettleAll}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Settle All
          </button>
        )}
      </div>

      {/* Transaction history */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wider">
          Transaction History
        </h3>
        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl border border-dashed border-border">
            <Banknote className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No transactions with {contact.name} yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map((payment) => {
              const isReceive = payment.direction === "receive";
              const statusConfig =
                STATUS_CONFIG[payment.status] ?? STATUS_CONFIG.pending!;

              return (
                <Link
                  key={payment.id}
                  href={`/dashboard/pending/${payment.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/50"
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      isReceive
                        ? "bg-green-100 dark:bg-green-900/30"
                        : "bg-red-100 dark:bg-red-900/30",
                    )}
                  >
                    {isReceive ? (
                      <ArrowDownLeft className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {payment.description || (isReceive ? "Receive" : "Give")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(payment.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isReceive ? "text-green-600" : "text-red-600",
                      )}
                    >
                      {isReceive ? "+" : "-"}
                      {formatCurrency(payment.amount, payment.currency)}
                    </span>
                    <span
                      className={cn(
                        "block mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                        statusConfig.className,
                      )}
                    >
                      {statusConfig.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
