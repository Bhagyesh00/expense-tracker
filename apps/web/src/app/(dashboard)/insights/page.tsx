"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { cn } from "@/lib/cn";
import { createBrowserClient } from "@/lib/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/ui-store";
import { toast } from "sonner";
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Star,
  ChevronRight,
  Loader2,
  History,
  X,
} from "lucide-react";

// Component imports
import { AiChat } from "@/components/insights/ai-chat";
import { InsightCard, InsightCardSkeleton, type InsightData } from "@/components/insights/insight-card";
import { AnomalyAlertGroup, type AnomalyAlertData } from "@/components/insights/anomaly-alert";
import { ForecastCard, type ForecastData } from "@/components/insights/forecast-card";
import { BudgetAdvisorCard, type BudgetRecommendation } from "@/components/insights/budget-advisor-card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QueryHistoryItem {
  id: string;
  question: string;
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// Mock data generators (replace with real API calls in production)
// ---------------------------------------------------------------------------

function generateMockInsights(
  totalSpent: number,
  prevMonthSpent: number,
  topCategory: string
): InsightData[] {
  const now = new Date();
  const diff = totalSpent - prevMonthSpent;
  const diffPercent = prevMonthSpent > 0 ? ((diff / prevMonthSpent) * 100).toFixed(1) : "0";

  return [
    {
      id: "1",
      type: diff > 0 ? "trend_up" : "trend_down",
      title: diff > 0 ? "Spending increased this month" : "Great job saving this month!",
      description: diff > 0
        ? `Your spending has gone up compared to last month. You've spent ₹${Math.abs(diff).toLocaleString("en-IN")} more.`
        : `Your spending has decreased compared to last month. You've saved ₹${Math.abs(diff).toLocaleString("en-IN")} more.`,
      supportingStat: `₹${Math.abs(diff).toLocaleString("en-IN")} ${diff > 0 ? "more" : "less"} than last month (${Math.abs(Number(diffPercent))}%)`,
      recommendation: diff > 0
        ? "Review your recent transactions and identify areas where you can cut back."
        : "Keep up the good work! Consider moving the savings to a dedicated savings goal.",
      category: "Monthly Trend",
      generatedAt: now,
    },
    {
      id: "2",
      type: "warning",
      title: `${topCategory} is your biggest expense`,
      description: `You're spending the most in ${topCategory} this month. This is your top spending category by a significant margin.`,
      recommendation: `Set a specific budget for ${topCategory} to keep spending under control.`,
      category: "Category Analysis",
      generatedAt: now,
    },
    {
      id: "3",
      type: "tip",
      title: "Consider automating your savings",
      description:
        "Based on your income and expense patterns, you have room to save more consistently. Automating a fixed transfer each month could help.",
      recommendation:
        "Set up a recurring transfer of at least 20% of your monthly income to a savings account.",
      category: "Savings Opportunity",
      generatedAt: now,
    },
    {
      id: "4",
      type: "highlight",
      title: "Recurring expenses detected",
      description:
        "We've identified several recurring transactions in your history. Tracking these helps forecast your monthly commitments accurately.",
      recommendation:
        "Review your recurring expenses and cancel any subscriptions you no longer use.",
      category: "Recurring Spend",
      generatedAt: now,
    },
  ];
}

function generateMockAnomalies(): AnomalyAlertData[] {
  return [
    {
      id: "a1",
      severity: "warning",
      type: "high_spend",
      title: "Above-average spending in Dining",
      description: "Your dining spend this month is 45% above your 3-month average.",
      amount: 8500,
      date: new Date(),
      categoryAverage: 5860,
      categoryName: "Dining",
    },
    {
      id: "a2",
      severity: "info",
      type: "velocity_spike",
      title: "High spending pace this week",
      description: "Your daily spend rate (₹1,200/day) is higher than your usual ₹800/day.",
      amount: 1200,
      categoryAverage: 800,
    },
    {
      id: "a3",
      severity: "critical",
      type: "unusual_merchant",
      title: "Unusual large transaction",
      description: "A ₹15,000 transaction from an unfamiliar source was detected.",
      amount: 15000,
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      categoryAverage: 2500,
    },
  ];
}

