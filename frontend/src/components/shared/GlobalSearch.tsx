import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { empleadosService } from '@/services/empleados.service'
import type { Empleado } from '@/types/empleado.types'

interface GlobalSearchProps {
  open: boolean
  onClose: () => void
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: searchData, isFetching } = useQuery({
    queryKey: ['global-search', query],
    queryFn: () => empleadosService.getAll({ search: query, limit: 8 } as any),
    enabled: query.length >= 2,
    staleTime: 10000,
  })
  const results: Empleado[] = (searchData as any)?.data ?? []

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => { setSelected(0) }, [results])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && results[selected]) {
      navigate(`/empleados/${results[selected].id}`)
      onClose()
    }
    if (e.key === 'Escape') onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative w-full max-w-lg mx-4 rounded-xl border shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <Search size={16} className="text-[var(--text-3)] flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar empleados por nombre o cédula..."
            className="flex-1 bg-transparent text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] outline-none"
          />
          {isFetching && <Loader2 size={14} className="animate-spin text-[var(--text-3)]" />}
          <button
            onClick={onClose}
            className="p-1 rounded text-[var(--text-3)] hover:text-[var(--text-1)]"
          >
            <X size={14} />
          </button>
        </div>

        {/* Results */}
        {query.length >= 2 && (
          <div className="max-h-72 overflow-y-auto py-1">
            {results.length === 0 && !isFetching ? (
              <div className="py-6 text-center text-sm text-[var(--text-3)]">Sin resultados</div>
            ) : (
              results.map((emp: any, i: number) => (
                <button
                  key={emp.id}
                  onClick={() => { navigate(`/empleados/${emp.id}`); onClose() }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                    i === selected ? 'bg-[var(--accent)]/10' : 'hover:bg-[var(--bg-hover)]',
                  )}
                >
                  <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {emp.firstName?.[0]}{emp.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--text-1)]">{emp.firstName} {emp.lastName}</div>
                    <div className="text-xs text-[var(--text-3)]">{emp.positionName ?? ''} · {emp.departmentName ?? ''}</div>
                  </div>
                  {emp.cedula && (
                    <span className="text-xs text-[var(--text-3)]">{emp.cedula}</span>
                  )}
                </button>
              ))
            )}
          </div>
        )}

        {query.length < 2 && (
          <div className="py-4 px-4 text-xs text-[var(--text-3)]">
            Escribe al menos 2 caracteres ·{' '}
            <kbd className="font-mono bg-[var(--bg-card)] px-1 py-0.5 rounded text-[var(--text-2)]">Esc</kbd>{' '}
            para cerrar
          </div>
        )}
      </div>
    </div>
  )
}
