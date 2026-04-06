"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

interface BudgetProgressProps {
  spent: number;
  budget: number;
  threshold?: number;
  showLabels?: boolean;
  currency?: string;
  formatCurrency?: (amount: number, code: string) => string;
  height?: "sm" | "md" | "lg";
  animated?: boolean;
  className?: string;
}

function getProgressColor(percent: number): string {
  if (percent >= 100) return "bg-red-500";
  if (percent >= 80) return "bg-amber-500";
  if (percent >= 50) return "bg-yellow-500";
  return "bg-emerald-500";
}

function getProgressGradient(percent: number): string {
  if (percent >= 100) return "from-red-400 to-red-600";
  if (percent >= 80) return "from-amber-400 to-red-500";
  if (percent >= 50) return "from-yellow-400 to-amber-500";
  return "from-emerald-400 to-emerald-500";
}

const heightMap = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

export function BudgetProgress({
  spent,
  budget,
  threshold = 80,
  showLabels = true,
  currency = "INR",
  formatCurrency: fmt,
  height = "md",
  animated = true,
  className,
}: BudgetProgressProps) {
  const [width, setWidth] = useState(animated ? 0 : Math.min((spent / budget) * 100, 100));
  const percent = budget > 0 ? (spent / budget) * 100 : 0;
  const clampedPercent = Math.min(percent, 100);

  useEffect(() => {
    if (animated) {
      const timer = requestAnimationFrame(() => {
        setWidth(clampedPercent);
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [animated, clampedPercent]);

  const displayWidth = animated ? width : clampedPercent;
  const thresholdPosition = Math.min(threshold, 100);

  return (
    <div className={cn("w-full", className)}>
      {showLabels && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-foreground">
            {fmt ? fmt(spent, currency) : `${spent.toLocaleString()}`}
            <span className="text-muted-foreground">
              {" "}
              / {fmt ? fmt(budget, currency) : `${budget.toLocaleString()}`}
            </span>
          </span>
          <span
            className={cn(
              "font-semibold",
              percent >= 100
                ? "text-red-600"
                : percent >= 80
                  ? "text-amber-600"
                  : "text-muted-foreground",
            )}
          >
            {Math.round(percent)}%
          </span>
        </div>
      )}

      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-muted",
          heightMap[height],
        )}
      >
        {/* Progress fill */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-all duration-700 ease-out",
            getProgressGradient(percent),
          )}
          style={{ width: `${displayWidth}%` }}
        />

        {/* Threshold marker */}
        {threshold < 100 && (
          <div
            className="absolute inset-y-0 w-0.5 bg-foreground/30"
            style={{ left: `${thresholdPosition}%` }}
          />
        )}
      </div>
    </div>
  );
}
