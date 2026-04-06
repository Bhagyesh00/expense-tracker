import type { WorkspaceRole } from '../enums';

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  owner_id: string;
  default_currency: string;
  is_personal: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  invited_by: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
}
