"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Send,
  Loader2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompactInsight {
  id: string;
  type: "trend_up" | "trend_down" | "warning" | "tip";
  title: string;
  summary: string;
}

interface AiInsightsWidgetProps {
  insights?: CompactInsight[];
  anomalyCount?: number;
  isLoading?: boolean;
  onQuickQuery?: (question: string) => Promise<string>;
  className?: string;
}

// ---------------------------------------------------------------------------
// Icon config
// ---------------------------------------------------------------------------

const ICON_MAP = {
  trend_up: { icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
  trend_down: { icon: TrendingDown, color: "text-destructive", bg: "bg-destructive/10" },
  warning: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
  tip: { icon: Lightbulb, color: "text-primary", bg: "bg-primary/10" },
} as const;

// ---------------------------------------------------------------------------
// Widget
// ---------------------------------------------------------------------------

export function AiInsightsWidget({
  insights = [],
  anomalyCount = 0,
  isLoading = false,
  onQuickQuery,
  className,
}: AiInsightsWidgetProps) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);

  const handleQuery = useCallback(async () => {
    if (!query.trim() || isQuerying || !onQuickQuery) return;

    setIsQuerying(true);
    setAnswer(null);
    try {
      const result = await onQuickQuery(query.trim());
      setAnswer(result);
    } catch {
      setAnswer("Unable to process your question. Try the full insights page.");
    } finally {
      setIsQuerying(false);
    }
  }, [query, isQuerying, onQuickQuery]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleQuery();
    },
    [handleQuery]
  );

  const topInsights = insights.slice(0, 2);

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-gradient-to-br from-primary/5 to-primary/10 shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">
            AI Insights
          </h2>
          {anomalyCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
              {anomalyCount > 9 ? "9+" : anomalyCount}
            </span>
          )}
        </div>
        <Link
          href="/dashboard/insights"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="p-5 space-y-4">
        {/* Insights list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted/60 animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-3/4 rounded bg-muted/60 animate-pulse" />
                  <div className="h-3 w-full rounded bg-muted/60 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : topInsights.length === 0 ? (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xs font-medium text-foreground">
              No insights yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add more expenses to get AI-powered insights
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {topInsights.map((insight) => {
              const config = ICON_MAP[insight.type];
              const Icon = config.icon;
              return (
                <div key={insight.id} className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      config.bg
                    )}
                  >
                    <Icon className={cn("h-4 w-4", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-snug">
                      {insight.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {insight.summary}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Anomaly badge */}
        {anomalyCount > 0 && (
          <Link
            href="/dashboard/insights#anomalies"
            className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/5 px-3 py-2 text-xs text-warning transition-colors hover:bg-warning/10"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium">
              {anomalyCount} anomal{anomalyCount === 1 ? "y" : "ies"} detected
            </span>
            <ArrowRight className="ml-auto h-3.5 w-3.5" />
          </Link>
        )}

        {/* Quick query */}
        {onQuickQuery && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                disabled={isQuerying}
                className={cn(
                  "flex-1 rounded-lg border border-input bg-background/80 px-3 py-2 text-xs text-foreground",
                  "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              />
              <button
                type="button"
                onClick={handleQuery}
                disabled={!query.trim() || isQuerying}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                  query.trim() && !isQuerying
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {isQuerying ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {/* Quick answer */}
            {answer && (
              <div className="rounded-lg border border-border bg-card/80 p-3">
                <p className="text-xs text-muted-foreground">{answer}</p>
                <Link
                  href="/dashboard/insights"
                  className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                >
                  See full analysis
                  <ArrowRight className="h-2.5 w-2.5" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
