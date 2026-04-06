/**
 * ExpenseFlow — AI Insights: Monthly Insight Generation
 *
 * Fetches the last 30 days of workspace expenses, runs anomaly detection,
 * generates AI-powered narrative insights via Gemini, and stores results
 * in the ai_insights table.
 *
 * Can be triggered as a Supabase scheduled cron job or called on-demand.
 *
 * POST /ai-insights/generate
 * Body: { workspaceId: string }
 * Returns: { generated: number, insights: AIInsight[] }
 */

import { corsHeaders, handleCors, errorResponse } from "../_shared/cors.ts";
import {
  createUserClient,
  createServiceClient,
  getUserId,
} from "../_shared/supabase.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InsightType =
  | "spending_pattern"
  | "anomaly"
  | "budget_warning"
  | "savings_opportunity"
  | "forecast";

type InsightSeverity = "info" | "warning" | "critical";

interface AIInsight {
  workspace_id: string;
  user_id: string;
  type: InsightType;
  title: string;
  description: string;
  supporting_data: Record<string, unknown>;
  recommendation: string;
  severity: InsightSeverity;
  is_dismissed: boolean;
}

interface ExpenseRow {
  id: string;
  amount: number;
  description: string;
  category_id: string | null;
  date: string;
  type: string;
  created_at: string;
}

interface BudgetRow {
  id: string;
  name: string;
  amount: number;
  spent: number;
  category_id: string | null;
  alert_threshold: number;
}

interface CategoryRow {
  id: string;
  name: string;
}

interface GeminiGenerateRequest {
  contents: Array<{ parts: Array<{ text: string }> }>;
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
}

// ---------------------------------------------------------------------------
// Anomaly detection (inlined from packages/ai/src/anomaly/detector.ts)
// ---------------------------------------------------------------------------

type AnomalySeverity = "low" | "medium" | "high";
type AnomalyType =
  | "high_spend"
  | "velocity_spike"
  | "duplicate"
  | "unusual_merchant";

interface Anomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  categoryId?: string;
  categoryName?: string;
  amount?: number;
  average?: number;
  description: string;
  relatedExpenseIds?: string[];
}

interface HistoricalAverage {
  categoryId: string;
  categoryName: string;
  mean: number;
  stddev: number;
  count: number;
}

function detectAnomalies(
  expenses: ExpenseRow[],
  historicalAverages: HistoricalAverage[],
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  anomalies.push(...detectZScoreAnomalies(expenses, historicalAverages));
  anomalies.push(...detectVelocitySpikes(expenses, historicalAverages));
  anomalies.push(...detectDuplicates(expenses));

  const severityOrder: Record<AnomalySeverity, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  anomalies.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  return anomalies;
}

function detectZScoreAnomalies(
  expenses: ExpenseRow[],
  averages: HistoricalAverage[],
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const categorySpend = new Map<string, number>();

  for (const exp of expenses) {
    if (exp.category_id) {
      categorySpend.set(
        exp.category_id,
        (categorySpend.get(exp.category_id) ?? 0) + exp.amount,
      );
    }
  }

  for (const avg of averages) {
    if (avg.stddev === 0 || avg.count < 3) continue;
    const currentSpend = categorySpend.get(avg.categoryId);
    if (currentSpend === undefined) continue;

    const zScore = (currentSpend - avg.mean) / avg.stddev;

    if (zScore > 3) {
      anomalies.push({
        type: "high_spend",
        severity: "high",
        categoryId: avg.categoryId,
        categoryName: avg.categoryName,
        amount: currentSpend,
        average: avg.mean,
        description: `Spending in ${avg.categoryName} is significantly above normal — ₹${currentSpend.toFixed(0)} vs usual ₹${avg.mean.toFixed(0)}`,
      });
    } else if (zScore > 2) {
      anomalies.push({
        type: "high_spend",
        severity: "medium",
        categoryId: avg.categoryId,
        categoryName: avg.categoryName,
        amount: currentSpend,
        average: avg.mean,
        description: `Spending in ${avg.categoryName} is above normal — ₹${currentSpend.toFixed(0)} vs usual ₹${avg.mean.toFixed(0)}`,
      });
    }
  }

  return anomalies;
}

