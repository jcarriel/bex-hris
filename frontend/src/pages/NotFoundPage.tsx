import { useNavigate } from 'react-router-dom'
import { Home, AlertTriangle } from 'lucide-react'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <div className="text-center">
        <div className="inline-flex w-20 h-20 rounded-2xl bg-amber-500/10 items-center justify-center mb-4">
          <AlertTriangle size={40} className="text-amber-400" />
        </div>
        <h1 className="text-4xl font-bold text-[var(--text-1)] mb-2">404</h1>
        <p className="text-[var(--text-2)] mb-6">La página que buscas no existe.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Home size={15} />
          Ir al Dashboard
        </button>
      </div>
    </div>
  )
}
