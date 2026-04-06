"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createBrowserClient } from "@/lib/supabase/client";
import { useUIStore } from "@/stores/ui-store";
import { useMemo } from "react";

function getClient() {
  return createBrowserClient();
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type AssetType =
  | "cash"
  | "bank"
  | "investment"
  | "property"
  | "vehicle"
  | "crypto"
  | "other";

export type LiabilityType =
  | "loan"
  | "credit_card"
  | "mortgage"
  | "pending_payment"
  | "other";

export interface NetWorthAsset {
  id: string;
  userId: string;
  name: string;
  type: AssetType;
  value: number;
  currency: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NetWorthLiability {
  id: string;
  userId: string;
  name: string;
  type: LiabilityType;
  value: number;
  currency: string;
  notes?: string | null;
  isAutoImported: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NetWorthSnapshot {
  month: string; // YYYY-MM
  assets: number;
  liabilities: number;
  netWorth: number;
}

export interface CreateAssetInput {
  name: string;
  type: AssetType;
  value: number;
  currency?: string;
  notes?: string;
}

export interface CreateLiabilityInput {
  name: string;
  type: LiabilityType;
  value: number;
  currency?: string;
  notes?: string;
}

// ── Query Keys ────────────────────────────────────────────────────────────────

const NET_WORTH_KEY = ["net-worth"] as const;

// ── useNetWorthAssets ─────────────────────────────────────────────────────────

export function useNetWorthAssets() {
  const client = getClient();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);

  return useQuery({
    queryKey: [...NET_WORTH_KEY, "assets", workspaceId],
    queryFn: async (): Promise<NetWorthAsset[]> => {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Use localStorage as fallback since net_worth_assets may not be in DB schema
      const stored = localStorage.getItem(`nw-assets-${user.id}`);
      if (stored) {
        return JSON.parse(stored) as NetWorthAsset[];
      }
      return [];
    },
    staleTime: 2 * 60 * 1000,
  });
}

// ── useNetWorthLiabilities ────────────────────────────────────────────────────

export function useNetWorthLiabilities() {
  const client = getClient();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);

  return useQuery({
    queryKey: [...NET_WORTH_KEY, "liabilities", workspaceId],
    queryFn: async (): Promise<NetWorthLiability[]> => {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const stored = localStorage.getItem(`nw-liabilities-${user.id}`);
      const manual: NetWorthLiability[] = stored ? JSON.parse(stored) : [];

      // Auto-import pending payments owed by user
      const { data: pendingPayments } = await client
        .from("pending_payments")
        .select("id, description, total_amount, currency")
        .eq("workspace_id", workspaceId ?? "")
        .eq("direction", "give")
        .eq("status", "pending");

      const imported: NetWorthLiability[] = ((pendingPayments ?? []) as any[]).map(
        (p: any) => ({
          id: `pending-${p.id}`,
          userId: user.id,
          name: (p.description as string) ?? "Pending payment",
          type: "pending_payment" as LiabilityType,
          value: p.total_amount as number,
          currency: (p.currency as string) ?? "INR",
          notes: "Auto-imported from pending payments",
          isAutoImported: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      );

      return [...imported, ...manual];
    },
    staleTime: 2 * 60 * 1000,
  });
}

// ── useNetWorthTotal ──────────────────────────────────────────────────────────

export function useNetWorthTotal() {
  const { data: assets = [], isLoading: assetsLoading } = useNetWorthAssets();
  const { data: liabilities = [], isLoading: liabilitiesLoading } =
    useNetWorthLiabilities();

  const totalAssets = useMemo(
    () => assets.reduce((sum, a) => sum + a.value, 0),
    [assets]
  );

  const totalLiabilities = useMemo(
    () => liabilities.reduce((sum, l) => sum + l.value, 0),
    [liabilities]
  );

  const netWorth = totalAssets - totalLiabilities;

  return {
    totalAssets,
    totalLiabilities,
    netWorth,
    isLoading: assetsLoading || liabilitiesLoading,
  };
}

// ── useNetWorthHistory ────────────────────────────────────────────────────────

export function useNetWorthHistory() {
  return useQuery({
    queryKey: [...NET_WORTH_KEY, "history"],
    queryFn: async (): Promise<NetWorthSnapshot[]> => {
      const stored = localStorage.getItem("nw-history");
      if (stored) return JSON.parse(stored);

      // Generate mock historical data for the last 6 months
      const snapshots: NetWorthSnapshot[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const base = 100000 + Math.random() * 50000;
        const liabilities = 20000 + Math.random() * 10000;
        snapshots.push({
          month: key,
          assets: Math.round(base),
          liabilities: Math.round(liabilities),
          netWorth: Math.round(base - liabilities),
        });
      }
      return snapshots;
    },
    staleTime: 10 * 60 * 1000,
  });
}

// ── useCreateAsset ────────────────────────────────────────────────────────────

export function useCreateAsset() {
  const client = getClient();
  const queryClient = useQueryClient();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);

  return useMutation({
    mutationFn: async (input: CreateAssetInput): Promise<NetWorthAsset> => {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const asset: NetWorthAsset = {
        id: crypto.randomUUID(),
        userId: user.id,
        name: input.name,
        type: input.type,
        value: input.value,
        currency: input.currency ?? "INR",
        notes: input.notes ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const stored = localStorage.getItem(`nw-assets-${user.id}`);
      const existing: NetWorthAsset[] = stored ? JSON.parse(stored) : [];
      existing.push(asset);
      localStorage.setItem(`nw-assets-${user.id}`, JSON.stringify(existing));

      return asset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...NET_WORTH_KEY, "assets", workspaceId],
      });
    },
  });
}

