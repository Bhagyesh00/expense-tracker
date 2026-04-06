import type { TypedSupabaseClient } from '../client';
import type { Category } from '@expenseflow/types';

export async function getCategories(
  client: TypedSupabaseClient,
  workspaceId: string,
): Promise<Category[]> {
  const { data, error } = await client
    .from('categories')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return data as Category[];
}
