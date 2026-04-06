import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";

/**
 * Custom storage adapter for Zustand that uses expo-secure-store
 * for sensitive mobile app state.
 */
const secureStoreAdapter = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch {
      console.warn("SecureStore.setItemAsync failed for app-store");
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch {
      console.warn("SecureStore.deleteItemAsync failed for app-store");
    }
  },
};

interface AppState {
  // PIN Lock
  isPinEnabled: boolean;
  isPinLocked: boolean;
  storedPin: string | null;

  // Biometric
  isBiometricEnabled: boolean;

  // Workspace
  activeWorkspaceId: string | null;

  // Connectivity
  isOnline: boolean;

  // Sync
  lastSyncAt: string | null;

  // Theme
  themeMode: "light" | "dark" | "system";

  // Currency
  defaultCurrency: string;

  // Privacy
  isPrivateMode: boolean;

  // Actions
  setIsPinEnabled: (enabled: boolean) => void;
  setIsPinLocked: (locked: boolean) => void;
  setStoredPin: (pin: string | null) => void;
  setIsBiometricEnabled: (enabled: boolean) => void;
  setActiveWorkspaceId: (id: string | null) => void;
  setIsOnline: (online: boolean) => void;
  setLastSyncAt: (date: string | null) => void;
  setThemeMode: (mode: "light" | "dark" | "system") => void;
  setDefaultCurrency: (currency: string) => void;
  setIsPrivateMode: (enabled: boolean) => void;
  reset: () => void;
}

const initialState = {
  isPinEnabled: false,
  isPinLocked: false,
  storedPin: null,
  isBiometricEnabled: false,
  activeWorkspaceId: null,
  isOnline: true,
  lastSyncAt: null,
  themeMode: "system" as const,
  defaultCurrency: "INR",
  isPrivateMode: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,

      setIsPinEnabled: (enabled) =>
        set({ isPinEnabled: enabled, isPinLocked: enabled }),

      setIsPinLocked: (locked) => set({ isPinLocked: locked }),

      setStoredPin: (pin) => set({ storedPin: pin }),

      setIsBiometricEnabled: (enabled) =>
        set({ isBiometricEnabled: enabled }),

      setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),

      setIsOnline: (online) => set({ isOnline: online }),

      setLastSyncAt: (date) => set({ lastSyncAt: date }),

      setThemeMode: (mode) => set({ themeMode: mode }),

      setDefaultCurrency: (currency) => set({ defaultCurrency: currency }),

      setIsPrivateMode: (enabled) => set({ isPrivateMode: enabled }),

      reset: () => set(initialState),
    }),
    {
      name: "expenseflow-app-store",
      storage: createJSONStorage(() => secureStoreAdapter),
      partialize: (state) => ({
        isPinEnabled: state.isPinEnabled,
        storedPin: state.storedPin,
        isBiometricEnabled: state.isBiometricEnabled,
        activeWorkspaceId: state.activeWorkspaceId,
        lastSyncAt: state.lastSyncAt,
        themeMode: state.themeMode,
        defaultCurrency: state.defaultCurrency,
        isPrivateMode: state.isPrivateMode,
      }),
    }
  )
);
