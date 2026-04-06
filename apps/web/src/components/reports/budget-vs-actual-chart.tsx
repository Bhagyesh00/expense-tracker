"use client";

import { cn } from "@/lib/cn";
import { useFormatCurrency } from "@/hooks/use-currency";
import type { BudgetVsActualItem } from "@/hooks/use-reports";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import { Target } from "lucide-react";

interface BudgetVsActualChartProps {
  data: BudgetVsActualItem[];
  isLoading: boolean;
}

export function BudgetVsActualChart({
  data,
  isLoading,
}: BudgetVsActualChartProps) {
  const { formatCurrency } = useFormatCurrency();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 h-5 w-36 animate-pulse rounded bg-muted" />
        <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-base font-semibold text-foreground">
          Budget vs Actual
        </h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Target className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            No budgets configured yet
          </p>
        </div>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    name: item.categoryName,
    isOverBudget: item.percentage > 100,
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-4 text-base font-semibold text-foreground">
        Budget vs Actual
      </h3>

      <div
        className="w-full"
        style={{ height: Math.max(280, data.length * 50) }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
              tickFormatter={(value: number) => {
                if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
                if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                return value.toString();
              }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              width={75}
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
                name === "budgetAmount" ? "Budget" : "Actual",
              ]}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
            />
            <Legend
              wrapperStyle={{ fontSize: "0.75rem" }}
              formatter={(value: string) =>
                value === "budgetAmount" ? "Budget" : "Actual"
              }
            />
            <Bar dataKey="budgetAmount" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={14} />
            <Bar dataKey="actualAmount" radius={[0, 4, 4, 0]} barSize={14}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isOverBudget ? "#f43f5e" : "#10b981"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Percentage labels below */}
      <div className="mt-4 space-y-1.5">
        {chartData.map((item) => (
          <div
            key={item.budgetId}
            className="flex items-center justify-between text-xs"
          >
            <span className="text-muted-foreground">{item.categoryName}</span>
            <span
              className={cn(
                "font-medium",
                item.isOverBudget ? "text-red-500" : "text-emerald-500",
              )}
            >
              {item.percentage.toFixed(0)}%{" "}
              {item.isOverBudget ? "over budget" : "of budget"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
