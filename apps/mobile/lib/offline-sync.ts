import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { AppState, AppStateStatus } from "react-native";

import { supabase } from "./supabase";

// ---- Types ----

/**
 * Represents a queued mutation that will be replayed when connectivity returns.
 */
export interface QueuedMutation {
  id: string;
  table: string;
  operation: "insert" | "update" | "delete";
  data: Record<string, unknown>;
  /** Filter for update/delete operations */
  matchColumn?: string;
  matchValue?: string;
  createdAt: string;
  retryCount: number;
}

export type SyncStatus = "synced" | "syncing" | "pending" | "error";

export interface OfflineSyncState {
  isOnline: boolean;
  mutationQueue: QueuedMutation[];
  lastSyncAt: string | null;
  isSyncing: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;

  // Actions
  setOnline: (online: boolean) => void;
  addMutation: (mutation: Omit<QueuedMutation, "id" | "createdAt" | "retryCount">) => void;
  removeMutation: (id: string) => void;
  clearQueue: () => void;
  setIsSyncing: (syncing: boolean) => void;
  setLastSyncAt: (date: string) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setSyncError: (error: string | null) => void;
  incrementRetry: (id: string) => void;

  // Derived
  pendingCount: () => number;
}

// ---- Store ----

export const useOfflineSyncStore = create<OfflineSyncState>()(
  persist(
    (set, get) => ({
      isOnline: true,
      mutationQueue: [],
      lastSyncAt: null,
      isSyncing: false,
      syncStatus: "synced",
      syncError: null,

      setOnline: (online) => set({ isOnline: online }),

      addMutation: (mutation) => {
        const newMutation: QueuedMutation = {
          ...mutation,
          id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          createdAt: new Date().toISOString(),
          retryCount: 0,
        };

        set((state) => ({
          mutationQueue: [...state.mutationQueue, newMutation],
          syncStatus: "pending",
          syncError: null,
        }));
      },

      removeMutation: (id) =>
        set((state) => {
          const newQueue = state.mutationQueue.filter((m) => m.id !== id);
          return {
            mutationQueue: newQueue,
            syncStatus: newQueue.length === 0 ? "synced" : state.syncStatus,
          };
        }),

      clearQueue: () =>
        set({ mutationQueue: [], syncStatus: "synced", syncError: null }),

      setIsSyncing: (syncing) => set({ isSyncing: syncing }),

      setLastSyncAt: (date) => set({ lastSyncAt: date }),

      setSyncStatus: (status) => set({ syncStatus: status }),

      setSyncError: (error) => set({ syncError: error }),

      incrementRetry: (id) =>
        set((state) => ({
          mutationQueue: state.mutationQueue.map((m) =>
            m.id === id ? { ...m, retryCount: m.retryCount + 1 } : m
          ),
        })),

      pendingCount: () => get().mutationQueue.length,
    }),
    {
      name: "expenseflow-offline-sync",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        mutationQueue: state.mutationQueue,
        lastSyncAt: state.lastSyncAt,
        syncStatus: state.syncStatus,
      }),
    }
  )
);

// ---- Constants ----

const MAX_RETRIES = 3;
const RETRY_BACKOFF_BASE_MS = 1000;

// ---- Helpers ----

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Replay a single queued mutation against Supabase.
 */
async function replayMutation(mutation: QueuedMutation): Promise<boolean> {
  try {
    let query;

    switch (mutation.operation) {
      case "insert":
        query = supabase.from(mutation.table).insert(mutation.data as any);
        break;

      case "update":
        if (!mutation.matchColumn || !mutation.matchValue) {
          console.error("Update mutation missing match criteria:", mutation.id);
          return false;
        }
        query = supabase
          .from(mutation.table)
          .update(mutation.data as unknown as never)
          .eq(mutation.matchColumn, mutation.matchValue);
        break;

      case "delete":
        if (!mutation.matchColumn || !mutation.matchValue) {
          console.error("Delete mutation missing match criteria:", mutation.id);
          return false;
        }
        query = supabase
          .from(mutation.table)
          .delete()
          .eq(mutation.matchColumn, mutation.matchValue);
        break;

      default:
        console.error("Unknown mutation operation:", (mutation as QueuedMutation).operation);
        return false;
    }

    const { error } = await query;

    if (error) {
      console.error(`Mutation replay failed (${mutation.id}):`, error);
      return false;
    }

    return true;
  } catch (error: unknown) {
    console.error(`Mutation replay error (${mutation.id}):`, error);
    return false;
  }
}

