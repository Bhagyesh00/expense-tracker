/**
 * ExpenseFlow — Mark Overdue Payments Cron Edge Function
 *
 * Runs daily at 00:05 IST. Queries all pending_payments where
 * status IN ('pending', 'partial') AND due_date < CURRENT_DATE,
 * then updates their status to 'overdue' and creates a notification
 * for each newly-overdue payment.
 */

import { createServiceClient } from "../_shared/supabase.ts";
import { corsHeaders, handleCors, errorResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleCors();

  try {
    const admin = createServiceClient();
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Find all payments that should now be overdue
    const { data: overduePayments, error: fetchError } = await admin
      .from("pending_payments")
      .select("id, user_id, workspace_id, contact_id, direction, total_amount, paid_amount, currency, description, due_date")
      .in("status", ["pending", "partial"])
      .lt("due_date", today);

    if (fetchError) throw fetchError;

    if (!overduePayments || overduePayments.length === 0) {
      return new Response(
        JSON.stringify({ data: { marked: 0 } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const paymentIds = overduePayments.map((p: any) => p.id);

    // Batch update status to overdue
    const { error: updateError } = await admin
      .from("pending_payments")
      .update({
        status: "overdue",
        updated_at: new Date().toISOString(),
      })
      .in("id", paymentIds);

    if (updateError) throw updateError;

    // Fetch contact names for notification bodies
    const contactIds = [...new Set(overduePayments.map((p: any) => p.contact_id))];
    const { data: contacts } = await admin
      .from("contacts")
      .select("id, name")
      .in("id", contactIds);

    const contactMap = new Map<string, string>();
    for (const c of contacts ?? []) {
      contactMap.set(c.id, c.name);
    }

    // Send a notification for each newly-overdue payment
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let notifiedCount = 0;

    for (const payment of overduePayments) {
      const contactName = contactMap.get(payment.contact_id) ?? "a contact";
      const remainingAmount = payment.total_amount - (payment.paid_amount ?? 0);
      const direction = payment.direction === "give" ? "to" : "from";

      const body = `Payment of ${payment.currency} ${remainingAmount} ${direction} ${contactName} is now overdue (was due ${payment.due_date}).${payment.description ? ` — "${payment.description}"` : ""}`;

      try {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/send-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              userId: payment.user_id,
              type: "overdue_payment",
              title: "Payment Overdue",
              body,
              data: {
                paymentId: payment.id,
                contactId: payment.contact_id,
                workspaceId: payment.workspace_id,
                direction: payment.direction,
                amount: remainingAmount,
                currency: payment.currency,
                dueDate: payment.due_date,
              },
            }),
          },
        );

        if (response.ok) {
          notifiedCount++;
        } else {
          console.error(
            `Failed to notify for payment ${payment.id}:`,
            await response.text(),
          );
        }
      } catch (notifyErr: unknown) {
        console.error(
          `Notification dispatch failed for payment ${payment.id}:`,
          notifyErr,
        );
      }
    }

    return new Response(
      JSON.stringify({
        data: {
          marked: paymentIds.length,
          notified: notifiedCount,
          timestamp: new Date().toISOString(),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    console.error("mark-overdue error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
    );
  }
});
