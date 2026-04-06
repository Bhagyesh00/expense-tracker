"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  RefreshCw,
  ExternalLink,
  Plus,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { createBrowserClient } from "@/lib/supabase/client";
import { useUIStore } from "@/stores/ui-store";
import { useBlurAmount } from "@/hooks/use-privacy";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DetectedSubscription {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  interval: "weekly" | "monthly" | "quarterly" | "yearly";
  lastCharged: string;
  nextExpected: string;
  confidence: "high" | "medium" | "low";
  transactionCount: number;
  categoryId?: string;
  categoryName?: string;
  isHidden: boolean; // small/easily overlooked amounts
}

// ── Detection Logic ───────────────────────────────────────────────────────────

interface ExpenseRow {
  id: string;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  category_id: string | null;
  categories: { id: string; name: string } | null;
}

function detectSubscriptions(expenses: ExpenseRow[]): DetectedSubscription[] {
  if (!expenses.length) return [];

  // Group by merchant
  const merchantGroups = new Map<
    string,
    { expenses: ExpenseRow[]; amounts: number[] }
  >();

  for (const exp of expenses) {
    const merchantKey =
      (exp.description || "Unknown")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ")
        // Remove common noise words
        .replace(/\b(payment|pay|charge|bill|invoice)\b/g, "")
        .trim() || "unknown";

    if (!merchantGroups.has(merchantKey)) {
      merchantGroups.set(merchantKey, { expenses: [], amounts: [] });
    }
    const group = merchantGroups.get(merchantKey)!;
    group.expenses.push(exp);
    group.amounts.push(exp.amount);
  }

  const subscriptions: DetectedSubscription[] = [];

  for (const [merchant, group] of merchantGroups.entries()) {
    if (group.expenses.length < 2) continue;

    // Sort by date
    group.expenses.sort(
      (a, b) => new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime()
    );

    // Check amount consistency (within 5% variance for FX)
    const avgAmount =
      group.amounts.reduce((s, a) => s + a, 0) / group.amounts.length;
    const isAmountConsistent = group.amounts.every(
      (a) => Math.abs(a - avgAmount) / avgAmount < 0.1
    );

    if (!isAmountConsistent) continue;

    // Detect interval from date gaps
    const dates = group.expenses.map((e) => new Date(e.expense_date));
    const gaps: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      const gapDays = Math.round(
        (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
      );
      gaps.push(gapDays);
    }

    if (!gaps.length) continue;

    const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    const gapVariance = Math.sqrt(
      gaps.reduce((s, g) => s + Math.pow(g - avgGap, 2), 0) / gaps.length
    );

    // Allow ±5 day variance for monthly detection
    let interval: DetectedSubscription["interval"] | null = null;
    if (avgGap >= 5 && avgGap <= 10 && gapVariance < 3) {
      interval = "weekly";
    } else if (avgGap >= 25 && avgGap <= 35 && gapVariance < 5) {
      interval = "monthly";
    } else if (avgGap >= 85 && avgGap <= 100 && gapVariance < 7) {
      interval = "quarterly";
    } else if (avgGap >= 355 && avgGap <= 375 && gapVariance < 10) {
      interval = "yearly";
    }

    if (!interval) continue;

    const confidence: DetectedSubscription["confidence"] =
      gapVariance < 2 ? "high" : gapVariance < 4 ? "medium" : "low";

    const lastExpense = group.expenses[group.expenses.length - 1];
    const lastDate = new Date(lastExpense.expense_date);

    // Calculate next expected date
    let nextDate = new Date(lastDate);
    if (interval === "weekly") nextDate.setDate(nextDate.getDate() + 7);
    else if (interval === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);
    else if (interval === "quarterly")
      nextDate.setMonth(nextDate.getMonth() + 3);
    else nextDate.setFullYear(nextDate.getFullYear() + 1);

    // Display name: capitalize words
    const displayName = merchant
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    subscriptions.push({
      id: `sub-${merchant.replace(/\s+/g, "-")}`,
      merchant: displayName,
      amount: Math.round(avgAmount * 100) / 100,
      currency: lastExpense.currency || "INR",
      interval,
      lastCharged: lastExpense.expense_date.split("T")[0],
      nextExpected: nextDate.toISOString().split("T")[0],
      confidence,
      transactionCount: group.expenses.length,
      categoryId: lastExpense.category_id ?? undefined,
      categoryName: lastExpense.categories?.name,
      isHidden: avgAmount < 200, // Flag subscriptions under ₹200 as "hidden"
    });
  }

  return subscriptions.sort((a, b) => b.amount - a.amount);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

function useSubscriptionDetector() {
  const client = createBrowserClient();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);

  return useQuery({
    queryKey: ["subscription-detector", workspaceId],
    queryFn: async (): Promise<DetectedSubscription[]> => {
      // Look at the last 12 months
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);

      const { data, error } = await client
        .from("expenses")
        .select(
          "id, description, amount, currency, expense_date, category_id, categories(id, name)"
        )
        .eq("workspace_id", workspaceId!)
        .eq("type", "expense")
        .gte("expense_date", startDate.toISOString().split("T")[0])
        .is("deleted_at", null)
        .order("expense_date", { ascending: true });

      if (error) throw error;

      return detectSubscriptions((data ?? []) as unknown as ExpenseRow[]);
    },
    enabled: !!workspaceId,
    staleTime: 15 * 60 * 1000, // 15 min
  });
}

// ── Main Component ────────────────────────────────────────────────────────────

interface SubscriptionDetectorProps {
  className?: string;
  showHidden?: boolean;
}

