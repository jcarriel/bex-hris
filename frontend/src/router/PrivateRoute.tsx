import { Navigate } from 'react-router-dom'
import { useAuthStore, hasModuleAccess, firstAccessiblePath } from '@/store/authStore'
import { ShieldOff } from 'lucide-react'

interface PrivateRouteProps {
  children: React.ReactNode
  module?: string   // if provided, user must have access to this module
}

export function PrivateRoute({ children, module }: PrivateRouteProps) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (module && !hasModuleAccess(user?.permissions, module, user?.rol)) {
    const fallback = firstAccessiblePath(user?.permissions, user?.rol)
    if (fallback === '/sin-acceso') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
          <ShieldOff size={48} className="text-[var(--text-3)]" />
          <h2 className="text-lg font-semibold text-[var(--text-1)]">Sin acceso</h2>
          <p className="text-sm text-[var(--text-3)] max-w-xs">
            No tienes permisos para acceder a ningún módulo. Contacta al administrador.
          </p>
        </div>
      )
    }
    return <Navigate to={fallback} replace />
  }

  return <>{children}</>
}
