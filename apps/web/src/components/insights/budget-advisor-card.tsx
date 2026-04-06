"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/cn";
import {
  PiggyBank,
  Sparkles,
  Check,
  Edit2,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BudgetRecommendation {
  categoryId: string;
  categoryName: string;
  categoryIcon?: string;
  categoryColor?: string;
  currentAvgSpend: number;
  recommendedBudget: number;
  currentBudget?: number;
  changePercent?: number;
}

interface BudgetAdvisorCardProps {
  recommendations: BudgetRecommendation[];
  isLoading?: boolean;
  lastUpdated?: Date;
  onApplyAll?: (recommendations: BudgetRecommendation[]) => Promise<void>;
  onApplyOne?: (recommendation: BudgetRecommendation, amount: number) => Promise<void>;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function ChangeIndicator({ percent }: { percent: number | undefined }) {
  if (percent === undefined) return null;
  const positive = percent >= 0;
  return (
    <span
      className={cn(
        "flex items-center gap-0.5 text-xs font-medium",
        positive ? "text-success" : "text-destructive"
      )}
    >
      {positive ? (
        <ChevronUp className="h-3 w-3" />
      ) : (
        <ChevronDown className="h-3 w-3" />
      )}
      {Math.abs(percent).toFixed(0)}%
    </span>
  );
}

// ---------------------------------------------------------------------------
// Single row with inline edit
// ---------------------------------------------------------------------------

interface RowProps {
  rec: BudgetRecommendation;
  onApply?: (amount: number) => Promise<void>;
}

function BudgetRecommendationRow({ rec, onApply }: RowProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(rec.recommendedBudget.toString());
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    const amount = parseFloat(value);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      await onApply?.(amount);
      toast.success(`Budget for ${rec.categoryName} updated`);
      setEditing(false);
    } catch {
      toast.error("Failed to apply recommendation");
    } finally {
      setSaving(false);
    }
  }, [value, onApply, rec.categoryName]);

  return (
    <tr className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
      {/* Category */}
      <td className="py-3 pl-0 pr-2">
        <div className="flex items-center gap-2">
          {rec.categoryIcon && (
            <span className="text-base">{rec.categoryIcon}</span>
          )}
          <span className="text-sm font-medium text-foreground">
            {rec.categoryName}
          </span>
        </div>
      </td>

      {/* Avg spend */}
      <td className="py-3 px-2 text-right">
        <span className="text-sm text-muted-foreground">
          {formatCurrency(rec.currentAvgSpend)}
        </span>
      </td>

      {/* Recommended */}
      <td className="py-3 px-2 text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-1">
            <span className="text-xs text-muted-foreground">₹</span>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-20 rounded border border-input bg-background px-1.5 py-0.5 text-right text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setEditing(false);
              }}
              autoFocus
            />
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-sm font-semibold text-foreground">
              {formatCurrency(rec.recommendedBudget)}
            </span>
            <ChangeIndicator percent={rec.changePercent} />
          </div>
        )}
      </td>

      {/* vs current */}
      <td className="py-3 pl-2 pr-0 text-right">
        {rec.currentBudget !== undefined ? (
          <span className="text-xs text-muted-foreground">
            {formatCurrency(rec.currentBudget)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground italic">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="py-3 pl-2 pr-0 text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Customize"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            {onApply && (
              <button
                type="button"
                onClick={() => onApply(rec.recommendedBudget)}
                className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              >
                <Check className="h-3 w-3" />
                Apply
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// BudgetAdvisorCard
// ---------------------------------------------------------------------------

export function BudgetAdvisorCard({
  recommendations,
  isLoading = false,
  lastUpdated,
  onApplyAll,
  onApplyOne,
  className,
}: BudgetAdvisorCardProps) {
  const [applyingAll, setApplyingAll] = useState(false);

  const handleApplyAll = useCallback(async () => {
    if (!onApplyAll) return;
    setApplyingAll(true);
    try {
      await onApplyAll(recommendations);
      toast.success("All budget recommendations applied");
    } catch {
      toast.error("Failed to apply recommendations");
    } finally {
      setApplyingAll(false);
    }
  }, [onApplyAll, recommendations]);

  return (
    <div
      className={cn("rounded-xl border border-border bg-card shadow-sm", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Budget Advisor
            </h3>
            <p className="text-xs text-muted-foreground">
              AI-powered budget recommendations
            </p>
          </div>
        </div>
        {onApplyAll && recommendations.length > 0 && (
          <button
            type="button"
            onClick={handleApplyAll}
            disabled={applyingAll || isLoading}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {applyingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Apply all
          </button>
        )}
      </div>

      {/* Intro text */}
      <div className="px-5 pt-4 pb-2">
        <p className="text-sm text-muted-foreground">
          Based on your spending patterns, here are recommended monthly budgets:
        </p>
      </div>

      {/* Table */}
      <div className="px-5 pb-4">
        {isLoading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-4 w-1/4 rounded bg-muted animate-pulse" />
                <div className="h-4 w-1/5 rounded bg-muted animate-pulse ml-auto" />
                <div className="h-4 w-1/5 rounded bg-muted animate-pulse" />
                <div className="h-4 w-1/6 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <PiggyBank className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Not enough data yet to generate recommendations
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pl-0 pr-2 text-left text-xs font-medium text-muted-foreground">
                    Category
                  </th>
                  <th className="py-2 px-2 text-right text-xs font-medium text-muted-foreground">
                    Avg Spend
                  </th>
                  <th className="py-2 px-2 text-right text-xs font-medium text-muted-foreground">
                    Recommended
                  </th>
                  <th className="py-2 pl-2 pr-0 text-right text-xs font-medium text-muted-foreground">
                    Current Budget
                  </th>
                  <th className="py-2 pl-2 pr-0 text-right text-xs font-medium text-muted-foreground">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {recommendations.map((rec) => (
                  <BudgetRecommendationRow
                    key={rec.categoryId}
                    rec={rec}
                    onApply={
                      onApplyOne
                        ? (amount) => onApplyOne(rec, amount)
                        : undefined
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      {lastUpdated && (
        <div className="border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground/60">
            Last updated:{" "}
            {lastUpdated.toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      )}
    </div>
  );
}
