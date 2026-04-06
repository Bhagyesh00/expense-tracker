/**
 * ExpenseFlow — Generate Recurring Payments Edge Function
 *
 * Scheduled cron function that auto-generates pending_payment records from
 * active recurring_payment_templates where the next_due_date is within the
 * configured auto_generate_days_before window.
 *
 * Expected invocation: daily cron at midnight UTC.
 * Can also be triggered manually via POST for backfill / testing.
 *
 * Response shape:
 *   { generated: number, skipped: number, errors: GenerationError[] }
 */

import { createServiceClient } from "../_shared/supabase.ts";
import { corsHeaders, handleCors, errorResponse } from "../_shared/cors.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecurringTemplate {
  id: string;
  workspace_id: string;
  user_id: string;
  contact_id: string | null;
  contact_name: string;
  direction: "give" | "receive";
  amount: number;
  currency: string;
  description: string | null;
  recurrence_interval: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
  start_date: string;
  end_date: string | null;
  next_due_date: string;
  is_active: boolean;
  auto_generate: boolean;
  auto_generate_days_before: number;
  notes: string | null;
}

interface GenerationError {
  template_id: string;
  contact_name: string;
  error: string;
}

interface GenerationResult {
  generated: number;
  skipped: number;
  errors: GenerationError[];
}

// ---------------------------------------------------------------------------
// Date advancement helper (mirrors the client-side hook)
// ---------------------------------------------------------------------------

function advanceDate(
  dateStr: string,
  interval: RecurringTemplate["recurrence_interval"],
): string {
  const d = new Date(dateStr);

  switch (interval) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "biweekly":
      d.setDate(d.getDate() + 14);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "quarterly":
      d.setMonth(d.getMonth() + 3);
      break;
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }

  return d.toISOString().split("T")[0]!;
}

// ---------------------------------------------------------------------------
// Core generation logic
// ---------------------------------------------------------------------------

async function generateRecurringPayments(): Promise<GenerationResult> {
  const admin = createServiceClient();
  const today = new Date().toISOString().split("T")[0]!;
  const result: GenerationResult = { generated: 0, skipped: 0, errors: [] };

  // Fetch all active templates where auto_generate is true and we're within
  // the look-ahead window: next_due_date <= today + auto_generate_days_before
  // We compute the threshold date as today + max(auto_generate_days_before) but
  // filter per-row in application code for accuracy.
  const { data: templates, error: fetchError } = await admin
    .from("recurring_payment_templates")
    .select("*")
    .eq("is_active", true)
    .eq("auto_generate", true)
    .lte("next_due_date", (() => {
      // Fetch templates with next_due_date up to 30 days away (generous upper bound)
      // Per-row day window is checked below
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toISOString().split("T")[0]!;
    })());

  if (fetchError) {
    console.error("[generate-recurring] Failed to fetch templates:", fetchError);
    throw new Error(`Failed to fetch templates: ${fetchError.message}`);
  }

  const templateRows = (templates ?? []) as RecurringTemplate[];

  for (const template of templateRows) {
    try {
      // Check if next_due_date falls within the per-template window
      const dueDate = new Date(template.next_due_date);
      const todayDate = new Date(today);
      const lookAheadDate = new Date(today);
      lookAheadDate.setDate(lookAheadDate.getDate() + template.auto_generate_days_before);

      if (dueDate > lookAheadDate) {
        // Not within this template's window yet
        result.skipped++;
        continue;
      }

      // Guard: do not generate if already past end_date
      if (template.end_date && todayDate > new Date(template.end_date)) {
        // Deactivate the template
        await admin
          .from("recurring_payment_templates")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", template.id);

        result.skipped++;
        continue;
      }

      // Check if a pending_payment for this template+due_date already exists
      // (prevents duplicate generation on re-runs)
      const { data: existingPayments, error: checkError } = await admin
        .from("pending_payments")
        .select("id")
        .eq("workspace_id", template.workspace_id)
        .eq("user_id", template.user_id)
        .eq("due_date", template.next_due_date)
        .eq("amount", template.amount)
        .in("status", ["pending", "partial"]);

      if (checkError) {
        console.warn(
          `[generate-recurring] Duplicate check failed for template ${template.id}:`,
          checkError,
        );
        // Proceed cautiously — skip rather than risk duplicate
        result.skipped++;
        continue;
      }

      if (existingPayments && existingPayments.length > 0) {
        // Already generated for this cycle
        result.skipped++;
        continue;
      }

      // Create the pending_payment record
      const { error: insertError } = await admin
        .from("pending_payments")
        .insert({
          workspace_id: template.workspace_id,
          user_id: template.user_id,
          contact_id: template.contact_id ?? null,
          direction: template.direction,
          amount: template.amount,
          paid_amount: 0,
          currency: template.currency,
          description: template.description ??
            `Recurring: ${template.contact_name}`,
          status: "pending",
          due_date: template.next_due_date,
        });

      if (insertError) {
        throw new Error(`Failed to create pending payment: ${insertError.message}`);
      }

      // Advance next_due_date
      const newNextDueDate = advanceDate(
        template.next_due_date,
        template.recurrence_interval,
      );

      const isExpired =
        template.end_date !== null &&
        new Date(newNextDueDate) > new Date(template.end_date);

      const { error: updateError } = await admin
        .from("recurring_payment_templates")
        .update({
          next_due_date: newNextDueDate,
          is_active: !isExpired,
          updated_at: new Date().toISOString(),
        })
        .eq("id", template.id);

      if (updateError) {
        console.warn(
          `[generate-recurring] Failed to advance next_due_date for template ${template.id}:`,
          updateError,
        );
        // Non-fatal — payment was created successfully
      }

      // Send notification to the user
      try {
        const directionText = template.direction === "give" ? "to" : "from";
        await admin.from("notifications").insert({
          user_id: template.user_id,
          workspace_id: template.workspace_id,
          type: "payment_reminder",
          title: "Recurring Payment Due",
          body: `${template.currency} ${template.amount} ${directionText} ${template.contact_name} is due on ${template.next_due_date}.`,
          data: {
            templateId: template.id,
            direction: template.direction,
            amount: template.amount,
            currency: template.currency,
            dueDate: template.next_due_date,
            contactName: template.contact_name,
            autoGenerated: true,
          },
          is_read: false,
        });
      } catch (notifyError: unknown) {
        // Notifications are best-effort — do not fail the generation
        console.warn(
          `[generate-recurring] Notification failed for template ${template.id}:`,
          notifyError,
        );
      }

      result.generated++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[generate-recurring] Error processing template ${template.id}:`,
        message,
      );

      result.errors.push({
        template_id: template.id,
        contact_name: template.contact_name,
        error: message,
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Deno HTTP handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") return handleCors();

  // Only allow POST (from cron scheduler or manual trigger)
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    console.log("[generate-recurring] Starting generation run at", new Date().toISOString());

    const result = await generateRecurringPayments();

    console.log(
      `[generate-recurring] Completed: ${result.generated} generated, ` +
        `${result.skipped} skipped, ${result.errors.length} errors`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[generate-recurring] Fatal error:", message);
    return errorResponse(message, 500);
  }
});
