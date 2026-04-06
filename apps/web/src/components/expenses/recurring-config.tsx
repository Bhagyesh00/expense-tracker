"use client";

import { cn } from "@/lib/cn";
import { DatePicker } from "@/components/shared/date-picker";
import { Repeat, CalendarClock } from "lucide-react";

const INTERVALS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
] as const;

interface RecurringConfigProps {
  isRecurring: boolean;
  onIsRecurringChange: (value: boolean) => void;
  interval: string | null;
  onIntervalChange: (value: string) => void;
  endDate: Date | null;
  onEndDateChange: (date: Date | null) => void;
  hasEndDate: boolean;
  onHasEndDateChange: (value: boolean) => void;
  expenseDate?: Date | null;
  className?: string;
}

function getNextOccurrence(
  date: Date | null,
  interval: string | null,
): string {
  if (!date || !interval) return "";
  const next = new Date(date);
  switch (interval) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "biweekly":
      next.setDate(next.getDate() + 14);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function RecurringConfig({
  isRecurring,
  onIsRecurringChange,
  interval,
  onIntervalChange,
  endDate,
  onEndDateChange,
  hasEndDate,
  onHasEndDateChange,
  expenseDate,
  className,
}: RecurringConfigProps) {
  const preview = getNextOccurrence(expenseDate ?? new Date(), interval);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Make this recurring
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isRecurring}
          onClick={() => onIsRecurringChange(!isRecurring)}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
            isRecurring ? "bg-primary" : "bg-input",
          )}
        >
          <span
            className={cn(
              "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg transition-transform",
              isRecurring ? "translate-x-5" : "translate-x-0",
            )}
          />
        </button>
      </div>

      {isRecurring && (
        <div className="space-y-4 rounded-lg border border-border bg-accent/30 p-4">
          {/* Interval */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Repeat every
            </label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {INTERVALS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onIntervalChange(item.value)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                    interval === item.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-foreground hover:bg-accent",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* End date */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Ends
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onHasEndDateChange(false);
                  onEndDateChange(null);
                }}
                className={cn(
                  "rounded-lg border px-4 py-2 text-xs font-medium transition-colors",
                  !hasEndDate
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground hover:bg-accent",
                )}
              >
                Never
              </button>
              <button
                type="button"
                onClick={() => onHasEndDateChange(true)}
                className={cn(
                  "rounded-lg border px-4 py-2 text-xs font-medium transition-colors",
                  hasEndDate
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground hover:bg-accent",
                )}
              >
                Until date
              </button>
            </div>
            {hasEndDate && (
              <div className="mt-2">
                <DatePicker
                  value={endDate}
                  onChange={onEndDateChange}
                  placeholder="Select end date"
                />
              </div>
            )}
          </div>

          {/* Preview */}
          {interval && preview && (
            <div className="flex items-center gap-2 rounded-md bg-primary/5 px-3 py-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              <p className="text-xs text-primary">
                Repeats {interval}, next on {preview}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
