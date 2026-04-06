/**
 * ExpenseFlow — user-setup Edge Function
 *
 * Called after first login to ensure proper user setup:
 *   1. Verify/create profile row (safety net for trigger failures)
 *   2. Verify/create default personal workspace
 *   3. Accept any pending invitations for the user's email
 *   4. Return user profile + workspace data
 *
 * POST /functions/v1/user-setup
 * Auth: Bearer <JWT>
 */

import { createUserClient, createServiceClient, getUserId } from "../_shared/supabase.ts";
import { corsHeaders, handleCors, errorResponse } from "../_shared/cors.ts";
import type { Profile, Workspace, UserSettings } from "../_shared/types.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 60);
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
    // ── Auth: identify caller ──────────────────────────────────────────
    const userClient = createUserClient(req);
    const userId = await getUserId(userClient);

    if (!userId) {
      return errorResponse("Unauthorized", 401);
    }

    // Get full user object for metadata
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return errorResponse("Failed to get user data", 500);
    }

    const serviceClient = createServiceClient();

    // ── 1. Ensure profile exists ────────────────────────────────────────
    let profile: Profile | null = null;

    const { data: existingProfile } = await serviceClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (existingProfile) {
      profile = existingProfile as Profile;
    } else {
      // Profile missing (trigger may have failed) — create it
      const fullName =
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email?.split("@")[0] ??
        "User";

      const email = user.email ?? "";
      const phone = user.phone ?? user.user_metadata?.phone ?? null;
      const avatarUrl = user.user_metadata?.avatar_url ?? null;

      const { data: newProfile, error: profileError } = await serviceClient
        .from("profiles")
        .insert({
          id: userId,
          full_name: fullName,
          email,
          avatar_url: avatarUrl,
          phone,
          default_currency: "USD",
          locale: "en",
          timezone: "UTC",
        })
        .select()
        .single();

      if (profileError) {
        console.error("Failed to create profile:", profileError);
        return errorResponse("Failed to create user profile", 500);
      }

      profile = newProfile as Profile;
    }

    // ── 2. Ensure user_settings exists ──────────────────────────────────
    const { data: existingSettings } = await serviceClient
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    let settings: UserSettings | null = existingSettings as UserSettings | null;

    if (!settings) {
      const { data: newSettings, error: settingsError } = await serviceClient
        .from("user_settings")
        .insert({
          user_id: userId,
          theme: "system",
          pin_enabled: false,
          biometric_enabled: false,
          push_enabled: true,
          email_notifications: true,
          reminder_days_before: 3,
          weekly_summary: true,
        })
        .select()
        .single();

      if (settingsError) {
        console.error("Failed to create user_settings:", settingsError);
        // Non-fatal: continue without settings
      } else {
        settings = newSettings as UserSettings;
      }
    }

    // ── 3. Ensure default personal workspace exists ─────────────────────
    let personalWorkspace: Workspace | null = null;

    // Check for existing personal workspace via membership
    const { data: existingMemberships } = await serviceClient
      .from("workspace_members")
      .select("workspace_id, workspaces(*)")
      .eq("user_id", userId);

    if (existingMemberships && existingMemberships.length > 0) {
      // Find the personal workspace
      const personalMembership = existingMemberships.find(
        (m: Record<string, unknown>) => {
          const ws = m.workspaces as Record<string, unknown> | null;
          return ws && ws.is_personal === true;
        },
      );

      if (personalMembership) {
        personalWorkspace = personalMembership.workspaces as unknown as Workspace;
      }
    }

    if (!personalWorkspace) {
      // Create personal workspace
      const personalName = `${profile.full_name ?? "My"}'s Space`;
      const slug = generateSlug(personalName) + "-" + userId.substring(0, 8);

      const { data: newWs, error: wsError } = await serviceClient
        .from("workspaces")
        .insert({
          name: personalName,
          slug,
          owner_id: userId,
          default_currency: profile.default_currency ?? "USD",
          is_personal: true,
        })
        .select()
        .single();

      if (wsError) {
        console.error("Failed to create personal workspace:", wsError);
        return errorResponse("Failed to create default workspace", 500);
      }

      personalWorkspace = newWs as Workspace;

      // Add as owner
      const { error: memberError } = await serviceClient
        .from("workspace_members")
        .insert({
          workspace_id: personalWorkspace.id,
          user_id: userId,
          role: "owner",
        });

      if (memberError) {
        console.error("Failed to add owner membership:", memberError);
      }
    }

    // ── 4. Accept pending invitations ───────────────────────────────────
    const acceptedWorkspaces: string[] = [];

    if (profile.email) {
      const { data: pendingInvitations } = await serviceClient
        .from("invitations")
        .select("*")
        .eq("email", profile.email.toLowerCase())
        .eq("status", "pending")
        .gte("expires_at", new Date().toISOString());

      if (pendingInvitations && pendingInvitations.length > 0) {
        for (const invite of pendingInvitations) {
          // Check if already a member (race condition guard)
          const { data: existing } = await serviceClient
            .from("workspace_members")
            .select("user_id")
            .eq("workspace_id", invite.workspace_id)
            .eq("user_id", userId)
            .maybeSingle();

          if (!existing) {
            await serviceClient.from("workspace_members").insert({
              workspace_id: invite.workspace_id,
              user_id: userId,
              role: invite.role,
            });

            acceptedWorkspaces.push(invite.workspace_id);
          }

          // Mark invitation as accepted
          await serviceClient
            .from("invitations")
            .update({ status: "accepted" })
            .eq("id", invite.id);
        }
      }
    }

    // ── 5. Fetch all workspaces for return ──────────────────────────────
    const { data: allMemberships } = await serviceClient
      .from("workspace_members")
      .select("role, workspaces(*)")
      .eq("user_id", userId)
      .order("joined_at", { ascending: false });

    const workspaces = (allMemberships ?? []).map(
      (m: Record<string, unknown>) => ({
        ...(m.workspaces as Workspace),
        role: m.role,
      }),
    );

    // ── Return setup data ───────────────────────────────────────────────
    return jsonResponse({
      data: {
        profile,
        settings,
        personalWorkspaceId: personalWorkspace.id,
        workspaces,
        acceptedInvitations: acceptedWorkspaces.length,
        isNewUser: !existingProfile,
      },
    });
  } catch (err: unknown) {
    console.error("user-setup error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return errorResponse(message, 500);
  }
});
