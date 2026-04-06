import { create } from "zustand";
import { persist } from "zustand/middleware";

type MutationType =
  | "create_expense"
  | "update_expense"
  | "delete_expense"
  | "create_category"
  | "update_category"
  | "create_budget"
  | "update_budget";

interface OfflineMutation {
  id: string;
  type: MutationType;
  payload: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

interface OfflineState {
  queue: OfflineMutation[];
  isOnline: boolean;
  isProcessing: boolean;
}

interface OfflineActions {
  addToQueue: (
    mutation: Omit<OfflineMutation, "id" | "timestamp" | "retryCount">
  ) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  setOnline: (online: boolean) => void;
  setProcessing: (processing: boolean) => void;
  processQueue: (
    handler: (mutation: OfflineMutation) => Promise<void>
  ) => Promise<void>;
}

type OfflineStore = OfflineState & OfflineActions;

const MAX_RETRIES = 3;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useOfflineStore = create<OfflineStore>()(
  persist(
    (set, get) => ({
      // State
      queue: [],
      isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
      isProcessing: false,

      // Actions
      addToQueue: (mutation) =>
        set((state) => ({
          queue: [
            ...state.queue,
            {
              ...mutation,
              id: generateId(),
              timestamp: Date.now(),
              retryCount: 0,
            },
          ],
        })),

      removeFromQueue: (id) =>
        set((state) => ({
          queue: state.queue.filter((m) => m.id !== id),
        })),

      clearQueue: () => set({ queue: [] }),

      setOnline: (online) => set({ isOnline: online }),

      setProcessing: (processing) => set({ isProcessing: processing }),

      processQueue: async (handler) => {
        const { queue, isOnline, isProcessing } = get();

        if (!isOnline || isProcessing || queue.length === 0) return;

        set({ isProcessing: true });

        // Process mutations in order (FIFO)
        const sortedQueue = [...queue].sort(
          (a, b) => a.timestamp - b.timestamp
        );

        for (const mutation of sortedQueue) {
          try {
            await handler(mutation);
            // Remove successfully processed mutation
            set((state) => ({
              queue: state.queue.filter((m) => m.id !== mutation.id),
            }));
          } catch {
            // Increment retry count; drop if max retries exceeded
            set((state) => ({
              queue: state.queue
                .map((m) =>
                  m.id === mutation.id
                    ? { ...m, retryCount: m.retryCount + 1 }
                    : m
                )
                .filter((m) => m.retryCount <= MAX_RETRIES),
            }));
            // Stop processing on first failure to maintain order
            break;
          }
        }

        set({ isProcessing: false });
      },
    }),
    {
      name: "expenseflow-offline-queue",
      partialize: (state) => ({
        queue: state.queue,
      }),
    }
  )
);

// Set up online/offline listeners (runs once on import in client)
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    useOfflineStore.getState().setOnline(true);
  });
  window.addEventListener("offline", () => {
    useOfflineStore.getState().setOnline(false);
  });
}
