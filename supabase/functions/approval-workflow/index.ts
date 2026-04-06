/**
 * ExpenseFlow — Approval Workflow Edge Function (Phase 13)
 *
 * Handles expense approval workflows:
 * - submit_for_approval: checks policies, creates approval_request, notifies approvers
 * - approve/reject: validates approver, updates status, notifies submitter
 * - auto_check: runs expense against team_policies, flags violations
 * - escalate: if no decision within 48h, notifies next-level approver
 *
 * POST body: { action, workspace_id, expense_id?, request_id?, comments? }
 */

import { createServiceClient, createUserClient, getUserId } from "../_shared/supabase.ts";
import { corsHeaders, handleCors, errorResponse } from "../_shared/cors.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WorkflowAction = "submit_for_approval" | "approve" | "reject" | "auto_check" | "escalate";

interface WorkflowRequest {
  action: WorkflowAction;
  workspace_id: string;
  expense_id?: string;
  request_id?: string;
  comments?: string;
}

interface ApprovalPolicy {
  id: string;
  workspace_id: string;
  name: string;
  conditions: {
    amount_above?: number;
    categories?: string[];
    tags?: string[];
  };
  approvers: string[];
  require_all: boolean;
  auto_approve_below: number | null;
  is_active: boolean;
}

interface TeamPolicy {
  id: string;
  workspace_id: string;
  name: string;
  rules: {
    max_amount?: number;
    allowed_categories?: string[];
    receipt_required_above?: number;
    auto_flag_rules?: Array<{
      field: string;
      condition: string;
      value: unknown;
      violation_type: string;
    }>;
  };
  applies_to_roles: string[];
  is_active: boolean;
}

interface ExpenseData {
  id: string;
  workspace_id: string;
  user_id: string;
  amount: number;
  category_id: string | null;
  description: string;
  receipt_url: string | null;
  tags: string[];
  approval_status: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function sendNotification(
  admin: ReturnType<typeof createServiceClient>,
  userId: string,
  workspaceId: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      userId,
      type: "system",
      title,
      body,
      workspaceId,
      data,
    }),
  }).catch((err) => console.error("Notification dispatch failed:", err));
}

