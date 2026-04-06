/**
 * ExpenseFlow — Subscription Detection Edge Function
 *
 * Analyses the last 6 months of expenses for a workspace and identifies
 * recurring charges by grouping on a normalised merchant name and measuring
 * the intervals between consecutive transactions.
 *
 * Detection rules
 * ───────────────
 *  weekly   : median interval  5 – 9 days,   ≥ 2 occurrences
 *  monthly  : median interval 25 – 35 days,  ≥ 2 occurrences
 *  yearly   : median interval 360 – 366 days, ≥ 2 occurrences
 *
 * Results are upserted into detected_subscriptions (unique on
 * workspace_id, user_id, merchant_name, detected_interval).
 *
 * POST /functions/v1/detect-subscriptions
 * Authorization: Bearer <user-jwt>
 * Body: { "workspace_id": "<uuid>" }
 */

import { corsHeaders, handleCors, errorResponse } from "../_shared/cors.ts";
import { createServiceClient, createUserClient, getUserId } from "../_shared/supabase.ts";

// ---------------------------------------------------------------------------
// Normalisation helpers
// ---------------------------------------------------------------------------

/** Lower-case + strip punctuation + collapse whitespace */
function normaliseMerchant(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")   // punctuation → space
    .replace(/\s+/g, " ")       // collapse whitespace
    .trim();
}

/** Return the median value of a sorted numeric array */
function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// ---------------------------------------------------------------------------
// Interval classification
// ---------------------------------------------------------------------------

type DetectedInterval = "weekly" | "monthly" | "yearly";

function classifyInterval(medianDays: number): DetectedInterval | null {
  if (medianDays >= 5   && medianDays <= 9)   return "weekly";
  if (medianDays >= 25  && medianDays <= 35)  return "monthly";
  if (medianDays >= 360 && medianDays <= 366) return "yearly";
  return null;
}

/** Add `days` calendar days to a Date string (YYYY-MM-DD) */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();

  if (req.method !== "POST") {
    return errorResponse("Method not allowed. Use POST.", 405);
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  let userClient;
  try {
    userClient = createUserClient(req);
  } catch {
    return errorResponse("Missing or invalid Authorization header", 401);
  }

  const userId = await getUserId(userClient);
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  // ── Body ──────────────────────────────────────────────────────────────────
  let workspaceId: string;
  try {
    const body = await req.json();
    if (!body?.workspace_id) {
      return errorResponse("workspace_id is required", 400);
    }
    workspaceId = body.workspace_id as string;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  // ── Verify workspace membership ───────────────────────────────────────────
  const admin = createServiceClient();

  const { data: member, error: memberErr } = await admin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memberErr || !member) {
    return errorResponse("Workspace not found or access denied", 403);
  }

  // ── Fetch last 6 months of expenses ──────────────────────────────────────
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sinceDate = sixMonthsAgo.toISOString().slice(0, 10);

  const { data: expenses, error: expErr } = await admin
    .from("expenses")
    .select("id, description, amount, currency, date")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("type", "expense")
    .is("deleted_at", null)
    .gte("date", sinceDate)
    .order("date", { ascending: true });

  if (expErr) {
    return errorResponse(`Failed to fetch expenses: ${expErr.message}`, 500);
  }

  if (!expenses || expenses.length === 0) {
    return new Response(
      JSON.stringify({ detected: [], count: 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ── Group by normalised merchant ──────────────────────────────────────────

  interface TxEntry {
    date: string;
    amount: number;
    currency: string;
  }

  const grouped = new Map<string, TxEntry[]>();

  for (const exp of expenses) {
    if (!exp.description?.trim()) continue;
    const key = normaliseMerchant(exp.description);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push({
      date: exp.date as string,
      amount: Number(exp.amount),
      currency: exp.currency ?? "INR",
    });
  }

  // ── Analyse intervals per group ───────────────────────────────────────────

  interface DetectedSub {
    merchant_name: string;
    average_amount: number;
    currency: string;
    detected_interval: DetectedInterval;
    transaction_count: number;
    last_charged_at: string;
    next_expected_at: string;
  }

  const detected: DetectedSub[] = [];

  for (const [merchant, txns] of grouped.entries()) {
    if (txns.length < 2) continue;

    // Sort by date ascending (should already be sorted but guard anyway)
    txns.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate day-intervals between consecutive transactions
    const intervals: number[] = [];
    for (let i = 1; i < txns.length; i++) {
      const prev = new Date(txns[i - 1].date).getTime();
      const curr = new Date(txns[i].date).getTime();
      const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
      intervals.push(diffDays);
    }

    intervals.sort((a, b) => a - b);
    const medianDays = median(intervals);
    const interval = classifyInterval(medianDays);
    if (!interval) continue;

    const avgAmount =
      txns.reduce((sum, t) => sum + t.amount, 0) / txns.length;

    const lastDate = txns[txns.length - 1].date;

    // Calculate expected next charge date
    const intervalDays =
      interval === "weekly" ? 7 :
      interval === "monthly" ? 30 :
      365;
    const nextDate = addDays(lastDate, intervalDays);

    detected.push({
      merchant_name: merchant,
      average_amount: Math.round(avgAmount * 100) / 100,
      currency: txns[0].currency,
      detected_interval: interval,
      transaction_count: txns.length,
      last_charged_at: lastDate,
      next_expected_at: nextDate,
    });
  }

  // ── Upsert results into detected_subscriptions ────────────────────────────

  const now = new Date().toISOString();
  const upsertRows = detected.map((d) => ({
    workspace_id: workspaceId,
    user_id: userId,
    merchant_name: d.merchant_name,
    average_amount: d.average_amount,
    currency: d.currency,
    detected_interval: d.detected_interval,
    last_charged_at: d.last_charged_at,
    next_expected_at: d.next_expected_at,
    transaction_count: d.transaction_count,
    updated_at: now,
  }));

  if (upsertRows.length > 0) {
    const { error: upsertErr } = await admin
      .from("detected_subscriptions")
      .upsert(upsertRows, {
        onConflict: "workspace_id,user_id,merchant_name,detected_interval",
        ignoreDuplicates: false,
      });

    if (upsertErr) {
      console.error("detect-subscriptions: upsert error", upsertErr);
      // Non-fatal — still return what we detected
    }
  }

  // ── Fetch current full list (including previously detected) ───────────────
  const { data: currentList } = await admin
    .from("detected_subscriptions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("is_dismissed", false)
    .order("next_expected_at", { ascending: true });

  return new Response(
    JSON.stringify({
      detected: currentList ?? [],
      count: (currentList ?? []).length,
      newly_detected: detected.length,
      analysed_expenses: expenses.length,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