function detectVelocitySpikes(
  expenses: ExpenseRow[],
  averages: HistoricalAverage[],
): Anomaly[] {
  if (expenses.length === 0) return [];

  const monthlyAverageTotal = averages.reduce((sum, a) => sum + a.mean, 0);
  const dailyAverageRate = monthlyAverageTotal / 30;
  if (dailyAverageRate === 0) return [];

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const recentExpenses = expenses.filter(
    (e) => new Date(e.date) >= threeDaysAgo,
  );

  if (recentExpenses.length === 0) return [];

  const recentTotal = recentExpenses.reduce((sum, e) => sum + e.amount, 0);
  const recentDailyRate = recentTotal / 3;
  const velocityRatio = recentDailyRate / dailyAverageRate;

  if (velocityRatio > 2.5) {
    return [
      {
        type: "velocity_spike",
        severity: "high",
        amount: recentDailyRate,
        average: dailyAverageRate,
        description: `Your daily spending rate (₹${recentDailyRate.toFixed(0)}/day) is ${velocityRatio.toFixed(1)}x your normal rate`,
      },
    ];
  } else if (velocityRatio > 1.5) {
    return [
      {
        type: "velocity_spike",
        severity: "medium",
        amount: recentDailyRate,
        average: dailyAverageRate,
        description: `Your daily spending rate (₹${recentDailyRate.toFixed(0)}/day) is above your normal ₹${dailyAverageRate.toFixed(0)}/day`,
      },
    ];
  }

  return [];
}

function detectDuplicates(expenses: ExpenseRow[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const seen = new Set<string>();

  const sorted = [...expenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i]!;
    for (let j = i + 1; j < sorted.length; j++) {
      const other = sorted[j]!;
      const timeDiff = Math.abs(
        new Date(current.date).getTime() - new Date(other.date).getTime(),
      );

      if (timeDiff > 24 * 60 * 60 * 1000) break;

      if (
        current.amount === other.amount &&
        areSimilarDescriptions(current.description, other.description)
      ) {
        const pairKey = [current.id, other.id].sort().join(":");
        if (seen.has(pairKey)) continue;
        seen.add(pairKey);

        anomalies.push({
          type: "duplicate",
          severity: "medium",
          amount: current.amount,
          description: `Possible duplicate: "${current.description}" for ₹${current.amount} appears twice within 24 hours`,
          relatedExpenseIds: [current.id, other.id],
        });
      }
    }
  }

  return anomalies;
}