function matchesPolicy(expense: ExpenseData, policy: ApprovalPolicy): boolean {
  const conditions = policy.conditions;

  if (conditions.amount_above !== undefined && expense.amount <= conditions.amount_above) {
    return false;
  }

  if (conditions.categories && conditions.categories.length > 0) {
    if (!expense.category_id || !conditions.categories.includes(expense.category_id)) {
      return false;
    }
  }

  if (conditions.tags && conditions.tags.length > 0) {
    const hasMatchingTag = expense.tags?.some((t) => conditions.tags!.includes(t));
    if (!hasMatchingTag) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

async function handleSubmitForApproval(
  admin: ReturnType<typeof createServiceClient>,
  workspaceId: string,
  expenseId: string,
  submittedBy: string,
): Promise<Response> {
  // 1. Fetch expense
  const { data: expense, error: expError } = await admin
    .from("expenses")
    .select("id, workspace_id, user_id, amount, category_id, description, receipt_url, tags, approval_status")
    .eq("id", expenseId)
    .single();

  if (expError || !expense) {
    return errorResponse("Expense not found", 404);
  }

  const exp = expense as unknown as ExpenseData;

  if (exp.approval_status !== "none") {
    return errorResponse(`Expense already has approval status: ${exp.approval_status}`);
  }

  // 2. Find matching approval policies
  const { data: policies } = await admin
    .from("approval_policies")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true);

  if (!policies || policies.length === 0) {
    return errorResponse("No active approval policies found");
  }

  const matchingPolicies = (policies as unknown as ApprovalPolicy[]).filter(
    (p) => matchesPolicy(exp, p),
  );

  if (matchingPolicies.length === 0) {
    // No policy matches — auto-approve
    await admin
      .from("expenses")
      .update({ approval_status: "approved" })
      .eq("id", expenseId);

    return new Response(
      JSON.stringify({ data: { status: "auto_approved", message: "No matching policies" } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 3. Check for auto-approve threshold
  const policy = matchingPolicies[0]!;
  if (policy.auto_approve_below && exp.amount < policy.auto_approve_below) {
    await admin
      .from("expenses")
      .update({ approval_status: "approved" })
      .eq("id", expenseId);

    return new Response(
      JSON.stringify({
        data: {
          status: "auto_approved",
          message: `Amount below auto-approve threshold of ${policy.auto_approve_below}`,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 4. Create approval request
  const { data: request, error: reqError } = await admin
    .from("approval_requests")
    .insert({
      expense_id: expenseId,
      policy_id: policy.id,
      status: "pending",
      submitted_by: submittedBy,
    })
    .select("id")
    .single();

  if (reqError || !request) {
    return errorResponse(`Failed to create approval request: ${reqError?.message}`, 500);
  }

  // 5. Update expense status
  await admin
    .from("expenses")
    .update({ approval_status: "pending" })
    .eq("id", expenseId);

  // 6. Notify approvers
  for (const approverId of policy.approvers) {
    await sendNotification(
      admin,
      approverId,
      workspaceId,
      "Expense Approval Required",
      `${exp.description} - ${exp.amount} requires your approval.`,
      { expense_id: expenseId, request_id: (request as any).id },
    );
  }

  return new Response(
    JSON.stringify({
      data: {
        status: "pending",
        request_id: (request as any).id,
        policy_name: policy.name,
        approvers_notified: policy.approvers.length,
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

async function handleApproveReject(
  admin: ReturnType<typeof createServiceClient>,
  requestId: string,
  decision: "approved" | "rejected",
  decidedBy: string,
  comments?: string,
): Promise<Response> {
  // 1. Fetch approval request
  const { data: request, error: reqError } = await admin
    .from("approval_requests")
    .select("*, approval_policies(approvers, workspace_id)")
    .eq("id", requestId)
    .single();

  if (reqError || !request) {
    return errorResponse("Approval request not found", 404);
  }

  if ((request as any).status !== "pending" && (request as any).status !== "escalated") {
    return errorResponse(`Request already ${(request as any).status}`);
  }

  // 2. Validate that the user is an authorized approver
  const policy = (request as any).approval_policies;
  const approvers: string[] = policy?.approvers ?? [];

  // Also allow workspace admins/owners
  const { data: membership } = await admin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", policy?.workspace_id)
    .eq("user_id", decidedBy)
    .single();

  const isApprover = approvers.includes(decidedBy);
  const isAdmin = membership && ["owner", "admin"].includes((membership as any).role);

  if (!isApprover && !isAdmin) {
    return errorResponse("You are not authorized to approve/reject this request", 403);
  }

  // 3. Update approval request
  await admin
    .from("approval_requests")
    .update({
      status: decision,
      decided_by: decidedBy,
      decided_at: new Date().toISOString(),
      comments: comments ?? null,
    })
    .eq("id", requestId);

  // 4. Update expense approval status
  await admin
    .from("expenses")
    .update({ approval_status: decision })
    .eq("id", (request as any).expense_id);

  // 5. Notify submitter
  const statusLabel = decision === "approved" ? "Approved" : "Rejected";
  await sendNotification(
    admin,
    (request as any).submitted_by,
    policy?.workspace_id,
    `Expense ${statusLabel}`,
    `Your expense has been ${decision}.${comments ? ` Comment: ${comments}` : ""}`,
    { expense_id: (request as any).expense_id, request_id: requestId },
  );

  return new Response(
    JSON.stringify({ data: { status: decision, request_id: requestId } }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

async function handleAutoCheck(
  admin: ReturnType<typeof createServiceClient>,
  workspaceId: string,
  expenseId: string,
): Promise<Response> {
  // 1. Fetch expense
  const { data: expense, error: expError } = await admin
    .from("expenses")
    .select("id, workspace_id, user_id, amount, category_id, description, receipt_url, tags, approval_status")
    .eq("id", expenseId)
    .single();

  if (expError || !expense) {
    return errorResponse("Expense not found", 404);
  }

  const exp = expense as unknown as ExpenseData;

  // 2. Get user's workspace role
  const { data: membership } = await admin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", exp.user_id)
    .single();

  const userRole = (membership as any)?.role ?? "member";

  // 3. Fetch active team policies
  const { data: policies } = await admin
    .from("team_policies")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true);

  if (!policies || policies.length === 0) {
    return new Response(
      JSON.stringify({ data: { violations: [], message: "No active team policies" } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const violations: Array<{ policy_id: string; violation_type: string; details: string }> = [];

  for (const rawPolicy of policies) {
    const policy = rawPolicy as unknown as TeamPolicy;

    // Check if policy applies to user's role
    if (!policy.applies_to_roles.includes(userRole)) continue;

    const rules = policy.rules;

    // Check max amount
    if (rules.max_amount && exp.amount > rules.max_amount) {
      violations.push({
        policy_id: policy.id,
        violation_type: "over_limit",
        details: `Amount ${exp.amount} exceeds policy limit of ${rules.max_amount}`,
      });
    }

    // Check allowed categories
    if (rules.allowed_categories && rules.allowed_categories.length > 0 && exp.category_id) {
      if (!rules.allowed_categories.includes(exp.category_id)) {
        violations.push({
          policy_id: policy.id,
          violation_type: "unapproved_category",
          details: `Category not in allowed list`,
        });
      }
    }

    // Check receipt requirement
    if (rules.receipt_required_above && exp.amount > rules.receipt_required_above && !exp.receipt_url) {
      violations.push({
        policy_id: policy.id,
        violation_type: "missing_receipt",
        details: `Receipt required for amounts above ${rules.receipt_required_above}`,
      });
    }

    // Custom auto-flag rules
    if (rules.auto_flag_rules) {
      for (const rule of rules.auto_flag_rules) {
        const fieldValue = (exp as any)[rule.field];
        let violated = false;

        switch (rule.condition) {
          case "greater_than":
            violated = fieldValue > rule.value;
            break;
          case "less_than":
            violated = fieldValue < rule.value;
            break;
          case "equals":
            violated = fieldValue === rule.value;
            break;
          case "contains":
            violated = String(fieldValue).includes(String(rule.value));
            break;
        }

        if (violated) {
          violations.push({
            policy_id: policy.id,
            violation_type: rule.violation_type,
            details: `${rule.field} ${rule.condition} ${rule.value}`,
          });
        }
      }
    }
  }

  // 4. Record violations
  if (violations.length > 0) {
    const inserts = violations.map((v) => ({
      expense_id: expenseId,
      policy_id: v.policy_id,
      violation_type: v.violation_type,
      details: v.details,
      is_resolved: false,
    }));

    await admin.from("policy_violations").insert(inserts);
  }

  return new Response(
    JSON.stringify({
      data: {
        violations_found: violations.length,
        violations,
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

async function handleEscalate(
  admin: ReturnType<typeof createServiceClient>,
): Promise<Response> {
  // Find pending approval requests older than 48 hours
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: staleRequests, error } = await admin
    .from("approval_requests")
    .select("id, expense_id, policy_id, submitted_by, approval_policies(approvers, workspace_id, name)")
    .eq("status", "pending")
    .lt("submitted_at", cutoff);

  if (error || !staleRequests || staleRequests.length === 0) {
    return new Response(
      JSON.stringify({ data: { escalated: 0, message: "No stale requests" } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let escalatedCount = 0;

  for (const request of staleRequests) {
    const policy = (request as any).approval_policies;
    const workspaceId = policy?.workspace_id;

    if (!workspaceId) continue;

    // Update status to escalated
    await admin
      .from("approval_requests")
      .update({ status: "escalated" })
      .eq("id", (request as any).id);

    // Find workspace admins/owners as escalation targets
    const { data: admins } = await admin
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .in("role", ["owner", "admin"]);

    if (admins) {
      for (const adm of admins) {
        await sendNotification(
          admin,
          (adm as any).user_id,
          workspaceId,
          "Escalated: Expense Approval Overdue",
          `Approval for expense has been pending over 48 hours. Policy: ${policy?.name}`,
          { expense_id: (request as any).expense_id, request_id: (request as any).id },
        );
      }
    }

    escalatedCount++;
  }

  return new Response(
    JSON.stringify({ data: { escalated: escalatedCount } }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
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
    const body = (await req.json()) as WorkflowRequest;
    const { action, workspace_id, expense_id, request_id, comments } = body;

    if (!action || !workspace_id) {
      return errorResponse("Missing required fields: action, workspace_id");
    }

    const admin = createServiceClient();

    // Get user ID from JWT for user-scoped actions
    let userId: string | null = null;
    try {
      const userClient = createUserClient(req);
      userId = await getUserId(userClient);
    } catch {
      // Service-level calls (escalate) may not have user context
    }

    switch (action) {
      case "submit_for_approval": {
        if (!expense_id) return errorResponse("Missing expense_id");
        if (!userId) return errorResponse("Authentication required", 401);
        return handleSubmitForApproval(admin, workspace_id, expense_id, userId);
      }

      case "approve": {
        if (!request_id) return errorResponse("Missing request_id");
        if (!userId) return errorResponse("Authentication required", 401);
        return handleApproveReject(admin, request_id, "approved", userId, comments);
      }

      case "reject": {
        if (!request_id) return errorResponse("Missing request_id");
        if (!userId) return errorResponse("Authentication required", 401);
        return handleApproveReject(admin, request_id, "rejected", userId, comments);
      }

      case "auto_check": {
        if (!expense_id) return errorResponse("Missing expense_id");
        return handleAutoCheck(admin, workspace_id, expense_id);
      }

      case "escalate": {
        return handleEscalate(admin);
      }

      default:
        return errorResponse(`Unknown action: ${action}`);
    }
  } catch (err: unknown) {
    console.error("approval-workflow error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
    );
  }
});
