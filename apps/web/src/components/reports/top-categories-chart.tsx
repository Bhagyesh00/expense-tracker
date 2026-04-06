"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { useFormatCurrency } from "@/hooks/use-currency";
import type { TopCategoryItem } from "@/hooks/use-reports";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { BarChart3 } from "lucide-react";

const DEFAULT_COLORS = [
  "#6366f1",
  "#f43f5e",
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#06b6d4",
];

interface TopCategoriesChartProps {
  data: TopCategoryItem[];
  isLoading: boolean;
}

export function TopCategoriesChart({
  data,
  isLoading,
}: TopCategoriesChartProps) {
  const { formatCurrency } = useFormatCurrency();

  const chartData = useMemo(
    () =>
      data.map((item, i) => ({
        ...item,
        name: item.categoryName,
        color: item.categoryColor ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      })),
    [data],
  );

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 h-5 w-44 animate-pulse rounded bg-muted" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-base font-semibold text-foreground">
          Top Categories
        </h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            No category data available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-4 text-base font-semibold text-foreground">
        Top Categories
      </h3>

      <div
        className="w-full"
        style={{ height: Math.max(250, data.length * 40) }}
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
              formatter={(value: number) => [
                formatCurrency(value, "INR"),
                "Amount",
              ]}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
            />
            <Bar dataKey="totalAmount" radius={[0, 6, 6, 0]} barSize={20}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Percentage breakdown */}
      <div className="mt-4 space-y-2">
        {chartData.map((item, i) => (
          <div key={item.categoryId} className="flex items-center gap-3">
            <span className="w-5 text-center text-xs font-medium text-muted-foreground">
              {i + 1}
            </span>
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="flex-1 truncate text-sm text-foreground">
              {item.categoryName}
            </span>
            <span className="text-sm font-medium text-foreground">
              {formatCurrency(item.totalAmount, "INR")}
            </span>
            <span className="w-12 text-right text-xs text-muted-foreground">
              {item.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
