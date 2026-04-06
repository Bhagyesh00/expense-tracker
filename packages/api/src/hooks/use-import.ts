/**
 * ExpenseFlow — CSV Import Hook
 *
 * Accepts an array of pre-parsed CSV row objects, validates each row,
 * then batch-inserts valid rows (100 at a time) into the expenses table.
 *
 * Returns a structured result:
 *   { imported: number, failed: number, errors: ImportError[] }
 *
 * Row validation rules:
 *   - date         : required, valid ISO date (YYYY-MM-DD)
 *   - amount       : required, positive finite number
 *   - description  : required, 1–255 characters
 *   - type         : optional, defaults to "expense"; must be "expense" | "income"
 *   - currency     : optional, defaults to workspace default currency; 3-letter ISO code
 *   - category     : optional, matched by name against workspace categories
 *   - tags         : optional, comma-separated list
 *   - notes        : optional, max 2000 characters
 */

import { useMutation } from '@tanstack/react-query';
import type { TypedSupabaseClient } from '../client';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A single row as produced by a CSV parser (string values for all fields). */
export interface ImportRow {
  date?: string;
  amount?: string | number;
  description?: string;
  type?: string;
  currency?: string;
  category?: string;
  tags?: string;
  notes?: string;
  /** Any additional columns are ignored */
  [key: string]: unknown;
}

export interface ImportError {
  /** 1-based row number in the original input array */
  row: number;
  field: string;
  message: string;
}

export interface ImportResult {
  imported: number;
  failed: number;
  errors: ImportError[];
}

/** Optional callback invoked after each batch is inserted. */
export type ImportProgressCallback = (progress: {
  processed: number;
  total: number;
  imported: number;
  failed: number;
}) => void;

// ---------------------------------------------------------------------------
// Internal validated row type
// ---------------------------------------------------------------------------

interface ValidatedRow {
  workspace_id: string;
  user_id: string;
  type: 'expense' | 'income';
  amount: number;
  currency: string;
  description: string;
  notes: string | null;
  expense_date: string;
  tags: string[];
  category_id: string | null;
  is_recurring: false;
  is_split: false;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: string | undefined, rowIndex: number): {
  value: string | null;
  error: ImportError | null;
} {
  if (!value || !value.trim()) {
    return {
      value: null,
      error: { row: rowIndex, field: 'date', message: 'Date is required' },
    };
  }

  const trimmed = value.trim();

  // Accept YYYY-MM-DD directly
  if (ISO_DATE_RE.test(trimmed)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return { value: trimmed, error: null };
    }
  }

  // Attempt to parse other common formats (e.g. DD/MM/YYYY, MM/DD/YYYY)
  const parts = trimmed.replace(/\//g, '-').split('-');
  if (parts.length === 3) {
    // Try DD-MM-YYYY
    const [a, b, c] = parts.map(Number);
    const candidates: Date[] = [];

    if (a !== undefined && b !== undefined && c !== undefined) {
      // YYYY-MM-DD
      if (a > 1900) candidates.push(new Date(a, b - 1, c));
      // DD-MM-YYYY
      if (c > 1900) candidates.push(new Date(c, b - 1, a));
    }

    for (const candidate of candidates) {
      if (!isNaN(candidate.getTime())) {
        return {
          value: candidate.toISOString().split('T')[0]!,
          error: null,
        };
      }
    }
  }

  return {
    value: null,
    error: {
      row: rowIndex,
      field: 'date',
      message: `Invalid date format "${trimmed}". Expected YYYY-MM-DD.`,
    },
  };
}

function parseAmount(value: string | number | undefined, rowIndex: number): {
  value: number | null;
  error: ImportError | null;
} {
  if (value === undefined || value === null || String(value).trim() === '') {
    return {
      value: null,
      error: { row: rowIndex, field: 'amount', message: 'Amount is required' },
    };
  }

  const numeric = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));

  if (isNaN(numeric) || !isFinite(numeric)) {
    return {
      value: null,
      error: {
        row: rowIndex,
        field: 'amount',
        message: `Amount "${value}" is not a valid number`,
      },
    };
  }

  if (numeric <= 0) {
    return {
      value: null,
      error: {
        row: rowIndex,
        field: 'amount',
        message: 'Amount must be greater than zero',
      },
    };
  }

  return { value: Math.round(numeric * 100) / 100, error: null };
}

function parseDescription(value: string | undefined, rowIndex: number): {
  value: string | null;
  error: ImportError | null;
} {
  const trimmed = (value ?? '').trim();

  if (!trimmed) {
    return {
      value: null,
      error: {
        row: rowIndex,
        field: 'description',
        message: 'Description is required',
      },
    };
  }

  if (trimmed.length > 255) {
    return {
      value: null,
      error: {
        row: rowIndex,
        field: 'description',
        message: 'Description must not exceed 255 characters',
      },
    };
  }

  return { value: trimmed, error: null };
}

function parseType(value: string | undefined): 'expense' | 'income' {
  const lower = (value ?? '').toLowerCase().trim();
  return lower === 'income' ? 'income' : 'expense';
}

function parseCurrency(value: string | undefined, defaultCurrency: string): string {
  const trimmed = (value ?? '').trim().toUpperCase();
  return trimmed.length === 3 ? trimmed : defaultCurrency;
}

function parseTags(value: string | undefined): string[] {
  if (!value || !value.trim()) return [];
  return value
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length <= 50)
    .slice(0, 10);
}

