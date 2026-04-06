"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase/client";
import { useUIStore } from "@/stores/ui-store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedRow {
  rowIndex: number;
  raw: Record<string, string>;
  mapped: {
    date?: string;
    description?: string;
    amount?: number;
    category?: string;
    type?: "expense" | "income";
    currency?: string;
    notes?: string;
    tags?: string[];
  };
  errors: string[];
  valid: boolean;
}

export interface ColumnMapping {
  date: string;
  description: string;
  amount: string;
  category: string;
  type: string;
  currency: string;
  notes: string;
  tags: string;
}

export interface ImportResult {
  successCount: number;
  failedRows: Array<{ rowIndex: number; reason: string }>;
}

export interface ExpenseTemplate {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  category_id?: string;
  type: "expense" | "income";
  amount?: number;
  variable_amount: boolean;
  currency: string;
  notes?: string;
  tags?: string[];
  icon?: string;
  created_at: string;
  updated_at: string;
  use_count: number;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  category_id?: string;
  type: "expense" | "income";
  amount?: number;
  variable_amount: boolean;
  currency: string;
  notes?: string;
  tags?: string[];
  icon?: string;
}

export interface MileageLog {
  id: string;
  workspace_id: string;
  user_id: string;
  from_location: string;
  to_location: string;
  distance_km: number;
  rate_per_km: number;
  amount: number;
  date: string;
  purpose?: string;
  expense_id?: string;
  created_at: string;
}

export interface CreateMileageInput {
  from_location: string;
  to_location: string;
  distance_km: number;
  rate_per_km: number;
  date: string;
  purpose?: string;
  create_expense?: boolean;
  category_id?: string;
}

export interface RecurringPayment {
  id: string;
  workspace_id: string;
  contact_id: string;
  direction: "give" | "receive";
  amount: number;
  currency: string;
  description: string;
  interval: "weekly" | "bi-weekly" | "monthly" | "quarterly" | "yearly";
  start_date: string;
  end_date?: string;
  next_due_date: string;
  status: "active" | "paused";
  auto_generate: boolean;
  auto_generate_days_before: number;
  notes?: string;
  created_at: string;
  contacts?: { name: string; phone?: string };
}

export interface CreateRecurringPaymentInput {
  contact_id: string;
  direction: "give" | "receive";
  amount: number;
  currency: string;
  description: string;
  interval: "weekly" | "bi-weekly" | "monthly" | "quarterly" | "yearly";
  start_date: string;
  end_date?: string;
  auto_generate: boolean;
  auto_generate_days_before: number;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Date parsing utilities
// ---------------------------------------------------------------------------

const DATE_FORMATS = [
  // YYYY-MM-DD
  { regex: /^(\d{4})-(\d{2})-(\d{2})$/, parse: (m: RegExpMatchArray) => new Date(+m[1], +m[2] - 1, +m[3]) },
  // DD/MM/YYYY
  { regex: /^(\d{2})\/(\d{2})\/(\d{4})$/, parse: (m: RegExpMatchArray) => new Date(+m[3], +m[2] - 1, +m[1]) },
  // MM/DD/YYYY
  { regex: /^(\d{2})\/(\d{2})\/(\d{4})$/, parse: (m: RegExpMatchArray) => new Date(+m[3], +m[1] - 1, +m[2]) },
  // DD-MMM-YY e.g. 01-Jan-24
  {
    regex: /^(\d{2})-([A-Za-z]{3})-(\d{2})$/,
    parse: (m: RegExpMatchArray) => {
      const months: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      };
      const year = +m[3] + 2000;
      return new Date(year, months[m[2].toLowerCase()] ?? 0, +m[1]);
    },
  },
];

export function parseDate(val: string): Date | null {
  const cleaned = val.trim();
  for (const fmt of DATE_FORMATS) {
    const m = cleaned.match(fmt.regex);
    if (m) {
      const d = fmt.parse(m);
      if (!isNaN(d.getTime())) return d;
    }
  }
  // Fallback to native
  const native = new Date(cleaned);
  return isNaN(native.getTime()) ? null : native;
}

