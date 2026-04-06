/**
 * ExpenseFlow — GDPR Data Export Edge Function
 *
 * Returns a full JSON export of all personal data owned by the authenticated
 * user.  The response carries a Content-Disposition: attachment header so
 * browsers prompt a file download.
 *
 * Rate-limit: 1 successful export per user per 60 minutes (tracked via a
 * lightweight in-memory map inside the Deno isolate; for multi-isolate
 * deployments replace with a Redis / KV check).
 *
 * POST /functions/v1/gdpr-export
 * Authorization: Bearer <user-jwt>
 */

import { corsHeaders, handleCors, errorResponse } from "../_shared/cors.ts";
import { createServiceClient, createUserClient, getUserId } from "../_shared/supabase.ts";

// ---------------------------------------------------------------------------
// In-memory rate-limit store  (isolate-local; resets on cold start)
// ---------------------------------------------------------------------------

/** Map<userId, lastExportTimestampMs> */
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(userId: string): boolean {
  const last = rateLimitMap.get(userId);
  if (!last) return false;
  return Date.now() - last < RATE_LIMIT_MS;
}

function recordExport(userId: string): void {
  rateLimitMap.set(userId, Date.now());
}

// ---------------------------------------------------------------------------
// Helper: safely fetch rows, returning [] on error
// ---------------------------------------------------------------------------

async function safeSelect<T = unknown>(
  // deno-lint-ignore no-explicit-any
  query: any,
): Promise<T[]> {
  const { data, error } = await query;
  if (error) {
    console.warn("gdpr-export: query error", error.message);
    return [];
  }
  return (data ?? []) as T[];
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();

  if (req.method !== "POST" && req.method !== "GET") {
    return errorResponse("Method not allowed", 405);
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

  // ── Rate limit ────────────────────────────────────────────────────────────
  if (isRateLimited(userId)) {
    return errorResponse(
      "Export rate limit exceeded. You may export your data once per hour.",
      429,
    );
  }

  // Use service client for cross-table reads (RLS on individual tables is
  // enforced at DB level; service client here lets us do one round-trip per
  // table without having to join the auth JWT to every query).
  const admin = createServiceClient();

  // ── Gather all user data ──────────────────────────────────────────────────

  // 1. Profile + settings
  const [profileRows, settingsRows] = await Promise.all([
    safeSelect(admin.from("profiles").select("*").eq("id", userId)),
    safeSelect(admin.from("user_settings").select("*").eq("user_id", userId)),
  ]);
  // Strip pin_hash from settings for security
  const settings = settingsRows.map((s: Record<string, unknown>) => {
    const { pin_hash: _ph, ...rest } = s as Record<string, unknown>;
    return rest;
  });

  // 2. Workspaces the user is a member of
  const memberRows = await safeSelect(
    admin
      .from("workspace_members")
      .select("workspace_id, role, joined_at, workspaces(id, name, slug, default_currency, created_at)")
      .eq("user_id", userId),
  );

  // 3. All expenses (including voided / soft-deleted)
  const expenses = await safeSelect(
    admin
      .from("expenses")
      .select("*, categories(name), subcategories(name)")
      .eq("user_id", userId)
      .order("date", { ascending: false }),
  );

  // 4. All pending payments + payment history
  const [pendingPayments, paymentRecords] = await Promise.all([
    safeSelect(
      admin
        .from("pending_payments")
        .select("*")
        .eq("user_id", userId)
        .order("due_date", { ascending: false }),
    ),
    safeSelect(
      admin
        .from("payment_records")
        .select("*")
        .eq("user_id", userId)
        .order("paid_at", { ascending: false }),
    ),
  ]);

  // 5. Budgets + savings goals
  const [budgets, savingsGoals] = await Promise.all([
    safeSelect(
      admin
        .from("budgets")
        .select("*")
        .eq("workspace_id", memberRows.map((m: Record<string, unknown>) => (m as Record<string, unknown>).workspace_id))
        .order("created_at"),
    ),
    safeSelect(
      admin
        .from("savings_goals")
        .select("*")
        .order("created_at"),
    ),
  ]);

  // 6. Custom categories (created by this user)
  const categories = await safeSelect(
    admin
      .from("categories")
      .select("*, subcategories(*)")
      .eq("user_id", userId)
      .order("name"),
  );

  // 7. Contacts
  const contacts = await safeSelect(
    admin
      .from("contacts")
      .select("*")
      .eq("user_id", userId)
      .order("name"),
  );

  // 8. Notifications
  const notifications = await safeSelect(
    admin
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  );

  // 9. Mileage logs
  const mileageLogs = await safeSelect(
    admin
      .from("mileage_logs")
      .select("*")
      .eq("user_id", userId)
      .order("trip_date", { ascending: false }),
  );

  // 10. Expense templates
  const expenseTemplates = await safeSelect(
    admin
      .from("expense_templates")
      .select("*")
      .eq("user_id", userId)
      .order("created_at"),
  );

  // 11. Recurring payment templates
  const recurringTemplates = await safeSelect(
    admin
      .from("recurring_payment_templates")
      .select("*")
      .eq("user_id", userId)
      .order("created_at"),
  );

  // 12. Net worth entries + snapshots
  const [netWorthEntries, netWorthSnapshots] = await Promise.all([
    safeSelect(
      admin
        .from("net_worth_entries")
        .select("*")
        .eq("user_id", userId)
        .order("created_at"),
    ),
    safeSelect(
      admin
        .from("net_worth_snapshots")
        .select("*")
        .eq("user_id", userId)
        .order("snapshot_date", { ascending: false }),
    ),
  ]);

  // 13. Detected subscriptions
  const detectedSubscriptions = await safeSelect(
    admin
      .from("detected_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at"),
  );

  // ── Build export payload ──────────────────────────────────────────────────

  const exportPayload = {
    _meta: {
      export_version: "1.0",
      exported_at: new Date().toISOString(),
      user_id: userId,
      generated_by: "ExpenseFlow GDPR Export",
    },
    profile: profileRows[0] ?? null,
    settings: settings[0] ?? null,
    workspaces: memberRows,
    expenses,
    pending_payments: pendingPayments,
    payment_records: paymentRecords,
    budgets,
    savings_goals: savingsGoals,
    categories,
    contacts,
    notifications,
    mileage_logs: mileageLogs,
    expense_templates: expenseTemplates,
    recurring_payment_templates: recurringTemplates,
    net_worth_entries: netWorthEntries,
    net_worth_snapshots: netWorthSnapshots,
    detected_subscriptions: detectedSubscriptions,
  };

  // ── Record successful export (rate limit) ─────────────────────────────────
  recordExport(userId);

  const filename = `expenseflow-export-${userId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;

  return new Response(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Export-Timestamp": new Date().toISOString(),
    },
  });
});