// ── useDeleteAsset ────────────────────────────────────────────────────────────

export function useDeleteAsset() {
  const client = getClient();
  const queryClient = useQueryClient();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);

  return useMutation({
    mutationFn: async (assetId: string) => {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const stored = localStorage.getItem(`nw-assets-${user.id}`);
      const existing: NetWorthAsset[] = stored ? JSON.parse(stored) : [];
      const updated = existing.filter((a) => a.id !== assetId);
      localStorage.setItem(`nw-assets-${user.id}`, JSON.stringify(updated));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...NET_WORTH_KEY, "assets", workspaceId],
      });
    },
  });
}

// ── useCreateLiability ────────────────────────────────────────────────────────

export function useCreateLiability() {
  const client = getClient();
  const queryClient = useQueryClient();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);

  return useMutation({
    mutationFn: async (
      input: CreateLiabilityInput
    ): Promise<NetWorthLiability> => {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const liability: NetWorthLiability = {
        id: crypto.randomUUID(),
        userId: user.id,
        name: input.name,
        type: input.type,
        value: input.value,
        currency: input.currency ?? "INR",
        notes: input.notes ?? null,
        isAutoImported: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const stored = localStorage.getItem(`nw-liabilities-${user.id}`);
      const existing: NetWorthLiability[] = stored ? JSON.parse(stored) : [];
      existing.push(liability);
      localStorage.setItem(
        `nw-liabilities-${user.id}`,
        JSON.stringify(existing)
      );

      return liability;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...NET_WORTH_KEY, "liabilities", workspaceId],
      });
    },
  });
}

// ── useDeleteLiability ────────────────────────────────────────────────────────

export function useDeleteLiability() {
  const client = getClient();
  const queryClient = useQueryClient();
  const workspaceId = useUIStore((s) => s.activeWorkspaceId);

  return useMutation({
    mutationFn: async (liabilityId: string) => {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const stored = localStorage.getItem(`nw-liabilities-${user.id}`);
      const existing: NetWorthLiability[] = stored ? JSON.parse(stored) : [];
      const updated = existing.filter((l) => l.id !== liabilityId);
      localStorage.setItem(
        `nw-liabilities-${user.id}`,
        JSON.stringify(updated)
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...NET_WORTH_KEY, "liabilities", workspaceId],
      });
    },
  });
}
