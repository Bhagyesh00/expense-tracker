"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Target,
  Plus,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ZeroBasedCategory {
  id: string;
  name: string;
  icon?: string | null;
  allocatedAmount: number;
  spentAmount: number;
}

interface ZeroBasedBudgetProps {
  monthlyIncome: number;
  categories: ZeroBasedCategory[];
  onAddBudget?: (categoryId: string, amount: number) => Promise<void>;
  onUpdateBudget?: (categoryId: string, amount: number) => Promise<void>;
  currency?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number, currency = "₹"): string {
  if (amount < 0) return `-${currency}${Math.abs(amount).toLocaleString("en-IN")}`;
  return `${currency}${amount.toLocaleString("en-IN")}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ZeroBasedBudget({
  monthlyIncome,
  categories,
  onAddBudget,
  onUpdateBudget,
  currency = "₹",
}: ZeroBasedBudgetProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const totalAllocated = useMemo(
    () => categories.reduce((sum, c) => sum + c.allocatedAmount, 0),
    [categories]
  );

  const remainingToAssign = monthlyIncome - totalAllocated;
  const allocationPercent =
    monthlyIncome > 0 ? (totalAllocated / monthlyIncome) * 100 : 0;
  const isFullyAssigned = Math.abs(remainingToAssign) < 1;
  const isOverAssigned = remainingToAssign < -1;

  const handleEditSave = async (categoryId: string) => {
    const amount = parseFloat(editValue);
    if (isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdateBudget?.(categoryId, amount);
      toast.success("Budget updated");
      setEditingId(null);
      setEditValue("");
    } catch {
      toast.error("Failed to update budget");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuickAdd = async (categoryId: string) => {
    if (remainingToAssign <= 0) {
      toast.error("No remaining income to assign");
      return;
    }
    try {
      await onAddBudget?.(categoryId, remainingToAssign);
      toast.success("Remaining income assigned");
    } catch {
      toast.error("Failed to assign budget");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header: Income Display */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Monthly Income
            </p>
            <p className="mt-1 text-3xl font-bold text-foreground">
              {fmt(monthlyIncome, currency)}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <TrendingDown className="h-5 w-5" />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground">
              {fmt(totalAllocated, currency)} assigned
            </span>
            <span
              className={cn(
                isOverAssigned
                  ? "text-red-500"
                  : isFullyAssigned
                  ? "text-emerald-600"
                  : "text-amber-500"
              )}
            >
              {isOverAssigned
                ? "Over by "
                : isFullyAssigned
                ? "Fully assigned"
                : "Remaining: "}
              {!isFullyAssigned &&
                fmt(Math.abs(remainingToAssign), currency)}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isOverAssigned
                  ? "bg-red-500"
                  : isFullyAssigned
                  ? "bg-emerald-500"
                  : "bg-amber-400"
              )}
              style={{
                width: `${Math.min(100, allocationPercent)}%`,
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">
            {fmt(totalAllocated, currency)} of {fmt(monthlyIncome, currency)}{" "}
            assigned ({allocationPercent.toFixed(0)}%)
          </p>
        </div>
      </div>

      {/* Status Banner */}
      {isOverAssigned && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800/50 dark:bg-red-950/20">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              Over-assigned!
            </p>
            <p className="text-xs text-red-600 dark:text-red-300">
              You&apos;ve assigned {fmt(Math.abs(remainingToAssign), currency)}{" "}
              more than your income. Reduce some budget amounts.
            </p>
          </div>
        </div>
      )}

      {isFullyAssigned && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800/50 dark:bg-emerald-950/20">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            Every rupee has a job! Your zero-based budget is balanced.
          </p>
        </div>
      )}

      {!isFullyAssigned && !isOverAssigned && remainingToAssign > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-950/20">
          <Target className="h-5 w-5 shrink-0 text-amber-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              {fmt(remainingToAssign, currency)} unassigned
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-300">
              Assign all income to reach zero. Add more budget categories or
              increase existing ones.
            </p>
          </div>
        </div>
      )}

      {/* Category List */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">
            Budget Categories
          </h3>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Budget
          </button>
        </div>

        <div className="divide-y divide-border">
          {categories.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Target className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                No budget categories yet. Add your first budget to get started.
              </p>
            </div>
          ) : (
            categories.map((cat) => {
              const isEditing = editingId === cat.id;
              const spentPercent =
                cat.allocatedAmount > 0
                  ? (cat.spentAmount / cat.allocatedAmount) * 100
                  : 0;
              const isOverBudget = cat.spentAmount > cat.allocatedAmount;

              return (
                <div
                  key={cat.id}
                  className="px-5 py-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {cat.icon && (
                        <span className="text-lg shrink-0">{cat.icon}</span>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {cat.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Spent: {fmt(cat.spentAmount, currency)}
                          {isOverBudget && (
                            <span className="ml-1 text-red-500 font-medium">
                              (over by{" "}
                              {fmt(
                                cat.spentAmount - cat.allocatedAmount,
                                currency
                              )}
                              )
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            {currency}
                          </span>
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleEditSave(cat.id);
                              if (e.key === "Escape") {
                                setEditingId(null);
                                setEditValue("");
                              }
                            }}
                            className="h-7 w-24 rounded border border-primary bg-background px-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                            autoFocus
                          />
                          <button
                            onClick={() => handleEditSave(cat.id)}
                            disabled={isUpdating}
                            className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
                          >
                            {isUpdating ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Save"
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditValue("");
                            }}
                            className="rounded p-1 text-muted-foreground hover:bg-accent"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(cat.id);
                              setEditValue(String(cat.allocatedAmount));
                            }}
                            className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                          >
                            {fmt(cat.allocatedAmount, currency)}
                          </button>
                          {cat.allocatedAmount === 0 &&
                            remainingToAssign > 0 && (
                              <button
                                onClick={() => handleQuickAdd(cat.id)}
                                className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                              >
                                Assign all
                              </button>
                            )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Spend Progress Bar */}
                  <div className="mt-2.5 space-y-1">
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          isOverBudget
                            ? "bg-red-500"
                            : spentPercent >= 80
                            ? "bg-amber-400"
                            : "bg-primary"
                        )}
                        style={{ width: `${Math.min(100, spentPercent)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{spentPercent.toFixed(0)}% spent</span>
                      <span>
                        {fmt(
                          Math.max(
                            0,
                            cat.allocatedAmount - cat.spentAmount
                          ),
                          currency
                        )}{" "}
                        left
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Summary Footer */}
        {categories.length > 0 && (
          <div className="border-t border-border bg-muted/30 px-5 py-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {categories.length} categories
            </span>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-muted-foreground">
                Allocated:{" "}
                <span className="font-semibold text-foreground">
                  {fmt(totalAllocated, currency)}
                </span>
              </span>
              <span
                className={cn(
                  "font-semibold",
                  isOverAssigned
                    ? "text-red-500"
                    : isFullyAssigned
                    ? "text-emerald-600"
                    : "text-amber-500"
                )}
              >
                {isOverAssigned ? "Over: " : "Remaining: "}
                {fmt(Math.abs(remainingToAssign), currency)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