/**
 * Process the entire mutation queue sequentially with retry backoff.
 */
async function processQueue(): Promise<void> {
  const store = useOfflineSyncStore.getState();

  if (store.isSyncing || !store.isOnline || store.mutationQueue.length === 0) {
    return;
  }

  store.setIsSyncing(true);
  store.setSyncStatus("syncing");
  store.setSyncError(null);

  let hasError = false;

  try {
    // Process mutations in order
    for (const mutation of [...store.mutationQueue]) {
      if (mutation.retryCount >= MAX_RETRIES) {
        console.warn(
          `Mutation ${mutation.id} exceeded max retries, removing from queue`
        );
        store.removeMutation(mutation.id);
        continue;
      }

      // Exponential backoff for retries
      if (mutation.retryCount > 0) {
        await sleep(RETRY_BACKOFF_BASE_MS * Math.pow(2, mutation.retryCount - 1));
      }

      const success = await replayMutation(mutation);

      if (success) {
        store.removeMutation(mutation.id);
      } else {
        store.incrementRetry(mutation.id);
        hasError = true;
        // Stop processing on failure to maintain order
        break;
      }
    }

    store.setLastSyncAt(new Date().toISOString());

    const remainingQueue = useOfflineSyncStore.getState().mutationQueue;
    if (hasError) {
      store.setSyncStatus("error");
      store.setSyncError("Some changes failed to sync. Will retry automatically.");
    } else if (remainingQueue.length === 0) {
      store.setSyncStatus("synced");
    } else {
      store.setSyncStatus("pending");
    }
  } catch (error: unknown) {
    console.error("processQueue error:", error);
    store.setSyncStatus("error");
    store.setSyncError("Sync failed. Please check your connection and try again.");
  } finally {
    store.setIsSyncing(false);
  }
}

/**
 * Manually trigger a sync. Returns a promise that resolves when sync completes.
 */
export async function triggerManualSync(): Promise<{ success: boolean; error?: string }> {
  const store = useOfflineSyncStore.getState();

  if (!store.isOnline) {
    return { success: false, error: "You are offline. Connect to sync." };
  }

  if (store.mutationQueue.length === 0) {
    // No pending changes — just update the timestamp
    store.setLastSyncAt(new Date().toISOString());
    store.setSyncStatus("synced");
    return { success: true };
  }

  await processQueue();

  const finalState = useOfflineSyncStore.getState();
  if (finalState.syncStatus === "error") {
    return { success: false, error: finalState.syncError ?? "Sync failed" };
  }

  return { success: true };
}

/**
 * Initialize offline sync listeners.
 * Call this once at app startup (e.g., in the root layout).
 * Returns a cleanup function.
 */
export function initializeOfflineSync(): () => void {
  // Listen for connectivity changes
  const unsubscribeNetInfo = NetInfo.addEventListener(
    (state: NetInfoState) => {
      const wasOffline = !useOfflineSyncStore.getState().isOnline;
      const isNowOnline = state.isConnected ?? false;

      useOfflineSyncStore.getState().setOnline(isNowOnline);

      // Process queue when coming back online
      if (wasOffline && isNowOnline) {
        processQueue();
      }
    }
  );

  // Process queue when app comes to foreground
  const appStateSubscription = AppState.addEventListener(
    "change",
    (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        const { isOnline } = useOfflineSyncStore.getState();
        if (isOnline) {
          processQueue();
        }
      }
    }
  );

  // Initial sync check
  NetInfo.fetch().then((state) => {
    useOfflineSyncStore.getState().setOnline(state.isConnected ?? false);
    if (state.isConnected) {
      processQueue();
    }
  });

  return () => {
    unsubscribeNetInfo();
    appStateSubscription.remove();
  };
}

// ---- Convenience selector ----

/**
 * Returns human-readable sync status text.
 */
export function getSyncStatusText(
  status: SyncStatus,
  lastSyncAt: string | null,
  pendingCount: number
): string {
  switch (status) {
    case "syncing":
      return "Syncing…";
    case "pending":
      return `${pendingCount} change${pendingCount !== 1 ? "s" : ""} pending`;
    case "error":
      return "Sync failed — tap to retry";
    case "synced":
      if (!lastSyncAt) return "Never synced";
      const date = new Date(lastSyncAt);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60_000);
      if (diffMin < 1) return "Synced just now";
      if (diffMin < 60) return `Synced ${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `Synced ${diffHr}h ago`;
      return `Synced ${Math.floor(diffHr / 24)}d ago`;
  }
}