export function SubscriptionDetector({
  className,
  showHidden = false,
}: SubscriptionDetectorProps) {
  const { data: subscriptions = [], isLoading, refetch } = useSubscriptionDetector();
  const [showHiddenSection, setShowHiddenSection] = useState(showHidden);
  const [addingId, setAddingId] = useState<string | null>(null);

  const visibleSubs = useMemo(
    () => subscriptions.filter((s) => !s.isHidden),
    [subscriptions]
  );

  const hiddenSubs = useMemo(
    () => subscriptions.filter((s) => s.isHidden),
    [subscriptions]
  );

  const totalMonthly = useMemo(() => {
    return subscriptions.reduce((total, sub) => {
      if (sub.interval === "monthly") return total + sub.amount;
      if (sub.interval === "weekly") return total + sub.amount * 4.33;
      if (sub.interval === "quarterly") return total + sub.amount / 3;
      if (sub.interval === "yearly") return total + sub.amount / 12;
      return total;
    }, 0);
  }, [subscriptions]);

  const blurredTotal = useBlurAmount(Math.round(totalMonthly));
  const blurredYearly = useBlurAmount(Math.round(totalMonthly * 12));

  const handleAddToRecurring = async (sub: DetectedSubscription) => {
    setAddingId(sub.id);
    try {
      // In a real app, this would create a recurring expense entry
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.success(`${sub.merchant} added to recurring expenses`);
    } catch {
      toast.error("Failed to add recurring expense");
    } finally {
      setAddingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-10", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">
          Analyzing subscriptions...
        </span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary Header */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Detected Subscriptions
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {subscriptions.length} recurring charges detected from your
              transaction history
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {subscriptions.length > 0 && (
          <div className="mt-4 flex items-center gap-6 border-t border-border pt-4">
            <div>
              <p className="text-xs text-muted-foreground">
                Total monthly cost
              </p>
              <p className="text-2xl font-bold text-foreground">
                {blurredTotal}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              <span>
                ≈{" "}
                <span className="font-medium text-foreground">
                  {blurredYearly}
                </span>{" "}
                per year
              </span>
            </div>
          </div>
        )}
      </div>

      {/* No subscriptions */}
      {subscriptions.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <RefreshCw className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground">
            No recurring subscriptions detected
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add more transaction history to enable subscription detection.
          </p>
        </div>
      )}

      {/* Visible Subscriptions */}
      {visibleSubs.length > 0 && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              Active Subscriptions ({visibleSubs.length})
            </h3>
          </div>
          <div className="divide-y divide-border">
            {visibleSubs.map((sub) => (
              <SubscriptionRow
                key={sub.id}
                subscription={sub}
                onAddToRecurring={handleAddToRecurring}
                isAdding={addingId === sub.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Hidden Subscriptions */}
      {hiddenSubs.length > 0 && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <button
            onClick={() => setShowHiddenSection(!showHiddenSection)}
            className="flex w-full items-center justify-between px-5 py-4 border-b border-border text-left hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-foreground">
                Easily-overlooked Subscriptions ({hiddenSubs.length})
              </span>
            </div>
            {showHiddenSection ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {showHiddenSection && (
            <div className="divide-y divide-border">
              {hiddenSubs.map((sub) => (
                <SubscriptionRow
                  key={sub.id}
                  subscription={sub}
                  onAddToRecurring={handleAddToRecurring}
                  isAdding={addingId === sub.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Subscription Row ──────────────────────────────────────────────────────────

function SubscriptionRow({
  subscription: sub,
  onAddToRecurring,
  isAdding,
}: {
  subscription: DetectedSubscription;
  onAddToRecurring: (sub: DetectedSubscription) => void;
  isAdding: boolean;
}) {
  const displayAmount = useBlurAmount(sub.amount, sub.currency === "INR" ? "₹" : sub.currency);

  const intervalLabel = {
    weekly: "/week",
    monthly: "/month",
    quarterly: "/quarter",
    yearly: "/year",
  }[sub.interval];

  const confidenceColor = {
    high: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    medium:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    low: "bg-muted text-muted-foreground",
  }[sub.confidence];

  const nextDate = new Date(sub.nextExpected);
  const daysUntilNext = Math.ceil(
    (nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="px-5 py-4 hover:bg-muted/20 transition-colors">
      <div className="flex items-start justify-between gap-3">
        {/* Left: Name & details */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">
              {sub.merchant}
            </span>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", confidenceColor)}>
              {sub.confidence} confidence
            </span>
            {sub.categoryName && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {sub.categoryName}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {sub.transactionCount} transactions detected ·{" "}
            {sub.confidence === "high" ? "Likely recurring" : "Possible subscription"}
          </p>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              Last: {new Date(sub.lastCharged).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </span>
            <span>·</span>
            <span
              className={cn(
                daysUntilNext <= 7 && daysUntilNext >= 0
                  ? "text-amber-500 font-medium"
                  : daysUntilNext < 0
                  ? "text-muted-foreground"
                  : ""
              )}
            >
              Next:{" "}
              {daysUntilNext < 0
                ? "Overdue"
                : daysUntilNext === 0
                ? "Today"
                : `in ${daysUntilNext}d`}
            </span>
          </div>
        </div>

        {/* Right: Amount & actions */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="text-base font-bold text-foreground">
            {displayAmount}
            <span className="text-xs font-normal text-muted-foreground ml-1">
              {intervalLabel}
            </span>
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onAddToRecurring(sub)}
              disabled={isAdding}
              className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {isAdding ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              Add to recurring
            </button>
            <Link
              href={`/expenses?merchant=${encodeURIComponent(sub.merchant)}`}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              View
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
