-- =============================================================================
-- ExpenseFlow: Phase 12 — Bank Sync & SMS Parsing
-- Migration: 00009_bank_sync
-- Description: Bank connections, transactions, SMS rules, statement imports
-- =============================================================================

-- =============================================================================
-- TABLE: bank_connections
-- Linked bank accounts via Plaid, Salt Edge, or manual
-- =============================================================================

CREATE TABLE public.bank_connections (
  id                    UUID          PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id          UUID          NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider              TEXT          NOT NULL CHECK (provider IN ('plaid', 'salt_edge', 'manual')),
  institution_name      TEXT          NOT NULL CHECK (char_length(institution_name) BETWEEN 1 AND 200),
  institution_id        TEXT,
  account_name          TEXT          NOT NULL CHECK (char_length(account_name) BETWEEN 1 AND 200),
  account_type          TEXT          NOT NULL DEFAULT 'checking' CHECK (account_type IN ('checking', 'savings', 'credit_card', 'loan', 'investment', 'other')),
  account_mask          TEXT          CHECK (char_length(account_mask) = 4),
  access_token_encrypted TEXT,
  status                TEXT          NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disconnected', 'error')),
  last_synced_at        TIMESTAMPTZ,
  error_message         TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.bank_connections                     IS 'Linked bank accounts for automatic transaction import';
COMMENT ON COLUMN public.bank_connections.account_mask        IS 'Last 4 digits of account number for display';
COMMENT ON COLUMN public.bank_connections.access_token_encrypted IS 'Encrypted provider access token';

-- =============================================================================
-- TABLE: bank_transactions
-- Imported bank transactions, optionally matched to expenses
-- =============================================================================

CREATE TABLE public.bank_transactions (
  id                  UUID          PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id        UUID          NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  bank_connection_id  UUID          NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  transaction_id      TEXT          NOT NULL,
  amount              DECIMAL(15,2) NOT NULL,
  currency            TEXT          NOT NULL DEFAULT 'INR',
  description         TEXT          NOT NULL DEFAULT '',
  merchant_name       TEXT,
  category_hint       TEXT,
  date                DATE          NOT NULL,
  status              TEXT          NOT NULL DEFAULT 'posted' CHECK (status IN ('pending', 'posted')),
  is_matched          BOOLEAN       NOT NULL DEFAULT FALSE,
  matched_expense_id  UUID          REFERENCES public.expenses(id) ON DELETE SET NULL,
  raw_data            JSONB         NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (bank_connection_id, transaction_id)
);

COMMENT ON TABLE  public.bank_transactions                    IS 'Imported bank transactions from connected accounts';
COMMENT ON COLUMN public.bank_transactions.transaction_id     IS 'External transaction ID from bank provider';
COMMENT ON COLUMN public.bank_transactions.is_matched         IS 'Whether this transaction has been matched to an expense';
COMMENT ON COLUMN public.bank_transactions.category_hint      IS 'Category suggestion from the bank provider';

-- =============================================================================
-- TABLE: sms_rules
-- Regex patterns for parsing bank SMS notifications
-- =============================================================================

CREATE TABLE public.sms_rules (
  id             UUID          PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id   UUID          NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  bank_name      TEXT          NOT NULL CHECK (char_length(bank_name) BETWEEN 1 AND 100),
  pattern        TEXT          NOT NULL CHECK (char_length(pattern) BETWEEN 1 AND 2000),
  amount_group   INTEGER       NOT NULL DEFAULT 1 CHECK (amount_group >= 1),
  merchant_group INTEGER       NOT NULL DEFAULT 2 CHECK (merchant_group >= 1),
  is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.sms_rules              IS 'Regex patterns for parsing bank SMS into transactions';
COMMENT ON COLUMN public.sms_rules.pattern      IS 'Regex pattern with named or numbered capture groups';
COMMENT ON COLUMN public.sms_rules.amount_group IS 'Regex group index that captures the transaction amount';
COMMENT ON COLUMN public.sms_rules.merchant_group IS 'Regex group index that captures the merchant name';

-- =============================================================================
-- TABLE: bank_statements
-- Uploaded bank statement files for batch import
-- =============================================================================

CREATE TABLE public.bank_statements (
  id            UUID          PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace_id  UUID          NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  file_url      TEXT          NOT NULL,
  file_type     TEXT          NOT NULL CHECK (file_type IN ('pdf', 'csv', 'ofx', 'qif')),
  status        TEXT          NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')),
  parsed_count  INTEGER       NOT NULL DEFAULT 0,
  matched_count INTEGER       NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.bank_statements             IS 'Uploaded bank statement files for batch import';
COMMENT ON COLUMN public.bank_statements.parsed_count IS 'Number of transactions extracted from the statement';
COMMENT ON COLUMN public.bank_statements.matched_count IS 'Number of parsed transactions matched to existing expenses';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;

-- Bank connections
CREATE POLICY "bank_connections_select" ON public.bank_connections
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = bank_connections.workspace_id AND wm.user_id = auth.uid())
  );
CREATE POLICY "bank_connections_insert" ON public.bank_connections
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = bank_connections.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
  );
CREATE POLICY "bank_connections_update" ON public.bank_connections
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = bank_connections.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
  );
CREATE POLICY "bank_connections_delete" ON public.bank_connections
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = bank_connections.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
  );

-- Bank transactions
CREATE POLICY "bank_transactions_select" ON public.bank_transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = bank_transactions.workspace_id AND wm.user_id = auth.uid())
  );
CREATE POLICY "bank_transactions_insert" ON public.bank_transactions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = bank_transactions.workspace_id AND wm.user_id = auth.uid())
  );
CREATE POLICY "bank_transactions_update" ON public.bank_transactions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = bank_transactions.workspace_id AND wm.user_id = auth.uid())
  );

-- SMS rules
CREATE POLICY "sms_rules_select" ON public.sms_rules
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sms_rules.workspace_id AND wm.user_id = auth.uid())
  );
CREATE POLICY "sms_rules_insert" ON public.sms_rules
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sms_rules.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
  );
CREATE POLICY "sms_rules_update" ON public.sms_rules
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sms_rules.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
  );
CREATE POLICY "sms_rules_delete" ON public.sms_rules
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sms_rules.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin'))
  );

-- Bank statements
CREATE POLICY "bank_statements_select" ON public.bank_statements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = bank_statements.workspace_id AND wm.user_id = auth.uid())
  );
CREATE POLICY "bank_statements_insert" ON public.bank_statements
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = bank_statements.workspace_id AND wm.user_id = auth.uid())
  );

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_bank_connections_workspace ON public.bank_connections (workspace_id, status);
CREATE INDEX idx_bank_transactions_connection ON public.bank_transactions (bank_connection_id, date DESC);
CREATE INDEX idx_bank_transactions_workspace ON public.bank_transactions (workspace_id, date DESC);
CREATE INDEX idx_bank_transactions_unmatched ON public.bank_transactions (workspace_id, is_matched, date DESC) WHERE is_matched = FALSE;
CREATE INDEX idx_bank_transactions_matched_expense ON public.bank_transactions (matched_expense_id) WHERE matched_expense_id IS NOT NULL;
CREATE INDEX idx_sms_rules_workspace ON public.sms_rules (workspace_id, bank_name, is_active);
CREATE INDEX idx_bank_statements_workspace ON public.bank_statements (workspace_id, created_at DESC);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_bank_connections_updated_at') THEN
    CREATE TRIGGER trg_bank_connections_updated_at
      BEFORE UPDATE ON public.bank_connections
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;
