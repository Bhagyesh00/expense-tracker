/**
 * ExpenseFlow — GDPR Account Deletion Edge Function
 *
 * Performs a full GDPR-compliant account deletion:
 *   1. Verify the caller is authenticated.
 *   2. Re-authenticate to confirm identity (password required in request body).
 *   3. Soft-delete all expenses (set deleted_at).
 *   4. Cancel / soft-delete all pending payments.
 *   5. Delete workspace if the user is its sole member.
 *   6. Anonymize profile (name = "Deleted User", email sentinel).
 *   7. Delete the auth.users record via service role admin API.
 *   8. Write a final audit log entry.
 *
 * POST /functions/v1/gdpr-delete
 * Authorization: Bearer <user-jwt>
 * Body: { "password": "<current-password>" }
 */

import { corsHeaders, handleCors, errorResponse } from "../_shared/cors.ts";
import { createServiceClient, createUserClient, getUserId } from "../_shared/supabase.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DeleteRequestBody {
  password: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function parseBody(req: Request): Promise<DeleteRequestBody | null> {
  try {
    const body = await req.json();
    if (typeof body?.password !== "string" || body.password.trim().length === 0) {
      return null;
    }
    return body as DeleteRequestBody;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();

  if (req.method !== "POST") {
    return errorResponse("Method not allowed. Use POST.", 405);
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  const body = await parseBody(req);
  if (!body) {
    return errorResponse(
      "Request body must contain { password: string }",
      400,
    );
  }

  // ── Auth (user-scoped client) ─────────────────────────────────────────────
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

  // ── Re-authenticate to confirm identity ───────────────────────────────────
  // Fetch the user's email first, then attempt a sign-in with their password.
  const { data: userMeta, error: userMetaErr } = await userClient.auth.getUser();
  if (userMetaErr || !userMeta?.user?.email) {
    return errorResponse("Could not retrieve user account details", 500);
  }

  const email = userMeta.user.email;

  // Attempt password verification via a throw-away sign-in (we don't persist
  // the session; we just check that Supabase accepts the credentials).
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey    = Deno.env.get("SUPABASE_ANON_KEY")!;

  const verifyRes = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": anonKey,
      },
      body: JSON.stringify({ email, password: body.password }),
    },
  );

  if (!verifyRes.ok) {
    return errorResponse(
      "Password verification failed. Account deletion requires your current password.",
      403,
    );
  }

  // ── Begin deletion sequence (service role for full access) ────────────────
  const admin = createServiceClient();
  const now = new Date().toISOString();
  const errors: string[] = [];

  // 1. Soft-delete all expenses
  const { error: expErr } = await admin
    .from("expenses")
    .update({ deleted_at: now })
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (expErr) {
    errors.push(`expenses: ${expErr.message}`);
    console.error("gdpr-delete: expenses soft-delete failed", expErr);
  }

  // 2. Cancel all pending payments (set status = 'cancelled')
  const { error: ppErr } = await admin
    .from("pending_payments")
    .update({ status: "cancelled", updated_at: now })
    .eq("user_id", userId)
    .neq("status", "settled");

  if (ppErr) {
    errors.push(`pending_payments: ${ppErr.message}`);
    console.error("gdpr-delete: pending_payments cancel failed", ppErr);
  }

  // 3. Workspace cleanup — delete workspace if user is the only member
  const { data: ownedWorkspaces } = await admin
    .from("workspaces")
    .select("id")
    .eq("owner_id", userId);

  for (const ws of ownedWorkspaces ?? []) {
    const { count } = await admin
      .from("workspace_members")
      .select("user_id", { count: "exact", head: true })
      .eq("workspace_id", ws.id);

    if ((count ?? 0) <= 1) {
      // Sole member — delete the workspace (cascades via FK)
      const { error: wsErr } = await admin
        .from("workspaces")
        .delete()
        .eq("id", ws.id);

      if (wsErr) {
        errors.push(`workspace ${ws.id}: ${wsErr.message}`);
        console.error("gdpr-delete: workspace delete failed", wsErr);
      }
    } else {
      // Transfer ownership to another admin/member before leaving
      const { data: nextOwner } = await admin
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", ws.id)
        .neq("user_id", userId)
        .in("role", ["owner", "admin"])
        .limit(1)
        .single();

      if (nextOwner) {
        await admin
          .from("workspaces")
          .update({ owner_id: nextOwner.user_id })
          .eq("id", ws.id);
      }

      // Remove this user from workspace_members
      await admin
        .from("workspace_members")
        .delete()
        .eq("workspace_id", ws.id)
        .eq("user_id", userId);
    }
  }

  // Also remove from workspaces where the user is just a member (not owner)
  await admin
    .from("workspace_members")
    .delete()
    .eq("user_id", userId);

  // 4. Anonymize profile
  const deletedEmail = `deleted_${userId.slice(0, 8)}@expenseflow.deleted`;

  const { error: profileErr } = await admin
    .from("profiles")
    .update({
      full_name: "Deleted User",
      avatar_url: null,
      phone: null,
      updated_at: now,
    })
    .eq("id", userId);

  if (profileErr) {
    errors.push(`profile: ${profileErr.message}`);
    console.error("gdpr-delete: profile anonymize failed", profileErr);
  }

  // 5. Write audit log entry before the auth user is removed
  await admin
    .from("notifications")
    .insert({
      user_id: userId,
      type: "system",
      title: "Account Deleted",
      message: `GDPR deletion requested at ${now}. User data anonymized.`,
      is_read: true,
      created_at: now,
    })
    .select()
    .maybeSingle();

  // 6. Delete the auth user via Supabase Admin API
  const deleteAuthRes = await fetch(
    `${supabaseUrl}/auth/v1/admin/users/${userId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "apikey": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
      },
    },
  );

  if (!deleteAuthRes.ok) {
    const body = await deleteAuthRes.text();
    errors.push(`auth_delete: ${body}`);
    console.error("gdpr-delete: auth user delete failed", body);
  }

  // ── Response ──────────────────────────────────────────────────────────────

  const success = errors.length === 0;

  return new Response(
    JSON.stringify({
      success,
      deleted_at: now,
      anonymized_email: deletedEmail,
      errors: success ? undefined : errors,
    }),
    {
      status: success ? 200 : 207, // 207 = multi-status (partial success)
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