function parseNotes(value: string | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed.slice(0, 2000) : null;
}

// ---------------------------------------------------------------------------
// Validate a single row
// ---------------------------------------------------------------------------

function validateRow(
  row: ImportRow,
  rowIndex: number,
  workspaceId: string,
  userId: string,
  defaultCurrency: string,
  categoryMap: Map<string, string>,
): { validated: ValidatedRow | null; errors: ImportError[] } {
  const errors: ImportError[] = [];

  const dateResult = parseDate(row.date, rowIndex);
  if (dateResult.error) errors.push(dateResult.error);

  const amountResult = parseAmount(row.amount, rowIndex);
  if (amountResult.error) errors.push(amountResult.error);

  const descResult = parseDescription(row.description, rowIndex);
  if (descResult.error) errors.push(descResult.error);

  // Stop early if any required field failed
  if (errors.length > 0) {
    return { validated: null, errors };
  }

  // Resolve category by name (case-insensitive)
  const categoryKey = (row.category ?? '').trim().toLowerCase();
  const categoryId = categoryKey ? (categoryMap.get(categoryKey) ?? null) : null;

  return {
    validated: {
      workspace_id: workspaceId,
      user_id: userId,
      type: parseType(row.type),
      amount: amountResult.value!,
      currency: parseCurrency(row.currency, defaultCurrency),
      description: descResult.value!,
      notes: parseNotes(row.notes),
      expense_date: dateResult.value!,
      tags: parseTags(row.tags),
      category_id: categoryId,
      is_recurring: false,
      is_split: false,
    },
    errors: [],
  };
}

// ---------------------------------------------------------------------------
// useImportExpenses
// ---------------------------------------------------------------------------

const BATCH_SIZE = 100;

interface UseImportExpensesOptions {
  client: TypedSupabaseClient;
  workspaceId: string;
  /** Called after each batch is inserted. */
  onProgress?: ImportProgressCallback;
}

interface ImportMutationInput {
  rows: ImportRow[];
  /** Override default currency for the import session. */
  currency?: string;
}

export function useImportExpenses({
  client,
  workspaceId,
  onProgress,
}: UseImportExpensesOptions) {
  return useMutation({
    mutationFn: async ({ rows, currency }: ImportMutationInput): Promise<ImportResult> => {
      if (!rows || rows.length === 0) {
        return { imported: 0, failed: 0, errors: [] };
      }

      // Authenticate
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError || !user) throw new Error('Not authenticated');

      // Fetch workspace default currency
      const { data: workspace, error: wsError } = await client
        .from('workspaces')
        .select('default_currency')
        .eq('id', workspaceId)
        .single();

      if (wsError) throw wsError;

      const defaultCurrency =
        currency ??
        (workspace as { default_currency: string }).default_currency ??
        'INR';

      // Build category name → id lookup map (case-insensitive)
      const { data: categories } = await client
        .from('categories')
        .select('id, name')
        .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`);

      const categoryMap = new Map<string, string>();
      for (const cat of categories ?? []) {
        const c = cat as { id: string; name: string };
        categoryMap.set(c.name.toLowerCase(), c.id);
      }

      // Validate all rows up-front
      const allErrors: ImportError[] = [];
      const validRows: ValidatedRow[] = [];

      for (let i = 0; i < rows.length; i++) {
        const { validated, errors } = validateRow(
          rows[i]!,
          i + 1, // 1-based
          workspaceId,
          user.id,
          defaultCurrency,
          categoryMap,
        );

        if (validated) {
          validRows.push(validated);
        } else {
          allErrors.push(...errors);
        }
      }

      // Batch insert valid rows
      let imported = 0;

      for (let batchStart = 0; batchStart < validRows.length; batchStart += BATCH_SIZE) {
        const batch = validRows.slice(batchStart, batchStart + BATCH_SIZE);

        const { error: insertError } = await client
          .from('expenses')
          .insert(batch as any);

        if (insertError) {
          // Mark all rows in this batch as failed
          const batchOffset = batchStart;
          for (let j = 0; j < batch.length; j++) {
            // Estimate the original row number (valid rows may have gaps from invalid ones)
            allErrors.push({
              row: batchOffset + j + 1,
              field: 'batch',
              message: `Batch insert failed: ${insertError.message}`,
            });
          }
        } else {
          imported += batch.length;
        }

        // Progress callback
        onProgress?.({
          processed: Math.min(batchStart + BATCH_SIZE, validRows.length),
          total: rows.length,
          imported,
          failed: rows.length - validRows.length + (validRows.length - imported),
        });
      }

      return {
        imported,
        failed: rows.length - imported,
        errors: allErrors,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Utility: parse a raw CSV string into ImportRow[]
// Exported so callers can use it before passing to useImportExpenses.
// ---------------------------------------------------------------------------

/**
 * Minimal CSV parser that handles quoted fields with embedded commas.
 * For production use, consider a full-featured library such as papaparse.
 */
export function parseCsvToRows(csvText: string): ImportRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  // Parse header
  const headers = splitCsvLine(lines[0]!).map((h) =>
    h.toLowerCase().replace(/[^a-z_]/g, '_').trim(),
  );

  const rows: ImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]!);
    if (values.length === 0) continue;

    const row: ImportRow = {};
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j];
      if (key) row[key] = values[j] ?? '';
    }

    rows.push(row);
  }

  return rows;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped double-quote inside quoted field
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  result.push(current);
  return result;
}
