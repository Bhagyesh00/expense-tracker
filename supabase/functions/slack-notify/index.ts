/**
 * ExpenseFlow — Slack & Teams Notification Edge Function
 *
 * Sends formatted notifications to Slack (Block Kit) or Microsoft Teams
 * (Adaptive Cards) based on workspace integration config.
 *
 * POST body: { workspace_id, event_type, payload }
 */

import { createServiceClient } from "../_shared/supabase.ts";
import { corsHeaders, handleCors, errorResponse } from "../_shared/cors.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotifyRequest {
  workspace_id: string;
  event_type: string;
  payload: Record<string, unknown>;
}

interface IntegrationRow {
  id: string;
  provider: string;
  config: Record<string, unknown>;
  is_active: boolean;
}

// ---------------------------------------------------------------------------
// Slack Block Kit message builder
// ---------------------------------------------------------------------------

function buildSlackBlocks(
  eventType: string,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const title = formatEventTitle(eventType);
  const blocks: Record<string, unknown>[] = [];

  // Header
  blocks.push({
    type: "header",
    text: { type: "plain_text", text: `ExpenseFlow: ${title}`, emoji: true },
  });

  // Divider
  blocks.push({ type: "divider" });

  // Event details section
  const fields: { type: string; text: string }[] = [];

  if (payload.description) {
    fields.push({ type: "mrkdwn", text: `*Description:*\n${payload.description}` });
  }
  if (payload.amount !== undefined) {
    const currency = (payload.currency as string) ?? "INR";
    fields.push({ type: "mrkdwn", text: `*Amount:*\n${currency} ${Number(payload.amount).toFixed(2)}` });
  }
  if (payload.category) {
    fields.push({ type: "mrkdwn", text: `*Category:*\n${payload.category}` });
  }
  if (payload.date) {
    fields.push({ type: "mrkdwn", text: `*Date:*\n${payload.date}` });
  }
  if (payload.user_name) {
    fields.push({ type: "mrkdwn", text: `*By:*\n${payload.user_name}` });
  }
  if (payload.status) {
    fields.push({ type: "mrkdwn", text: `*Status:*\n${payload.status}` });
  }

  if (fields.length > 0) {
    blocks.push({ type: "section", fields });
  }

  // Additional context
  if (payload.notes) {
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: `_${payload.notes}_` }],
    });
  }

  // Tags
  if (payload.tags && Array.isArray(payload.tags) && payload.tags.length > 0) {
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Tags: ${(payload.tags as string[]).map((t) => `\`${t}\``).join(" ")}`,
        },
      ],
    });
  }

  // Footer with timestamp
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Sent from ExpenseFlow at ${new Date().toISOString()}`,
      },
    ],
  });

  return {
    text: `ExpenseFlow: ${title}`,
    blocks,
  };
}

// ---------------------------------------------------------------------------
// Microsoft Teams Adaptive Card builder
// ---------------------------------------------------------------------------

function buildTeamsCard(
  eventType: string,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const title = formatEventTitle(eventType);
  const facts: { title: string; value: string }[] = [];

  if (payload.description) {
    facts.push({ title: "Description", value: String(payload.description) });
  }
  if (payload.amount !== undefined) {
    const currency = (payload.currency as string) ?? "INR";
    facts.push({ title: "Amount", value: `${currency} ${Number(payload.amount).toFixed(2)}` });
  }
  if (payload.category) {
    facts.push({ title: "Category", value: String(payload.category) });
  }
  if (payload.date) {
    facts.push({ title: "Date", value: String(payload.date) });
  }
  if (payload.user_name) {
    facts.push({ title: "By", value: String(payload.user_name) });
  }
  if (payload.status) {
    facts.push({ title: "Status", value: String(payload.status) });
  }

  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body: [
            {
              type: "TextBlock",
              text: `ExpenseFlow: ${title}`,
              weight: "bolder",
              size: "medium",
              color: "accent",
            },
            {
              type: "FactSet",
              facts,
            },
            ...(payload.notes
              ? [
                  {
                    type: "TextBlock",
                    text: String(payload.notes),
                    isSubtle: true,
                    wrap: true,
                  },
                ]
              : []),
            {
              type: "TextBlock",
              text: `Sent from ExpenseFlow at ${new Date().toISOString()}`,
              isSubtle: true,
              size: "small",
            },
          ],
        },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatEventTitle(eventType: string): string {
  return eventType
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
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
    const body = (await req.json()) as NotifyRequest;
    const { workspace_id, event_type, payload } = body;

    if (!workspace_id || !event_type || !payload) {
      return errorResponse("Missing required fields: workspace_id, event_type, payload");
    }

    const admin = createServiceClient();

    // Fetch messaging integrations (Slack and/or Teams)
    const { data: integrations, error: intError } = await admin
      .from("integrations")
      .select("id, provider, config, is_active")
      .eq("workspace_id", workspace_id)
      .in("provider", ["slack", "teams"])
      .eq("is_active", true);

    if (intError) {
      return errorResponse(`Failed to fetch integrations: ${intError.message}`, 500);
    }

    if (!integrations || integrations.length === 0) {
      return new Response(
        JSON.stringify({ data: { sent: 0, message: "No active Slack/Teams integrations" } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const results: { provider: string; success: boolean; error?: string }[] = [];

    for (const integration of integrations as unknown as IntegrationRow[]) {
      const webhookUrl = integration.config?.webhook_url as string | undefined;

      if (!webhookUrl) {
        results.push({
          provider: integration.provider,
          success: false,
          error: "Missing webhook_url in config",
        });
        continue;
      }

      try {
        let messageBody: Record<string, unknown>;

        if (integration.provider === "slack") {
          messageBody = buildSlackBlocks(event_type, payload);
        } else {
          messageBody = buildTeamsCard(event_type, payload);
        }

        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(messageBody),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => "Unknown error");
          results.push({
            provider: integration.provider,
            success: false,
            error: `HTTP ${response.status}: ${errText.slice(0, 200)}`,
          });
        } else {
          results.push({ provider: integration.provider, success: true });
        }
      } catch (err: unknown) {
        results.push({
          provider: integration.provider,
          success: false,
          error: err instanceof Error ? err.message : "Delivery failed",
        });
      }
    }

    const summary = {
      sent: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      details: results,
    };

    return new Response(
      JSON.stringify({ data: summary }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    console.error("slack-notify error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
    );
  }
});
