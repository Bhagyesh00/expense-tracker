-- Migration: Payment Reminder Tracking
-- Adds columns and indexes to support the 3-stage reminder escalation system
-- and efficient cron queries for the payment-reminders and mark-overdue edge functions.

-- ---------------------------------------------------------------------------
-- 1. Add reminder tracking columns to pending_payments
-- ---------------------------------------------------------------------------

ALTER TABLE pending_payments
  ADD COLUMN IF NOT EXISTS last_reminder_stage INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN pending_payments.last_reminder_stage IS
  'Tracks the highest escalation stage sent (0 = none, 1 = friendly, 2 = due today, 3 = overdue alert)';

COMMENT ON COLUMN pending_payments.last_reminder_sent_at IS
  'Timestamp of the most recent reminder notification sent for this payment';

-- ---------------------------------------------------------------------------
-- 2. Indexes for efficient cron queries
-- ---------------------------------------------------------------------------

-- Composite index on (due_date, status) for the payment-reminders cron
-- which queries payments WHERE status IN ('pending','partial','overdue')
-- AND due_date IS NOT NULL.
CREATE INDEX IF NOT EXISTS idx_pending_payments_due_date_status
  ON pending_payments (due_date, status)
  WHERE due_date IS NOT NULL;

-- Index for the mark-overdue cron which queries
-- WHERE status IN ('pending','partial') AND due_date < CURRENT_DATE.
CREATE INDEX IF NOT EXISTS idx_pending_payments_overdue_candidates
  ON pending_payments (due_date)
  WHERE status IN ('pending', 'partial') AND due_date IS NOT NULL;

-- Index for contact-based payment lookups (used by contact ledger and payment history).
CREATE INDEX IF NOT EXISTS idx_pending_payments_contact
  ON pending_payments (workspace_id, contact_id, status);

-- ---------------------------------------------------------------------------
-- 3. pg_cron schedule documentation
-- ---------------------------------------------------------------------------
-- To enable the cron schedules, run the following in the Supabase SQL Editor
-- (requires pg_cron extension to be enabled):
--
-- Enable pg_cron if not already enabled:
--   CREATE EXTENSION IF NOT EXISTS pg_cron;
--
-- Schedule payment-reminders to run daily at 08:00 IST (02:30 UTC):
--   SELECT cron.schedule(
--     'payment-reminders',
--     '30 2 * * *',
--     $$
--     SELECT net.http_post(
--       url := current_setting('app.supabase_url') || '/functions/v1/payment-reminders',
--       headers := jsonb_build_object(
--         'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
--         'Content-Type', 'application/json'
--       ),
--       body := '{}'::jsonb
--     );
--     $$
--   );
--
-- Schedule mark-overdue to run daily at 00:05 IST (18:35 UTC previous day):
--   SELECT cron.schedule(
--     'mark-overdue',
--     '35 18 * * *',
--     $$
--     SELECT net.http_post(
--       url := current_setting('app.supabase_url') || '/functions/v1/mark-overdue',
--       headers := jsonb_build_object(
--         'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
--         'Content-Type', 'application/json'
--       ),
--       body := '{}'::jsonb
--     );
--     $$
--   );
--
-- To verify scheduled jobs:
--   SELECT * FROM cron.job;
--
-- To remove a scheduled job:
--   SELECT cron.unschedule('payment-reminders');
--   SELECT cron.unschedule('mark-overdue');
