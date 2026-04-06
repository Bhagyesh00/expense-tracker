"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/cn";
import { useFormatCurrency } from "@/hooks/use-currency";
import {
  useReportSummary,
  useCategoryBreakdown,
  useSpendTrend,
  useBudgetVsActual,
  useIncomeVsExpense,
  useDailyHeatmap,
  useTopCategories,
} from "@/hooks/use-reports";
import type { DateRange, Granularity } from "@/hooks/use-reports";
import { CategoryChart } from "@/components/reports/category-chart";
import { SpendTrendChart } from "@/components/reports/spend-trend-chart";
import { BudgetVsActualChart } from "@/components/reports/budget-vs-actual-chart";
import { IncomeExpenseChart } from "@/components/reports/income-expense-chart";
import { HeatmapCalendar } from "@/components/reports/heatmap-calendar";
import { TopCategoriesChart } from "@/components/reports/top-categories-chart";
import { ExportButtons } from "@/components/reports/export-buttons";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Percent,
  CalendarDays,
  BarChart3,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Date presets
// ---------------------------------------------------------------------------

type DatePreset =
  | "this-month"
  | "last-month"
  | "this-quarter"
  | "this-year"
  | "custom";

function getPresetRange(preset: DatePreset): DateRange {
  const now = new Date();

  switch (preset) {
    case "this-month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
      };
    }
    case "last-month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
      };
    }
    case "this-quarter": {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), qMonth, 1);
      const end = new Date(now.getFullYear(), qMonth + 3, 0);
      return {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
      };
    }
    case "this-year": {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
      };
    }
    default:
      return getPresetRange("this-month");
  }
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const { formatCurrency } = useFormatCurrency();

  // Date range state
  const [preset, setPreset] = useState<DatePreset>("this-month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const dateRange: DateRange = useMemo(() => {
    if (preset === "custom" && customStart && customEnd) {
      return { startDate: customStart, endDate: customEnd };
    }
    return getPresetRange(preset);
  }, [preset, customStart, customEnd]);

  // Granularity for spend trend
  const [granularity, setGranularity] = useState<Granularity>("daily");

  // Heatmap month
  const now = new Date();
  const [heatmapYear, setHeatmapYear] = useState(now.getFullYear());
  const [heatmapMonth, setHeatmapMonth] = useState(now.getMonth() + 1);

  // Data hooks
  const { data: summary, isLoading: summaryLoading } =
    useReportSummary(dateRange);
  const { data: categoryBreakdown, isLoading: categoryLoading } =
    useCategoryBreakdown(dateRange);
  const { data: spendTrend, isLoading: trendLoading } = useSpendTrend(
    dateRange,
    granularity,
  );
  const { data: budgetVsActual, isLoading: budgetLoading } =
    useBudgetVsActual(dateRange);
  const { data: incomeVsExpense, isLoading: incomeExpenseLoading } =
    useIncomeVsExpense(6);
  const { data: heatmapData, isLoading: heatmapLoading } = useDailyHeatmap(
    heatmapYear,
    heatmapMonth,
  );
  const { data: topCategories, isLoading: topCategoriesLoading } =
    useTopCategories(dateRange, 10);

  const handlePresetChange = useCallback((p: DatePreset) => {
    setPreset(p);
  }, []);

  const handleHeatmapMonthChange = useCallback(
    (y: number, m: number) => {
      setHeatmapYear(y);
      setHeatmapMonth(m);
    },
    [],
  );

  // Preset buttons config
  const presets: { value: DatePreset; label: string }[] = [
    { value: "this-month", label: "This Month" },
    { value: "last-month", label: "Last Month" },
    { value: "this-quarter", label: "This Quarter" },
    { value: "this-year", label: "This Year" },
    { value: "custom", label: "Custom" },
  ];

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Reports & Analytics
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Comprehensive view of your financial health
          </p>
        </div>
        <ExportButtons
          dateRange={dateRange}
          summary={summary}
          categoryBreakdown={categoryBreakdown ?? []}
          topCategories={topCategories ?? []}
        />
      </div>

      {/* Print header */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">
          Expense Report: {dateRange.startDate} to {dateRange.endDate}
        </h1>
      </div>

      {/* Date range selector */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center print:hidden">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => handlePresetChange(p.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                preset === p.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground"
            />
          </div>
        )}
      </div>

      {/* Summary stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          icon={Wallet}
          iconBg="bg-destructive/10"
          iconColor="text-destructive"
          label="Total Spent"
          value={
            summaryLoading
              ? undefined
              : formatCurrency(summary?.totalExpenses ?? 0, "INR")
          }
        />
        <StatCard
          icon={TrendingUp}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          iconColor="text-emerald-600"
          label="Total Income"
          value={
            summaryLoading
              ? undefined
              : formatCurrency(summary?.totalIncome ?? 0, "INR")
          }
        />
        <StatCard
          icon={PiggyBank}
          iconBg={
            (summary?.netSavings ?? 0) >= 0
              ? "bg-emerald-100 dark:bg-emerald-900/30"
              : "bg-red-100 dark:bg-red-900/30"
          }
          iconColor={
            (summary?.netSavings ?? 0) >= 0
              ? "text-emerald-600"
              : "text-red-600"
          }
          label="Net Savings"
          value={
            summaryLoading
              ? undefined
              : formatCurrency(summary?.netSavings ?? 0, "INR")
          }
          valueColor={
            (summary?.netSavings ?? 0) >= 0
              ? "text-emerald-600"
              : "text-red-600"
          }
        />
        <StatCard
          icon={Percent}
          iconBg="bg-primary/10"
          iconColor="text-primary"
          label="Savings Rate"
          value={
            summaryLoading
              ? undefined
              : `${(summary?.savingsRate ?? 0).toFixed(1)}%`
          }
        />
        <StatCard
          icon={CalendarDays}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-600"
          label="Avg Daily Spend"
          value={
            summaryLoading
              ? undefined
              : formatCurrency(summary?.avgDailySpend ?? 0, "INR")
          }
        />
      </div>

      {/* Charts grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Section 1: Spending by Category */}
        <CategoryChart
          data={categoryBreakdown ?? []}
          isLoading={categoryLoading}
        />

        {/* Section 2: Spend Trend */}
        <SpendTrendChart
          data={spendTrend ?? []}
          isLoading={trendLoading}
          granularity={granularity}
          onGranularityChange={setGranularity}
        />

        {/* Section 3: Budget vs Actual */}
        <BudgetVsActualChart
          data={budgetVsActual ?? []}
          isLoading={budgetLoading}
        />

        {/* Section 4: Income vs Expense */}
        <IncomeExpenseChart
          data={incomeVsExpense ?? []}
          isLoading={incomeExpenseLoading}
        />

        {/* Section 5: Daily Spend Heatmap */}
        <HeatmapCalendar
          data={heatmapData ?? []}
          isLoading={heatmapLoading}
          year={heatmapYear}
          month={heatmapMonth}
          onMonthChange={handleHeatmapMonthChange}
        />

        {/* Section 6: Top Categories Ranking */}
        <TopCategoriesChart
          data={topCategories ?? []}
          isLoading={topCategoriesLoading}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatCard sub-component
// ---------------------------------------------------------------------------

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  label: string;
  value?: string;
  valueColor?: string;
}

function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  valueColor,
}: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg",
          iconBg,
        )}
      >
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {value === undefined ? (
          <span className="inline-block h-5 w-16 animate-pulse rounded bg-muted" />
        ) : (
          <p
            className={cn(
              "truncate text-lg font-bold",
              valueColor ?? "text-foreground",
            )}
          >
            {value}
          </p>
        )}
      </div>
    </div>
  );
}
