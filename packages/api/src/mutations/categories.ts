import type { TypedSupabaseClient } from '../client';
import type { Category } from '@expenseflow/types';

export interface CreateCategoryInput {
  name: string;
  icon?: string | null;
  color?: string | null;
  sort_order?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  icon?: string | null;
  color?: string | null;
  sort_order?: number;
}

export async function createCategory(
  client: TypedSupabaseClient,
  workspaceId: string,
  input: CreateCategoryInput,
): Promise<Category> {
  const { data, error } = await client
    .from('categories')
    .insert({
      workspace_id: workspaceId,
      name: input.name,
      icon: input.icon ?? null,
      color: input.color ?? null,
      is_default: false,
      sort_order: input.sort_order ?? 0,
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data as Category;
}

export async function updateCategory(
  client: TypedSupabaseClient,
  id: string,
  input: UpdateCategoryInput,
): Promise<Category> {
  const { data, error } = await client
    .from('categories')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Category;
}

export async function deleteCategory(
  client: TypedSupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await client
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('is_system', false); // Prevent deleting system categories

  if (error) throw error;
}
