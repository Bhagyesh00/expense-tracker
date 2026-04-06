/**
 * ExpenseFlow — Budget Rollover Cron Edge Function
 *
 * Designed to run on the 1st of each month (Supabase cron schedule:
 * "0 0 1 * *" UTC).
 *
 * For every active monthly budget that has rollover_enabled = TRUE:
 *   1. Calculate total expenses in the previous calendar month.
 *   2. Determine unused amount = budget.amount + existing rollover - spent.
 *   3. Apply rollover type:
 *        full    → carry 100 % of unused amount
 *        partial → carry rollover_percentage % of unused amount
 *        capped  → carry min(unused, rollover_cap)
 *   4. Accumulate result into budget.rollover_amount (never goes negative).
 *   5. Create a notification for the workspace members.
 *
 * Can also be invoked manually:
 * POST /functions/v1/budget-rollover
 * Authorization: Bearer <service-role-key>
 * Body (optional): { "workspace_id": "<uuid>", "month": "2026-02" }
 *   workspace_id → process only this workspace (default: all)
 *   month        → override the previous month (format YYYY-MM)
 */

import { corsHeaders, handleCors, errorResponse } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** Return "YYYY-MM" for the month before `now`. */
function previousMonth(now = new Date()): string {
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
  return d.toISOString().slice(0, 7);
}

