"use client";

import { useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/cn";
import { useFormatCurrency } from "@/hooks/use-currency";
import { BudgetProgress } from "./budget-progress";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Plus,
  CheckCircle2,
  Clock,
  PartyPopper,
} from "lucide-react";
import { motion } from "framer-motion";

export interface SavingsGoalRow {
  id: string;
  workspace_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  target_date: string | null;
  icon: string | null;
  color: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

const GOAL_ICONS: Record<string, string> = {
  home: "🏠",
  car: "🚗",
  vacation: "✈️",
  education: "🎓",
  emergency: "🛡️",
  wedding: "💍",
  gadget: "📱",
  investment: "📈",
  other: "🎯",
};

interface SavingsGoalCardProps {
  goal: SavingsGoalRow;
  onAddFunds?: (goal: SavingsGoalRow) => void;
  onEdit?: (goal: SavingsGoalRow) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

export function SavingsGoalCard({
  goal,
  onAddFunds,
  onEdit,
  onDelete,
  className,
}: SavingsGoalCardProps) {
  const { formatCurrency } = useFormatCurrency();
  const [showMenu, setShowMenu] = useState(false);

  const percent =
    goal.target_amount > 0
      ? (goal.current_amount / goal.target_amount) * 100
      : 0;
  const isCompleted = goal.is_completed || percent >= 100;

  const daysRemaining = useMemo(() => {
    if (!goal.target_date) return null;
    const target = new Date(goal.target_date);
    const now = new Date();
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }, [goal.target_date]);

  const iconEmoji = GOAL_ICONS[goal.icon ?? "other"] ?? "🎯";

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowMenu(false);
      onEdit?.(goal);
    },
    [goal, onEdit],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowMenu(false);
      onDelete?.(goal.id);
    },
    [goal.id, onDelete],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "group relative rounded-xl border p-4 transition-shadow hover:shadow-md",
        isCompleted
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border bg-card",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg text-lg"
            style={{ backgroundColor: (goal.color ?? "#6B7280") + "20" }}
          >
            {iconEmoji}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{goal.name}</h3>
            {daysRemaining !== null && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {isCompleted ? (
                  <span className="text-emerald-600">Completed</span>
                ) : daysRemaining < 0 ? (
                  <span className="text-red-500">{Math.abs(daysRemaining)} days overdue</span>
                ) : (
                  <span>{daysRemaining} days remaining</span>
                )}
              </div>
            )}
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
                  Edit Goal
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-accent"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Goal
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Amounts */}
      <div className="mt-4 space-y-1">
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-bold text-foreground">
            {formatCurrency(goal.current_amount, goal.currency)}
          </span>
          <span className="text-xs text-muted-foreground">
            of {formatCurrency(goal.target_amount, goal.currency)}
          </span>
        </div>

        <BudgetProgress
          spent={goal.current_amount}
          budget={goal.target_amount}
          showLabels={false}
          height="md"
        />

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {Math.min(Math.round(percent), 100)}% saved
          </span>
          <span className="text-muted-foreground">
            {formatCurrency(
              Math.max(goal.target_amount - goal.current_amount, 0),
              goal.currency,
            )}{" "}
            to go
          </span>
        </div>
      </div>

      {/* Completed celebration */}
      {isCompleted ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2">
          <PartyPopper className="h-4 w-4 text-emerald-600" />
          <span className="text-xs font-semibold text-emerald-600">
            Goal achieved! Congratulations!
          </span>
          <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-600" />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onAddFunds?.(goal)}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Funds
        </button>
      )}
    </motion.div>
  );
}
