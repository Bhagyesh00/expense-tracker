"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/cn";
import { useFormatCurrency } from "@/hooks/use-currency";
import type { DailyHeatmapPoint } from "@/hooks/use-reports";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";

interface HeatmapCalendarProps {
  data: DailyHeatmapPoint[];
  isLoading: boolean;
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getIntensity(
  amount: number,
  max: number,
): "none" | "low" | "medium" | "high" | "very-high" {
  if (amount === 0) return "none";
  const ratio = amount / max;
  if (ratio <= 0.25) return "low";
  if (ratio <= 0.5) return "medium";
  if (ratio <= 0.75) return "high";
  return "very-high";
}

const intensityColors: Record<string, string> = {
  none: "bg-muted/30 dark:bg-muted/20",
  low: "bg-emerald-200 dark:bg-emerald-900/60",
  medium: "bg-yellow-300 dark:bg-yellow-700/60",
  high: "bg-orange-400 dark:bg-orange-600/60",
  "very-high": "bg-red-500 dark:bg-red-600/60",
};

export function HeatmapCalendar({
  data,
  isLoading,
  year,
  month,
  onMonthChange,
}: HeatmapCalendarProps) {
  const { formatCurrency } = useFormatCurrency();
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    data: DailyHeatmapPoint;
  } | null>(null);

  const maxAmount = useMemo(
    () => Math.max(1, ...data.map((d) => d.amount)),
    [data],
  );

  // Build calendar grid
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();

    // getDay: 0=Sun, convert to Mon=0
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const dataMap = new Map(data.map((d) => [d.date, d]));

    const cells: (DailyHeatmapPoint | null)[] = [];

    // Empty cells before month starts
    for (let i = 0; i < startDow; i++) {
      cells.push(null);
    }

    // Days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push(dataMap.get(dateStr) ?? { date: dateStr, amount: 0, count: 0 });
    }

    return cells;
  }, [data, year, month]);

  const handlePrev = () => {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  };

  const handleNext = () => {
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded bg-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">
          Daily Spend Heatmap
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[140px] text-center text-sm font-medium text-foreground">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            type="button"
            onClick={handleNext}
            className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {data.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Flame className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            No spending data for this month
          </p>
        </div>
      ) : (
        <>
          {/* Day headers */}
          <div className="mb-1 grid grid-cols-7 gap-1">
            {DAY_LABELS.map((label) => (
              <div
                key={label}
                className="text-center text-[10px] font-medium text-muted-foreground"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="relative grid grid-cols-7 gap-1">
            {calendarGrid.map((cell, i) => {
              if (!cell) {
                return <div key={`empty-${i}`} className="aspect-square" />;
              }

              const intensity = getIntensity(cell.amount, maxAmount);
              const day = parseInt(cell.date.split("-")[2], 10);

              return (
                <div
                  key={cell.date}
                  className={cn(
                    "relative aspect-square cursor-default rounded-sm transition-transform hover:scale-110",
                    intensityColors[intensity],
                  )}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                      data: cell,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-foreground/70">
                    {day}
                  </span>
                </div>
              );
            })}

            {/* Tooltip */}
            {tooltip && (
              <div
                className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-popover px-3 py-2 shadow-md"
                style={{ left: tooltip.x, top: tooltip.y - 8 }}
              >
                <p className="text-xs font-medium text-foreground">
                  {new Date(tooltip.data.date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(tooltip.data.amount, "INR")} &middot;{" "}
                  {tooltip.data.count} transaction
                  {tooltip.data.count !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-end gap-1.5">
            <span className="text-[10px] text-muted-foreground">Low</span>
            {["none", "low", "medium", "high", "very-high"].map((level) => (
              <div
                key={level}
                className={cn(
                  "h-3 w-3 rounded-sm",
                  intensityColors[level],
                )}
              />
            ))}
            <span className="text-[10px] text-muted-foreground">High</span>
          </div>
        </>
      )}
    </div>
  );
}
