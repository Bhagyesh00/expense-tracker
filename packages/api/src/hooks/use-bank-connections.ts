import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import type { TypedSupabaseClient } from '../client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BankProvider = 'plaid' | 'salt_edge' | 'manual';
export type BankAccountType = 'checking' | 'savings' | 'credit_card' | 'loan' | 'investment' | 'other';
export type BankConnectionStatus = 'active' | 'disconnected' | 'error';
export type BankTransactionStatus = 'pending' | 'posted';

export interface BankConnection {
  id: string;
  workspace_id: string;
  provider: BankProvider;
  institution_name: string;
  institution_id: string | null;
  account_name: string;
  account_type: BankAccountType;
  account_mask: string | null;
  status: BankConnectionStatus;
  last_synced_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankTransaction {
  id: string;
  workspace_id: string;
  bank_connection_id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  description: string;
  merchant_name: string | null;
  category_hint: string | null;
  date: string;
  status: BankTransactionStatus;
  is_matched: boolean;
  matched_expense_id: string | null;
  raw_data: Record<string, unknown>;
  created_at: string;
}

export interface BankStatement {
  id: string;
  workspace_id: string;
  file_url: string;
  file_type: 'pdf' | 'csv' | 'ofx' | 'qif';
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  parsed_count: number;
  matched_count: number;
  error_message: string | null;
  created_at: string;
}

export interface ConnectBankInput {
  workspace_id: string;
  provider: BankProvider;
  institution_name: string;
  institution_id?: string;
  account_name: string;
  account_type: BankAccountType;
  account_mask?: string;
  access_token_encrypted?: string;
}

export interface ImportStatementResult {
  parsed_count: number;
  matched_count: number;
  unmatched_count: number;
  statement_id: string;
}

export interface ParseSmsResult {
  parsed: boolean;
  transaction?: {
    amount: number;
    merchant: string;
    type: 'debit' | 'credit';
    bank: string;
    account_mask?: string;
    confidence: number;
  };
  expense_id?: string | null;
  auto_created?: boolean;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const BANK_CONNECTIONS_KEY = ['bank-connections'] as const;
const BANK_TRANSACTIONS_KEY = ['bank-transactions'] as const;
const BANK_STATEMENTS_KEY = ['bank-statements'] as const;

// ---------------------------------------------------------------------------
// Connection hooks
// ---------------------------------------------------------------------------

interface UseBankConnectionsOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
}

/** List all bank connections for a workspace. */
export function useBankConnections({ client, workspaceId }: UseBankConnectionsOptions) {
  return useQuery<BankConnection[]>({
    queryKey: [...BANK_CONNECTIONS_KEY, workspaceId],
    queryFn: async () => {
      const { data, error } = await client
        .from('bank_connections')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as BankConnection[];
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Connect a new bank account. */
export function useConnectBank({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<BankConnection, Error, ConnectBankInput>({
    mutationFn: async (input) => {
      const { data, error } = await client
        .from('bank_connections')
        .insert({
          workspace_id: input.workspace_id,
          provider: input.provider,
          institution_name: input.institution_name,
          institution_id: input.institution_id ?? null,
          account_name: input.account_name,
          account_type: input.account_type,
          account_mask: input.account_mask ?? null,
          access_token_encrypted: input.access_token_encrypted ?? null,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as BankConnection;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: [...BANK_CONNECTIONS_KEY, input.workspace_id] });
    },
  });
}

/** Disconnect (remove) a bank connection. */
export function useDisconnectBank({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; workspaceId: string }>({
    mutationFn: async ({ id }) => {
      const { error } = await client
        .from('bank_connections')
        .update({ status: 'disconnected', access_token_encrypted: null })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: [...BANK_CONNECTIONS_KEY, workspaceId] });
    },
  });
}

// ---------------------------------------------------------------------------
// Transaction hooks
// ---------------------------------------------------------------------------

interface UseBankTransactionsOptions {
  client: TypedSupabaseClient;
  workspaceId: string | undefined;
  connectionId?: string;
  onlyUnmatched?: boolean;
  pageSize?: number;
}

/** List bank transactions with pagination and optional filtering. */
export function useBankTransactions({
  client,
  workspaceId,
  connectionId,
  onlyUnmatched = false,
  pageSize = 50,
}: UseBankTransactionsOptions) {
  return useInfiniteQuery({
    queryKey: [...BANK_TRANSACTIONS_KEY, workspaceId, connectionId, onlyUnmatched],
    queryFn: async ({ pageParam = 0 }) => {
      let query = client
        .from('bank_transactions')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('date', { ascending: false })
        .range(pageParam as number, (pageParam as number) + pageSize - 1);

      if (connectionId) {
        query = query.eq('bank_connection_id', connectionId);
      }
      if (onlyUnmatched) {
        query = query.eq('is_matched', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as BankTransaction[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const total = allPages.reduce((sum, page) => sum + page.length, 0);
      return lastPage.length === pageSize ? total : undefined;
    },
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  });
}

/** Match a bank transaction to an expense. */
export function useMatchTransaction({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { transactionId: string; expenseId: string; workspaceId: string }>({
    mutationFn: async ({ transactionId, expenseId }) => {
      const { error } = await client
        .from('bank_transactions')
        .update({
          is_matched: true,
          matched_expense_id: expenseId,
        })
        .eq('id', transactionId);

      if (error) throw error;
    },
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: [...BANK_TRANSACTIONS_KEY, workspaceId] });
    },
  });
}

/** Unmatch a bank transaction from an expense. */
export function useUnmatchTransaction({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { transactionId: string; workspaceId: string }>({
    mutationFn: async ({ transactionId }) => {
      const { error } = await client
        .from('bank_transactions')
        .update({
          is_matched: false,
          matched_expense_id: null,
        })
        .eq('id', transactionId);

      if (error) throw error;
    },
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: [...BANK_TRANSACTIONS_KEY, workspaceId] });
    },
  });
}

// ---------------------------------------------------------------------------
// Statement import hooks
// ---------------------------------------------------------------------------

/** List imported bank statements. */
export function useBankStatements({ client, workspaceId }: UseBankConnectionsOptions) {
  return useQuery<BankStatement[]>({
    queryKey: [...BANK_STATEMENTS_KEY, workspaceId],
    queryFn: async () => {
      const { data, error } = await client
        .from('bank_statements')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as BankStatement[];
    },
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  });
}

/** Upload and import a bank statement file. */
export function useImportStatement({ client }: { client: TypedSupabaseClient }) {
  const queryClient = useQueryClient();

  return useMutation<ImportStatementResult, Error, {
    workspaceId: string;
    file: File;
    fileType: 'pdf' | 'csv' | 'ofx' | 'qif';
  }>({
    mutationFn: async ({ workspaceId, file, fileType }) => {
      // 1. Upload file to storage
      const filePath = `statements/${workspaceId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await client.storage
        .from('statements')
        .upload(filePath, file);

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      // 2. Create bank_statements record
      const { data: statement, error: stmtError } = await client
        .from('bank_statements')
        .insert({
          workspace_id: workspaceId,
          file_url: filePath,
          file_type: fileType,
          status: 'uploaded',
        })
        .select('id')
        .single();

      if (stmtError || !statement) {
        throw new Error(`Failed to create statement record: ${stmtError?.message}`);
      }

      // 3. Trigger import edge function
      const {
        data: { session },
      } = await client.auth.getSession();

      if (!session?.access_token) throw new Error('Not authenticated');

      const supabaseUrl = (client as unknown as { supabaseUrl?: string }).supabaseUrl;
      if (!supabaseUrl) throw new Error('Supabase URL not available');

      const res = await fetch(`${supabaseUrl}/functions/v1/import-statement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          statement_id: (statement as any).id,
          file_url: filePath,
          file_type: fileType,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err?.error ?? 'Import failed');
      }

      const result = await res.json();
      return result.data as ImportStatementResult;
    },
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: [...BANK_STATEMENTS_KEY, workspaceId] });
      queryClient.invalidateQueries({ queryKey: [...BANK_TRANSACTIONS_KEY, workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

/** Parse a bank SMS message into a transaction. */
export function useParseBankSms({ client }: { client: TypedSupabaseClient }) {
  return useMutation<ParseSmsResult, Error, {
    workspaceId: string;
    smsText: string;
    sender?: string;
    autoCreate?: boolean;
  }>({
    mutationFn: async ({ workspaceId, smsText, sender, autoCreate = true }) => {
      const {
        data: { session },
      } = await client.auth.getSession();

      if (!session?.access_token) throw new Error('Not authenticated');

      const supabaseUrl = (client as unknown as { supabaseUrl?: string }).supabaseUrl;
      if (!supabaseUrl) throw new Error('Supabase URL not available');

      const res = await fetch(`${supabaseUrl}/functions/v1/parse-bank-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          sms_text: smsText,
          sender,
          auto_create: autoCreate,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err?.error ?? 'SMS parse failed');
      }

      const result = await res.json();
      return result.data as ParseSmsResult;
    },
  });
}
