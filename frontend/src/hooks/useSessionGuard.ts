import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'

export function useSessionGuard() {
  const checkExpiry = useAuthStore((s) => s.checkExpiry)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated) return
    const interval = setInterval(() => {
      const expired = checkExpiry()
      if (expired) navigate('/login')
    }, 60000) // check every minute
    return () => clearInterval(interval)
  }, [isAuthenticated])
}