function generateMockForecasts(): Partial<Record<30 | 60 | 90, ForecastData>> {
  const now = new Date();
  return {
    30: {
      period: 30,
      projectedIncome: 85000,
      projectedExpenses: 62000,
      projectedSavings: 23000,
      confidence: 78,
      keyDrivers: [
        { label: "Recurring expenses", amount: 18000 },
        { label: "Estimated income", amount: 85000 },
        { label: "Variable spending (avg)", amount: 44000 },
      ],
      basedOnMonths: 3,
      lastUpdated: now,
    },
    60: {
      period: 60,
      projectedIncome: 170000,
      projectedExpenses: 128000,
      projectedSavings: 42000,
      confidence: 65,
      keyDrivers: [
        { label: "Recurring expenses", amount: 36000 },
        { label: "Estimated income", amount: 170000 },
        { label: "Variable spending (avg)", amount: 92000 },
      ],
      basedOnMonths: 3,
      lastUpdated: now,
    },
    90: {
      period: 90,
      projectedIncome: 255000,
      projectedExpenses: 196000,
      projectedSavings: 59000,
      confidence: 52,
      keyDrivers: [
        { label: "Recurring expenses", amount: 54000 },
        { label: "Estimated income", amount: 255000 },
        { label: "Variable spending (avg)", amount: 142000 },
      ],
      basedOnMonths: 3,
      lastUpdated: now,
    },
  };
}

function generateMockBudgetRecommendations(): BudgetRecommendation[] {
  return [
    {
      categoryId: "food",
      categoryName: "Food & Dining",
      categoryIcon: "🍽️",
      currentAvgSpend: 8200,
      recommendedBudget: 9000,
      currentBudget: 7500,
      changePercent: 20,
    },
    {
      categoryId: "transport",
      categoryName: "Transport",
      categoryIcon: "🚗",
      currentAvgSpend: 3100,
      recommendedBudget: 3500,
      currentBudget: 3000,
      changePercent: 16.7,
    },
    {
      categoryId: "entertainment",
      categoryName: "Entertainment",
      categoryIcon: "🎬",
      currentAvgSpend: 2800,
      recommendedBudget: 2500,
      currentBudget: undefined,
      changePercent: -10.7,
    },
    {
      categoryId: "shopping",
      categoryName: "Shopping",
      categoryIcon: "🛍️",
      currentAvgSpend: 5200,
      recommendedBudget: 4500,
      currentBudget: 6000,
      changePercent: -25,
    },
    {
      categoryId: "health",
      categoryName: "Health & Fitness",
      categoryIcon: "💊",
      currentAvgSpend: 1800,
      recommendedBudget: 2000,
      currentBudget: 1500,
      changePercent: 33.3,
    },
  ];
}

// ---------------------------------------------------------------------------
// AI query handler (mock — replace with real edge function calls)
// ---------------------------------------------------------------------------

