import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AIQueryResult {
  answer: string;
  data?: {
    label: string;
    value: string | number;
  }[];
  followUpSuggestions?: string[];
  confidence?: number;
}

export interface AIInsight {
  id: string;
  type: "trend" | "warning" | "positive" | "neutral";
  icon: string;
  title: string;
  description: string;
  metric?: string;
  metricLabel?: string;
  recommendation?: string;
  createdAt: string;
}

export interface Anomaly {
  id: string;
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  amount: number;
  avgAmount: number;
  date: string;
  category?: string;
  dismissed?: boolean;
}

export interface CashFlowForecast {
  period: 30 | 60 | 90;
  projectedBalance: number;
  projectedIncome: number;
  projectedExpenses: number;
  projectedSavings: number;
  confidencePercent: number;
  dataMonths: number;
  breakdown: {
    label: string;
    income: number;
    expense: number;
  }[];
}

// ---------------------------------------------------------------------------
// callAIQuery — send a natural language question to the AI edge function
// ---------------------------------------------------------------------------

export async function callAIQuery(
  question: string,
  workspaceId: string,
  userId: string
): Promise<AIQueryResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const supabaseUrl =
    (supabase as unknown as { supabaseUrl?: string }).supabaseUrl ??
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    "";

  const response = await fetch(`${supabaseUrl}/functions/v1/ai-query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ question, workspaceId, userId }),
  });

  if (!response.ok) {
    // Graceful fallback — return a mock response if the edge function isn't deployed yet
    const status = response.status;
    if (status === 404 || status === 503) {
      return generateMockAIResponse(question);
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { message?: string }).message ?? `AI query failed: ${status}`
    );
  }

  return response.json() as Promise<AIQueryResult>;
}

// ---------------------------------------------------------------------------
// getInsights — fetch AI-generated spending insights
// ---------------------------------------------------------------------------

export async function getInsights(workspaceId: string): Promise<AIInsight[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const supabaseUrl =
    (supabase as unknown as { supabaseUrl?: string }).supabaseUrl ??
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    "";

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/ai-insights?workspaceId=${workspaceId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      return getMockInsights();
    }

    return response.json() as Promise<AIInsight[]>;
  } catch {
    return getMockInsights();
  }
}

// ---------------------------------------------------------------------------
// dismissAnomaly — mark an anomaly as dismissed
// ---------------------------------------------------------------------------

export async function dismissAnomaly(anomalyId: string): Promise<void> {
  const { error } = await supabase
    .from("anomalies")
    .update({ dismissed: true, dismissed_at: new Date().toISOString() })
    .eq("id", anomalyId);

  if (error) {
    // Non-critical: log but don't throw so the UI can still update optimistically
    console.warn("Failed to dismiss anomaly:", error.message);
  }
}

// ---------------------------------------------------------------------------
// getForecast — fetch cash flow forecast for a given period
// ---------------------------------------------------------------------------

export async function getForecast(
  workspaceId: string,
  days: 30 | 60 | 90
): Promise<CashFlowForecast> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const supabaseUrl =
    (supabase as unknown as { supabaseUrl?: string }).supabaseUrl ??
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    "";

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/ai-forecast?workspaceId=${workspaceId}&days=${days}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      return getMockForecast(days);
    }

    return response.json() as Promise<CashFlowForecast>;
  } catch {
    return getMockForecast(days);
  }
}

// ---------------------------------------------------------------------------
// Mock data helpers — used when edge functions are not yet deployed
// ---------------------------------------------------------------------------

function generateMockAIResponse(question: string): AIQueryResult {
  const lq = question.toLowerCase();

  if (lq.includes("budget")) {
    return {
      answer:
        "Based on your spending this month, you've used 78% of your Food budget and exceeded your Shopping budget by ₹500. You're within limits for Transport and Bills.",
      data: [
        { label: "Food", value: "78%" },
        { label: "Shopping", value: "110% ⚠️" },
        { label: "Transport", value: "64%" },
      ],
      followUpSuggestions: [
        "How can I reduce food spending?",
        "Show budget history",
      ],
      confidence: 82,
    };
  }

  if (lq.includes("trend") || lq.includes("month")) {
    return {
      answer:
        "Your spending this month is ₹24,500, which is 12% higher than last month (₹21,800). Dining out and online shopping have increased the most.",
      data: [
        { label: "This month", value: "₹24,500" },
        { label: "Last month", value: "₹21,800" },
        { label: "Change", value: "+12%" },
      ],
      followUpSuggestions: ["What drove the increase?", "Show category breakdown"],
      confidence: 88,
    };
  }

  if (lq.includes("categor") || lq.includes("top")) {
    return {
      answer:
        "Your top spending categories this month are: Food & Dining (₹9,800), Bills & Utilities (₹6,200), and Shopping (₹5,500).",
      data: [
        { label: "Food & Dining", value: "₹9,800" },
        { label: "Bills", value: "₹6,200" },
        { label: "Shopping", value: "₹5,500" },
      ],
      followUpSuggestions: [
        "How does this compare to last month?",
        "Am I over budget?",
      ],
      confidence: 95,
    };
  }

  return {
    answer:
      "Based on your spending patterns over the last 3 months, your average monthly expenditure is ₹22,400. You're currently tracking 9% above that pace this month.",
    data: [
      { label: "Monthly avg", value: "₹22,400" },
      { label: "Current pace", value: "₹24,400" },
      { label: "Variance", value: "+9%" },
    ],
    followUpSuggestions: [
      "Top spending categories?",
      "Am I over budget?",
      "Spending trend this month?",
    ],
    confidence: 75,
  };
}

function getMockInsights(): AIInsight[] {
  return [
    {
      id: "ins-1",
      type: "warning",
      icon: "🍔",
      title: "Food spending up 23%",
      description:
        "Your food & dining expenses rose significantly compared to last month.",
      metric: "+₹1,840",
      metricLabel: "vs last month",
      recommendation:
        "Try meal prepping 3 days a week to cut costs by up to ₹2,000/month.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "ins-2",
      type: "positive",
      icon: "🎯",
      title: "Transport savings goal",
      description: "You've reduced Uber/transport spend by 18% this month.",
      metric: "-₹720",
      metricLabel: "saved vs last month",
      recommendation:
        "Keep it up! You're on track to save ₹8,600/year on transport.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "ins-3",
      type: "trend",
      icon: "📈",
      title: "Monthly spend trending up",
      description:
        "Your spending has increased for 3 consecutive months.",
      metric: "₹24,500",
      metricLabel: "projected this month",
      recommendation:
        "Review your subscriptions — you may have unused services costing ~₹1,200/month.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "ins-4",
      type: "positive",
      icon: "💰",
      title: "Good savings rate",
      description: "You're saving 28% of your income this month.",
      metric: "28%",
      metricLabel: "savings rate",
      recommendation:
        "Consider putting the surplus ₹5,000 into a recurring deposit.",
      createdAt: new Date().toISOString(),
    },
  ];
}

export function getMockAnomalies(): Anomaly[] {
  return [
    {
      id: "ano-1",
      severity: "high",
      title: "Unusually large restaurant bill",
      description: "Single dining expense 4.2× your monthly average",
      amount: 3800,
      avgAmount: 900,
      date: "Mar 24, 2026",
      category: "Food",
    },
    {
      id: "ano-2",
      severity: "medium",
      title: "Duplicate subscription detected",
      description: "Two streaming charges this month vs one last month",
      amount: 1298,
      avgAmount: 649,
      date: "Mar 20, 2026",
      category: "Entertainment",
    },
    {
      id: "ano-3",
      severity: "low",
      title: "Weekend spending spike",
      description: "Saturday spending 60% above your weekend average",
      amount: 4200,
      avgAmount: 2600,
      date: "Mar 22, 2026",
      category: "Shopping",
    },
  ];
}

function getMockForecast(days: 30 | 60 | 90): CashFlowForecast {
  const multiplier = days / 30;

  return {
    period: days,
    projectedBalance: Math.round(60500 + 85000 * multiplier - 24500 * multiplier),
    projectedIncome: Math.round(85000 * multiplier),
    projectedExpenses: Math.round(24500 * multiplier),
    projectedSavings: Math.round((85000 - 24500) * multiplier),
    confidencePercent: days === 30 ? 87 : days === 60 ? 74 : 61,
    dataMonths: 4,
    breakdown: Array.from({ length: Math.ceil(days / 30) }, (_, i) => ({
      label:
        days === 30
          ? `Week ${i + 1}`
          : `Month ${i + 1}`,
      income: Math.round(85000 / (days / 30) + (Math.random() - 0.5) * 5000),
      expense: Math.round(24500 / (days / 30) + (Math.random() - 0.5) * 3000),
    })),
  };
}
