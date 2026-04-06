"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { useFormatCurrency } from "@/hooks/use-currency";
import { getCategoryIcon } from "./category-selector";
import {
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  Loader2,
  Receipt,
  ArrowUpDown,
} from "lucide-react";
import type { ExpenseRow } from "@expenseflow/api";

type SortField = "date" | "description" | "category" | "amount";
type SortDir = "asc" | "desc";

interface ExpenseListProps {
  expenses: ExpenseRow[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (expense: ExpenseRow) => void;
  className?: string;
}

function getRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function ActionsDropdown({
  expense,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  expense: ExpenseRow;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        aria-label="Actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-1 w-36 rounded-lg border border-border bg-popover py-1 shadow-lg">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
            >
              <Edit className="h-3.5 w-3.5" />
              Edit
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
              Duplicate
            </button>
            <hr className="my-1 border-border" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function ExpenseList({
  expenses,
  isLoading,
  hasMore,
  onLoadMore,
  isLoadingMore,
  selectedIds,
  onSelectionChange,
  onDelete,
  onDuplicate,
  className,
}: ExpenseListProps) {
  const router = useRouter();
  const { formatCurrency } = useFormatCurrency();
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("desc");
      }
    },
    [sortField],
  );

  const sortedExpenses = useMemo(() => {
    const sorted = [...expenses];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date":
          cmp = new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime();
          break;
        case "description":
          cmp = a.description.localeCompare(b.description);
          break;
        case "category":
          cmp = (a.categories?.name ?? "").localeCompare(
            b.categories?.name ?? "",
          );
          break;
        case "amount":
          cmp = a.amount - b.amount;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [expenses, sortField, sortDir]);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === expenses.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(expenses.map((e) => e.id)));
    }
  }, [expenses, selectedIds, onSelectionChange]);

  const toggleOne = useCallback(
    (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      onSelectionChange(next);
    },
    [selectedIds, onSelectionChange],
  );

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 text-primary" />
    ) : (
      <ChevronDown className="h-3 w-3 text-primary" />
    );
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
          >
            <div className="h-4 w-4 rounded bg-muted animate-pulse" />
            <div className="h-4 w-20 rounded bg-muted animate-pulse" />
            <div className="flex-1 h-4 rounded bg-muted animate-pulse" />
            <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-20 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Receipt className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold text-foreground">
          No expenses found
        </h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Try adjusting your filters or add your first expense to get started.
        </p>
        <Link
          href="/dashboard/expenses/new"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Add Expense
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Desktop table */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={
                    expenses.length > 0 &&
                    selectedIds.size === expenses.length
                  }
                  onChange={toggleAll}
                  className="rounded border-input"
                />
              </th>
              {(
                [
                  { field: "date" as SortField, label: "Date" },
                  { field: "description" as SortField, label: "Description" },
                  { field: "category" as SortField, label: "Category" },
                  { field: "amount" as SortField, label: "Amount" },
                ] as const
              ).map(({ field, label }) => (
                <th
                  key={field}
                  onClick={() => toggleSort(field)}
                  className="group cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  <div className="flex items-center gap-1">
                    {label}
                    <SortIcon field={field} />
                  </div>
                </th>
              ))}
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {sortedExpenses.map((expense) => {
              const isIncome = expense.type === "income";
              const Icon = getCategoryIcon(expense.categories?.icon);
              return (
                <tr
                  key={expense.id}
                  onClick={() =>
                    router.push(`/dashboard/expenses/${expense.id}`)
                  }
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(expense.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleOne(expense.id)}
                      className="rounded border-input"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                    {getRelativeDate(expense.expense_date)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate max-w-[250px]">
                        {expense.description}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {expense.categories && (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: `${expense.categories.color || "#6366f1"}20`,
                          color: expense.categories.color || "#6366f1",
                        }}
                      >
                        <Icon className="h-3 w-3" />
                        {expense.categories.name}
                      </span>
                    )}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-sm font-semibold whitespace-nowrap text-right",
                      isIncome ? "text-success" : "text-foreground",
                    )}
                  >
                    {isIncome ? "+" : "-"}
                    {formatCurrency(expense.amount, expense.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <ActionsDropdown
                      expense={expense}
                      onEdit={() =>
                        router.push(`/dashboard/expenses/${expense.id}`)
                      }
                      onDuplicate={() => onDuplicate(expense)}
                      onDelete={() => onDelete(expense.id)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {sortedExpenses.map((expense) => {
          const isIncome = expense.type === "income";
          const Icon = getCategoryIcon(expense.categories?.icon);
          return (
            <Link
              key={expense.id}
              href={`/dashboard/expenses/${expense.id}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/50 active:bg-accent"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: `${expense.categories?.color || "#6366f1"}20`,
                }}
              >
                <Icon
                  className="h-5 w-5"
                  style={{
                    color: expense.categories?.color || "#6366f1",
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {expense.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getRelativeDate(expense.expense_date)}
                  {expense.categories && ` \u00B7 ${expense.categories.name}`}
                </p>
              </div>
              <span
                className={cn(
                  "text-sm font-semibold whitespace-nowrap",
                  isIncome ? "text-success" : "text-foreground",
                )}
              >
                {isIncome ? "+" : "-"}
                {formatCurrency(expense.amount, expense.currency)}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            {isLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
