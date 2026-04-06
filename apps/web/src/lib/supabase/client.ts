import { createBrowserClient as createClient } from "@supabase/ssr";
import type { Database } from "@expenseflow/types";
import type { TypedSupabaseClient } from "@expenseflow/api";

let browserClient: TypedSupabaseClient | null = null;

export function createBrowserClient(): TypedSupabaseClient {
  if (browserClient) return browserClient;

  browserClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ) as unknown as TypedSupabaseClient;

  return browserClient;
}
