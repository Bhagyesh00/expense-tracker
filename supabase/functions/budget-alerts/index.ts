/**
 * ExpenseFlow — Budget Alerts Cron Edge Function
 *
 * Runs daily to check all active budgets against their spending thresholds.
 * For each budget:
 *   1. Calculates current period total spend (sum of expenses in category within period)
 *   2. Checks against alert thresholds: 50% (info), 80% (warning), 100% (critical)
 *   3. Avoids duplicate alerts by tracking last_alert_percent on the budget row
 *   4. Dispatches notifications via the send-notification function
 *
 * Invoked by Supabase cron or via POST with a service-role bearer token.
 */

import { createServiceClient } from "../_shared/supabase.ts";
import { corsHeaders, handleCors, errorResponse } from "../_shared/cors.ts";
import type { Budget, BudgetPeriod } from "../_shared/types.ts";

// ---------------------------------------------------------------------------
// Alert threshold configuration
// ---------------------------------------------------------------------------

interface AlertThreshold {
  percent: number;
  level: "info" | "warning" | "critical";
  title: (categoryName: string, percent: number) => string;
  body: (categoryName: string, spent: number, budget: number, currency: string) => string;
}

const ALERT_THRESHOLDS: AlertThreshold[] = [
  {
    percent: 100,
    level: "critical",
    title: (cat, pct) => `Over budget! ${cat} at ${pct}%`,
    body: (cat, spent, budget, cur) =>
      `You've spent ${cur} ${spent.toFixed(2)} of your ${cur} ${budget.toFixed(2)} budget for ${cat}. You are over budget!`,
  },
  {
    percent: 80,
    level: "warning",
    title: (cat, pct) => `Budget warning: ${cat} at ${pct}%`,
    body: (cat, spent, budget, cur) =>
      `You've spent ${cur} ${spent.toFixed(2)} of your ${cur} ${budget.toFixed(2)} budget for ${cat}. Consider slowing down.`,
  },
  {
    percent: 50,
    level: "info",
    title: (cat, pct) => `Budget update: ${cat} at ${pct}%`,
    body: (cat, spent, budget, cur) =>
      `You've spent ${cur} ${spent.toFixed(2)} of your ${cur} ${budget.toFixed(2)} budget for ${cat}. Halfway there.`,
  },
];

// ---------------------------------------------------------------------------
// Period helpers
// ---------------------------------------------------------------------------

function getPeriodStart(period: BudgetPeriod, now: Date): Date {
  switch (period) {
    case "weekly": {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday start
      const start = new Date(now);
      start.setDate(now.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case "monthly":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "quarterly": {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      return new Date(now.getFullYear(), quarterMonth, 1);
    }
    case "yearly":
      return new Date(now.getFullYear(), 0, 1);
    default:
      return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleCors();

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const admin = createServiceClient();
    const now = new Date();

    // 1. Fetch all active budgets with their category info and workspace owner
    const { data: budgets, error: budgetsError } = await admin
      .from("budgets")
      .select("*, categories(id, name, icon, color), workspaces(id, owner_id)")
      .eq("is_active", true);

    if (budgetsError) {
      console.error("Failed to fetch budgets:", budgetsError);
      return errorResponse(`Failed to fetch budgets: ${budgetsError.message}`, 500);
    }

    if (!budgets || budgets.length === 0) {
      return new Response(
        JSON.stringify({ data: { processed: 0, alerts_sent: 0 } }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let alertsSent = 0;
    const errors: Array<{ budgetId: string; error: string }> = [];

    // 2. Process each budget
    for (const budget of budgets) {
      try {
        const period = budget.period as BudgetPeriod;
        const periodStart = getPeriodStart(period, now);
        const categoryName =
          (budget.categories as any)?.name ?? "Uncategorized";
        const workspaceOwnerId = (budget.workspaces as any)?.owner_id;

        if (!workspaceOwnerId) {
          errors.push({
            budgetId: budget.id,
            error: "No workspace owner found",
          });
          continue;
        }

        // 3. Calculate total spend for current period
        let spentQuery = admin
          .from("expenses")
          .select("amount")
          .eq("workspace_id", budget.workspace_id)
          .eq("type", "expense")
          .gte("expense_date", periodStart.toISOString().split("T")[0]!)
          .lte("expense_date", now.toISOString().split("T")[0]!)
          .is("deleted_at", null);

        if (budget.category_id) {
          spentQuery = spentQuery.eq("category_id", budget.category_id);
        }

        const { data: expenses, error: expError } = await spentQuery;

        if (expError) {
          errors.push({
            budgetId: budget.id,
            error: `Expense query failed: ${expError.message}`,
          });
          continue;
        }

        const totalSpent = (expenses ?? []).reduce(
          (sum: number, e: any) => sum + (e.amount as number),
          0,
        );

        const spentPercent =
          budget.amount > 0
            ? Math.round((totalSpent / budget.amount) * 100)
            : 0;

        const lastAlertPercent = (budget as any).last_alert_percent ?? 0;

        // 4. Determine which threshold to alert on (highest crossed but not yet alerted)
        let matchedThreshold: AlertThreshold | null = null;
        for (const threshold of ALERT_THRESHOLDS) {
          if (
            spentPercent >= threshold.percent &&
            lastAlertPercent < threshold.percent
          ) {
            matchedThreshold = threshold;
            break; // ALERT_THRESHOLDS is sorted descending, so first match is the highest
          }
        }

        if (!matchedThreshold) continue;

        // 5. Send notification via send-notification function
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        // Notify the budget creator (user_id) rather than just workspace owner
        const notifyUserId = budget.user_id ?? workspaceOwnerId;

        const notificationPayload = {
          userId: notifyUserId,
          type: "budget_alert" as const,
          title: matchedThreshold.title(categoryName, spentPercent),
          body: matchedThreshold.body(
            categoryName,
            totalSpent,
            budget.amount,
            budget.currency,
          ),
          workspaceId: budget.workspace_id,
          data: {
            budget_id: budget.id,
            category_id: budget.category_id,
            category_name: categoryName,
            spent: totalSpent,
            budget_amount: budget.amount,
            spent_percent: spentPercent,
            alert_level: matchedThreshold.level,
          },
        };

        const notifyResponse = await fetch(
          `${supabaseUrl}/functions/v1/send-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify(notificationPayload),
          },
        );

        if (!notifyResponse.ok) {
          const errText = await notifyResponse.text();
          errors.push({
            budgetId: budget.id,
            error: `Notification dispatch failed: ${errText}`,
          });
          continue;
        }

        // 6. Update last_alert_percent on the budget to prevent duplicate alerts
        const { error: updateError } = await admin
          .from("budgets")
          .update({ last_alert_percent: matchedThreshold.percent } as any)
          .eq("id", budget.id);

        if (updateError) {
          console.error(
            `Failed to update last_alert_percent for budget ${budget.id}:`,
            updateError,
          );
        }

        alertsSent++;
      } catch (err: unknown) {
        errors.push({
          budgetId: budget.id,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    // 7. Return summary
    const summary = {
      processed: budgets.length,
      alerts_sent: alertsSent,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log("Budget alerts summary:", JSON.stringify(summary));

    return new Response(JSON.stringify({ data: summary }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("budget-alerts error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
    );
  }
});
