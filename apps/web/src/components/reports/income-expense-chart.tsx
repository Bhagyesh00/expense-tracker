"use client";

import { useFormatCurrency } from "@/hooks/use-currency";
import type { IncomeExpensePoint } from "@/hooks/use-reports";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart,
} from "recharts";
import { ArrowUpDown } from "lucide-react";

interface IncomeExpenseChartProps {
  data: IncomeExpensePoint[];
  isLoading: boolean;
}

export function IncomeExpenseChart({
  data,
  isLoading,
}: IncomeExpenseChartProps) {
  const { formatCurrency } = useFormatCurrency();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-base font-semibold text-foreground">
          Income vs Expense
        </h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ArrowUpDown className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            No data available for this period
          </p>
        </div>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    label: `${item.month} ${item.year}`,
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-4 text-base font-semibold text-foreground">
        Income vs Expense (P&L)
      </h3>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
          >
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
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => {
                if (Math.abs(value) >= 100000)
                  return `${(value / 100000).toFixed(1)}L`;
                if (Math.abs(value) >= 1000)
                  return `${(value / 1000).toFixed(0)}K`;
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
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  income: "Income",
                  expense: "Expense",
                  net: "Net Savings",
                };
                return [formatCurrency(value, "INR"), labels[name] ?? name];
              }}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
            />
            <Legend
              wrapperStyle={{ fontSize: "0.75rem" }}
              formatter={(value: string) => {
                const labels: Record<string, string> = {
                  income: "Income",
                  expense: "Expense",
                  net: "Net Savings",
                };
                return labels[value] ?? value;
              }}
            />
            <Bar
              dataKey="income"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              barSize={24}
            />
            <Bar
              dataKey="expense"
              fill="#f43f5e"
              radius={[4, 4, 0, 0]}
              barSize={24}
            />
            <Line
              type="monotone"
              dataKey="net"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 3, fill: "#6366f1" }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
