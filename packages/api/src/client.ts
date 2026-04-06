import {
  createClient,
  type SupabaseClient,
  type SupabaseClientOptions,
} from '@supabase/supabase-js';
import type { Database } from '@expenseflow/types';

export type { Database };

export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Creates a typed Supabase client instance.
 *
 * @param url - Supabase project URL
 * @param anonKey - Supabase anon/public key
 * @param options - Additional Supabase client options
 * @returns A typed SupabaseClient
 */
export function createSupabaseClient(
  url: string,
  anonKey: string,
  options?: SupabaseClientOptions<'public'>,
): TypedSupabaseClient {
  return createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      ...options?.auth,
    },
    ...options,
  });
}
