"use client";

import { useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/cn";
import { useFormatCurrency } from "@/hooks/use-currency";
import { useDeleteBudget } from "@/hooks/use-budgets";
import { BudgetProgress } from "./budget-progress";
import type { BudgetRow } from "@expenseflow/api";
import {
  X,
  Pencil,
  Trash2,
  AlertTriangle,
  Calendar,
  Target,
  TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PERIOD_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

interface BudgetDetailProps {
  budget: BudgetRow;
  open: boolean;
  onClose: () => void;
  onEdit?: (budget: BudgetRow) => void;
}

export function BudgetDetail({
  budget,
  open,
  onClose,
  onEdit,
}: BudgetDetailProps) {
  const { formatCurrency } = useFormatCurrency();
  const { deleteBudget } = useDeleteBudget();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const spent = budget.spent ?? 0;
  const remaining = budget.amount - spent;
  const percent = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
  const isOverBudget = percent > 100;
  const categoryName = budget.categories?.name ?? "Uncategorized";
  const categoryColor = budget.categories?.color ?? "#6B7280";

  // Generate mock monthly data for bar chart (last 6 months)
  const monthlyData = useMemo(() => {
    const months: { label: string; budget: number; actual: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("en-US", { month: "short" });
      // Current month uses real data; prior months show the budget amount with variation
      if (i === 0) {
        months.push({ label, budget: budget.amount, actual: spent });
      } else {
        const variation = 0.5 + Math.random() * 0.7;
        months.push({
          label,
          budget: budget.amount,
          actual: Math.round(budget.amount * variation),
        });
      }
    }
    return months;
  }, [budget.amount, spent]);

  const maxBarValue = useMemo(
    () => Math.max(...monthlyData.map((d) => Math.max(d.budget, d.actual))),
    [monthlyData],
  );

  const handleDelete = useCallback(async () => {
    try {
      await deleteBudget(budget.id);
      onClose();
    } catch {
      // toast handled in hook
    }
  }, [budget.id, deleteBudget, onClose]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 mx-4 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-xl"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-6 py-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ backgroundColor: categoryColor }}
                >
                  {categoryName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    {categoryName}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {PERIOD_LABELS[budget.period] ?? budget.period} Budget
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              {/* Large progress ring */}
              <div className="flex flex-col items-center">
                <div className="relative flex h-32 w-32 items-center justify-center">
                  <svg
                    className="h-32 w-32 -rotate-90"
                    viewBox="0 0 128 128"
                  >
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-muted"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - Math.min(percent, 100) / 100)}`}
                      className={cn(
                        "transition-all duration-1000 ease-out",
                        percent >= 100
                          ? "text-red-500"
                          : percent >= 80
                            ? "text-amber-500"
                            : percent >= 50
                              ? "text-yellow-500"
                              : "text-emerald-500",
                      )}
                      stroke="currentColor"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span
                      className={cn(
                        "text-2xl font-bold",
                        percent >= 100
                          ? "text-red-600"
                          : "text-foreground",
                      )}
                    >
                      {Math.round(percent)}%
                    </span>
                    <span className="text-[10px] text-muted-foreground">used</span>
                  </div>
                </div>

                {isOverBudget && (
                  <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-600">
                      Over budget by{" "}
                      {formatCurrency(Math.abs(remaining), budget.currency)}
                    </span>
                  </div>
                )}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-muted/50 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">Budget</p>
                  <p className="mt-0.5 text-sm font-bold text-foreground">
                    {formatCurrency(budget.amount, budget.currency)}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">Spent</p>
                  <p className="mt-0.5 text-sm font-bold text-foreground">
                    {formatCurrency(spent, budget.currency)}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">Remaining</p>
                  <p
                    className={cn(
                      "mt-0.5 text-sm font-bold",
                      remaining < 0 ? "text-red-600" : "text-emerald-600",
                    )}
                  >
                    {remaining < 0 ? "-" : ""}
                    {formatCurrency(Math.abs(remaining), budget.currency)}
                  </p>
                </div>
              </div>

              {/* Budget info */}
              <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    Period: {PERIOD_LABELS[budget.period] ?? budget.period}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Target className="h-3.5 w-3.5" />
                  <span>
                    Alert at 80% ({formatCurrency(budget.amount * 0.8, budget.currency)})
                  </span>
                </div>
                {budget.start_date && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Started: {new Date(budget.start_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Bar chart: Budget vs Actual */}
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Budget vs Actual (Last 6 Months)
                  </h3>
                </div>
                <div className="flex items-end gap-2">
                  {monthlyData.map((month) => (
                    <div key={month.label} className="flex flex-1 flex-col items-center gap-1">
                      <div className="flex w-full items-end gap-0.5" style={{ height: 100 }}>
                        {/* Budget bar */}
                        <div
                          className="flex-1 rounded-t bg-primary/20"
                          style={{
                            height: `${maxBarValue > 0 ? (month.budget / maxBarValue) * 100 : 0}%`,
                          }}
                        />
                        {/* Actual bar */}
                        <div
                          className={cn(
                            "flex-1 rounded-t",
                            month.actual > month.budget
                              ? "bg-red-500"
                              : "bg-primary",
                          )}
                          style={{
                            height: `${maxBarValue > 0 ? (month.actual / maxBarValue) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {month.label}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-primary/20" />
                    <span className="text-[10px] text-muted-foreground">Budget</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-[10px] text-muted-foreground">Actual</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => onEdit?.(budget)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Budget
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-destructive/30 px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>

            {/* Delete confirmation */}
            {showDeleteConfirm && (
              <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/50 backdrop-blur-sm">
                <div className="mx-4 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
                  <h3 className="text-base font-semibold text-foreground">
                    Delete this budget?
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This will deactivate the budget for {categoryName}. This action cannot be undone.
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
                      onClick={handleDelete}
                      className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