function areSimilarDescriptions(a: string, b: string): boolean {
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    // Allow service-role invocations (cron) or user-authenticated calls
    let userId: string | null = null;
    let isServiceCall = false;

    const authHeader = req.headers.get("Authorization") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (authHeader === `Bearer ${serviceRoleKey}`) {
      isServiceCall = true;
    } else {
      const userClient = createUserClient(req);
      userId = await getUserId(userClient);
      if (!userId) {
        return errorResponse("Unauthorized", 401);
      }
    }

    const body: { workspaceId: string } = await req.json();
    const { workspaceId } = body;

    if (!workspaceId?.trim()) {
      return errorResponse("workspaceId is required");
    }

    const admin = createServiceClient();

    // If user call, verify workspace membership
    if (!isServiceCall && userId) {
      const { data: membership } = await admin
        .from("workspace_members")
        .select("workspace_id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .single();

      if (!membership) {
        return errorResponse("Workspace not found or access denied", 403);
      }
    }

    // Get workspace owner/members for userId assignment
    const { data: workspace } = await admin
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single();

    const resolvedUserId = userId ?? (workspace?.owner_id as string);
    if (!resolvedUserId) {
      return errorResponse("Could not resolve workspace user", 400);
    }

    // Fetch last 30 days of expenses
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: expenses, error: expensesError } = await admin
      .from("expenses")
      .select("id, amount, description, category_id, date, type, created_at")
      .eq("workspace_id", workspaceId)
      .eq("type", "expense")
      .gte("date", thirtyDaysAgo.toISOString().split("T")[0]!)
      .order("date", { ascending: false })
      .limit(500);

    if (expensesError) throw expensesError;

    const expenseList = (expenses ?? []) as ExpenseRow[];

    // Fetch categories for name resolution
    const { data: categories } = await admin
      .from("categories")
      .select("id, name")
      .eq("workspace_id", workspaceId);

    const categoryMap = new Map<string, string>(
      ((categories ?? []) as CategoryRow[]).map((c) => [c.id, c.name]),
    );

    // Fetch budgets
    const { data: budgets } = await admin
      .from("budgets")
      .select("id, name, amount, spent, category_id, alert_threshold")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true);

    const budgetList = (budgets ?? []) as BudgetRow[];

    // Build historical averages from the expense data (simple 30-day aggregation)
    const historicalAverages = buildHistoricalAverages(
      expenseList,
      categoryMap,
    );

    // Run anomaly detection
    const anomalies = detectAnomalies(expenseList, historicalAverages);

    // Generate insights array
    const insights: AIInsight[] = [];

    // 1. Anomaly insights
    for (const anomaly of anomalies.slice(0, 5)) {
      const severity = mapAnomalySeverity(anomaly.severity);
      insights.push({
        workspace_id: workspaceId,
        user_id: resolvedUserId,
        type: "anomaly",
        title: getTitleForAnomaly(anomaly),
        description: anomaly.description,
        supporting_data: {
          anomalyType: anomaly.type,
          amount: anomaly.amount,
          average: anomaly.average,
          categoryId: anomaly.categoryId,
          categoryName: anomaly.categoryName,
          relatedExpenseIds: anomaly.relatedExpenseIds,
        },
        recommendation: getRecommendationForAnomaly(anomaly),
        severity,
        is_dismissed: false,
      });
    }

    // 2. Budget warning insights
    for (const budget of budgetList) {
      const spentPercent = budget.amount > 0
        ? (budget.spent / budget.amount) * 100
        : 0;
      const threshold = budget.alert_threshold ?? 80;

      if (spentPercent >= 100) {
        insights.push({
          workspace_id: workspaceId,
          user_id: resolvedUserId,
          type: "budget_warning",
          title: `Budget exceeded: ${budget.name}`,
          description: `You've exceeded your ${budget.name} budget — spent ₹${budget.spent.toFixed(0)} of ₹${budget.amount.toFixed(0)} (${spentPercent.toFixed(0)}%).`,
          supporting_data: {
            budgetId: budget.id,
            budgetName: budget.name,
            amount: budget.amount,
            spent: budget.spent,
            spentPercent,
          },
          recommendation: `Review your ${budget.name} spending and consider adjusting the budget or reducing discretionary expenses.`,
          severity: "critical",
          is_dismissed: false,
        });
      } else if (spentPercent >= threshold) {
        insights.push({
          workspace_id: workspaceId,
          user_id: resolvedUserId,
          type: "budget_warning",
          title: `Budget alert: ${budget.name}`,
          description: `You've used ${spentPercent.toFixed(0)}% of your ${budget.name} budget (₹${budget.spent.toFixed(0)} of ₹${budget.amount.toFixed(0)}).`,
          supporting_data: {
            budgetId: budget.id,
            budgetName: budget.name,
            amount: budget.amount,
            spent: budget.spent,
            spentPercent,
          },
          recommendation: `You're approaching your ${budget.name} budget limit. Consider slowing down spending in this category.`,
          severity: "warning",
          is_dismissed: false,
        });
      }
    }

    // 3. Spending pattern insights (AI-generated narrative)
    if (expenseList.length >= 5) {
      const patternInsight = await generateSpendingPatternInsight(
        expenseList,
        categoryMap,
        workspaceId,
        resolvedUserId,
      );
      if (patternInsight) insights.push(patternInsight);
    }

    // 4. Savings opportunity insights
    const savingsInsight = detectSavingsOpportunity(
      expenseList,
      categoryMap,
      workspaceId,
      resolvedUserId,
    );
    if (savingsInsight) insights.push(savingsInsight);

    // Delete stale non-dismissed insights older than 7 days before inserting new ones
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    await admin
      .from("ai_insights")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("is_dismissed", false)
      .lt("created_at", sevenDaysAgo.toISOString())
      .in("type", ["spending_pattern", "anomaly", "budget_warning", "savings_opportunity"]);

    // Insert new insights
    if (insights.length > 0) {
      const { error: insertError } = await admin
        .from("ai_insights")
        .insert(insights);

      if (insertError) {
        console.error("[ai-insights/generate] Insert error:", insertError);
        throw insertError;
      }
    }

    return jsonResponse({
      generated: insights.length,
      insights,
    });
  } catch (err: unknown) {
    console.error("[ai-insights/generate] Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return errorResponse(message, 500);
  }
});

