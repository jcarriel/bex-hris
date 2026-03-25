import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: string
  nombre: string
  username: string
  email: string
  rol: string          // 'admin' | 'user' | etc.
  roleId?: string
  permissions: string[] // ['*'] for admin, module IDs for others
  avatar?: string
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  expiresAt: number | null
  login: (user: AuthUser, token: string) => void
  logout: () => void
  setUser: (user: AuthUser) => void
  checkExpiry: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      expiresAt: null,

      login: (user, token) => set({
        user,
        token,
        isAuthenticated: true,
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      }),

      logout: () => set({ user: null, token: null, isAuthenticated: false, expiresAt: null }),

      setUser: (user) => set({ user }),

      checkExpiry: () => {
        const { expiresAt, isAuthenticated } = get()
        if (!isAuthenticated) return false
        if (expiresAt !== null && Date.now() > expiresAt) {
          get().logout()
          return true
        }
        return false
      },
    }),
    { name: 'bex-hris-auth' },
  ),
)

export function hasModuleAccess(
  permissions: string[] | undefined,
  module: string,
  rol?: string,
): boolean {
  if (rol === 'admin') return true
  if (!permissions || permissions.length === 0) return false
  return permissions.includes('*') || permissions.includes(module)
}
