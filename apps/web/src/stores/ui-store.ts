import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark" | "system";

interface UIState {
  sidebarOpen: boolean;
  activeWorkspaceId: string | null;
  theme: Theme;
  quickAddOpen: boolean;
}

interface UIActions {
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setActiveWorkspaceId: (id: string | null) => void;
  setTheme: (theme: Theme) => void;
  setQuickAddOpen: (open: boolean) => void;
  toggleQuickAdd: () => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      // State
      sidebarOpen: true,
      activeWorkspaceId: null,
      theme: "system",
      quickAddOpen: false,

      // Actions
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
      setTheme: (theme) => set({ theme }),
      setQuickAddOpen: (open) => set({ quickAddOpen: open }),
      toggleQuickAdd: () =>
        set((state) => ({ quickAddOpen: !state.quickAddOpen })),
    }),
    {
      name: "expenseflow-ui",
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        activeWorkspaceId: state.activeWorkspaceId,
        theme: state.theme,
      }),
    }
  )
);
