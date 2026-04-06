"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/cn";
import { useFormatCurrency } from "@/hooks/use-currency";
import type { CategoryBreakdownItem } from "@/hooks/use-reports";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Sector,
} from "recharts";
import { List, PieChart as PieChartIcon } from "lucide-react";

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
  "#84cc16",
  "#a855f7",
];

interface CategoryChartProps {
  data: CategoryBreakdownItem[];
  isLoading: boolean;
}

function renderActiveShape(props: Record<string, number | string>) {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
  } = props;

  return (
    <g>
      <Sector
        cx={cx as number}
        cy={cy as number}
        innerRadius={innerRadius as number}
        outerRadius={(outerRadius as number) + 6}
        startAngle={startAngle as number}
        endAngle={endAngle as number}
        fill={fill as string}
      />
    </g>
  );
}

export function CategoryChart({ data, isLoading }: CategoryChartProps) {
  const { formatCurrency } = useFormatCurrency();
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const chartData = useMemo(
    () =>
      data.map((item, i) => ({
        ...item,
        color: item.categoryColor ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      })),
    [data],
  );

  const total = useMemo(
    () => data.reduce((sum, item) => sum + item.totalAmount, 0),
    [data],
  );

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="h-8 w-20 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="h-48 w-48 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-base font-semibold text-foreground">
          Spending by Category
        </h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <PieChartIcon className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            No expense data for this period
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">
          Spending by Category
        </h3>
        <div className="flex rounded-lg border border-input">
          <button
            type="button"
            onClick={() => setViewMode("chart")}
            className={cn(
              "rounded-l-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
              viewMode === "chart"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
          >
            <PieChartIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={cn(
              "rounded-r-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
              viewMode === "table"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {viewMode === "chart" ? (
        <div className="flex flex-col items-center lg:flex-row lg:gap-6">
          <div className="relative h-64 w-full max-w-xs">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                  dataKey="totalAmount"
                  nameKey="categoryName"
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(undefined)}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value, "INR"),
                    "Amount",
                  ]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center text */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-sm font-bold text-foreground">
                {formatCurrency(total, "INR")}
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex-1 space-y-2 lg:mt-0">
            {chartData.map((item, i) => (
              <div
                key={item.categoryId}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-1.5 transition-colors",
                  activeIndex === i && "bg-accent",
                )}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(undefined)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-foreground">
                    {item.categoryName}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">
                    {formatCurrency(item.totalAmount, "INR")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 font-medium text-muted-foreground">
                  Category
                </th>
                <th className="pb-2 text-right font-medium text-muted-foreground">
                  Amount
                </th>
                <th className="pb-2 text-right font-medium text-muted-foreground">
                  Transactions
                </th>
                <th className="pb-2 text-right font-medium text-muted-foreground">
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((item) => (
                <tr
                  key={item.categoryId}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-foreground">
                        {item.categoryName}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-medium text-foreground">
                    {formatCurrency(item.totalAmount, "INR")}
                  </td>
                  <td className="py-2.5 text-right text-muted-foreground">
                    {item.transactionCount}
                  </td>
                  <td className="py-2.5 text-right text-muted-foreground">
                    {item.percentage.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border font-medium">
                <td className="pt-2 text-foreground">Total</td>
                <td className="pt-2 text-right text-foreground">
                  {formatCurrency(total, "INR")}
                </td>
                <td className="pt-2 text-right text-muted-foreground">
                  {data.reduce((sum, d) => sum + d.transactionCount, 0)}
                </td>
                <td className="pt-2 text-right text-muted-foreground">
                  100%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
