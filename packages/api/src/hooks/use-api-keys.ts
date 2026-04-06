import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { TypedSupabaseClient } from '../client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiKey {
  id: string;
  workspace_id: string;
  name: string;
  prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface GenerateApiKeyInput {
  workspace_id: string;
  name: string;
  scopes: string[];
  expires_at?: string;
}

/** Returned only once on creation — includes the full plaintext key. */
export interface GeneratedApiKey {
  id: string;
  key: string;
  prefix: string;
  name: string;
  scopes: string[];
  expires_at: string | null;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const API_KEYS_KEY = ['api-keys'] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically random API key.
 * Format: efk_XXXXXXXX_XXXXXXXXXXXXXXXXXXXXXXXX (prefix_random)
 */
function generateRawKey(): { key: string; prefix: string } {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const key = `efk_${hex}`;
  const prefix = key.slice(0, 8);
  return { key, prefix };
}

/**
 * SHA-256 hash of the API key for storage.
 */
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

interface UseApiKeysOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
}

/** List all API keys for a workspace (no plaintext keys — only prefix). */
export function useApiKeys({ client, workspaceId }: UseApiKeysOptions) {
  return useQuery<ApiKey[]>({
    queryKey: [...API_KEYS_KEY, workspaceId],
    queryFn: async () => {
      const { data, error } = await client
        .from('api_keys')
        .select('id, workspace_id, name, prefix, scopes, last_used_at, expires_at, is_active, created_at')
        .eq('workspace_id', workspaceId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as ApiKey[];
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Generate a new API key.
 * Returns the full key ONCE — it cannot be retrieved again.
 */
export function useGenerateApiKey({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<GeneratedApiKey, Error, GenerateApiKeyInput>({
    mutationFn: async (input) => {
      const { key, prefix } = generateRawKey();
      const keyHash = await hashKey(key);

      const { data, error } = await client
        .from('api_keys')
        .insert({
          workspace_id: input.workspace_id,
          name: input.name,
          key_hash: keyHash,
          prefix,
          scopes: input.scopes,
          expires_at: input.expires_at ?? null,
          is_active: true,
        })
        .select('id, name, prefix, scopes, expires_at')
        .single();

      if (error) throw error;

      return {
        ...(data as unknown as Omit<GeneratedApiKey, 'key'>),
        key,
      };
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: [...API_KEYS_KEY, input.workspace_id] });
    },
  });
}

/** Revoke (deactivate) an API key. */
export function useRevokeApiKey({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; workspaceId: string }>({
    mutationFn: async ({ id }) => {
      const { error } = await client
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: [...API_KEYS_KEY, workspaceId] });
    },
  });
}

/** Delete an API key permanently. */
export function useDeleteApiKey({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; workspaceId: string }>({
    mutationFn: async ({ id }) => {
      const { error } = await client
        .from('api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: [...API_KEYS_KEY, workspaceId] });
    },
  });
}

/** Rename an API key or update scopes. */
export function useUpdateApiKey({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; workspaceId: string; name?: string; scopes?: string[] }>({
    mutationFn: async ({ id, name, scopes }) => {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (scopes !== undefined) updates.scopes = scopes;

      if (Object.keys(updates).length === 0) return;

      const { error } = await client
        .from('api_keys')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: [...API_KEYS_KEY, workspaceId] });
    },
  });
}
