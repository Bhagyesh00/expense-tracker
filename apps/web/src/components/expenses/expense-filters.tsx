"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useCategoriesList } from "@/hooks/use-categories";
import { DatePicker } from "@/components/shared/date-picker";
import {
  Search,
  Filter,
  X,
  ChevronDown,
  Calendar,
  SlidersHorizontal,
} from "lucide-react";

interface ExpenseFiltersValue {
  search: string;
  type: "all" | "expense" | "income";
  categoryIds: string[];
  dateFrom: Date | null;
  dateTo: Date | null;
  minAmount: string;
  maxAmount: string;
  datePreset: string;
}

interface ExpenseFiltersProps {
  value: ExpenseFiltersValue;
  onChange: (filters: ExpenseFiltersValue) => void;
  className?: string;
}

const DATE_PRESETS = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "this-week" },
  { label: "This Month", value: "this-month" },
  { label: "Custom", value: "custom" },
];

function getPresetDates(preset: string): {
  from: Date | null;
  to: Date | null;
} {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "this-week": {
      const start = new Date(today);
      start.setDate(start.getDate() - start.getDay());
      return { from: start, to: today };
    }
    case "this-month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: start, to: today };
    }
    default:
      return { from: null, to: null };
  }
}

export function ExpenseFilters({
  value,
  onChange,
  className,
}: ExpenseFiltersProps) {
  const { data: categories } = useCategoriesList();
  const [expanded, setExpanded] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [localSearch, setLocalSearch] = useState(value.search);

  // Debounce search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      if (localSearch !== value.search) {
        onChange({ ...value, search: localSearch });
      }
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [localSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTypeChange = useCallback(
    (type: "all" | "expense" | "income") => {
      onChange({ ...value, type });
    },
    [value, onChange],
  );

  const handleDatePreset = useCallback(
    (preset: string) => {
      const dates = getPresetDates(preset);
      onChange({
        ...value,
        datePreset: preset,
        dateFrom: dates.from,
        dateTo: dates.to,
      });
    },
    [value, onChange],
  );

  const handleCategoryToggle = useCallback(
    (id: string) => {
      const ids = value.categoryIds.includes(id)
        ? value.categoryIds.filter((c) => c !== id)
        : [...value.categoryIds, id];
      onChange({ ...value, categoryIds: ids });
    },
    [value, onChange],
  );

  const clearAll = useCallback(() => {
    setLocalSearch("");
    onChange({
      search: "",
      type: "all",
      categoryIds: [],
      dateFrom: null,
      dateTo: null,
      minAmount: "",
      maxAmount: "",
      datePreset: "",
    });
  }, [onChange]);

  const hasActiveFilters =
    value.search ||
    value.type !== "all" ||
    value.categoryIds.length > 0 ||
    value.dateFrom ||
    value.dateTo ||
    value.minAmount ||
    value.maxAmount;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Main filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search expenses..."
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch("");
                onChange({ ...value, search: "" });
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Type */}
        <div className="flex rounded-lg border border-input">
          {(["all", "expense", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTypeChange(t)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium capitalize transition-colors first:rounded-l-lg last:rounded-r-lg",
                value.type === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Date presets */}
        <div className="hidden sm:flex items-center gap-1">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => handleDatePreset(preset.value)}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                value.datePreset === preset.value
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Expand filters */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            expanded
              ? "border-primary bg-primary/5 text-primary"
              : "border-input text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {hasActiveFilters && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              !
            </span>
          )}
        </button>

        {/* Clear */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium text-destructive hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Date range */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              From date
            </label>
            <DatePicker
              value={value.dateFrom}
              onChange={(d) =>
                onChange({ ...value, dateFrom: d, datePreset: "custom" })
              }
              placeholder="Start date"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              To date
            </label>
            <DatePicker
              value={value.dateTo}
              onChange={(d) =>
                onChange({ ...value, dateTo: d, datePreset: "custom" })
              }
              placeholder="End date"
            />
          </div>

          {/* Amount range */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Min amount
            </label>
            <input
              type="number"
              value={value.minAmount}
              onChange={(e) =>
                onChange({ ...value, minAmount: e.target.value })
              }
              placeholder="0"
              min="0"
              step="0.01"
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Max amount
            </label>
            <input
              type="number"
              value={value.maxAmount}
              onChange={(e) =>
                onChange({ ...value, maxAmount: e.target.value })
              }
              placeholder="No limit"
              min="0"
              step="0.01"
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Categories */}
          {categories && categories.length > 0 && (
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Categories
              </label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryToggle(cat.id)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      value.categoryIds.includes(cat.id)
                        ? "text-white"
                        : "bg-muted text-muted-foreground hover:bg-accent",
                    )}
                    style={
                      value.categoryIds.includes(cat.id)
                        ? { backgroundColor: cat.color || "#6366f1" }
                        : undefined
                    }
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
