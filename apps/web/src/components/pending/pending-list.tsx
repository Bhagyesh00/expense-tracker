"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { useFormatCurrency } from "@/hooks/use-currency";
import {
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  ArrowUpDown,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Banknote,
  CheckCircle2,
  Clock,
  Bell,
} from "lucide-react";
import type { PendingPaymentRow } from "@expenseflow/api";

type SortField = "contact" | "amount" | "dueDate" | "status";
type SortDir = "asc" | "desc";

interface PendingListProps {
  payments: PendingPaymentRow[];
  isLoading: boolean;
  onRecordPayment: (payment: PendingPaymentRow) => void;
  onMarkSettled: (id: string) => void;
  className?: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
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

function getOverdueDays(dueDate: string | null): number {
  if (!dueDate) return 0;
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = now.getTime() - due.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function formatDueDate(dateString: string | null): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
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

function ActionsDropdown({
  payment,
  onRecordPayment,
  onMarkSettled,
}: {
  payment: PendingPaymentRow;
  onRecordPayment: () => void;
  onMarkSettled: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isSettled = payment.status === "settled" || payment.status === "cancelled";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        aria-label="Actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-1 w-44 rounded-lg border border-border bg-popover py-1 shadow-lg">
            {!isSettled && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRecordPayment();
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
                >
                  <Banknote className="h-3.5 w-3.5" />
                  Record Payment
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
                >
                  <Bell className="h-3.5 w-3.5" />
                  Send Reminder
                </button>
                <hr className="my-1 border-border" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkSettled();
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark Settled
                </button>
              </>
            )}
            {isSettled && (
              <span className="block px-3 py-1.5 text-sm text-muted-foreground">
                No actions available
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function PendingList({
  payments,
  isLoading,
  onRecordPayment,
  onMarkSettled,
  className,
}: PendingListProps) {
  const router = useRouter();
  const { formatCurrency } = useFormatCurrency();
  const [sortField, setSortField] = useState<SortField>("dueDate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("desc");
      }
    },
    [sortField],
  );

  const sortedPayments = useMemo(() => {
    const sorted = [...payments];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "contact":
          cmp = (a.contacts?.name ?? "").localeCompare(b.contacts?.name ?? "");
          break;
        case "amount":
          cmp = a.total_amount - b.total_amount;
          break;
        case "dueDate":
          cmp =
            new Date(a.due_date ?? "9999-12-31").getTime() -
            new Date(b.due_date ?? "9999-12-31").getTime();
          break;
        case "status": {
          const order: Record<string, number> = {
            overdue: 0,
            pending: 1,
            partial: 2,
            settled: 3,
            cancelled: 4,
          };
          cmp = (order[a.status] ?? 5) - (order[b.status] ?? 5);
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [payments, sortField, sortDir]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 text-primary" />
    ) : (
      <ChevronDown className="h-3 w-3 text-primary" />
    );
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
          >
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-muted animate-pulse" />
              <div className="h-3 w-20 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-4 w-20 rounded bg-muted animate-pulse" />
            <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Banknote className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold text-foreground">
          No pending payments
        </h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Record a payment you owe or are owed to start tracking.
        </p>
        <Link
          href="/dashboard/pending/new"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Record Payment
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Desktop table */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {(
                [
                  { field: "contact" as SortField, label: "Contact" },
                  { field: "amount" as SortField, label: "Amount" },
                  { field: "dueDate" as SortField, label: "Due Date" },
                  { field: "status" as SortField, label: "Status" },
                ] as const
              ).map(({ field, label }) => (
                <th
                  key={field}
                  onClick={() => toggleSort(field)}
                  className="group cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  <div className="flex items-center gap-1">
                    {label}
                    <SortIcon field={field} />
                  </div>
                </th>
              ))}
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {sortedPayments.map((payment) => {
              const isReceive = payment.direction === "receive";
              const contactName = payment.contacts?.name ?? "Unknown";
              const overdueDays = getOverdueDays(payment.due_date);
              const isOverdue =
                overdueDays > 0 &&
                payment.status !== "settled" &&
                payment.status !== "cancelled";
              const progressPercent =
                payment.total_amount > 0
                  ? Math.min(
                      (payment.paid_amount / payment.total_amount) * 100,
                      100,
                    )
                  : 0;
              const statusConfig =
                STATUS_CONFIG[isOverdue ? "overdue" : payment.status] ??
                STATUS_CONFIG.pending!;

              return (
                <tr
                  key={payment.id}
                  onClick={() =>
                    router.push(`/dashboard/pending/${payment.id}`)
                  }
                  className={cn(
                    "cursor-pointer border-b border-border last:border-0 hover:bg-accent/50 transition-colors",
                    isOverdue && "border-l-2 border-l-red-500",
                  )}
                >
                  {/* Contact */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold"
                        style={{ backgroundColor: getColorForName(contactName) }}
                      >
                        {getInitials(contactName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {contactName}
                        </p>
                        <div className="flex items-center gap-1.5">
                          {isReceive ? (
                            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                              <ArrowDownLeft className="h-3 w-3" />
                              Receive
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                              <ArrowUpRight className="h-3 w-3" />
                              Give
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Amount with progress */}
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          isReceive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
                        )}
                      >
                        {formatCurrency(payment.total_amount, payment.currency)}
                      </span>
                      {payment.paid_amount > 0 && payment.status !== "settled" && (
                        <div className="space-y-0.5">
                          <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                isReceive ? "bg-green-500" : "bg-red-500",
                              )}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {formatCurrency(payment.paid_amount, payment.currency)} paid
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Due Date */}
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-sm whitespace-nowrap",
                        isOverdue
                          ? "text-red-600 dark:text-red-400 font-medium"
                          : "text-foreground",
                      )}
                    >
                      {formatDueDate(payment.due_date)}
                    </span>
                    {isOverdue && (
                      <p className="text-[10px] text-red-500 font-medium">
                        Overdue by {overdueDays}d
                      </p>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        statusConfig.className,
                      )}
                    >
                      {isOverdue ? "Overdue" : statusConfig.label}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <ActionsDropdown
                      payment={payment}
                      onRecordPayment={() => onRecordPayment(payment)}
                      onMarkSettled={() => onMarkSettled(payment.id)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {sortedPayments.map((payment) => {
          const isReceive = payment.direction === "receive";
          const contactName = payment.contacts?.name ?? "Unknown";
          const overdueDays = getOverdueDays(payment.due_date);
          const isOverdue =
            overdueDays > 0 &&
            payment.status !== "settled" &&
            payment.status !== "cancelled";
          const progressPercent =
            payment.total_amount > 0
              ? Math.min(
                  (payment.paid_amount / payment.total_amount) * 100,
                  100,
                )
              : 0;
          const statusConfig =
            STATUS_CONFIG[isOverdue ? "overdue" : payment.status] ??
            STATUS_CONFIG.pending!;

          return (
            <Link
              key={payment.id}
              href={`/dashboard/pending/${payment.id}`}
              className={cn(
                "block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/50 active:bg-accent",
                isOverdue && "border-l-2 border-l-red-500",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold"
                  style={{ backgroundColor: getColorForName(contactName) }}
                >
                  {getInitials(contactName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground truncate">
                      {contactName}
                    </p>
                    <span
                      className={cn(
                        "text-sm font-semibold whitespace-nowrap ml-2",
                        isReceive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
                      )}
                    >
                      {isReceive ? "+" : "-"}
                      {formatCurrency(payment.total_amount, payment.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2">
                      {isReceive ? (
                        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                          <ArrowDownLeft className="h-3 w-3" />
                          Receive
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                          <ArrowUpRight className="h-3 w-3" />
                          Give
                        </span>
                      )}
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                          statusConfig.className,
                        )}
                      >
                        {isOverdue ? "Overdue" : statusConfig.label}
                      </span>
                    </div>
                    {payment.due_date && (
                      <span
                        className={cn(
                          "text-xs",
                          isOverdue
                            ? "text-red-500 font-medium"
                            : "text-muted-foreground",
                        )}
                      >
                        {isOverdue
                          ? `${overdueDays}d overdue`
                          : formatDueDate(payment.due_date)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {payment.paid_amount > 0 && payment.status !== "settled" && (
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {formatCurrency(payment.paid_amount, payment.currency)} paid
                    </span>
                    <span>{Math.round(progressPercent)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        isReceive ? "bg-green-500" : "bg-red-500",
                      )}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
