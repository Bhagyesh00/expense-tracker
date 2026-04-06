/**
 * ExpenseFlow — Payment Reminders Cron Edge Function
 *
 * Runs daily via cron (08:00 IST). For each pending/partial payment with a
 * due_date, checks whether a reminder should be sent based on a 3-stage
 * escalation model:
 *
 *   Stage 1: `reminder_days_before` days before due date (friendly reminder)
 *   Stage 2: On the due date itself (payment is due today)
 *   Stage 3: 3 days after the due date (overdue alert)
 *
 * Duplicate reminders are avoided by tracking `last_reminder_stage` and
 * `last_reminder_sent_at` on the pending_payments row.
 */

import { createServiceClient } from "../_shared/supabase.ts";
import { corsHeaders, handleCors, errorResponse } from "../_shared/cors.ts";

const OVERDUE_GRACE_DAYS = 3;

interface ReminderStage {
  stage: number;
  type: "payment_reminder" | "payment_reminder" | "overdue_payment";
  title: string;
  body: string;
}

function getReminderStage(
  daysUntilDue: number,
  reminderDaysBefore: number,
): ReminderStage | null {
  if (daysUntilDue <= -OVERDUE_GRACE_DAYS) {
    return {
      stage: 3,
      type: "overdue_payment",
      title: "Overdue Payment Alert",
      body: `A payment is overdue by ${Math.abs(daysUntilDue)} day(s). Please settle it as soon as possible.`,
    };
  }

  if (daysUntilDue <= 0 && daysUntilDue > -OVERDUE_GRACE_DAYS) {
    return {
      stage: 2,
      type: "payment_reminder",
      title: "Payment Due Today",
      body: daysUntilDue === 0
        ? "You have a payment due today."
        : `A payment was due ${Math.abs(daysUntilDue)} day(s) ago.`,
    };
  }

  if (daysUntilDue > 0 && daysUntilDue <= reminderDaysBefore) {
    return {
      stage: 1,
      type: "payment_reminder",
      title: "Upcoming Payment Reminder",
      body: `You have a payment due in ${daysUntilDue} day(s). Don't forget to settle it on time.`,
    };
  }

  return null;
}

function daysBetween(dateA: Date, dateB: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((dateA.getTime() - dateB.getTime()) / msPerDay);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleCors();

  try {
    const admin = createServiceClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch all pending/partial payments that have a due_date
    const { data: payments, error: paymentsError } = await admin
      .from("pending_payments")
      .select("id, user_id, workspace_id, contact_id, direction, total_amount, currency, description, due_date, status, last_reminder_stage, last_reminder_sent_at")
      .in("status", ["pending", "partial", "overdue"])
      .not("due_date", "is", null);

    if (paymentsError) throw paymentsError;

    if (!payments || payments.length === 0) {
      return new Response(
        JSON.stringify({ data: { processed: 0, sent: 0 } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Collect unique user IDs to fetch their reminder settings
    const userIds = [...new Set(payments.map((p: any) => p.user_id))];

    const { data: settings, error: settingsError } = await admin
      .from("user_settings")
      .select("user_id, reminder_days_before, push_enabled, email_notifications")
      .in("user_id", userIds);

    if (settingsError) throw settingsError;

    const settingsMap = new Map<string, { reminder_days_before: number }>();
    for (const s of settings ?? []) {
      settingsMap.set(s.user_id, {
        reminder_days_before: s.reminder_days_before ?? 3,
      });
    }

    // Fetch contact names for notification body
    const contactIds = [...new Set(payments.map((p: any) => p.contact_id))];
    const { data: contacts } = await admin
      .from("contacts")
      .select("id, name")
      .in("id", contactIds);

    const contactMap = new Map<string, string>();
    for (const c of contacts ?? []) {
      contactMap.set(c.id, c.name);
    }

    let sentCount = 0;

    for (const payment of payments) {
      const dueDate = new Date(payment.due_date);
      dueDate.setHours(0, 0, 0, 0);

      const daysUntilDue = daysBetween(dueDate, today);

      const userSetting = settingsMap.get(payment.user_id);
      const reminderDaysBefore = userSetting?.reminder_days_before ?? 3;

      const reminderInfo = getReminderStage(daysUntilDue, reminderDaysBefore);
      if (!reminderInfo) continue;

      // Skip if we already sent this stage
      const lastStage = payment.last_reminder_stage ?? 0;
      if (reminderInfo.stage <= lastStage) continue;

      const contactName = contactMap.get(payment.contact_id) ?? "a contact";
      const direction = payment.direction === "give" ? "to" : "from";
      const amountStr = `${payment.currency} ${payment.total_amount}`;

      const personalizedBody = `${reminderInfo.body} — ${amountStr} ${direction} ${contactName}${payment.description ? ` for "${payment.description}"` : ""}.`;

      // Send notification via the send-notification function
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      const notifyResponse = await fetch(
        `${supabaseUrl}/functions/v1/send-notification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            userId: payment.user_id,
            type: reminderInfo.type,
            title: reminderInfo.title,
            body: personalizedBody,
            data: {
              paymentId: payment.id,
              contactId: payment.contact_id,
              workspaceId: payment.workspace_id,
              stage: reminderInfo.stage,
              direction: payment.direction,
              amount: payment.total_amount,
              currency: payment.currency,
              dueDate: payment.due_date,
            },
          }),
        },
      );

      if (!notifyResponse.ok) {
        console.error(
          `Failed to send notification for payment ${payment.id}:`,
          await notifyResponse.text(),
        );
        continue;
      }

      // Update the payment's reminder tracking fields
      const { error: updateError } = await admin
        .from("pending_payments")
        .update({
          last_reminder_stage: reminderInfo.stage,
          last_reminder_sent_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      if (updateError) {
        console.error(
          `Failed to update reminder stage for payment ${payment.id}:`,
          updateError.message,
        );
        continue;
      }

      sentCount++;
    }

    return new Response(
      JSON.stringify({
        data: {
          processed: payments.length,
          sent: sentCount,
          timestamp: new Date().toISOString(),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    console.error("payment-reminders error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
    );
  }
});
