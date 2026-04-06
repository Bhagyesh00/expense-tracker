"use client";

import { cn } from "@/lib/cn";
import { useFormatCurrency } from "@/hooks/use-currency";
import type { SpendTrendPoint, Granularity } from "@/hooks/use-reports";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";

interface SpendTrendChartProps {
  data: SpendTrendPoint[];
  isLoading: boolean;
  granularity: Granularity;
  onGranularityChange: (g: Granularity) => void;
  showComparison?: boolean;
  onToggleComparison?: () => void;
}

export function SpendTrendChart({
  data,
  isLoading,
  granularity,
  onGranularityChange,
  showComparison,
  onToggleComparison,
}: SpendTrendChartProps) {
  const { formatCurrency } = useFormatCurrency();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-base font-semibold text-foreground">
          Spend Trend
        </h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <TrendingUp className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            No data available for this period
          </p>
        </div>
      </div>
    );
  }

  const granularityOptions: { value: Granularity; label: string }[] = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-foreground">
          Spend Trend
        </h3>
        <div className="flex items-center gap-2">
          {onToggleComparison && (
            <button
              type="button"
              onClick={onToggleComparison}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                showComparison
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              Compare
            </button>
          )}
          <div className="flex rounded-lg border border-input">
            {granularityOptions.map((opt, i) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onGranularityChange(opt.value)}
                className={cn(
                  "px-2.5 py-1.5 text-xs font-medium transition-colors",
                  i === 0 && "rounded-l-lg",
                  i === granularityOptions.length - 1 && "rounded-r-lg",
                  granularity === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => {
                if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
                if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                return value.toString();
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                fontSize: "0.75rem",
              }}
              formatter={(value: number, name: string) => [
                formatCurrency(value, "INR"),
                name === "totalExpenses" ? "Expenses" : "Income",
              ]}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
            />
            <Legend
              wrapperStyle={{ fontSize: "0.75rem" }}
              formatter={(value: string) =>
                value === "totalExpenses" ? "Expenses" : "Income"
              }
            />
            <Area
              type="monotone"
              dataKey="totalExpenses"
              stroke="#f43f5e"
              strokeWidth={2}
              fill="url(#expenseGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "#f43f5e" }}
            />
            <Area
              type="monotone"
              dataKey="totalIncome"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#incomeGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "#10b981" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
