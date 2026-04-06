"use client";

import { useQuery } from "@tanstack/react-query";
import { createBrowserClient } from "@/lib/supabase/client";
import { useUIStore } from "@/stores/ui-store";

function getClient() {
  return createBrowserClient();
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;
}

export interface ReportSummary {
  totalExpenses: number;
  totalIncome: number;
  netSavings: number;
  savingsRate: number;
  avgDailySpend: number;
  transactionCount: number;
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
}

export interface SpendTrendPoint {
  label: string;
  date: string;
  totalExpenses: number;
  totalIncome: number;
}

export interface BudgetVsActualItem {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  budgetAmount: number;
  actualAmount: number;
  percentage: number;
}

export interface IncomeExpensePoint {
  month: string;
  year: number;
  income: number;
  expense: number;
  net: number;
}

export interface DailyHeatmapPoint {
  date: string;
  amount: number;
  count: number;
}

export interface TopCategoryItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  totalAmount: number;
  percentage: number;
}

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

const REPORTS_KEY = ["reports"] as const;

// ---------------------------------------------------------------------------
// useReportSummary
// ---------------------------------------------------------------------------

export function useReportSummary(dateRange: DateRange) {
  const client = getClient();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);

  return useQuery({
    queryKey: [
      ...REPORTS_KEY,
      "summary",
      workspaceId,
      dateRange.startDate,
      dateRange.endDate,
    ],
    queryFn: async (): Promise<ReportSummary> => {
      const { data, error } = await client
        .from("expenses")
        .select("type, amount, expense_date")
        .eq("workspace_id", workspaceId!)
        .gte("expense_date", dateRange.startDate)
        .lte("expense_date", dateRange.endDate)
        .is("deleted_at", null);

      if (error) throw error;

      const rows = (data ?? []) as {
        type: string;
        amount: number;
        expense_date: string;
      }[];

      let totalExpenses = 0;
      let totalIncome = 0;

      for (const r of rows) {
        if (r.type === "income") totalIncome += r.amount;
        else totalExpenses += r.amount;
      }

      const netSavings = totalIncome - totalExpenses;
      const savingsRate =
        totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

      // Calculate days in range for avg daily spend
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      const days =
        Math.max(
          1,
          Math.ceil(
            (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
          ) + 1,
        );
      const avgDailySpend = totalExpenses / days;

      return {
        totalExpenses,
        totalIncome,
        netSavings,
        savingsRate,
        avgDailySpend,
        transactionCount: rows.length,
      };
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useCategoryBreakdown
// ---------------------------------------------------------------------------

export function useCategoryBreakdown(dateRange: DateRange) {
  const client = getClient();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);

  return useQuery({
    queryKey: [
      ...REPORTS_KEY,
      "category-breakdown",
      workspaceId,
      dateRange.startDate,
      dateRange.endDate,
    ],
    queryFn: async (): Promise<CategoryBreakdownItem[]> => {
      const { data, error } = await client
        .from("expenses")
        .select("amount, category_id, categories(id, name, icon, color)")
        .eq("workspace_id", workspaceId!)
        .eq("type", "expense")
        .gte("expense_date", dateRange.startDate)
        .lte("expense_date", dateRange.endDate)
        .is("deleted_at", null);

      if (error) throw error;

      const expenses = (data ?? []) as unknown as {
        amount: number;
        category_id: string;
        categories: {
          id: string;
          name: string;
          icon: string | null;
          color: string | null;
        } | null;
      }[];

      const totals = new Map<
        string,
        Omit<CategoryBreakdownItem, "percentage">
      >();

      for (const expense of expenses) {
        const catId = expense.category_id ?? "uncategorized";
        const existing = totals.get(catId);
        if (existing) {
          existing.totalAmount += expense.amount;
          existing.transactionCount += 1;
        } else {
          totals.set(catId, {
            categoryId: catId,
            categoryName: expense.categories?.name ?? "Uncategorized",
            categoryIcon: expense.categories?.icon ?? null,
            categoryColor: expense.categories?.color ?? null,
            totalAmount: expense.amount,
            transactionCount: 1,
          });
        }
      }

      const grandTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

      return Array.from(totals.values())
        .map((item) => ({
          ...item,
          percentage:
            grandTotal > 0 ? (item.totalAmount / grandTotal) * 100 : 0,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount);
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useSpendTrend
// ---------------------------------------------------------------------------

export type Granularity = "daily" | "weekly" | "monthly";

export function useSpendTrend(
  dateRange: DateRange,
  granularity: Granularity = "daily",
) {
  const client = getClient();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);

  return useQuery({
    queryKey: [
      ...REPORTS_KEY,
      "spend-trend",
      workspaceId,
      dateRange.startDate,
      dateRange.endDate,
      granularity,
    ],
    queryFn: async (): Promise<SpendTrendPoint[]> => {
      const { data, error } = await client
        .from("expenses")
        .select("type, amount, expense_date")
        .eq("workspace_id", workspaceId!)
        .gte("expense_date", dateRange.startDate)
        .lte("expense_date", dateRange.endDate)
        .is("deleted_at", null)
        .order("expense_date", { ascending: true });

      if (error) throw error;

      const rows = (data ?? []) as {
        type: string;
        amount: number;
        expense_date: string;
      }[];

      if (granularity === "daily") {
        const map = new Map<
          string,
          { totalExpenses: number; totalIncome: number }
        >();
        // Initialize all days in range
        const start = new Date(dateRange.startDate);
        const end = new Date(dateRange.endDate);
        for (
          let d = new Date(start);
          d <= end;
          d.setDate(d.getDate() + 1)
        ) {
          const key = d.toISOString().split("T")[0];
          map.set(key, { totalExpenses: 0, totalIncome: 0 });
        }
        for (const r of rows) {
          const key = r.expense_date.split("T")[0];
          const entry = map.get(key);
          if (entry) {
            if (r.type === "income") entry.totalIncome += r.amount;
            else entry.totalExpenses += r.amount;
          }
        }
        return Array.from(map.entries()).map(([date, val]) => ({
          label: new Date(date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          }),
          date,
          totalExpenses: val.totalExpenses,
          totalIncome: val.totalIncome,
        }));
      }

      if (granularity === "weekly") {
        const map = new Map<
          string,
          { totalExpenses: number; totalIncome: number; date: string }
        >();
        for (const r of rows) {
          const d = new Date(r.expense_date);
          // Get Monday of the week
          const day = d.getDay();
          const diff = d.getDate() - day + (day === 0 ? -6 : 1);
          const monday = new Date(d.setDate(diff));
          const key = monday.toISOString().split("T")[0];
          if (!map.has(key)) {
            map.set(key, { totalExpenses: 0, totalIncome: 0, date: key });
          }
          const entry = map.get(key)!;
          if (r.type === "income") entry.totalIncome += r.amount;
          else entry.totalExpenses += r.amount;
        }
        return Array.from(map.values())
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((val) => ({
            label: `Week of ${new Date(val.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
            date: val.date,
            totalExpenses: val.totalExpenses,
            totalIncome: val.totalIncome,
          }));
      }

      // monthly
      const map = new Map<
        string,
        { totalExpenses: number; totalIncome: number }
      >();
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      for (const r of rows) {
        const d = new Date(r.expense_date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!map.has(key)) {
          map.set(key, { totalExpenses: 0, totalIncome: 0 });
        }
        const entry = map.get(key)!;
        if (r.type === "income") entry.totalIncome += r.amount;
        else entry.totalExpenses += r.amount;
      }

      return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, val]) => {
          const [year, month] = key.split("-");
          return {
            label: `${monthNames[parseInt(month, 10) - 1]} ${year}`,
            date: `${key}-01`,
            totalExpenses: val.totalExpenses,
            totalIncome: val.totalIncome,
          };
        });
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useBudgetVsActual
// ---------------------------------------------------------------------------

export function useBudgetVsActual(dateRange: DateRange) {
  const client = getClient();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);

  return useQuery({
    queryKey: [
      ...REPORTS_KEY,
      "budget-vs-actual",
      workspaceId,
      dateRange.startDate,
      dateRange.endDate,
    ],
    queryFn: async (): Promise<BudgetVsActualItem[]> => {
      const { data: budgets, error: budgetsError } = await client
        .from("budgets")
        .select("*, categories(name, icon, color)")
        .eq("workspace_id", workspaceId!)
        .eq("is_active", true);

      if (budgetsError) throw budgetsError;

      const { data: spending, error: spendingError } = await client
        .from("expenses")
        .select("category_id, amount")
        .eq("workspace_id", workspaceId!)
        .eq("type", "expense")
        .gte("expense_date", dateRange.startDate)
        .lte("expense_date", dateRange.endDate)
        .is("deleted_at", null);

      if (spendingError) throw spendingError;

      const spendingByCategory = (spending ?? []).reduce<
        Record<string, number>
      >((acc, expense) => {
        const catId = expense.category_id as string;
        acc[catId] = (acc[catId] ?? 0) + (expense.amount as number);
        return acc;
      }, {});

      return ((budgets ?? []) as any[]).map((budget: any) => ({
        budgetId: budget.id as string,
        categoryId: budget.category_id as string,
        categoryName:
          (budget.categories as { name: string })?.name ?? "Unknown",
        categoryIcon:
          (budget.categories as { icon: string | null })?.icon ?? null,
        categoryColor:
          (budget.categories as { color: string | null })?.color ?? null,
        budgetAmount: budget.amount as number,
        actualAmount:
          spendingByCategory[budget.category_id as string] ?? 0,
        percentage:
          (budget.amount as number) > 0
            ? ((spendingByCategory[budget.category_id as string] ?? 0) /
                (budget.amount as number)) *
              100
            : 0,
      }));
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useIncomeVsExpense
// ---------------------------------------------------------------------------

export function useIncomeVsExpense(months: number = 6) {
  const client = getClient();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);

  return useQuery({
    queryKey: [...REPORTS_KEY, "income-vs-expense", workspaceId, months],
    queryFn: async (): Promise<IncomeExpensePoint[]> => {
      const now = new Date();
      const startDate = new Date(
        now.getFullYear(),
        now.getMonth() - months + 1,
        1,
      );

      const { data, error } = await client
        .from("expenses")
        .select("type, amount, expense_date")
        .eq("workspace_id", workspaceId!)
        .gte("expense_date", startDate.toISOString())
        .is("deleted_at", null)
        .order("expense_date", { ascending: true });

      if (error) throw error;

      const rows = (data ?? []) as {
        type: string;
        amount: number;
        expense_date: string;
      }[];

      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const map = new Map<
        string,
        { income: number; expense: number; year: number; monthIdx: number }
      >();

      // Initialize all months
      for (let i = 0; i < months; i++) {
        const d = new Date(
          now.getFullYear(),
          now.getMonth() - months + 1 + i,
          1,
        );
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        map.set(key, {
          income: 0,
          expense: 0,
          year: d.getFullYear(),
          monthIdx: d.getMonth(),
        });
      }

      for (const r of rows) {
        const d = new Date(r.expense_date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const entry = map.get(key);
        if (entry) {
          if (r.type === "income") entry.income += r.amount;
          else entry.expense += r.amount;
        }
      }

      return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, val]) => ({
          month: monthNames[val.monthIdx],
          year: val.year,
          income: val.income,
          expense: val.expense,
          net: val.income - val.expense,
        }));
    },
    enabled: !!workspaceId,
    staleTime: 10 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useDailyHeatmap
// ---------------------------------------------------------------------------

export function useDailyHeatmap(year: number, month: number) {
  const client = getClient();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);

  return useQuery({
    queryKey: [...REPORTS_KEY, "daily-heatmap", workspaceId, year, month],
    queryFn: async (): Promise<DailyHeatmapPoint[]> => {
      const startDate = new Date(year, month - 1, 1)
        .toISOString()
        .split("T")[0];
      const endDate = new Date(year, month, 0).toISOString().split("T")[0];

      const { data, error } = await client
        .from("expenses")
        .select("amount, expense_date")
        .eq("workspace_id", workspaceId!)
        .eq("type", "expense")
        .gte("expense_date", startDate)
        .lte("expense_date", endDate)
        .is("deleted_at", null);

      if (error) throw error;

      const rows = (data ?? []) as { amount: number; expense_date: string }[];

      const map = new Map<string, { amount: number; count: number }>();

      // Initialize all days in the month
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        map.set(dateStr, { amount: 0, count: 0 });
      }

      for (const r of rows) {
        const key = r.expense_date.split("T")[0];
        const entry = map.get(key);
        if (entry) {
          entry.amount += r.amount;
          entry.count += 1;
        }
      }

      return Array.from(map.entries())
        .map(([date, val]) => ({
          date,
          amount: val.amount,
          count: val.count,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useTopCategories
// ---------------------------------------------------------------------------

export function useTopCategories(dateRange: DateRange, limit: number = 10) {
  const client = getClient();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);

  return useQuery({
    queryKey: [
      ...REPORTS_KEY,
      "top-categories",
      workspaceId,
      dateRange.startDate,
      dateRange.endDate,
      limit,
    ],
    queryFn: async (): Promise<TopCategoryItem[]> => {
      const { data, error } = await client
        .from("expenses")
        .select("amount, category_id, categories(id, name, icon, color)")
        .eq("workspace_id", workspaceId!)
        .eq("type", "expense")
        .gte("expense_date", dateRange.startDate)
        .lte("expense_date", dateRange.endDate)
        .is("deleted_at", null);

      if (error) throw error;

      const expenses = (data ?? []) as unknown as {
        amount: number;
        category_id: string;
        categories: {
          id: string;
          name: string;
          icon: string | null;
          color: string | null;
        } | null;
      }[];

      const totals = new Map<
        string,
        Omit<TopCategoryItem, "percentage">
      >();

      for (const expense of expenses) {
        const catId = expense.category_id ?? "uncategorized";
        const existing = totals.get(catId);
        if (existing) {
          existing.totalAmount += expense.amount;
        } else {
          totals.set(catId, {
            categoryId: catId,
            categoryName: expense.categories?.name ?? "Uncategorized",
            categoryIcon: expense.categories?.icon ?? null,
            categoryColor: expense.categories?.color ?? null,
            totalAmount: expense.amount,
          });
        }
      }

      const grandTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

      return Array.from(totals.values())
        .map((item) => ({
          ...item,
          percentage:
            grandTotal > 0 ? (item.totalAmount / grandTotal) * 100 : 0,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, limit);
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}