async function handleAiQuery(question: string): Promise<{
  text: string;
  highlights?: string[];
  suggestions?: string[];
  sources?: string;
}> {
  // Simulate latency
  await new Promise((resolve) => setTimeout(resolve, 1200 + Math.random() * 800));

  const q = question.toLowerCase();

  if (q.includes("food") || q.includes("dining") || q.includes("restaurant")) {
    return {
      text: "Your food and dining expenses this month total **₹8,500**, which is 45% above your 3-month average of ₹5,860. The spike is primarily from restaurant visits on weekends.",
      highlights: ["₹8,500 this month", "45% above average", "Weekend dining spike"],
      suggestions: [
        "How does my dining spend compare to last quarter?",
        "Which restaurants do I spend the most at?",
        "What is my weekly food budget?",
      ],
      sources: "Based on 23 transactions from Jan–Mar 2026",
    };
  }

  if (q.includes("budget") || q.includes("track")) {
    return {
      text: "You're currently **on track** with 3 out of 5 active budgets. Your Dining budget is at 113% (overspent by ₹1,000), and Shopping is at 87%. Overall, you've spent **₹52,300** against a total budget of **₹60,000** this month.",
      highlights: ["₹52,300 of ₹60,000 spent", "3/5 budgets on track", "Dining overspent by ₹1,000"],
      suggestions: [
        "Which budget categories am I closest to exceeding?",
        "How can I adjust my budgets?",
        "Show me my budget history",
      ],
      sources: "Based on 5 active budgets and 67 transactions",
    };
  }

  if (q.includes("spend most") || q.includes("biggest") || q.includes("top categor")) {
    return {
      text: "Your biggest expense category this month is **Food & Dining** at ₹8,500 (27% of total spending), followed by **Shopping** at ₹5,200 (17%) and **Transport** at ₹3,100 (10%). Together, these three categories account for **54% of your total spending**.",
      highlights: ["Food & Dining: ₹8,500 (27%)", "Shopping: ₹5,200 (17%)", "Transport: ₹3,100 (10%)"],
      suggestions: [
        "How has my food spending changed over 3 months?",
        "What are my most frequent transactions?",
        "Am I on track with my budget?",
      ],
      sources: "Based on 67 transactions from March 2026",
    };
  }

  if (q.includes("day") || q.includes("weekday") || q.includes("weekend")) {
    return {
      text: "You spend the most on **Fridays** on average (₹1,840/day), primarily on dining and entertainment. **Weekends** account for 38% of your weekly spending despite being only 2 out of 7 days. **Tuesdays** are your lightest spending days (avg ₹420).",
      highlights: ["Friday: highest (₹1,840 avg)", "Weekends: 38% of weekly spend", "Tuesday: lowest (₹420 avg)"],
      suggestions: [
        "What do I spend the most on during weekends?",
        "How can I reduce my Friday spending?",
        "Show me my daily spending trend",
      ],
      sources: "Based on 3 months of transaction history",
    };
  }

  // Generic response
  return {
    text: `Based on your recent transaction history, here is what I found regarding **"${question}"**: Your total spending this month is ₹31,200 across 67 transactions. Your average daily spend is ₹1,040, and your savings rate is approximately 22% of your estimated monthly income.`,
    highlights: ["₹31,200 total this month", "₹1,040 daily average", "22% savings rate"],
    suggestions: [
      "What did I spend most on this month?",
      "Am I on track with my budget?",
      "Show me my top spending categories",
    ],
    sources: "Based on 67 transactions from Jan–Mar 2026",
  };
}

// ---------------------------------------------------------------------------
// Suggested query chips
// ---------------------------------------------------------------------------

const SUGGESTED_QUERIES = [
  "What did I spend most on this month?",
  "Show me my food expenses trend",
  "Which day do I spend the most?",
  "Am I on track with my budget?",
  "Where can I cut costs?",
  "What's my savings rate?",
];

function SuggestedQueryChip({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 py-1.5 text-sm text-foreground",
        "transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
      )}
    >
      <ChevronRight className="h-3.5 w-3.5 text-primary" />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

