export interface Contact {
  id: string;
  user_id: string;
  workspace_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  linked_user_id: string | null;
  notes: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateContactInput {
  workspace_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  linked_user_id?: string | null;
  notes?: string | null;
}
