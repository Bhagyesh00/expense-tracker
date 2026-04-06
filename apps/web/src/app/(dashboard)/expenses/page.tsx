"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { useExpensesList, useDeleteExpense, useCreateExpense } from "@/hooks/use-expenses";
import { useFormatCurrency } from "@/hooks/use-currency";
import { useUIStore } from "@/stores/ui-store";
import { ExpenseList } from "@/components/expenses/expense-list";
import { ExpenseFilters } from "@/components/expenses/expense-filters";
import type { ExpenseFilters as ApiFilters, ExpenseRow } from "@expenseflow/api";
import { toast } from "sonner";
import {
  Plus,
  Download,
  Trash2,
  Wallet,
  TrendingUp,
  Hash,
} from "lucide-react";

interface FiltersState {
  search: string;
  type: "all" | "expense" | "income";
  categoryIds: string[];
  dateFrom: Date | null;
  dateTo: Date | null;
  minAmount: string;
  maxAmount: string;
  datePreset: string;
}

const DEFAULT_FILTERS: FiltersState = {
  search: "",
  type: "all",
  categoryIds: [],
  dateFrom: null,
  dateTo: null,
  minAmount: "",
  maxAmount: "",
  datePreset: "",
};

export default function ExpensesPage() {
  const router = useRouter();
  const { formatCurrency } = useFormatCurrency();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { deleteExpense } = useDeleteExpense();
  const { createExpense } = useCreateExpense();

  // Build API filters
  const apiFilters: ApiFilters = useMemo(() => {
    const f: ApiFilters = {};
    if (filters.search) f.search = filters.search;
    if (filters.type !== "all") f.type = filters.type;
    if (filters.categoryIds.length === 1) f.categoryId = filters.categoryIds[0];
    if (filters.dateFrom || filters.dateTo) {
      f.dateRange = {
        startDate: filters.dateFrom
          ? filters.dateFrom.toISOString().split("T")[0]
          : "2000-01-01",
        endDate: filters.dateTo
          ? filters.dateTo.toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      };
    }
    if (filters.minAmount) f.minAmount = parseFloat(filters.minAmount);
    if (filters.maxAmount) f.maxAmount = parseFloat(filters.maxAmount);
    return f;
  }, [filters]);

  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useExpensesList(apiFilters);

  const expenses: ExpenseRow[] = useMemo(
    () => data?.pages.flat() ?? [],
    [data],
  );

  // Quick stats
  const stats = useMemo(() => {
    let totalSpent = 0;
    let totalIncome = 0;
    expenses.forEach((e) => {
      if (e.type === "income") totalIncome += e.amount;
      else totalSpent += e.amount;
    });
    return { totalSpent, totalIncome, count: expenses.length };
  }, [expenses]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Are you sure you want to delete this expense?")) return;
      await deleteExpense(id);
    },
    [deleteExpense],
  );

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    setShowDeleteConfirm(false);
    let success = 0;
    for (const id of ids) {
      try {
        await deleteExpense(id);
        success++;
      } catch {
        // Error already toasted
      }
    }
    if (success > 0) {
      toast.success(`Deleted ${success} expense${success > 1 ? "s" : ""}`);
      setSelectedIds(new Set());
    }
  }, [selectedIds, deleteExpense]);

  const handleDuplicate = useCallback(
    async (expense: ExpenseRow) => {
      if (!workspaceId) return;
      try {
        await createExpense({
          workspace_id: workspaceId,
          user_id: "",
          category_id: expense.category_id,
          type: expense.type as "expense" | "income",
          amount: expense.amount,
          currency: expense.currency,
          description: `${expense.description} (copy)`,
          notes: expense.notes,
          date: new Date().toISOString().split("T")[0],
          tags: expense.tags,
          is_recurring: false,
        });
      } catch {
        // Toast handled by hook
      }
    },
    [workspaceId, createExpense],
  );

  const exportCSV = useCallback(() => {
    if (expenses.length === 0) {
      toast.error("No expenses to export");
      return;
    }
    const headers = ["Date", "Description", "Category", "Type", "Amount", "Currency", "Tags", "Notes"];
    const rows = expenses.map((e) => [
      e.expense_date,
      `"${e.description.replace(/"/g, '""')}"`,
      e.categories?.name ?? "",
      e.type,
      e.amount.toString(),
      e.currency,
      (e.tags ?? []).join("; "),
      `"${(e.notes ?? "").replace(/"/g, '""')}"`,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported successfully");
  }, [expenses]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Track and manage all your transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <Link
            href="/dashboard/expenses/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
            <Wallet className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Spent</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(stats.totalSpent, "INR")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
            <TrendingUp className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Income</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(stats.totalIncome, "INR")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Hash className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Transactions</p>
            <p className="text-lg font-bold text-foreground">{stats.count}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <ExpenseFilters value={filters} onChange={setFilters} />

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <span className="text-sm font-medium text-foreground">
            {selectedIds.size} selected
          </span>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete selected
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-base font-semibold text-foreground">
              Delete {selectedIds.size} expense{selectedIds.size > 1 ? "s" : ""}?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense list */}
      <ExpenseList
        expenses={expenses}
        isLoading={isLoading}
        hasMore={!!hasNextPage}
        onLoadMore={() => fetchNextPage()}
        isLoadingMore={isFetchingNextPage}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
      />
    </div>
  );
}
