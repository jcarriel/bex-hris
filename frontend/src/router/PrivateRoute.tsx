import { Navigate } from 'react-router-dom'
import { useAuthStore, hasModuleAccess } from '@/store/authStore'

interface PrivateRouteProps {
  children: React.ReactNode
  module?: string   // if provided, user must have access to this module
}

export function PrivateRoute({ children, module }: PrivateRouteProps) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (module && !hasModuleAccess(user?.permissions, module, user?.rol)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
