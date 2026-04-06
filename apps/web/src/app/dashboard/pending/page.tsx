"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  usePendingList,
  usePendingSummary,
  useRecordPayment,
  useSettlePending,
} from "@/hooks/use-pending-payments";
import { useContactsList } from "@/hooks/use-contacts";
import { useFormatCurrency } from "@/hooks/use-currency";
import { PendingList } from "@/components/pending/pending-list";
import { SettleModal } from "@/components/pending/settle-modal";
import type { PendingPaymentFilters, PendingPaymentRow } from "@expenseflow/api";
import {
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Banknote,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

type TabValue = "all" | "give" | "receive";
type StatusFilter = "" | "pending" | "partial" | "overdue" | "settled";

export default function PendingPaymentsPage() {
  const { formatCurrency } = useFormatCurrency();
  const { totalGive, totalReceive, netBalance, isLoading: summaryLoading } = usePendingSummary();

  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [contactFilter, setContactFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [settlePayment, setSettlePayment] = useState<PendingPaymentRow | null>(null);

  const { data: contacts } = useContactsList();
  const { recordPayment } = useRecordPayment();
  const { settlePending } = useSettlePending();

  // Build API filters
  const apiFilters: PendingPaymentFilters = useMemo(() => {
    const f: PendingPaymentFilters = {};
    if (activeTab !== "all") f.direction = activeTab;
    if (statusFilter) f.status = statusFilter;
    if (contactFilter) f.contactId = contactFilter;
    return f;
  }, [activeTab, statusFilter, contactFilter]);

  const { data: payments, isLoading } = usePendingList(apiFilters);
  const paymentsList = payments ?? [];

  // Filter overdue items client-side for the overdue status filter
  const filteredPayments = useMemo(() => {
    if (statusFilter === "overdue") {
      const now = new Date();
      return paymentsList.filter((p) => {
        if (p.status === "settled" || p.status === "cancelled") return false;
        if (!p.due_date) return false;
        return new Date(p.due_date) < now;
      });
    }
    return paymentsList;
  }, [paymentsList, statusFilter]);

  const handleRecordPayment = useCallback(
    (payment: PendingPaymentRow) => {
      setSettlePayment(payment);
    },
    [],
  );

  const handleSettleSubmit = useCallback(
    async (data: { amount: number; method: string; notes?: string }) => {
      if (!settlePayment) return;
      await recordPayment(settlePayment.id, {
        amount: data.amount,
        method: data.method,
        notes: data.notes,
        paid_at: new Date().toISOString(),
      });
    },
    [settlePayment, recordPayment],
  );

  const handleMarkSettled = useCallback(
    async (id: string) => {
      if (!confirm("Mark this payment as settled?")) return;
      await settlePending(id);
    },
    [settlePending],
  );

  const hasActiveFilters = statusFilter || contactFilter;
  const isPositiveBalance = netBalance >= 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Pending Payments
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Track money you owe and money owed to you
          </p>
        </div>
        <Link
          href="/dashboard/pending/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Record Payment
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
            <ArrowUpRight className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">You Owe</p>
            <p className="text-lg font-bold text-red-600">
              {summaryLoading ? (
                <span className="inline-block h-5 w-16 rounded bg-muted animate-pulse" />
              ) : (
                formatCurrency(totalGive, "INR")
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
            <ArrowDownLeft className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Owed to You</p>
            <p className="text-lg font-bold text-green-600">
              {summaryLoading ? (
                <span className="inline-block h-5 w-16 rounded bg-muted animate-pulse" />
              ) : (
                formatCurrency(totalReceive, "INR")
              )}
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
              {summaryLoading ? (
                <span className="inline-block h-5 w-16 rounded bg-muted animate-pulse" />
              ) : (
                <>
                  {netBalance >= 0 ? "+" : ""}
                  {formatCurrency(Math.abs(netBalance), "INR")}
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Tab/Segmented control + Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tabs */}
          <div className="flex rounded-lg border border-input">
            {(
              [
                { value: "all" as TabValue, label: "All" },
                { value: "give" as TabValue, label: "Give" },
                { value: "receive" as TabValue, label: "Receive" },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                className={cn(
                  "px-4 py-1.5 text-xs font-medium capitalize transition-colors first:rounded-l-lg last:rounded-r-lg",
                  activeTab === value
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Expand filters */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              showFilters
                ? "border-primary bg-primary/5 text-primary"
                : "border-input text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {hasActiveFilters && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                !
              </span>
            )}
          </button>

          {/* Clear */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter("");
                setContactFilter("");
              }}
              className="text-xs font-medium text-destructive hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
            {/* Status filter */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as StatusFilter)
                }
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="overdue">Overdue</option>
                <option value="settled">Settled</option>
              </select>
            </div>

            {/* Contact filter */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Contact
              </label>
              <select
                value={contactFilter}
                onChange={(e) => setContactFilter(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All contacts</option>
                {contacts?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Payment list */}
      <PendingList
        payments={filteredPayments}
        isLoading={isLoading}
        onRecordPayment={handleRecordPayment}
        onMarkSettled={handleMarkSettled}
      />

      {/* Settle modal */}
      {settlePayment && (
        <SettleModal
          payment={settlePayment}
          open={!!settlePayment}
          onClose={() => setSettlePayment(null)}
          onSubmit={handleSettleSubmit}
        />
      )}
    </div>
  );
}
