-- ============================================================================
-- ExpenseFlow — Invitations Table Migration
-- ============================================================================
-- Adds support for workspace invitations so that non-existing users can be
-- invited by email and automatically join when they sign up.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Invitation status enum
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status') THEN
    CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Invitations table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS invitations (
  id            uuid            DEFAULT gen_random_uuid()  PRIMARY KEY,
  workspace_id  uuid            NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email         text            NOT NULL,
  role          workspace_role  NOT NULL DEFAULT 'member',
  invited_by    uuid            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token         text            NOT NULL UNIQUE,
  status        invitation_status NOT NULL DEFAULT 'pending',
  created_at    timestamptz     NOT NULL DEFAULT now(),
  expires_at    timestamptz     NOT NULL DEFAULT (now() + interval '7 days')
);

-- ---------------------------------------------------------------------------
-- 3. Comments
-- ---------------------------------------------------------------------------

COMMENT ON TABLE  invitations IS 'Pending workspace invitations for users who may or may not have an account yet.';
COMMENT ON COLUMN invitations.token IS 'Unique token for accepting the invitation via a link.';
COMMENT ON COLUMN invitations.status IS 'pending = awaiting acceptance, accepted = user joined, expired = manually revoked or timed out.';

-- ---------------------------------------------------------------------------
-- 4. Indexes
-- ---------------------------------------------------------------------------

-- Fast lookup by token (used when accepting an invitation via link)
CREATE INDEX IF NOT EXISTS idx_invitations_token
  ON invitations (token);

-- Fast lookup by email (used during user-setup to find pending invitations)
CREATE INDEX IF NOT EXISTS idx_invitations_email_status
  ON invitations (email, status)
  WHERE status = 'pending';

-- List invitations for a workspace
CREATE INDEX IF NOT EXISTS idx_invitations_workspace_status
  ON invitations (workspace_id, status)
  WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Workspace owners and admins can view invitations for their workspace
CREATE POLICY "workspace_admins_can_view_invitations"
  ON invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM workspace_members wm
      WHERE wm.workspace_id = invitations.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

-- Workspace owners and admins can create invitations
CREATE POLICY "workspace_admins_can_create_invitations"
  ON invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM workspace_members wm
      WHERE wm.workspace_id = invitations.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

-- Workspace owners and admins can update invitations (e.g. cancel)
CREATE POLICY "workspace_admins_can_update_invitations"
  ON invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM workspace_members wm
      WHERE wm.workspace_id = invitations.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM workspace_members wm
      WHERE wm.workspace_id = invitations.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

-- Users can view their own invitations (by email matching their profile)
CREATE POLICY "users_can_view_own_invitations"
  ON invitations
  FOR SELECT
  USING (
    email = (
      SELECT p.email
      FROM profiles p
      WHERE p.id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Automatic expiration function (optional — can be called by a cron job)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

COMMENT ON FUNCTION expire_old_invitations IS 'Marks all invitations past their expires_at as expired. Call from a cron job.';
