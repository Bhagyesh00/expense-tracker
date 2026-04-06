"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  AlertTriangle,
  Info,
  AlertCircle,
  X,
  ExternalLink,
  TrendingUp,
  ShoppingBag,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnomalySeverity = "info" | "warning" | "critical";

export interface AnomalyAlertData {
  id: string;
  severity: AnomalySeverity;
  type: "high_spend" | "velocity_spike" | "duplicate" | "unusual_merchant";
  title: string;
  description: string;
  amount?: number;
  date?: Date;
  categoryAverage?: number;
  categoryName?: string;
  expenseId?: string;
}

interface AnomalyAlertProps {
  alert: AnomalyAlertData;
  onDismiss?: (id: string) => void;
  className?: string;
}

interface AnomalyAlertGroupProps {
  alerts: AnomalyAlertData[];
  onDismiss?: (id: string) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SEVERITY_CONFIG: Record<
  AnomalySeverity,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    bg: string;
    border: string;
    badgeBg: string;
    badgeText: string;
    iconColor: string;
  }
> = {
  info: {
    label: "Info",
    icon: Info,
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    badgeBg: "bg-blue-500/10",
    badgeText: "text-blue-600 dark:text-blue-400",
    iconColor: "text-blue-500",
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    bg: "bg-warning/5",
    border: "border-warning/20",
    badgeBg: "bg-warning/10",
    badgeText: "text-warning",
    iconColor: "text-warning",
  },
  critical: {
    label: "Critical",
    icon: AlertCircle,
    bg: "bg-destructive/5",
    border: "border-destructive/20",
    badgeBg: "bg-destructive/10",
    badgeText: "text-destructive",
    iconColor: "text-destructive",
  },
};

const TYPE_ICON: Record<
  AnomalyAlertData["type"],
  React.ComponentType<{ className?: string }>
> = {
  high_spend: TrendingUp,
  velocity_spike: TrendingUp,
  duplicate: Info,
  unusual_merchant: ShoppingBag,
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Single alert
// ---------------------------------------------------------------------------

export function AnomalyAlert({
  alert,
  onDismiss,
  className,
}: AnomalyAlertProps) {
  const [isDismissing, setIsDismissing] = useState(false);
  const config = SEVERITY_CONFIG[alert.severity];
  const SeverityIcon = config.icon;

  const handleDismiss = () => {
    setIsDismissing(true);
    setTimeout(() => onDismiss?.(alert.id), 300);
  };

  return (
    <div
      className={cn(
        "relative flex gap-3 rounded-xl border p-4 transition-all duration-300",
        config.bg,
        config.border,
        isDismissing && "scale-95 opacity-0 overflow-hidden",
        className
      )}
    >
      {/* Severity icon */}
      <div className="mt-0.5 shrink-0">
        <SeverityIcon className={cn("h-5 w-5", config.iconColor)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Header row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              config.badgeBg,
              config.badgeText
            )}
          >
            {config.label}
          </span>
          <h4 className="text-sm font-semibold text-foreground">
            {alert.title}
          </h4>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground">{alert.description}</p>

        {/* Amount + date */}
        {(alert.amount !== undefined || alert.date) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {alert.amount !== undefined && (
              <span className="font-semibold text-foreground">
                {formatCurrency(alert.amount)}
              </span>
            )}
            {alert.date && (
              <span>
                {alert.date.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        )}

        {/* Category average comparison */}
        {alert.categoryAverage !== undefined && (
          <p className="text-xs text-muted-foreground">
            Avg spend in {alert.categoryName ?? "this category"}:{" "}
            <span className="font-medium">
              {formatCurrency(alert.categoryAverage)}
            </span>
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          {alert.expenseId && (
            <Link
              href={`/dashboard/expenses/${alert.expenseId}`}
              className={cn(
                "flex items-center gap-1 text-xs font-medium transition-colors",
                config.badgeText,
                "hover:underline"
              )}
            >
              View Expense
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>

      {/* Dismiss X */}
      {onDismiss && (
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3 top-3 rounded-md p-0.5 text-muted-foreground/40 transition-colors hover:bg-accent hover:text-muted-foreground"
          aria-label="Dismiss alert"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Group: sorted by severity
// ---------------------------------------------------------------------------

const SEVERITY_ORDER: Record<AnomalySeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export function AnomalyAlertGroup({
  alerts,
  onDismiss,
  className,
}: AnomalyAlertGroupProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = alerts
    .filter((a) => !dismissed.has(a.id))
    .sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    );

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
    onDismiss?.(id);
  };

  if (visible.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border border-border bg-card py-8 text-center",
          className
        )}
      >
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
          <Info className="h-5 w-5 text-success" />
        </div>
        <p className="text-sm font-medium text-foreground">All clear!</p>
        <p className="mt-1 text-xs text-muted-foreground">
          No spending anomalies detected
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {(["critical", "warning", "info"] as AnomalySeverity[]).map(
        (severity) => {
          const group = visible.filter((a) => a.severity === severity);
          if (group.length === 0) return null;
          const config = SEVERITY_CONFIG[severity];

          return (
            <div key={severity}>
              <div className="mb-2 flex items-center gap-2">
                <config.icon className={cn("h-4 w-4", config.iconColor)} />
                <span
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wide",
                    config.badgeText
                  )}
                >
                  {config.label} ({group.length})
                </span>
              </div>
              <div className="space-y-2">
                {group.map((alert) => (
                  <AnomalyAlert
                    key={alert.id}
                    alert={alert}
                    onDismiss={handleDismiss}
                  />
                ))}
              </div>
            </div>
          );
        }
      )}
    </div>
  );
}
