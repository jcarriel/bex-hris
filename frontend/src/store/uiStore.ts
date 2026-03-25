import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FontSize } from '@/lib/theme'

interface EmpleadoFilters {
  search: string
  dept: string
  position: string
  status: string
  page: number
  sortBy: string
  sortDir: 'asc' | 'desc'
}

interface UiState {
  theme: 'dark' | 'light'
  sidebarOpen: boolean
  // Appearance settings
  accentColor: string
  fontSize: FontSize
  avatarColor: string
  avatarEmoji: string
  settingsOpen: boolean
  // Tour
  tourSeen: boolean
  // Persistent page filters
  empleadoFilters: EmpleadoFilters
  // Actions
  toggleTheme: () => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setAccentColor: (color: string) => void
  setFontSize: (size: FontSize) => void
  setAvatarColor: (color: string) => void
  setAvatarEmoji: (emoji: string) => void
  setSettingsOpen: (open: boolean) => void
  setTourSeen: (seen: boolean) => void
  setEmpleadoFilters: (filters: Partial<EmpleadoFilters>) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      sidebarOpen: true,
      accentColor: '#48bb78',
      fontSize: 'md',
      avatarColor: '#48bb78',
      avatarEmoji: '',
      settingsOpen: false,
      tourSeen: false,
      empleadoFilters: { search: '', dept: '', position: '', status: '', page: 1, sortBy: 'firstName', sortDir: 'asc' },

      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
      },

      toggleSidebar: () =>
        set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      setAccentColor: (color) => set({ accentColor: color }),

      setFontSize: (size) => set({ fontSize: size }),

      setAvatarColor: (color) => set({ avatarColor: color }),

      setAvatarEmoji: (emoji) => set({ avatarEmoji: emoji }),

      setSettingsOpen: (open) => set({ settingsOpen: open }),

      setTourSeen: (seen) => set({ tourSeen: seen }),

      setEmpleadoFilters: (filters) =>
        set((s) => ({ empleadoFilters: { ...s.empleadoFilters, ...filters } })),
    }),
    { name: 'bex-hris-ui' },
  ),
)