function SectionHeader({
  icon,
  title,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function InsightsPage() {
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([]);
  const [isRefreshingInsights, setIsRefreshingInsights] = useState(false);
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());
  const [dismissedAnomalies, setDismissedAnomalies] = useState<Set<string>>(new Set());
  const [pendingQuery, setPendingQuery] = useState<string>("");

  // Mock data (in production, replace with real hooks)
  const [insights, setInsights] = useState<InsightData[]>(() =>
    generateMockInsights(31200, 28400, "Food & Dining")
  );
  const [anomalies] = useState<AnomalyAlertData[]>(() => generateMockAnomalies());
  const [forecasts] = useState(() => generateMockForecasts());
  const [budgetRecommendations] = useState<BudgetRecommendation[]>(() =>
    generateMockBudgetRecommendations()
  );

  const visibleInsights = insights.filter((i) => !dismissedInsights.has(i.id));
  const visibleAnomalies = anomalies.filter((a) => !dismissedAnomalies.has(a.id));

  // AI query handler with history tracking
  const handleQuery = useCallback(async (question: string) => {
    // Save to history
    setQueryHistory((prev) => {
      const existing = prev.filter((h) => h.question !== question);
      return [
        { id: crypto.randomUUID(), question, timestamp: new Date() },
        ...existing,
      ].slice(0, 5);
    });

    return handleAiQuery(question);
  }, []);

  // Listen for suggestion clicks from AiChat bubbles
  useEffect(() => {
    const handler = (e: Event) => {
      const query = (e as CustomEvent<{ query: string }>).detail.query;
      setPendingQuery(query);
    };
    document.addEventListener("ai-suggestion-click", handler);
    return () => document.removeEventListener("ai-suggestion-click", handler);
  }, []);

  const handleRefreshInsights = useCallback(async () => {
    setIsRefreshingInsights(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setInsights(generateMockInsights(31200, 28400, "Food & Dining"));
    setDismissedInsights(new Set());
    setIsRefreshingInsights(false);
    toast.success("Insights refreshed");
  }, []);

  const handleApplyAllBudgets = useCallback(
    async (recs: BudgetRecommendation[]) => {
      // In production: call budget update API for each recommendation
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(`Applied ${recs.length} budget recommendations`);
    },
    []
  );

  const handleApplyOneBudget = useCallback(
    async (rec: BudgetRecommendation, amount: number) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
    },
    []
  );

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            AI Insights
          </h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Intelligent analysis and recommendations powered by AI
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 1. Natural Language Query */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4">
        <SectionHeader
          icon={<Sparkles className="h-5 w-5 text-primary" />}
          title="Ask AI"
        />

        {/* Suggested chips */}
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUERIES.map((q, i) => (
            <SuggestedQueryChip
              key={i}
              label={q}
              onClick={() => setPendingQuery(q)}
            />
          ))}
        </div>

        {/* Chat interface */}
        <AiChat
          onQuery={handleQuery}
          initialSuggestions={SUGGESTED_QUERIES}
          placeholder="Ask anything about your spending..."
          className="min-h-[380px]"
        />

        {/* Query history */}
        {queryHistory.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Recent queries
              </span>
            </div>
            <div className="space-y-1">
              {queryHistory.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPendingQuery(item.question)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="flex-1 truncate">{item.question}</span>
                  <span className="text-xs text-muted-foreground/50 shrink-0">
                    {item.timestamp.toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 2. AI-Generated Insights */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4" id="insights">
        <SectionHeader
          icon={<Lightbulb className="h-5 w-5 text-primary" />}
          title="AI-Generated Insights"
          action={
            <button
              type="button"
              onClick={handleRefreshInsights}
              disabled={isRefreshingInsights}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4",
                  isRefreshingInsights && "animate-spin"
                )}
              />
              Refresh insights
            </button>
          }
        />

        {isRefreshingInsights ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <InsightCardSkeleton key={i} />
            ))}
          </div>
        ) : visibleInsights.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">
              All insights dismissed
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Click &ldquo;Refresh insights&rdquo; to generate new ones
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {visibleInsights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onDismiss={(id) =>
                  setDismissedInsights((prev) => new Set([...prev, id]))
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Anomaly Alerts */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4" id="anomalies">
        <SectionHeader
          icon={<AlertTriangle className="h-5 w-5 text-warning" />}
          title="Anomaly Alerts"
          action={
            visibleAnomalies.length > 0 ? (
              <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-warning/10 px-2 text-xs font-bold text-warning">
                {visibleAnomalies.length}
              </span>
            ) : null
          }
        />

        <AnomalyAlertGroup
          alerts={visibleAnomalies}
          onDismiss={(id) =>
            setDismissedAnomalies((prev) => new Set([...prev, id]))
          }
        />
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Bottom grid: Forecast + Budget Advisor */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 4. Cash Flow Forecast */}
        <section id="forecast">
          <ForecastCard
            forecasts={forecasts}
            onRefresh={async () => {
              await new Promise((r) => setTimeout(r, 1000));
              toast.success("Forecast updated");
            }}
          />
        </section>

        {/* 5. Budget Advisor */}
        <section id="budget-advisor">
          <BudgetAdvisorCard
            recommendations={budgetRecommendations}
            lastUpdated={new Date()}
            onApplyAll={handleApplyAllBudgets}
            onApplyOne={handleApplyOneBudget}
          />
        </section>
      </div>
    </div>
  );
}
