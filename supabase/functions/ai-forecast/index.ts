/**
 * ExpenseFlow — AI Forecast Edge Function
 *
 * Generates a cash flow forecast for the specified number of days
 * using weighted moving averages, recurring expenses, and pending payments.
 * Returns a narrative summary generated via Gemini.
 *
 * POST /ai-forecast
 * Body: { workspaceId: string, days: 30 | 60 | 90 }
 * Returns: {
 *   projectedExpenses, projectedIncome, projectedNet,
 *   confidence, narrative, breakdown[], assumptions[]
 * }
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

type ForecastDays = 30 | 60 | 90;

interface ForecastRequest {
  workspaceId: string;
  days: ForecastDays;
}

interface ForecastBreakdownItem {
  categoryId: string;
  categoryName: string;
  projectedAmount: number;
  currentAmount: number;
  trend: "up" | "down" | "stable";
}

interface ForecastResponse {
  projectedExpenses: number;
  projectedIncome: number;
  projectedNet: number;
  confidence: number;
  narrative: string;
  breakdown: ForecastBreakdownItem[];
  assumptions: string[];
  periodDays: ForecastDays;
  generatedAt: string;
}

interface ExpenseRow {
  id: string;
  amount: number;
  description: string;
  category_id: string | null;
  date: string;
  type: "expense" | "income";
}

interface RecurringExpenseRow {
  id: string;
  amount: number;
  category_id: string | null;
  recurrence_interval: string;
  next_due_date: string | null;
}

interface PendingPaymentRow {
  id: string;
  amount: number;
  settled_amount: number;
  due_date: string | null;
  direction: "give" | "receive";
  category_id: string | null;
}

interface CategoryRow {
  id: string;
  name: string;
}

interface BudgetRow {
  id: string;
  name: string;
  amount: number;
  spent: number;
  category_id: string | null;
}

interface GeminiGenerateRequest {
  contents: Array<{ parts: Array<{ text: string }> }>;
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
}

// ---------------------------------------------------------------------------
// Weighted Moving Average Forecast (inlined from time-series.ts)
// ---------------------------------------------------------------------------

interface DailyExpense {
  date: string;
  amount: number;
  categoryId: string | null;
  type: "expense" | "income";
}

interface CategoryForecast {
  categoryId: string;
  projectedAmount: number;
  currentAmount: number;
}

interface ForecastResult {
  projectedExpenses: number;
  projectedIncome: number;
  projectedByCategory: CategoryForecast[];
  confidence: number;
  dailyAverage: number;
  currentTotal: number;
}

function forecastCashFlow(
  dailyExpenses: DailyExpense[],
  forecastDays: number,
  recurringExpenses: Array<{
    amount: number;
    categoryId: string | null;
    nextDueDate: string;
    interval: string;
  }>,
  pendingPayments: Array<{
    amount: number;
    dueDate: string | null;
    direction: "give" | "receive";
  }>,
): ForecastResult {
  const now = new Date();
  const forecastEnd = new Date(
    now.getTime() + forecastDays * 24 * 60 * 60 * 1000,
  );

  // Split by type
  const expenseHistory = dailyExpenses.filter((e) => e.type === "expense");
  const incomeHistory = dailyExpenses.filter((e) => e.type === "income");

  // Calculate current totals (last 30 days)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentExpenses = expenseHistory.filter(
    (e) => new Date(e.date) >= thirtyDaysAgo,
  );
  const recentIncome = incomeHistory.filter(
    (e) => new Date(e.date) >= thirtyDaysAgo,
  );

  const currentTotal = recentExpenses.reduce((s, e) => s + e.amount, 0);
  const currentIncome = recentIncome.reduce((s, e) => s + e.amount, 0);

  // Weighted daily average
  const dailyAvgExpense = calculateWeightedDailyAverage(recentExpenses, 30);
  const dailyAvgIncome = calculateWeightedDailyAverage(recentIncome, 30);

  // Projected regular spending
  const projectedRegularExpenses = dailyAvgExpense * forecastDays;
  const projectedRegularIncome = dailyAvgIncome * forecastDays;

  // Upcoming recurring expenses
  let recurringTotal = 0;
  for (const rec of recurringExpenses) {
    const nextDue = new Date(rec.nextDueDate);
    if (nextDue >= now && nextDue <= forecastEnd) {
      recurringTotal += rec.amount;
    }

    if (rec.interval === "weekly") {
      const weeksLeft = Math.floor(forecastDays / 7);
      recurringTotal += rec.amount * Math.max(0, weeksLeft - 1);
    } else if (rec.interval === "monthly" && forecastDays >= 30) {
      const monthsLeft = Math.floor(forecastDays / 30);
      recurringTotal += rec.amount * Math.max(0, monthsLeft - 1);
    }
  }

  // Pending payments within forecast window
  let pendingOutflow = 0;
  let pendingInflow = 0;
  for (const pmt of pendingPayments) {
    if (!pmt.dueDate) continue;
    const due = new Date(pmt.dueDate);
    if (due >= now && due <= forecastEnd) {
      if (pmt.direction === "give") {
        pendingOutflow += pmt.amount;
      } else {
        pendingInflow += pmt.amount;
      }
    }
  }

  const projectedExpenses =
    projectedRegularExpenses + recurringTotal + pendingOutflow;
  const projectedIncome = projectedRegularIncome + pendingInflow;

  // Per-category forecast
  const projectedByCategory = forecastByCategory(
    recentExpenses,
    forecastDays,
    recurringExpenses,
  );

  const confidence = calculateConfidence(
    Math.min(30, forecastDays),
    recentExpenses.length,
  );

  return {
    projectedExpenses: Math.round(projectedExpenses * 100) / 100,
    projectedIncome: Math.round(projectedIncome * 100) / 100,
    projectedByCategory,
    confidence,
    dailyAverage: Math.round(dailyAvgExpense * 100) / 100,
    currentTotal: Math.round(currentTotal * 100) / 100,
  };
}

function calculateWeightedDailyAverage(
  expenses: DailyExpense[],
  windowDays: number,
): number {
  if (windowDays === 0 || expenses.length === 0) return 0;

  const dailyTotals = new Map<string, number>();
  for (const exp of expenses) {
    const key = exp.date.slice(0, 10);
    dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + exp.amount);
  }

  const entries = Array.from(dailyTotals.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  if (entries.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < entries.length; i++) {
    const weight = i + 1; // More recent days get higher weight
    weightedSum += entries[i]![1] * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

function forecastByCategory(
  expenses: DailyExpense[],
  forecastDays: number,
  recurring: Array<{
    amount: number;
    categoryId: string | null;
    nextDueDate: string;
    interval: string;
  }>,
): CategoryForecast[] {
  const categoryTotals = new Map<string, number>();
  const windowDays = 30;

  for (const exp of expenses) {
    const catId = exp.categoryId ?? "uncategorized";
    categoryTotals.set(catId, (categoryTotals.get(catId) ?? 0) + exp.amount);
  }

  const forecasts: CategoryForecast[] = [];

  for (const [categoryId, currentAmount] of categoryTotals) {
    const dailyRate = windowDays > 0 ? currentAmount / windowDays : 0;
    const projectedFromHistory = dailyRate * forecastDays;

    const recurringAmount = recurring
      .filter((r) => r.categoryId === categoryId)
      .reduce((sum, r) => {
        const nextDue = new Date(r.nextDueDate);
        const forecastEnd = new Date(
          Date.now() + forecastDays * 24 * 60 * 60 * 1000,
        );
        return nextDue >= new Date() && nextDue <= forecastEnd
          ? sum + r.amount
          : sum;
      }, 0);

    forecasts.push({
      categoryId,
      currentAmount: Math.round(currentAmount * 100) / 100,
      projectedAmount:
        Math.round((projectedFromHistory + recurringAmount) * 100) / 100,
    });
  }

  forecasts.sort((a, b) => b.projectedAmount - a.projectedAmount);
  return forecasts;
}

function calculateConfidence(
  daysElapsed: number,
  expenseCount: number,
): number {
  if (daysElapsed === 0 || expenseCount === 0) return 0;
  const timeConfidence = Math.min(0.95, 0.3 + (daysElapsed / 30) * 0.65);
  const dataConfidence = Math.min(1.0, expenseCount / 20);
  const combined = timeConfidence * 0.7 + dataConfidence * 0.3;
  return Math.round(combined * 100) / 100;
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
    // Auth verification
    const userClient = createUserClient(req);
    const userId = await getUserId(userClient);
    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    const body: ForecastRequest = await req.json();
    const { workspaceId, days } = body;

    if (!workspaceId?.trim()) {
      return errorResponse("workspaceId is required");
    }

    const validDays: ForecastDays[] = [30, 60, 90];
    if (!validDays.includes(days)) {
      return errorResponse("days must be 30, 60, or 90");
    }

    // Verify workspace membership
    const { data: membership, error: memberError } = await userClient
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .single();

    if (memberError || !membership) {
      return errorResponse("Workspace not found or access denied", 403);
    }

    const admin = createServiceClient();

    // Fetch last 3 months of expense data
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: expenses, error: expensesError } = await admin
      .from("expenses")
      .select("id, amount, description, category_id, date, type")
      .eq("workspace_id", workspaceId)
      .gte("date", threeMonthsAgo.toISOString().split("T")[0]!)
      .order("date", { ascending: false })
      .limit(1000);

    if (expensesError) throw expensesError;

    // Fetch recurring expenses
    const { data: recurring } = await admin
      .from("expenses")
      .select("id, amount, category_id, recurrence_interval, next_due_date")
      .eq("workspace_id", workspaceId)
      .eq("is_recurring", true)
      .not("next_due_date", "is", null);

    // Fetch pending payments (upcoming)
    const forecastEnd = new Date();
    forecastEnd.setDate(forecastEnd.getDate() + days);

    const { data: pendingPayments } = await admin
      .from("pending_payments")
      .select("id, amount, settled_amount, due_date, direction, category_id")
      .eq("workspace_id", workspaceId)
      .in("status", ["pending", "partial"])
      .lte("due_date", forecastEnd.toISOString().split("T")[0]!);

    // Fetch categories
    const { data: categories } = await admin
      .from("categories")
      .select("id, name")
      .eq("workspace_id", workspaceId);

    // Fetch active budgets
    const { data: budgets } = await admin
      .from("budgets")
      .select("id, name, amount, spent, category_id")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true);

    const categoryMap = new Map<string, string>(
      ((categories ?? []) as CategoryRow[]).map((c) => [c.id, c.name]),
    );

    // Transform to forecast inputs
    const dailyExpenses: DailyExpense[] = ((expenses ?? []) as ExpenseRow[]).map(
      (e) => ({
        date: e.date,
        amount: e.amount,
        categoryId: e.category_id,
        type: e.type as "expense" | "income",
      }),
    );

    const recurringInputs = ((recurring ?? []) as RecurringExpenseRow[])
      .filter((r) => r.next_due_date)
      .map((r) => ({
        amount: r.amount,
        categoryId: r.category_id,
        nextDueDate: r.next_due_date!,
        interval: r.recurrence_interval,
      }));

    const pendingInputs = ((pendingPayments ?? []) as PendingPaymentRow[]).map(
      (p) => ({
        amount: p.amount - (p.settled_amount ?? 0),
        dueDate: p.due_date,
        direction: p.direction,
      }),
    );

    // Run forecast
    const forecast = forecastCashFlow(
      dailyExpenses,
      days,
      recurringInputs,
      pendingInputs,
    );

    // Build breakdown with category names
    const breakdown: ForecastBreakdownItem[] = forecast.projectedByCategory
      .slice(0, 10)
      .map((cat) => ({
        categoryId: cat.categoryId,
        categoryName:
          categoryMap.get(cat.categoryId) ?? cat.categoryId,
        projectedAmount: cat.projectedAmount,
        currentAmount: cat.currentAmount,
        trend: determineTrend(cat.currentAmount, cat.projectedAmount, days),
      }));

    // Generate narrative
    const narrative = await generateForecastNarrative(
      forecast,
      (budgets ?? []) as BudgetRow[],
      days,
    );

    // Build assumptions list
    const assumptions = buildAssumptions(
      forecast,
      recurringInputs.length,
      pendingInputs.length,
      days,
    );

    const response: ForecastResponse = {
      projectedExpenses: forecast.projectedExpenses,
      projectedIncome: forecast.projectedIncome,
      projectedNet: forecast.projectedIncome - forecast.projectedExpenses,
      confidence: forecast.confidence,
      narrative,
      breakdown,
      assumptions,
      periodDays: days,
      generatedAt: new Date().toISOString(),
    };

    return jsonResponse(response);
  } catch (err: unknown) {
    console.error("[ai-forecast] Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return errorResponse(message, 500);
  }
});

// ---------------------------------------------------------------------------
// Narrative generation (inlined from forecast/narrative.ts)
// ---------------------------------------------------------------------------

async function generateForecastNarrative(
  forecast: ForecastResult,
  budgets: BudgetRow[],
  forecastDays: number,
): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");

  if (apiKey) {
    try {
      return await callGeminiForNarrative(forecast, budgets, forecastDays, apiKey);
    } catch (err: unknown) {
      console.warn("[ai-forecast] Gemini narrative failed:", err);
    }
  }

  return generateTemplateNarrative(forecast, budgets, forecastDays);
}

async function callGeminiForNarrative(
  forecast: ForecastResult,
  budgets: BudgetRow[],
  forecastDays: number,
  apiKey: string,
): Promise<string> {
  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const topCat = forecast.projectedByCategory[0];

  const summaryData = {
    periodDays: forecastDays,
    projectedExpenses: forecast.projectedExpenses,
    projectedIncome: forecast.projectedIncome,
    projectedNet: forecast.projectedIncome - forecast.projectedExpenses,
    dailyAverage: forecast.dailyAverage,
    confidence: Math.round(forecast.confidence * 100),
    totalBudget: totalBudget > 0 ? totalBudget : null,
    overBudget:
      totalBudget > 0 ? forecast.projectedExpenses > totalBudget : null,
    topCategoryProjected: topCat?.projectedAmount ?? null,
  };

  const prompt = `You are a personal finance advisor. Write a concise 2-3 sentence narrative summary of this ${forecastDays}-day cash flow forecast. Use ₹ for amounts.

Forecast data: ${JSON.stringify(summaryData)}

Rules:
- Be specific about amounts
- Mention whether the outlook is positive or concerning
- Give one actionable tip

Respond with ONLY the narrative text (no JSON, no quotes).`;

  const body: GeminiGenerateRequest = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 200 },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);

  const result = await response.json();
  const text: string = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  return text.trim();
}

function generateTemplateNarrative(
  forecast: ForecastResult,
  budgets: BudgetRow[],
  forecastDays: number,
): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  const parts: string[] = [];

  parts.push(
    `Over the next ${forecastDays} days, you're projected to spend ${fmt(forecast.projectedExpenses)}.`,
  );

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  if (totalBudget > 0) {
    const diff = forecast.projectedExpenses - totalBudget;
    const pct = Math.abs(Math.round((diff / totalBudget) * 100));
    if (diff > 0) {
      parts.push(
        `That's approximately ${pct}% over your total budget of ${fmt(totalBudget)}.`,
      );
    } else {
      parts.push(
        `That's about ${pct}% within your total budget of ${fmt(totalBudget)} — good progress!`,
      );
    }
  }

  if (forecast.projectedIncome > 0) {
    const net = forecast.projectedIncome - forecast.projectedExpenses;
    parts.push(
      `With projected income of ${fmt(forecast.projectedIncome)}, your net position is ${net >= 0 ? "+" : ""}${fmt(net)}.`,
    );
  }

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function determineTrend(
  currentAmount: number,
  projectedAmount: number,
  forecastDays: number,
): "up" | "down" | "stable" {
  // Normalize projected to 30-day equivalent for comparison
  const normalizedProjected = (projectedAmount / forecastDays) * 30;
  const ratio = currentAmount > 0 ? normalizedProjected / currentAmount : 1;

  if (ratio > 1.1) return "up";
  if (ratio < 0.9) return "down";
  return "stable";
}

function buildAssumptions(
  forecast: ForecastResult,
  recurringCount: number,
  pendingCount: number,
  forecastDays: number,
): string[] {
  const assumptions: string[] = [
    `Daily spending rate based on weighted moving average from last 30 days (₹${forecast.dailyAverage.toFixed(0)}/day)`,
    `Forecast covers the next ${forecastDays} days`,
    `Confidence level: ${Math.round(forecast.confidence * 100)}% based on available data`,
  ];

  if (recurringCount > 0) {
    assumptions.push(
      `${recurringCount} recurring expense${recurringCount === 1 ? "" : "s"} factored into projection`,
    );
  }

  if (pendingCount > 0) {
    assumptions.push(
      `${pendingCount} pending payment${pendingCount === 1 ? "" : "s"} with due dates included`,
    );
  }

  assumptions.push(
    "Income projection assumes consistent historical income patterns",
    "No extraordinary one-time expenses are accounted for",
  );

  return assumptions;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
