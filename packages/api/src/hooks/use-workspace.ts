import { useState, useEffect, useCallback } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { TypedSupabaseClient } from '../client';

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

const WORKSPACES_KEY = ['workspaces'] as const;
const WORKSPACE_MEMBERS_KEY = ['workspace-members'] as const;
const WORKSPACE_INVITATIONS_KEY = ['workspace-invitations'] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  default_currency: string;
  description?: string | null;
  icon?: string | null;
  is_personal?: boolean;
  created_at: string;
  updated_at: string;
}

interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at: string;
}

interface WorkspaceMemberWithProfile extends WorkspaceMember {
  profiles: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

interface UseWorkspaceOptions {
  client: TypedSupabaseClient;
  userId: string | undefined;
}

interface UseCurrentWorkspaceOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
}

interface UseMembersOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
}

interface CreateWorkspaceInput {
  name: string;
  description?: string;
  icon?: string;
  default_currency?: string;
}

interface InviteMemberInput {
  workspaceId: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
}

interface WorkspaceWithRole extends Workspace {
  role: 'owner' | 'admin' | 'member' | 'viewer';
}

// ---------------------------------------------------------------------------
// Storage key for persisting active workspace
// ---------------------------------------------------------------------------

const ACTIVE_WORKSPACE_STORAGE_KEY = 'expenseflow:active-workspace-id';

function getStoredWorkspaceId(): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
    }
  } catch {
    // AsyncStorage / SSR — fall through
  }
  return null;
}

function setStoredWorkspaceId(id: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, id);
    }
  } catch {
    // Ignore storage errors
  }
}

// ---------------------------------------------------------------------------
// useWorkspaces — fetch all workspaces the user belongs to, with their role
// ---------------------------------------------------------------------------

export function useWorkspaces({ client, userId }: UseWorkspaceOptions) {
  return useQuery({
    queryKey: [...WORKSPACES_KEY, userId],
    queryFn: async () => {
      const { data, error } = await client
        .from('workspace_members')
        .select('role, workspaces(*)')
        .eq('user_id', userId!)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      // Flatten into WorkspaceWithRole[]
      return (data ?? []).map((row: Record<string, unknown>) => ({
        ...(row.workspaces as Workspace),
        role: row.role as WorkspaceMemberWithProfile['role'],
      })) as WorkspaceWithRole[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useCurrentWorkspace — get/set the active workspace
// ---------------------------------------------------------------------------

export function useCurrentWorkspace({ client, workspaceId }: UseCurrentWorkspaceOptions) {
  return useQuery({
    queryKey: [...WORKSPACES_KEY, 'current', workspaceId],
    queryFn: async () => {
      const { data, error } = await client
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId!)
        .single();

      if (error) throw error;
      return data as Workspace;
    },
    enabled: !!workspaceId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Manages the active workspace ID, persisting it in localStorage.
 * Automatically picks the first workspace if none is stored.
 */
export function useActiveWorkspace({ client, userId }: UseWorkspaceOptions) {
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces({ client, userId });
  const [activeId, setActiveIdState] = useState<string | null>(getStoredWorkspaceId);

  // Auto-select first workspace if none stored
  useEffect(() => {
    if (!activeId && workspaces && workspaces.length > 0) {
      const personalWs = workspaces.find((ws) => ws.is_personal);
      const fallback = personalWs ?? workspaces[0];
      if (fallback) {
        setActiveIdState(fallback.id);
        setStoredWorkspaceId(fallback.id);
      }
    }
  }, [activeId, workspaces]);

  const setActiveWorkspaceId = useCallback((id: string) => {
    setActiveIdState(id);
    setStoredWorkspaceId(id);
  }, []);

  const workspace = useCurrentWorkspace({ client, workspaceId: activeId ?? undefined });

  return {
    activeWorkspaceId: activeId,
    setActiveWorkspaceId,
    workspace: workspace.data ?? null,
    workspaces: workspaces ?? [],
    isLoading: workspacesLoading || workspace.isLoading,
  };
}

// ---------------------------------------------------------------------------
// useCreateWorkspace
// ---------------------------------------------------------------------------

export function useCreateWorkspace({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWorkspaceInput) => {
      // Create workspace — the DB trigger should auto-add creator as owner
      const { data, error } = await client
        .from('workspaces')
        .insert({
          name: input.name,
          description: input.description ?? null,
          icon: input.icon ?? null,
          default_currency: input.default_currency ?? 'USD',
          is_personal: false,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as Workspace;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSPACES_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// useInviteMember — calls the invite-member edge function
// ---------------------------------------------------------------------------

export function useInviteMember({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, email, role }: InviteMemberInput) => {
      // Call the edge function so the server can handle invitation logic
      const { data: sessionData } = await client.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) throw new Error('Not authenticated');

      const supabaseUrl = (client as unknown as { supabaseUrl: string }).supabaseUrl
        ?? (client as unknown as { rest: { url: string } }).rest?.url?.replace('/rest/v1', '')
        ?? '';

      const response = await fetch(`${supabaseUrl}/functions/v1/invite-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ workspaceId, email, role }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: 'Invitation failed' }));
        throw new Error(errorBody.error ?? 'Failed to invite member');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...WORKSPACE_MEMBERS_KEY, variables.workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: [...WORKSPACE_INVITATIONS_KEY, variables.workspaceId],
      });
    },
  });
}

// ---------------------------------------------------------------------------
// useWorkspaceMembers — list members with profile info
// ---------------------------------------------------------------------------

export function useWorkspaceMembers({ client, workspaceId }: UseMembersOptions) {
  return useQuery({
    queryKey: [...WORKSPACE_MEMBERS_KEY, workspaceId],
    queryFn: async () => {
      const { data, error } = await client
        .from('workspace_members')
        .select('*, profiles(id, full_name, email, avatar_url)')
        .eq('workspace_id', workspaceId!)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      return data as unknown as WorkspaceMemberWithProfile[];
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useRemoveMember — remove a member from workspace
// ---------------------------------------------------------------------------

export function useRemoveMember({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      userId,
    }: {
      workspaceId: string;
      userId: string;
    }) => {
      const { error } = await client
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...WORKSPACE_MEMBERS_KEY, variables.workspaceId],
      });
    },
  });
}

// ---------------------------------------------------------------------------
// useUpdateMemberRole — change a member's role
// ---------------------------------------------------------------------------

export function useUpdateMemberRole({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      userId,
      role,
    }: {
      workspaceId: string;
      userId: string;
      role: 'admin' | 'member' | 'viewer';
    }) => {
      const { data, error } = await client
        .from('workspace_members')
        .update({ role })
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data as WorkspaceMember;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...WORKSPACE_MEMBERS_KEY, variables.workspaceId],
      });
    },
  });
}

// ---------------------------------------------------------------------------
// useWorkspaceInvitations — list pending invitations for a workspace
// ---------------------------------------------------------------------------

export function useWorkspaceInvitations({
  client,
  workspaceId,
}: UseMembersOptions) {
  return useQuery({
    queryKey: [...WORKSPACE_INVITATIONS_KEY, workspaceId],
    queryFn: async () => {
      const { data, error } = await client
        .from('invitations')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// useCancelInvitation — revoke a pending invitation
// ---------------------------------------------------------------------------

export function useCancelInvitation({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invitationId,
      workspaceId,
    }: {
      invitationId: string;
      workspaceId: string;
    }) => {
      const { error } = await client
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', invitationId)
        .eq('workspace_id', workspaceId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...WORKSPACE_INVITATIONS_KEY, variables.workspaceId],
      });
    },
  });
}
