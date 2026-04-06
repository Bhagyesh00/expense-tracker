"use client";

import { useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/cn";
import { useFormatCurrency } from "@/hooks/use-currency";
import { BudgetProgress } from "./budget-progress";
import type { BudgetRow } from "@expenseflow/api";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";

// Map icon names from categories to a simple emoji/letter fallback
// The actual lucide icon dynamic loading is complex; we use a colored circle with initial
function CategoryIcon({ icon, color, name }: { icon?: string | null; color?: string | null; name: string }) {
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
      style={{ backgroundColor: color ?? "#6B7280" }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

const PERIOD_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

interface BudgetCardProps {
  budget: BudgetRow;
  onEdit?: (budget: BudgetRow) => void;
  onDelete?: (id: string) => void;
  onClick?: (budget: BudgetRow) => void;
  className?: string;
}

export function BudgetCard({
  budget,
  onEdit,
  onDelete,
  onClick,
  className,
}: BudgetCardProps) {
  const { formatCurrency } = useFormatCurrency();
  const [showMenu, setShowMenu] = useState(false);

  const spent = budget.spent ?? 0;
  const remaining = budget.amount - spent;
  const percent = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
  const isOverBudget = percent > 100;
  const isNearLimit = percent >= 80 && percent <= 100;
  const categoryName = budget.categories?.name ?? "Uncategorized";
  const categoryColor = budget.categories?.color ?? null;
  const categoryIcon = budget.categories?.icon ?? null;

  const statusColor = useMemo(() => {
    if (isOverBudget) return "border-red-500/30 bg-red-500/5";
    if (isNearLimit) return "border-amber-500/30 bg-amber-500/5";
    return "border-border bg-card";
  }, [isOverBudget, isNearLimit]);

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowMenu(false);
      onEdit?.(budget);
    },
    [budget, onEdit],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowMenu(false);
      onDelete?.(budget.id);
    },
    [budget.id, onDelete],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "group relative cursor-pointer rounded-xl border p-4 transition-shadow hover:shadow-md",
        statusColor,
        className,
      )}
      onClick={() => onClick?.(budget)}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <CategoryIcon icon={categoryIcon} color={categoryColor} name={categoryName} />
          <div>
            <h3 className="text-sm font-semibold text-foreground">{categoryName}</h3>
            <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {PERIOD_LABELS[budget.period] ?? budget.period}
            </span>
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="rounded-lg p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }}
              />
              <div className="absolute right-0 top-8 z-50 w-36 rounded-lg border border-border bg-card py-1 shadow-lg">
                <button
                  type="button"
                  onClick={handleEdit}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-accent"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Budget
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-accent"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Budget
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Ring + Stats */}
      <div className="mt-4 flex items-center gap-4">
        {/* SVG circular progress */}
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              className="text-muted"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - Math.min(percent, 100) / 100)}`}
              className={cn(
                "transition-all duration-700 ease-out",
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
          <span
            className={cn(
              "absolute text-xs font-bold",
              percent >= 100
                ? "text-red-600"
                : percent >= 80
                  ? "text-amber-600"
                  : "text-foreground",
            )}
          >
            {Math.round(percent)}%
          </span>
        </div>

        {/* Amounts */}
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Budget</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(budget.amount, budget.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Spent</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(spent, budget.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Remaining</span>
            <span
              className={cn(
                "font-semibold",
                remaining < 0 ? "text-red-600" : "text-emerald-600",
              )}
            >
              {remaining < 0 ? "-" : ""}
              {formatCurrency(Math.abs(remaining), budget.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <BudgetProgress
          spent={spent}
          budget={budget.amount}
          showLabels={false}
          height="sm"
        />
      </div>

      {/* Over budget warning */}
      {isOverBudget && (
        <div className="mt-2 flex items-center gap-1.5 rounded-md bg-red-500/10 px-2 py-1">
          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
          <span className="text-[11px] font-medium text-red-600">
            Over budget by {formatCurrency(Math.abs(remaining), budget.currency)}
          </span>
        </div>
      )}
    </motion.div>
  );
}
