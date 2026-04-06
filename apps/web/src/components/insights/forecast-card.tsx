"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/cn";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Info,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ForecastPeriod = 30 | 60 | 90;

export interface ForecastData {
  period: ForecastPeriod;
  projectedIncome: number;
  projectedExpenses: number;
  projectedSavings: number;
  confidence: number; // 0-100
  keyDrivers: Array<{ label: string; amount: number }>;
  basedOnMonths: number;
  lastUpdated: Date;
}

interface ForecastCardProps {
  forecasts: Partial<Record<ForecastPeriod, ForecastData>>;
  isLoading?: boolean;
  onRefresh?: () => void;
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

function ConfidenceBadge({ value }: { value: number }) {
  const color =
    value >= 80
      ? "bg-success/10 text-success"
      : value >= 60
      ? "bg-warning/10 text-warning"
      : "bg-destructive/10 text-destructive";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        color
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          value >= 80
            ? "bg-success"
            : value >= 60
            ? "bg-warning"
            : "bg-destructive"
        )}
      />
      {value}% confidence
    </span>
  );
}

// Simple inline bar chart
function MiniBarChart({
  income,
  expenses,
}: {
  income: number;
  expenses: number;
}) {
  const max = Math.max(income, expenses) || 1;
  const incomeW = (income / max) * 100;
  const expenseW = (expenses / max) * 100;

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Projected Income</span>
          <span className="font-medium text-success">
            {formatCurrency(income)}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-success transition-all duration-700"
            style={{ width: `${incomeW}%` }}
          />
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Projected Expenses</span>
          <span className="font-medium text-destructive">
            {formatCurrency(expenses)}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-destructive transition-all duration-700"
            style={{ width: `${expenseW}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ForecastCard
// ---------------------------------------------------------------------------

export function ForecastCard({
  forecasts,
  isLoading = false,
  onRefresh,
  className,
}: ForecastCardProps) {
  const [period, setPeriod] = useState<ForecastPeriod>(30);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const data = forecasts[period];

  const handleRefresh = useCallback(async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 800);
    }
  }, [onRefresh, isRefreshing]);

  const savingsPositive = (data?.projectedSavings ?? 0) >= 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">
            Cash Flow Forecast
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
              aria-label="Refresh forecast"
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4",
                  (isRefreshing || isLoading) && "animate-spin"
                )}
              />
            </button>
          )}
        </div>
      </div>

      {/* Period selector */}
      <div className="border-b border-border px-5 py-3">
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1 w-fit">
          {([30, 60, 90] as ForecastPeriod[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                period === p
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p} days
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-5">
        {isLoading || !data ? (
          <ForecastSkeleton />
        ) : (
          <>
            {/* Confidence */}
            <div className="flex items-center justify-between">
              <ConfidenceBadge value={data.confidence} />
              <span className="text-xs text-muted-foreground">
                Based on last {data.basedOnMonths} months
              </span>
            </div>

            {/* Bar chart */}
            <MiniBarChart
              income={data.projectedIncome}
              expenses={data.projectedExpenses}
            />

            {/* Net savings highlight */}
            <div
              className={cn(
                "flex items-center justify-between rounded-xl p-4 border",
                savingsPositive
                  ? "bg-success/5 border-success/20"
                  : "bg-destructive/5 border-destructive/20"
              )}
            >
              <div>
                <p className="text-xs text-muted-foreground">
                  Projected Savings ({period} days)
                </p>
                <p
                  className={cn(
                    "text-xl font-bold mt-0.5",
                    savingsPositive ? "text-success" : "text-destructive"
                  )}
                >
                  {formatCurrency(Math.abs(data.projectedSavings))}
                </p>
              </div>
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  savingsPositive ? "bg-success/10" : "bg-destructive/10"
                )}
              >
                {savingsPositive ? (
                  <ArrowUpRight className="h-5 w-5 text-success" />
                ) : (
                  <ArrowDownRight className="h-5 w-5 text-destructive" />
                )}
              </div>
            </div>

            {/* Key drivers */}
            {data.keyDrivers.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Key Assumptions
                </p>
                <div className="space-y-2">
                  {data.keyDrivers.map((driver, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Minus className="h-3 w-3 shrink-0" />
                        <span>{driver.label}</span>
                      </div>
                      <span className="font-medium text-foreground">
                        {formatCurrency(driver.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Last updated */}
            <p className="text-xs text-muted-foreground/60 border-t border-border pt-3">
              Last updated:{" "}
              {data.lastUpdated.toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ForecastSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-32 rounded-full bg-muted animate-pulse" />
      <div className="space-y-2">
        <div className="h-8 rounded bg-muted animate-pulse" />
        <div className="h-8 rounded bg-muted animate-pulse" />
      </div>
      <div className="h-20 rounded-xl bg-muted animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        <div className="h-4 rounded bg-muted animate-pulse" />
        <div className="h-4 rounded bg-muted animate-pulse" />
        <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}
