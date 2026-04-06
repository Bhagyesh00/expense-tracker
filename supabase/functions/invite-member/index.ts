/**
 * ExpenseFlow — invite-member Edge Function
 *
 * Handles workspace member invitations with the following flow:
 *   1. Verify the caller has admin/owner role in the workspace
 *   2. Check if the target user exists by email
 *   3. If exists → add directly to workspace_members
 *   4. If not exists → create an invitation record for later acceptance
 *
 * POST /functions/v1/invite-member
 * Body: { workspaceId: string, email: string, role: "admin" | "member" | "viewer" }
 * Auth: Bearer <JWT>
 */

import { createUserClient, createServiceClient, getUserId } from "../_shared/supabase.ts";
import { corsHeaders, handleCors, errorResponse } from "../_shared/cors.ts";
import type { WorkspaceRole } from "../_shared/types.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InviteRequest {
  workspaceId: string;
  email: string;
  role: "admin" | "member" | "viewer";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") return handleCors();

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    // ── Parse & validate body ──────────────────────────────────────────
    const body: InviteRequest = await req.json();
    const { workspaceId, email, role } = body;

    if (!workspaceId || !email || !role) {
      return errorResponse("Missing required fields: workspaceId, email, role");
    }

    const validRoles: InviteRequest["role"][] = ["admin", "member", "viewer"];
    if (!validRoles.includes(role)) {
      return errorResponse(`Invalid role. Must be one of: ${validRoles.join(", ")}`);
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ── Auth: identify caller ──────────────────────────────────────────
    const userClient = createUserClient(req);
    const callerId = await getUserId(userClient);

    if (!callerId) {
      return errorResponse("Unauthorized", 401);
    }

    // ── Auth: verify caller has admin/owner role ────────────────────────
    const { data: callerMembership, error: memberError } = await userClient
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", callerId)
      .single();

    if (memberError || !callerMembership) {
      return errorResponse("You are not a member of this workspace", 403);
    }

    const callerRole = callerMembership.role as WorkspaceRole;
    if (callerRole !== "owner" && callerRole !== "admin") {
      return errorResponse(
        "Only workspace owners and admins can invite members",
        403,
      );
    }

    // Prevent non-owners from granting admin role
    if (role === "admin" && callerRole !== "owner") {
      return errorResponse("Only workspace owners can assign the admin role", 403);
    }

    // ── Use service client for cross-user lookups ────────────────────────
    const serviceClient = createServiceClient();

    // ── Check for existing membership ───────────────────────────────────
    const { data: existingProfile } = await serviceClient
      .from("profiles")
      .select("id, email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingProfile) {
      // Check if already a member
      const { data: existingMember } = await serviceClient
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", existingProfile.id)
        .maybeSingle();

      if (existingMember) {
        return errorResponse("User is already a member of this workspace", 409);
      }

      // User exists → add directly to workspace_members
      const { data: newMember, error: insertError } = await serviceClient
        .from("workspace_members")
        .insert({
          workspace_id: workspaceId,
          user_id: existingProfile.id,
          role,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Failed to add member:", insertError);
        return errorResponse("Failed to add member to workspace", 500);
      }

      // Create a notification for the invited user
      await serviceClient.from("notifications").insert({
        user_id: existingProfile.id,
        workspace_id: workspaceId,
        type: "workspace_invite",
        title: "Workspace Invitation",
        body: `You have been added to a workspace as ${role}.`,
        data: { workspace_id: workspaceId, role, invited_by: callerId },
      });

      return jsonResponse({
        data: {
          type: "direct_add",
          member: newMember,
          message: "User added to workspace directly",
        },
      });
    }

    // ── User does not exist → create invitation record ──────────────────
    // Check for existing pending invitation
    const { data: existingInvite } = await serviceClient
      .from("invitations")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("email", normalizedEmail)
      .eq("status", "pending")
      .maybeSingle();

    if (existingInvite) {
      return errorResponse(
        "A pending invitation already exists for this email",
        409,
      );
    }

    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

    const { data: invitation, error: inviteError } = await serviceClient
      .from("invitations")
      .insert({
        workspace_id: workspaceId,
        email: normalizedEmail,
        role,
        invited_by: callerId,
        token,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Failed to create invitation:", inviteError);
      return errorResponse("Failed to create invitation", 500);
    }

    // In a production setup you would send an email here via
    // Supabase's auth.admin.inviteUserByEmail or a third-party service.
    // For now we store the invitation and return the token.

    return jsonResponse({
      data: {
        type: "invitation_created",
        invitation: {
          id: invitation.id,
          email: normalizedEmail,
          role,
          expiresAt: expiresAt.toISOString(),
        },
        message: "Invitation created. User will be added when they sign up.",
      },
    });
  } catch (err: unknown) {
    console.error("invite-member error:", err);

    if (err instanceof SyntaxError) {
      return errorResponse("Invalid JSON body", 400);
    }

    const message = err instanceof Error ? err.message : "Internal server error";
    return errorResponse(message, 500);
  }
});
