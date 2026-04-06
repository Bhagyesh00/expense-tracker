"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Star,
  X,
  Calendar,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InsightType = "trend_up" | "trend_down" | "warning" | "tip" | "highlight";

export interface InsightData {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  supportingStat?: string;
  recommendation?: string;
  category?: string;
  generatedAt: Date;
}

interface InsightCardProps {
  insight: InsightData;
  onDismiss?: (id: string) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Icon + color config
// ---------------------------------------------------------------------------

const TYPE_CONFIG: Record<
  InsightType,
  {
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    iconColor: string;
    border: string;
  }
> = {
  trend_up: {
    icon: TrendingUp,
    iconBg: "bg-success/10",
    iconColor: "text-success",
    border: "border-success/20",
  },
  trend_down: {
    icon: TrendingDown,
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    border: "border-destructive/20",
  },
  warning: {
    icon: AlertTriangle,
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
    border: "border-warning/20",
  },
  tip: {
    icon: Lightbulb,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    border: "border-primary/20",
  },
  highlight: {
    icon: Star,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    border: "border-amber-500/20",
  },
};

// ---------------------------------------------------------------------------
// InsightCard
// ---------------------------------------------------------------------------

export function InsightCard({ insight, onDismiss, className }: InsightCardProps) {
  const [isDismissing, setIsDismissing] = useState(false);

  const config = TYPE_CONFIG[insight.type];
  const Icon = config.icon;

  const handleDismiss = () => {
    setIsDismissing(true);
    setTimeout(() => onDismiss?.(insight.id), 300);
  };

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-card p-5 shadow-sm transition-all duration-300",
        config.border,
        isDismissing && "scale-95 opacity-0",
        className
      )}
    >
      {/* Dismiss button */}
      {onDismiss && (
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground/50 transition-colors hover:bg-accent hover:text-muted-foreground"
          aria-label="Dismiss insight"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            config.iconBg
          )}
        >
          <Icon className={cn("h-5 w-5", config.iconColor)} />
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <h3 className="text-sm font-semibold text-foreground leading-snug">
            {insight.title}
          </h3>
          {insight.category && (
            <span className="mt-1 inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {insight.category}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        {insight.description}
      </p>

      {/* Supporting stat */}
      {insight.supportingStat && (
        <div className={cn("mt-3 rounded-lg px-3 py-2", config.iconBg)}>
          <p className={cn("text-sm font-semibold", config.iconColor)}>
            {insight.supportingStat}
          </p>
        </div>
      )}

      {/* Recommendation */}
      {insight.recommendation && (
        <div className="mt-3 rounded-lg border border-border bg-accent/30 px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
            Recommendation
          </p>
          <p className="text-sm text-foreground">{insight.recommendation}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center gap-1 text-xs text-muted-foreground/60">
        <Calendar className="h-3 w-3" />
        <span>
          {insight.generatedAt.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// InsightCardSkeleton
// ---------------------------------------------------------------------------

export function InsightCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-sm",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-3 w-1/4 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 rounded bg-muted animate-pulse" />
        <div className="h-3 w-5/6 rounded bg-muted animate-pulse" />
      </div>
      <div className="mt-3 h-8 rounded-lg bg-muted animate-pulse" />
      <div className="mt-3 h-14 rounded-lg bg-muted animate-pulse" />
    </div>
  );
}
