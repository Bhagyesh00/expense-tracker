"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/cn";
import { useCategoriesList } from "@/hooks/use-categories";
import { DEFAULT_CATEGORIES } from "@expenseflow/utils";
import {
  Search,
  Plus,
  Utensils,
  Car,
  ShoppingBag,
  Receipt,
  Film,
  HeartPulse,
  GraduationCap,
  ShoppingCart,
  Home,
  Plane,
  Sparkles,
  Gift,
  TrendingUp,
  MoreHorizontal,
  Banknote,
  Laptop,
  BarChart2,
  PlusCircle,
  X,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  "shopping-bag": ShoppingBag,
  receipt: Receipt,
  film: Film,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  "shopping-cart": ShoppingCart,
  home: Home,
  plane: Plane,
  sparkles: Sparkles,
  gift: Gift,
  "trending-up": TrendingUp,
  ellipsis: MoreHorizontal,
  banknote: Banknote,
  laptop: Laptop,
  "bar-chart-2": BarChart2,
  "plus-circle": PlusCircle,
};

export function getCategoryIcon(iconName: string | null | undefined): LucideIcon {
  if (!iconName) return MoreHorizontal;
  return ICON_MAP[iconName] ?? MoreHorizontal;
}

interface CategoryItem {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  type?: string;
  is_default?: boolean;
}

interface CategorySelectorProps {
  value: string | null;
  onChange: (categoryId: string) => void;
  type?: "expense" | "income";
  variant?: "grid" | "modal";
  onCreateNew?: () => void;
  className?: string;
  error?: string;
}

export function CategorySelector({
  value,
  onChange,
  type,
  variant = "grid",
  onCreateNew,
  className,
  error,
}: CategorySelectorProps) {
  const [search, setSearch] = useState("");
  const { data: categories, isLoading } = useCategoriesList();

  const displayCategories = useMemo(() => {
    let items: CategoryItem[] = [];

    if (categories && categories.length > 0) {
      items = categories.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        type: undefined,
        is_default: c.is_default,
      }));
    } else {
      // Fallback to default categories
      items = DEFAULT_CATEGORIES.map((c, i) => ({
        id: `default-${i}`,
        name: c.name,
        icon: c.icon,
        color: c.color,
        type: c.type,
        is_default: true,
      }));
    }

    if (type) {
      items = items.filter((c) => !c.type || c.type === type);
    }

    if (search) {
      const q = search.toLowerCase();
      items = items.filter((c) => c.name.toLowerCase().includes(q));
    }

    return items;
  }, [categories, type, search]);

  const expenseCategories = displayCategories.filter(
    (c) => !c.type || c.type === "expense",
  );
  const incomeCategories = displayCategories.filter(
    (c) => c.type === "income",
  );

  const handleSelect = useCallback(
    (id: string) => {
      onChange(id);
    },
    [onChange],
  );

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories..."
          className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Expense categories */}
      {(!type || type === "expense") && expenseCategories.length > 0 && (
        <div>
          {!type && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Expenses
            </p>
          )}
          <div
            className={cn(
              "grid gap-2",
              variant === "grid"
                ? "grid-cols-4 sm:grid-cols-5 md:grid-cols-6"
                : "grid-cols-3 sm:grid-cols-4",
            )}
          >
            {expenseCategories.map((cat) => {
              const Icon = getCategoryIcon(cat.icon);
              const isSelected = value === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelect(cat.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all hover:shadow-sm",
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary shadow-sm"
                      : "border-border bg-card hover:border-primary/30 hover:bg-accent",
                  )}
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: `${cat.color || "#6366f1"}20`,
                    }}
                  >
                    <Icon
                      className="h-4.5 w-4.5"
                      style={{ color: cat.color || "#6366f1" }}
                    />
                  </div>
                  <span className="text-[11px] font-medium leading-tight text-foreground line-clamp-2">
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Income categories */}
      {(!type || type === "income") && incomeCategories.length > 0 && (
        <div>
          {!type && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Income
            </p>
          )}
          <div
            className={cn(
              "grid gap-2",
              variant === "grid"
                ? "grid-cols-4 sm:grid-cols-5 md:grid-cols-6"
                : "grid-cols-3 sm:grid-cols-4",
            )}
          >
            {incomeCategories.map((cat) => {
              const Icon = getCategoryIcon(cat.icon);
              const isSelected = value === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelect(cat.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all hover:shadow-sm",
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary shadow-sm"
                      : "border-border bg-card hover:border-primary/30 hover:bg-accent",
                  )}
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: `${cat.color || "#6366f1"}20`,
                    }}
                  >
                    <Icon
                      className="h-4.5 w-4.5"
                      style={{ color: cat.color || "#6366f1" }}
                    />
                  </div>
                  <span className="text-[11px] font-medium leading-tight text-foreground line-clamp-2">
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {displayCategories.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No categories found</p>
        </div>
      )}

      {/* Create new */}
      {onCreateNew && (
        <button
          type="button"
          onClick={onCreateNew}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="h-4 w-4" />
          Create new category
        </button>
      )}
    </div>
  );
}
