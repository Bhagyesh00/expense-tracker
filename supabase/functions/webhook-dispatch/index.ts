/**
 * ExpenseFlow — Webhook Dispatch Edge Function
 *
 * Dispatches event payloads to registered webhook endpoints.
 * - Queries active webhooks matching the event type
 * - Signs payloads with HMAC-SHA256
 * - Records delivery attempts in webhook_deliveries
 * - Retries failed deliveries up to 3 times with exponential backoff
 *
 * POST body: { event_type: string, payload: object, workspace_id: string }
 */

import { createServiceClient } from "../_shared/supabase.ts";
import { corsHeaders, handleCors, errorResponse } from "../_shared/cors.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 60_000; // 1 minute

// ---------------------------------------------------------------------------
// HMAC-SHA256 signing
// ---------------------------------------------------------------------------

async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------------------------------------------------------------------------
// Delivery logic
// ---------------------------------------------------------------------------

interface WebhookRow {
  id: string;
  url: string;
  secret: string;
  events: string[];
}

interface DeliveryResult {
  webhookId: string;
  status: "success" | "failed";
  responseCode?: number;
  error?: string;
}

async function deliverToWebhook(
  webhook: WebhookRow,
  eventType: string,
  payload: Record<string, unknown>,
  deliveryId: string,
): Promise<DeliveryResult> {
  const payloadStr = JSON.stringify(payload);
  const signature = await signPayload(payloadStr, webhook.secret);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": `sha256=${signature}`,
        "X-Webhook-Event": eventType,
        "X-Webhook-ID": deliveryId,
        "User-Agent": "ExpenseFlow-Webhook/1.0",
      },
      body: payloadStr,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const responseBody = await response.text().catch(() => "");

    if (response.ok) {
      return {
        webhookId: webhook.id,
        status: "success",
        responseCode: response.status,
      };
    }

    return {
      webhookId: webhook.id,
      status: "failed",
      responseCode: response.status,
      error: responseBody.slice(0, 1000),
    };
  } catch (err: unknown) {
    return {
      webhookId: webhook.id,
      status: "failed",
      error: err instanceof Error ? err.message : "Network error",
    };
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
    const body = await req.json();
    const { event_type, payload, workspace_id } = body as {
      event_type?: string;
      payload?: Record<string, unknown>;
      workspace_id?: string;
    };

    if (!event_type || !payload || !workspace_id) {
      return errorResponse("Missing required fields: event_type, payload, workspace_id");
    }

    const admin = createServiceClient();

    // 1. Fetch active webhooks that subscribe to this event type
    const { data: webhooks, error: whError } = await admin
      .from("webhooks")
      .select("id, url, secret, events")
      .eq("workspace_id", workspace_id)
      .eq("is_active", true);

    if (whError) {
      console.error("Failed to fetch webhooks:", whError);
      return errorResponse(`Failed to fetch webhooks: ${whError.message}`, 500);
    }

    // Filter webhooks that subscribe to this event (or have '*' wildcard)
    const matchingWebhooks = (webhooks ?? []).filter(
      (wh: WebhookRow) =>
        wh.events.includes(event_type) || wh.events.includes("*"),
    );

    if (matchingWebhooks.length === 0) {
      return new Response(
        JSON.stringify({ data: { dispatched: 0, message: "No matching webhooks" } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Create delivery records and dispatch
    const results: DeliveryResult[] = [];

    for (const webhook of matchingWebhooks) {
      // Create delivery record
      const { data: delivery, error: insertError } = await admin
        .from("webhook_deliveries")
        .insert({
          webhook_id: webhook.id,
          event_type,
          payload,
          status: "pending",
          attempts: 1,
        })
        .select("id")
        .single();

      if (insertError || !delivery) {
        console.error(`Failed to create delivery record for webhook ${webhook.id}:`, insertError);
        continue;
      }

      const deliveryId = (delivery as { id: string }).id;

      // Attempt delivery
      const result = await deliverToWebhook(webhook, event_type, payload, deliveryId);
      results.push(result);

      // Update delivery record
      const updateData: Record<string, unknown> = {
        status: result.status,
        response_code: result.responseCode ?? null,
        response_body: result.error ?? null,
        attempts: 1,
      };

      if (result.status === "failed") {
        // Schedule retry with exponential backoff
        const nextRetry = new Date(Date.now() + BASE_BACKOFF_MS);
        updateData.next_retry_at = nextRetry.toISOString();
      }

      await admin
        .from("webhook_deliveries")
        .update(updateData)
        .eq("id", deliveryId);
    }

    // 3. Process pending retries (deliveries that previously failed)
    await processRetries(admin, workspace_id);

    const summary = {
      dispatched: results.length,
      successful: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "failed").length,
    };

    return new Response(
      JSON.stringify({ data: summary }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    console.error("webhook-dispatch error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
    );
  }
});

// ---------------------------------------------------------------------------
// Retry processor
// ---------------------------------------------------------------------------

async function processRetries(
  admin: ReturnType<typeof createServiceClient>,
  workspaceId: string,
): Promise<void> {
  const now = new Date().toISOString();

  // Fetch failed deliveries due for retry
  const { data: retries, error } = await admin
    .from("webhook_deliveries")
    .select("id, webhook_id, event_type, payload, attempts")
    .eq("status", "failed")
    .lt("next_retry_at", now)
    .lt("attempts", MAX_ATTEMPTS)
    .limit(50);

  if (error || !retries || retries.length === 0) return;

  for (const retry of retries) {
    const { data: webhook } = await admin
      .from("webhooks")
      .select("id, url, secret, events")
      .eq("id", (retry as any).webhook_id)
      .eq("is_active", true)
      .single();

    if (!webhook) {
      // Webhook deactivated, mark as failed permanently
      await admin
        .from("webhook_deliveries")
        .update({ status: "failed", next_retry_at: null })
        .eq("id", (retry as any).id);
      continue;
    }

    const result = await deliverToWebhook(
      webhook as unknown as WebhookRow,
      (retry as any).event_type,
      (retry as any).payload,
      (retry as any).id,
    );

    const attempts = ((retry as any).attempts ?? 0) + 1;
    const updateData: Record<string, unknown> = {
      status: result.status,
      response_code: result.responseCode ?? null,
      response_body: result.error ?? null,
      attempts,
    };

    if (result.status === "failed" && attempts < MAX_ATTEMPTS) {
      // Exponential backoff: 1min, 4min, 16min
      const backoffMs = BASE_BACKOFF_MS * Math.pow(4, attempts - 1);
      updateData.next_retry_at = new Date(Date.now() + backoffMs).toISOString();
    } else {
      updateData.next_retry_at = null;
    }

    await admin
      .from("webhook_deliveries")
      .update(updateData)
      .eq("id", (retry as any).id);
  }
}