/** Return the inclusive date range for a "YYYY-MM" string. */
function monthRange(ym: string): { start: string; end: string } {
  const [y, m] = ym.split("-").map(Number);
  const start = `${ym}-01`;
  // Last day of the month
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${ym}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

// ---------------------------------------------------------------------------
// Rollover calculation
// ---------------------------------------------------------------------------

interface BudgetRolloverRow {
  id: string;
  workspace_id: string;
  amount: number;
  rollover_amount: number;
  rollover_type: "full" | "partial" | "capped";
  rollover_percentage: number;
  rollover_cap: number | null;
  categories?: { name: string } | null;
}

function computeRollover(
  budget: BudgetRolloverRow,
  spent: number,
): number {
  const effective = budget.amount + (budget.rollover_amount ?? 0);
  const unused = effective - spent;

  if (unused <= 0) return 0; // overspent — no rollover

  let carry: number;

  switch (budget.rollover_type) {
    case "full":
      carry = unused;
      break;

    case "partial":
      carry = unused * ((budget.rollover_percentage ?? 100) / 100);
      break;

    case "capped":
      carry = budget.rollover_cap != null
        ? Math.min(unused, budget.rollover_cap)
        : unused;
      break;

    default:
      carry = unused;
  }

  return Math.max(0, Math.round(carry * 100) / 100);
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();

  if (req.method !== "POST") {
    return errorResponse("Method not allowed. Use POST.", 405);
  }

  // This function requires service-role authorisation (cron or admin call).
  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!authHeader.includes(serviceKey) && !authHeader.startsWith("Bearer ")) {
    return errorResponse("Service-role authorization required", 401);
  }

  // ── Parse optional overrides ──────────────────────────────────────────────
  let filterWorkspaceId: string | null = null;
  let targetMonth: string = previousMonth();

  try {
    const body = await req.json().catch(() => ({}));
    if (body?.workspace_id) filterWorkspaceId = body.workspace_id as string;
    if (body?.month && /^\d{4}-\d{2}$/.test(body.month)) {
      targetMonth = body.month as string;
    }
  } catch {
    // body is optional
  }

  const { start, end } = monthRange(targetMonth);
  const admin = createServiceClient();
  const now = new Date().toISOString();

  // ── Fetch eligible budgets ────────────────────────────────────────────────
  let budgetQuery = admin
    .from("budgets")
    .select(
      "id, workspace_id, amount, rollover_amount, rollover_type, rollover_percentage, rollover_cap, categories(name)",
    )
    .eq("is_active", true)
    .eq("rollover_enabled", true)
    .eq("period", "monthly");

  if (filterWorkspaceId) {
    budgetQuery = budgetQuery.eq("workspace_id", filterWorkspaceId);
  }

  const { data: budgets, error: budgetsErr } = await budgetQuery;

  if (budgetsErr) {
    return errorResponse(`Failed to fetch budgets: ${budgetsErr.message}`, 500);
  }

  if (!budgets || budgets.length === 0) {
    return new Response(
      JSON.stringify({
        success: true,
        month: targetMonth,
        processed: 0,
        rollovers: [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ── Process each budget ───────────────────────────────────────────────────

  interface RolloverResult {
    budget_id: string;
    workspace_id: string;
    category_name: string;
    spent: number;
    budget_amount: number;
    previous_rollover: number;
    new_rollover: number;
    carry_amount: number;
    notification_sent: boolean;
  }

  const results: RolloverResult[] = [];
  const updateErrors: string[] = [];

  for (const budget of budgets as BudgetRolloverRow[]) {
    // Calculate total spent for this budget's category in the target month.
    // If no category_id filter, we sum all expenses (total budget).
    const { data: spentData, error: spentErr } = await admin
      .from("expenses")
      .select("amount_inr")
      .eq("workspace_id", budget.workspace_id)
      .eq("type", "expense")
      .is("deleted_at", null)
      .gte("date", start)
      .lte("date", end);

    if (spentErr) {
      updateErrors.push(`budget ${budget.id} spent query: ${spentErr.message}`);
      continue;
    }

    const spent = (spentData ?? []).reduce(
      (sum: number, r: { amount_inr: number }) => sum + (Number(r.amount_inr) || 0),
      0,
    );

    const carryAmount = computeRollover(budget, spent);
    const previousRollover = budget.rollover_amount ?? 0;
    const newRolloverAmount = carryAmount; // Replace (not accumulate) each period

    // Update budget.rollover_amount
    const { error: updateErr } = await admin
      .from("budgets")
      .update({ rollover_amount: newRolloverAmount, updated_at: now })
      .eq("id", budget.id);

    if (updateErr) {
      updateErrors.push(`budget ${budget.id} update: ${updateErr.message}`);
      continue;
    }

    // Determine category display name
    const catName =
      (budget.categories as { name: string } | null)?.name ?? "Overall";

    // Create notification for workspace members
    let notificationSent = false;
    if (carryAmount > 0) {
      // Fetch all workspace member user_ids
      const { data: members } = await admin
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", budget.workspace_id);

      if (members && members.length > 0) {
        const notifications = members.map((m: { user_id: string }) => ({
          user_id: m.user_id,
          workspace_id: budget.workspace_id,
          type: "budget_alert",
          title: "Budget Rolled Over",
          message: `₹${carryAmount.toLocaleString("en-IN")} rolled over to ${catName} budget for ${targetMonth}.`,
          metadata: {
            budget_id: budget.id,
            month: targetMonth,
            carry_amount: carryAmount,
            category: catName,
          },
          is_read: false,
          created_at: now,
        }));

        const { error: notifErr } = await admin
          .from("notifications")
          .insert(notifications);

        if (!notifErr) notificationSent = true;
      }
    }

    results.push({
      budget_id: budget.id,
      workspace_id: budget.workspace_id,
      category_name: catName,
      spent: Math.round(spent * 100) / 100,
      budget_amount: budget.amount,
      previous_rollover: previousRollover,
      new_rollover: newRolloverAmount,
      carry_amount: carryAmount,
      notification_sent: notificationSent,
    });
  }

  return new Response(
    JSON.stringify({
      success: updateErrors.length === 0,
      month: targetMonth,
      processed: results.length,
      rollovers: results,
      errors: updateErrors.length > 0 ? updateErrors : undefined,
    }),
    {
      status: updateErrors.length === 0 ? 200 : 207,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
