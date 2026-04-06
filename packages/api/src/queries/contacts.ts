import type { TypedSupabaseClient } from '../client';

export interface ContactRow {
  id: string;
  workspace_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactWithBalance extends ContactRow {
  netBalance: number;
  totalGive: number;
  totalReceive: number;
}

export interface ContactPaymentSummary {
  totalGive: number;
  totalReceive: number;
  netBalance: number;
  pendingCount: number;
  overdueCount: number;
}

export interface ContactSearchOptions {
  query?: string;
  sortBy?: 'name' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export async function getContacts(
  client: TypedSupabaseClient,
  workspaceId: string,
  options?: ContactSearchOptions,
): Promise<ContactRow[]> {
  let query = client
    .from('contacts')
    .select('*')
    .eq('workspace_id', workspaceId);

  // Apply search filter across name, phone, email
  if (options?.query && options.query.trim().length > 0) {
    const searchTerm = `%${options.query.trim()}%`;
    query = query.or(
      `name.ilike.${searchTerm},phone.ilike.${searchTerm},email.ilike.${searchTerm}`,
    );
  }

  const sortBy = options?.sortBy ?? 'name';
  const ascending = (options?.sortOrder ?? 'asc') === 'asc';
  query = query.order(sortBy, { ascending });

  const { data, error } = await query;
  if (error) throw error;
  return data as ContactRow[];
}

/**
 * Get a single contact with computed net balance from pending payments.
 */
export async function getContactWithBalance(
  client: TypedSupabaseClient,
  workspaceId: string,
  contactId: string,
): Promise<ContactWithBalance> {
  // Fetch contact
  const { data: contact, error: contactError } = await client
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .eq('workspace_id', workspaceId)
    .single();

  if (contactError) throw contactError;

  // Fetch active payments with this contact
  const { data: payments, error: paymentsError } = await client
    .from('pending_payments')
    .select('direction, total_amount, paid_amount')
    .eq('workspace_id', workspaceId)
    .eq('contact_id', contactId)
    .neq('status', 'cancelled')
    .neq('status', 'settled');

  if (paymentsError) throw paymentsError;

  let totalGive = 0;
  let totalReceive = 0;

  for (const p of payments ?? []) {
    const remaining = (p.total_amount as number) - ((p.paid_amount as number) ?? 0);
    if ((p.direction as string) === 'give') {
      totalGive += remaining;
    } else {
      totalReceive += remaining;
    }
  }

  return {
    ...(contact as ContactRow),
    totalGive: Math.round(totalGive * 100) / 100,
    totalReceive: Math.round(totalReceive * 100) / 100,
    netBalance: Math.round((totalReceive - totalGive) * 100) / 100,
  };
}

/**
 * Search contacts by name, phone, or email.
 */
export async function searchContacts(
  client: TypedSupabaseClient,
  workspaceId: string,
  query: string,
): Promise<ContactRow[]> {
  if (!query || query.trim().length === 0) {
    return getContacts(client, workspaceId);
  }

  const searchTerm = `%${query.trim()}%`;

  const { data, error } = await client
    .from('contacts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .or(
      `name.ilike.${searchTerm},phone.ilike.${searchTerm},email.ilike.${searchTerm}`,
    )
    .order('name', { ascending: true });

  if (error) throw error;
  return data as ContactRow[];
}

/**
 * Get a summary of payments with a specific contact.
 */
export async function getContactPaymentSummary(
  client: TypedSupabaseClient,
  workspaceId: string,
  contactId: string,
): Promise<ContactPaymentSummary> {
  const { data: payments, error } = await client
    .from('pending_payments')
    .select('direction, total_amount, paid_amount, status')
    .eq('workspace_id', workspaceId)
    .eq('contact_id', contactId)
    .neq('status', 'cancelled')
    .neq('status', 'settled');

  if (error) throw error;

  let totalGive = 0;
  let totalReceive = 0;
  let pendingCount = 0;
  let overdueCount = 0;

  for (const p of payments ?? []) {
    const remaining = (p.total_amount as number) - ((p.paid_amount as number) ?? 0);
    if ((p.direction as string) === 'give') {
      totalGive += remaining;
    } else {
      totalReceive += remaining;
    }
    pendingCount++;
    if ((p.status as string) === 'overdue') {
      overdueCount++;
    }
  }

  return {
    totalGive: Math.round(totalGive * 100) / 100,
    totalReceive: Math.round(totalReceive * 100) / 100,
    netBalance: Math.round((totalReceive - totalGive) * 100) / 100,
    pendingCount,
    overdueCount,
  };
}
