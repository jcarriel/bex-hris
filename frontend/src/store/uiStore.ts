import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  theme: 'dark' | 'light'
  sidebarOpen: boolean
  toggleTheme: () => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      sidebarOpen: true,

      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
      },

      toggleSidebar: () =>
        set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    {
      name: 'bex-hris-ui',
    },
  ),
)
