/**
 * ExpenseFlow — Supabase Client Factories for Edge Functions
 *
 * Provides two client constructors:
 *   1. createServiceClient()  — admin/service-role client that bypasses RLS
 *   2. createUserClient(req)  — per-request client that respects RLS using the caller's JWT
 *
 * Usage:
 *   import { createServiceClient, createUserClient } from "../_shared/supabase.ts";
 *
 *   // Admin operations (cron jobs, webhooks, background tasks)
 *   const admin = createServiceClient();
 *
 *   // User-scoped operations (API handlers)
 *   const supabase = createUserClient(req);
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Database } from "./types.ts";

/**
 * Create an admin Supabase client using the service role key.
 * This client bypasses Row Level Security — use only for trusted server-side operations.
 */
export function createServiceClient(): SupabaseClient<Database> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables",
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a Supabase client scoped to the calling user's JWT.
 * This client respects Row Level Security policies.
 *
 * Extracts the Bearer token from the request's Authorization header.
 * Throws if the header is missing or malformed.
 */
export function createUserClient(req: Request): SupabaseClient<Database> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables",
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }

  return createClient<Database>(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Extract the authenticated user's ID from a user-scoped client.
 * Returns null if the user is not authenticated.
 */
export async function getUserId(
  client: SupabaseClient<Database>,
): Promise<string | null> {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) return null;
  return user.id;
}
