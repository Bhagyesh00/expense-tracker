-- Migration: 00004_budget_alerts
-- Description: Add budget alert tracking and savings goal fund history columns,
--              plus performance indexes for the budget-alerts cron function.

-- ---------------------------------------------------------------------------
-- 1. Add last_alert_percent to budgets table
--    Tracks the highest alert threshold that has already been sent for this
--    budget in the current period, preventing duplicate notifications.
--    Resets to 0 at period boundaries (handled by app logic or a separate cron).
-- ---------------------------------------------------------------------------

ALTER TABLE budgets
  ADD COLUMN IF NOT EXISTS last_alert_percent INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN budgets.last_alert_percent IS
  'Highest alert threshold percent already notified (0/50/80/100). Prevents duplicate alerts within a period.';

-- ---------------------------------------------------------------------------
-- 2. Add fund_additions JSONB to savings_goals table
--    Stores the history of individual fund additions as a JSONB array:
--    [{ "amount": 500, "notes": "Birthday money", "added_at": "2026-03-27T..." }, ...]
-- ---------------------------------------------------------------------------

ALTER TABLE savings_goals
  ADD COLUMN IF NOT EXISTS fund_additions JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN savings_goals.fund_additions IS
  'Array of fund addition records: [{ amount, notes, added_at }]. Tracks contribution history.';

-- ---------------------------------------------------------------------------
-- 3. Index for efficient budget-alerts cron queries
--    The cron function queries: WHERE workspace_id = ? AND is_active = true AND period = ?
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_budgets_workspace_active_period
  ON budgets (workspace_id, is_active, period)
  WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- 4. Index for savings goals workspace queries (active and completed)
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_savings_goals_workspace_completed
  ON savings_goals (workspace_id, is_completed);
