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
  login: (user: AuthUser, token: string) => void
  logout: () => void
  setUser: (user: AuthUser) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      setUser: (user) => set({ user }),
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