// ---------------------------------------------------------------------------
// Historical averages calculation
// ---------------------------------------------------------------------------

function buildHistoricalAverages(
  expenses: ExpenseRow[],
  categoryMap: Map<string, string>,
): HistoricalAverage[] {
  const categorySpend = new Map<string, number[]>();

  // Group amounts by category (use weekly buckets for stddev calculation)
  const weeklyBuckets = new Map<string, Map<number, number>>();

  for (const exp of expenses) {
    const catId = exp.category_id ?? "uncategorized";
    if (!weeklyBuckets.has(catId)) {
      weeklyBuckets.set(catId, new Map());
    }

    const weekNum = Math.floor(
      new Date(exp.date).getTime() / (7 * 24 * 60 * 60 * 1000),
    );
    const bucket = weeklyBuckets.get(catId)!;
    bucket.set(weekNum, (bucket.get(weekNum) ?? 0) + exp.amount);
  }

  const averages: HistoricalAverage[] = [];

  for (const [catId, weekBuckets] of weeklyBuckets) {
    const amounts = Array.from(weekBuckets.values());
    if (amounts.length === 0) continue;

    const mean = amounts.reduce((s, v) => s + v, 0) / amounts.length;
    const variance =
      amounts.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / amounts.length;
    const stddev = Math.sqrt(variance);

    averages.push({
      categoryId: catId,
      categoryName: categoryMap.get(catId) ?? catId,
      mean,
      stddev,
      count: amounts.length,
    });
  }

  return averages;
}

// ---------------------------------------------------------------------------
// AI narrative generation
// ---------------------------------------------------------------------------

async function generateSpendingPatternInsight(
  expenses: ExpenseRow[],
  categoryMap: Map<string, string>,
  workspaceId: string,
  userId: string,
): Promise<AIInsight | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return null;

  // Build category summary
  const catTotals = new Map<string, number>();
  let totalSpend = 0;

  for (const exp of expenses) {
    const catName = exp.category_id
      ? (categoryMap.get(exp.category_id) ?? "Other")
      : "Uncategorized";
    catTotals.set(catName, (catTotals.get(catName) ?? 0) + exp.amount);
    totalSpend += exp.amount;
  }

  const topCategories = Array.from(catTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => `${name}: ₹${amount.toFixed(0)}`)
    .join(", ");

  const prompt = `You are a personal finance advisor. Analyze this 30-day spending summary and provide ONE key insight.

Total spend: ₹${totalSpend.toFixed(0)}
Top categories: ${topCategories}
Number of transactions: ${expenses.length}

Respond with ONLY a JSON object:
{
  "title": "<short insight title, max 60 chars>",
  "description": "<2-3 sentence description of the spending pattern>",
  "recommendation": "<one actionable recommendation>"
}`;

  try {
    const body: GeminiGenerateRequest = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 256 },
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) return null;

    const result = await response.json();
    const rawText: string =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    return {
      workspace_id: workspaceId,
      user_id: userId,
      type: "spending_pattern",
      title: typeof parsed.title === "string"
        ? parsed.title
        : "Monthly Spending Pattern",
      description: typeof parsed.description === "string"
        ? parsed.description
        : `You spent ₹${totalSpend.toFixed(0)} across ${expenses.length} transactions.`,
      supporting_data: {
        totalSpend,
        transactionCount: expenses.length,
        topCategories: Array.from(catTotals.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, amount]) => ({ name, amount })),
      },
      recommendation: typeof parsed.recommendation === "string"
        ? parsed.recommendation
        : "Review your top spending categories to identify savings opportunities.",
      severity: "info",
      is_dismissed: false,
    };
  } catch {
    return null;
  }
}