export function parseAmount(val: string): number | null {
  const cleaned = val.replace(/[₹$€£¥,\s]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.abs(num);
}

// Auto-detect column mapping from CSV headers
export function autoDetectColumns(headers: string[]): ColumnMapping {
  const lower = headers.map((h) => h.toLowerCase().trim());

  const find = (patterns: string[]): string => {
    for (const p of patterns) {
      const idx = lower.findIndex((h) => h.includes(p));
      if (idx !== -1) return headers[idx];
    }
    return "";
  };

  return {
    date: find(["date", "dated", "txn date", "transaction date", "value date"]),
    description: find(["description", "desc", "narration", "particulars", "merchant", "payee", "name"]),
    amount: find(["amount", "amt", "debit", "credit", "value", "total"]),
    category: find(["category", "cat", "type of", "expense type"]),
    type: find(["type", "direction", "dr/cr", "debit/credit"]),
    currency: find(["currency", "curr", "ccy"]),
    notes: find(["notes", "note", "remarks", "comment", "memo"]),
    tags: find(["tags", "tag", "labels", "label"]),
  };
}

// ---------------------------------------------------------------------------
// useCSVImport
// ---------------------------------------------------------------------------

export function useCSVImport() {
  const client = createBrowserClient();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const importRows = useCallback(
    async (
      rows: ParsedRow[],
      userId: string,
    ): Promise<ImportResult> => {
      if (!workspaceId) throw new Error("No workspace selected");

      const validRows = rows.filter((r) => r.valid);
      const failedRows: ImportResult["failedRows"] = rows
        .filter((r) => !r.valid)
        .map((r) => ({ rowIndex: r.rowIndex, reason: r.errors.join("; ") }));

      setIsImporting(true);
      setProgress(0);

      let successCount = 0;
      const BATCH = 100;

      for (let i = 0; i < validRows.length; i += BATCH) {
        const batch = validRows.slice(i, i + BATCH);
        const inserts = batch.map((r) => ({
          workspace_id: workspaceId,
          user_id: userId,
          description: r.mapped.description ?? "Imported",
          amount: r.mapped.amount ?? 0,
          currency: r.mapped.currency ?? "INR",
          type: r.mapped.type ?? "expense",
          expense_date: r.mapped.date ?? new Date().toISOString().split("T")[0],
          notes: r.mapped.notes ?? null,
          tags: r.mapped.tags ?? null,
          is_recurring: false,
        }));

        const { error } = await client.from("expenses").insert(inserts as any);
        if (error) {
          batch.forEach((r) =>
            failedRows.push({ rowIndex: r.rowIndex, reason: error.message }),
          );
        } else {
          successCount += batch.length;
        }

        setProgress(Math.round(((i + batch.length) / validRows.length) * 100));
      }

      setIsImporting(false);
      return { successCount, failedRows };
    },
    [client, workspaceId],
  );

  return { importRows, isImporting, progress };
}

// ---------------------------------------------------------------------------
// useTemplates
// ---------------------------------------------------------------------------

export function useTemplates() {
  const client = createBrowserClient();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["templates", workspaceId],
    queryFn: async (): Promise<ExpenseTemplate[]> => {
      if (!workspaceId) return [];
      const { data, error } = await client
        .from("expense_templates")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("use_count", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ExpenseTemplate[];
    },
    enabled: !!workspaceId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateTemplateInput): Promise<ExpenseTemplate> => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await client
        .from("expense_templates")
        .insert({ ...input, workspace_id: workspaceId, use_count: 0 } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ExpenseTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates", workspaceId] });
      toast.success("Template created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<CreateTemplateInput> }) => {
      const { data, error } = await client
        .from("expense_templates")
        .update(input as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ExpenseTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates", workspaceId] });
      toast.success("Template updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.from("expense_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates", workspaceId] });
      toast.success("Template deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const incrementUse = useCallback(
    async (id: string) => {
      try {
        const { data: current } = await client
          .from("expense_templates")
          .select("use_count")
          .eq("id", id)
          .single();
        await client
          .from("expense_templates")
          .update({
            use_count: ((current as any)?.use_count ?? 0) + 1,
            last_used_at: new Date().toISOString(),
          } as any)
          .eq("id", id);
      } catch {
        // Silently ignore increment failures
      }
    },
    [client],
  );

  return {
    templates: query.data ?? [],
    isLoading: query.isLoading,
    createTemplate: createMutation.mutateAsync,
    updateTemplate: updateMutation.mutateAsync,
    deleteTemplate: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    incrementUse,
  };
}

export function useTemplate(id: string | undefined) {
  const client = createBrowserClient();
  return useQuery({
    queryKey: ["template", id],
    queryFn: async (): Promise<ExpenseTemplate | null> => {
      if (!id) return null;
      const { data, error } = await client
        .from("expense_templates")
        .select("*")
        .eq("id", id)
        .single();
      if (error) return null;
      return data as unknown as ExpenseTemplate;
    },
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// useMileageLogs
// ---------------------------------------------------------------------------

export function useMileageLogs() {
  const client = createBrowserClient();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["mileage_logs", workspaceId],
    queryFn: async (): Promise<MileageLog[]> => {
      if (!workspaceId) return [];
      const { data, error } = await client
        .from("mileage_logs")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("trip_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MileageLog[];
    },
    enabled: !!workspaceId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateMileageInput): Promise<MileageLog> => {
      if (!workspaceId) throw new Error("No workspace");
      const amount = input.distance_km * input.rate_per_km;

      let expense_id: string | undefined;
      if (input.create_expense) {
        const { data: expense, error: expError } = await client
          .from("expenses")
          .insert({
            workspace_id: workspaceId,
            user_id: "",
            description: `Mileage: ${input.from_location} to ${input.to_location}`,
            amount,
            currency: "INR",
            type: "expense",
            expense_date: input.date,
            category_id: input.category_id ?? null,
            notes: input.purpose ?? null,
            is_recurring: false,
          } as any)
          .select()
          .single();
        if (!expError && expense) expense_id = expense.id;
      }

      const { data, error } = await client
        .from("mileage_logs")
        .insert({
          workspace_id: workspaceId,
          from_location: input.from_location,
          to_location: input.to_location,
          distance_km: input.distance_km,
          rate_per_km: input.rate_per_km,
          amount,
          trip_date: input.date,
          purpose: input.purpose ?? null,
          expense_id: expense_id ?? null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as MileageLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mileage_logs", workspaceId] });
      toast.success("Trip logged successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.from("mileage_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mileage_logs", workspaceId] });
      toast.success("Trip deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    logs: query.data ?? [],
    isLoading: query.isLoading,
    createLog: createMutation.mutateAsync,
    deleteLog: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}

// ---------------------------------------------------------------------------
// useRecurringPayments
// ---------------------------------------------------------------------------

export function useRecurringPayments() {
  const client = createBrowserClient();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["recurring_payments", workspaceId],
    queryFn: async (): Promise<RecurringPayment[]> => {
      if (!workspaceId) return [];
      const { data, error } = await client
        .from("recurring_payments")
        .select("*, contacts(name, phone)")
        .eq("workspace_id", workspaceId)
        .order("next_due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as RecurringPayment[];
    },
    enabled: !!workspaceId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateRecurringPaymentInput): Promise<RecurringPayment> => {
      if (!workspaceId) throw new Error("No workspace");
      const nextDue = calculateNextDueDate(input.start_date, input.interval);
      const { data, error } = await client
        .from("recurring_payments")
        .insert({
          ...input,
          workspace_id: workspaceId,
          next_due_date: nextDue,
          status: "active",
        } as any)
        .select("*, contacts(name, phone)")
        .single();
      if (error) throw error;
      return data as unknown as RecurringPayment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_payments", workspaceId] });
      toast.success("Recurring payment created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<CreateRecurringPaymentInput & { status: string }> }) => {
      const { data, error } = await client
        .from("recurring_payments")
        .update(input as unknown as never)
        .eq("id", id)
        .select("*, contacts(name, phone)")
        .single();
      if (error) throw error;
      return data as unknown as RecurringPayment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_payments", workspaceId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.from("recurring_payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_payments", workspaceId] });
      toast.success("Recurring payment deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const generateNext = useCallback(
    async (payment: RecurringPayment) => {
      if (!workspaceId) return;
      const { error } = await client.from("pending_payments").insert({
        workspace_id: workspaceId,
        contact_id: payment.contact_id,
        direction: payment.direction,
        amount: payment.amount,
        currency: payment.currency,
        description: payment.description,
        due_date: payment.next_due_date,
        notes: payment.notes ?? null,
        status: "pending",
      } as any);
      if (error) {
        toast.error(error.message);
        return;
      }

      const nextDue = calculateNextDueDate(payment.next_due_date, payment.interval);
      await updateMutation.mutateAsync({ id: payment.id, input: { next_due_date: nextDue } as Partial<CreateRecurringPaymentInput & { next_due_date: string; status: string }> });
      toast.success("Pending payment generated");
    },
    [client, workspaceId, updateMutation],
  );

  return {
    payments: query.data ?? [],
    isLoading: query.isLoading,
    createPayment: createMutation.mutateAsync,
    updatePayment: updateMutation.mutateAsync,
    deletePayment: deleteMutation.mutateAsync,
    generateNext,
    isCreating: createMutation.isPending,
  };
}

function calculateNextDueDate(
  fromDate: string,
  interval: RecurringPayment["interval"],
): string {
  const date = new Date(fromDate);
  switch (interval) {
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "bi-weekly":
      date.setDate(date.getDate() + 14);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "quarterly":
      date.setMonth(date.getMonth() + 3);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date.toISOString().split("T")[0];
}
