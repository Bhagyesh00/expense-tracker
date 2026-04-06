"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { useBudgetsList, useDeleteBudget, useSavingsGoalsList, useUpdateGoal } from "@/hooks/use-budgets";
import { useFormatCurrency } from "@/hooks/use-currency";
import { BudgetCard } from "@/components/budgets/budget-card";
import { BudgetDetail } from "@/components/budgets/budget-detail";
import { SavingsGoalCard } from "@/components/budgets/savings-goal-card";
import { AddFundsModal } from "@/components/budgets/add-funds-modal";
import type { BudgetRow } from "@expenseflow/api";
import type { SavingsGoalRow } from "@/components/budgets/savings-goal-card";
import {
  Plus,
  Wallet,
  TrendingUp,
  PiggyBank,
  Target,
  Percent,
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";

type TabValue = "budgets" | "goals";

export default function BudgetsPage() {
  const { formatCurrency } = useFormatCurrency();
  const { data: budgets, isLoading: budgetsLoading } = useBudgetsList();
  const { data: goals, isLoading: goalsLoading } = useSavingsGoalsList();
  const { deleteBudget } = useDeleteBudget();
  const { updateGoal } = useUpdateGoal();

  const [activeTab, setActiveTab] = useState<TabValue>("budgets");
  const [selectedBudget, setSelectedBudget] = useState<BudgetRow | null>(null);
  const [addFundsGoal, setAddFundsGoal] = useState<SavingsGoalRow | null>(null);

  // ---------- Budget stats ----------
  const budgetStats = useMemo(() => {
    if (!budgets || budgets.length === 0) {
      return { totalBudget: 0, totalSpent: 0, remaining: 0, percentUsed: 0 };
    }
    let totalBudget = 0;
    let totalSpent = 0;
    budgets.forEach((b) => {
      totalBudget += b.amount;
      totalSpent += b.spent ?? 0;
    });
    const remaining = totalBudget - totalSpent;
    const percentUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    return { totalBudget, totalSpent, remaining, percentUsed };
  }, [budgets]);

  // Sort budgets: over-budget first, near limit second, then ok
  const sortedBudgets = useMemo(() => {
    if (!budgets) return [];
    return [...budgets].sort((a, b) => {
      const pA = a.amount > 0 ? ((a.spent ?? 0) / a.amount) * 100 : 0;
      const pB = b.amount > 0 ? ((b.spent ?? 0) / b.amount) * 100 : 0;
      // Over budget first
      if (pA >= 100 && pB < 100) return -1;
      if (pB >= 100 && pA < 100) return 1;
      // Near limit second
      if (pA >= 80 && pB < 80) return -1;
      if (pB >= 80 && pA < 80) return 1;
      // Higher percent first within group
      return pB - pA;
    });
  }, [budgets]);

  // ---------- Handlers ----------
  const handleDeleteBudget = useCallback(
    async (id: string) => {
      if (!confirm("Are you sure you want to delete this budget?")) return;
      try {
        await deleteBudget(id);
      } catch {
        // Toast handled
      }
    },
    [deleteBudget],
  );

  const handleEditBudget = useCallback((budget: BudgetRow) => {
    // For simplicity we navigate; a modal-based edit could also work
    window.location.href = `/dashboard/budgets/new?type=budget&edit=${budget.id}`;
  }, []);

  const handleDeleteGoal = useCallback(
    async (id: string) => {
      if (!confirm("Are you sure you want to delete this goal?")) return;
      try {
        // Soft delete by marking completed
        await updateGoal(id, { is_completed: true });
      } catch {
        // Toast handled
      }
    },
    [updateGoal],
  );

  const handleEditGoal = useCallback((_goal: SavingsGoalRow) => {
    window.location.href = `/dashboard/budgets/new?type=goal&edit=${_goal.id}`;
  }, []);

  const percentColor = budgetStats.percentUsed >= 100
    ? "text-red-600"
    : budgetStats.percentUsed >= 80
      ? "text-amber-600"
      : "text-emerald-600";

  // ---------- Skeleton ----------
  const CardSkeleton = () => (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="h-2 w-16 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <div className="h-16 w-16 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-2 w-full animate-pulse rounded bg-muted" />
          <div className="h-2 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-2 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="mt-3 h-1.5 w-full animate-pulse rounded bg-muted" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Budgets & Goals
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Set spending limits and track savings goals
          </p>
        </div>
        <Link
          href={`/dashboard/budgets/new?type=${activeTab === "goals" ? "goal" : "budget"}`}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {activeTab === "goals" ? "Create Goal" : "Create Budget"}
        </Link>
      </div>

      {/* Tab/Segmented control */}
      <div className="flex rounded-lg border border-input">
        {(
          [
            { value: "budgets" as TabValue, label: "Budgets", icon: Wallet },
            { value: "goals" as TabValue, label: "Savings Goals", icon: Target },
          ] as const
        ).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveTab(value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 px-4 py-2 text-sm font-medium capitalize transition-colors first:rounded-l-lg last:rounded-r-lg",
              activeTab === value
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* =================== BUDGETS TAB =================== */}
      {activeTab === "budgets" && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Budget</p>
                <p className="text-lg font-bold text-foreground">
                  {budgetsLoading ? (
                    <span className="inline-block h-5 w-16 animate-pulse rounded bg-muted" />
                  ) : (
                    formatCurrency(budgetStats.totalBudget, "INR")
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <TrendingUp className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Spent</p>
                <p className="text-lg font-bold text-foreground">
                  {budgetsLoading ? (
                    <span className="inline-block h-5 w-16 animate-pulse rounded bg-muted" />
                  ) : (
                    formatCurrency(budgetStats.totalSpent, "INR")
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  budgetStats.remaining >= 0
                    ? "bg-emerald-100 dark:bg-emerald-900/30"
                    : "bg-red-100 dark:bg-red-900/30",
                )}
              >
                <PiggyBank
                  className={cn(
                    "h-5 w-5",
                    budgetStats.remaining >= 0
                      ? "text-emerald-600"
                      : "text-red-600",
                  )}
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Remaining</p>
                <p
                  className={cn(
                    "text-lg font-bold",
                    budgetStats.remaining >= 0
                      ? "text-emerald-600"
                      : "text-red-600",
                  )}
                >
                  {budgetsLoading ? (
                    <span className="inline-block h-5 w-16 animate-pulse rounded bg-muted" />
                  ) : (
                    <>
                      {budgetStats.remaining < 0 ? "-" : ""}
                      {formatCurrency(
                        Math.abs(budgetStats.remaining),
                        "INR",
                      )}
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Percent className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">% Used</p>
                <p className={cn("text-lg font-bold", percentColor)}>
                  {budgetsLoading ? (
                    <span className="inline-block h-5 w-10 animate-pulse rounded bg-muted" />
                  ) : (
                    `${Math.round(budgetStats.percentUsed)}%`
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Budget cards grid */}
          {budgetsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : sortedBudgets.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Wallet className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                Set your first budget to track spending
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Create budgets for different categories to control your spending
                and get alerts when you are near the limit.
              </p>
              <Link
                href="/dashboard/budgets/new?type=budget"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Create Budget
              </Link>
            </motion.div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedBudgets.map((budget) => (
                <BudgetCard
                  key={budget.id}
                  budget={budget}
                  onEdit={handleEditBudget}
                  onDelete={handleDeleteBudget}
                  onClick={setSelectedBudget}
                />
              ))}
            </div>
          )}

          {/* Unbudgeted spending info */}
          {!budgetsLoading && sortedBudgets.length > 0 && (
            <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-foreground">
                  Unbudgeted Spending
                </h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Categories without a budget are not tracked here. Create budgets
                for all your expense categories to get a complete spending picture.
              </p>
            </div>
          )}
        </div>
      )}

      {/* =================== SAVINGS GOALS TAB =================== */}
      {activeTab === "goals" && (
        <div className="space-y-6">
          {goalsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                      <div className="h-2 w-16 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="h-2 w-full animate-pulse rounded bg-muted" />
                    <div className="h-8 w-full animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : !goals || goals.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <Target className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                Start saving towards your goals
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Create savings goals for things like vacations, emergency funds,
                or big purchases and track your progress.
              </p>
              <Link
                href="/dashboard/budgets/new?type=goal"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Create Goal
              </Link>
            </motion.div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(goals as SavingsGoalRow[]).map((goal) => (
                <SavingsGoalCard
                  key={goal.id}
                  goal={goal}
                  onAddFunds={setAddFundsGoal}
                  onEdit={handleEditGoal}
                  onDelete={handleDeleteGoal}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Budget detail modal */}
      {selectedBudget && (
        <BudgetDetail
          budget={selectedBudget}
          open={!!selectedBudget}
          onClose={() => setSelectedBudget(null)}
          onEdit={handleEditBudget}
        />
      )}

      {/* Add funds modal */}
      {addFundsGoal && (
        <AddFundsModal
          goal={addFundsGoal}
          open={!!addFundsGoal}
          onClose={() => setAddFundsGoal(null)}
        />
      )}
    </div>
  );
}
