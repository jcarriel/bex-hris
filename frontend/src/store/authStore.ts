import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: string
  nombre: string
  username: string
  email: string
  rol: string          // 'admin' | 'user' | etc.
  roleId?: string
  employeeId?: string | null
  permissions: string[] // ['*'] for admin, module IDs + action IDs for others
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

/**
 * Check if the user has access to a module or can perform a specific action.
 * Action format: 'module:action' (e.g. 'empleados:crear', 'bienestar:aprobar')
 * Admin role always returns true.
 */
export function hasModuleAccess(
  permissions: string[] | undefined,
  module: string,
  rol?: string,
): boolean {
  if (module === 'admin') return rol === 'admin'
  if (rol === 'admin') return true
  if (!permissions || permissions.length === 0) return false
  return permissions.includes('*') || permissions.includes(module)
}

// Semantic alias for action-level checks
export const hasAction = hasModuleAccess

// Ordered list of module → path used to find the first accessible route after login
const MODULE_ROUTES: { module: string; path: string }[] = [
  { module: 'dashboard',      path: '/dashboard' },
  { module: 'empleados',      path: '/empleados' },
  { module: 'nomina',         path: '/nomina' },
  { module: 'asistencia',     path: '/asistencia' },
  { module: 'eventos',        path: '/eventos' },
  { module: 'tareas',         path: '/tareas' },
  { module: 'bienestar',      path: '/bienestar' },
  { module: 'casilleros',     path: '/casilleros' },
  { module: 'fuerza-laboral', path: '/fuerza-laboral' },
  { module: 'mayordomos',     path: '/mayordomos' },
  { module: 'carga-masiva',   path: '/carga-masiva' },
  { module: 'tablas',         path: '/tablas' },
  { module: 'configuracion',  path: '/configuracion' },
  { module: 'reclutamiento',  path: '/reclutamiento' },
]

/** Returns the path of the first module the user has access to, or '/sin-acceso'. */
export function firstAccessiblePath(permissions: string[] | undefined, rol?: string): string {
  if (rol === 'admin') return '/dashboard'
  for (const { module, path } of MODULE_ROUTES) {
    if (hasModuleAccess(permissions, module, rol)) return path
  }
  return '/sin-acceso'
}
