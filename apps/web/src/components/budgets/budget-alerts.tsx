"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { useFormatCurrency } from "@/hooks/use-currency";
import { useBudgetAlerts } from "@/hooks/use-budgets";
import { BudgetProgress } from "./budget-progress";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface BudgetAlertsProps {
  maxItems?: number;
  className?: string;
}

export function BudgetAlerts({ maxItems = 5, className }: BudgetAlertsProps) {
  const { formatCurrency } = useFormatCurrency();
  const { data: alerts, isLoading } = useBudgetAlerts(50);

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
          >
            <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-32 animate-pulse rounded bg-muted" />
              <div className="h-2 w-full animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!alerts || alerts.length === 0) return null;

  const displayAlerts = alerts.slice(0, maxItems);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-foreground">
            Budget Alerts
          </h3>
        </div>
        <Link
          href="/dashboard/budgets"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View All
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-2">
        {displayAlerts.map((budget, i) => {
          const spent = budget.spent ?? 0;
          const percent =
            budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
          const isOver = percent >= 100;
          const categoryName = budget.categories?.name ?? "Uncategorized";
          const categoryColor = budget.categories?.color ?? "#6B7280";

          return (
            <motion.div
              key={budget.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-accent/50",
                isOver
                  ? "border-red-500/20 bg-red-500/5"
                  : "border-amber-500/20 bg-amber-500/5",
              )}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: categoryColor }}
              >
                {categoryName.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">
                  <span className="font-semibold">{categoryName}</span>
                  {isOver ? (
                    <span className="text-red-600">
                      {" "}
                      is over budget ({Math.round(percent)}%)
                    </span>
                  ) : (
                    <span className="text-amber-600">
                      {" "}
                      is at {Math.round(percent)}% of budget
                    </span>
                  )}
                </p>
                <div className="mt-1">
                  <BudgetProgress
                    spent={spent}
                    budget={budget.amount}
                    showLabels={false}
                    height="sm"
                    animated={false}
                  />
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {formatCurrency(spent, budget.currency)} /{" "}
                  {formatCurrency(budget.amount, budget.currency)}
                </p>
              </div>

              <Link
                href="/dashboard/budgets"
                className="shrink-0 text-xs font-medium text-primary hover:underline"
              >
                View
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