function detectSavingsOpportunity(
  expenses: ExpenseRow[],
  categoryMap: Map<string, string>,
  workspaceId: string,
  userId: string,
): AIInsight | null {
  if (expenses.length < 10) return null;

  // Find categories with high frequency and potential for reduction
  const catData = new Map<
    string,
    { name: string; total: number; count: number }
  >();

  for (const exp of expenses) {
    const catId = exp.category_id ?? "uncategorized";
    const catName = categoryMap.get(catId) ?? "Uncategorized";
    const existing = catData.get(catId) ?? {
      name: catName,
      total: 0,
      count: 0,
    };
    catData.set(catId, {
      name: catName,
      total: existing.total + exp.amount,
      count: existing.count + 1,
    });
  }

  // Find the discretionary category with highest frequency
  const DISCRETIONARY = [
    "food",
    "dining",
    "restaurant",
    "entertainment",
    "shopping",
    "subscription",
  ];

  let bestCandidate: {
    id: string;
    name: string;
    total: number;
    count: number;
  } | null = null;

  for (const [id, data] of catData) {
    const isDiscretionary = DISCRETIONARY.some((d) =>
      data.name.toLowerCase().includes(d),
    );

    if (isDiscretionary && data.count >= 5) {
      if (!bestCandidate || data.total > bestCandidate.total) {
        bestCandidate = { id, ...data };
      }
    }
  }

  if (!bestCandidate) return null;

  const potentialSavings = Math.round(bestCandidate.total * 0.2);

  return {
    workspace_id: workspaceId,
    user_id: userId,
    type: "savings_opportunity",
    title: `Save up to ₹${potentialSavings} on ${bestCandidate.name}`,
    description: `You spent ₹${bestCandidate.total.toFixed(0)} on ${bestCandidate.name} across ${bestCandidate.count} transactions in the last 30 days. A 20% reduction could save ₹${potentialSavings}.`,
    supporting_data: {
      categoryId: bestCandidate.id,
      categoryName: bestCandidate.name,
      totalSpent: bestCandidate.total,
      transactionCount: bestCandidate.count,
      potentialSavings,
    },
    recommendation: `Consider setting a budget limit for ${bestCandidate.name} to track and reduce spending in this category.`,
    severity: "info",
    is_dismissed: false,
  };
}

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

function getTitleForAnomaly(anomaly: Anomaly): string {
  switch (anomaly.type) {
    case "high_spend":
      return anomaly.categoryName
        ? `High spending in ${anomaly.categoryName}`
        : "Unusual high spending detected";
    case "velocity_spike":
      return "Spending pace above normal";
    case "duplicate":
      return "Possible duplicate transaction";
    case "unusual_merchant":
      return "Unusual transaction detected";
    default:
      return "Spending anomaly detected";
  }
}

function getRecommendationForAnomaly(anomaly: Anomaly): string {
  switch (anomaly.type) {
    case "high_spend":
      return "Review recent transactions in this category and check if all charges are expected.";
    case "velocity_spike":
      return "Consider slowing down discretionary purchases for the rest of the week.";
    case "duplicate":
      return "Check if both entries are intentional or if one should be removed.";
    case "unusual_merchant":
      return "Verify this transaction is legitimate and ensure it was authorized by you.";
    default:
      return "Review your recent transactions to confirm all charges are correct.";
  }
}

function mapAnomalySeverity(
  anomalySeverity: AnomalySeverity,
): InsightSeverity {
  switch (anomalySeverity) {
    case "high":
      return "critical";
    case "medium":
      return "warning";
    case "low":
      return "info";
    default:
      return "info";
  }
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
