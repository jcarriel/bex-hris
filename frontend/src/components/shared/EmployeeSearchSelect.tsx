import { useState, useRef, useEffect } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EmpOption {
  id: string
  firstName: string
  lastName: string
  cedula?: string
  positionName?: string
  departmentName?: string
  status?: string
}

interface Props {
  value: string
  onChange: (id: string) => void
  employees: EmpOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function EmployeeSearchSelect({ value, onChange, employees, placeholder = 'Buscar empleado...', disabled, className }: Props) {
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const ref                 = useRef<HTMLDivElement>(null)
  const inputRef            = useRef<HTMLInputElement>(null)

  const selected = employees.find((e) => e.id === value)
  const displayName = selected ? `${selected.firstName} ${selected.lastName}` : ''

  const filtered = query.length >= 1
    ? employees.filter((e) => {
        const full = `${e.firstName} ${e.lastName} ${e.cedula ?? ''}`.toLowerCase()
        return full.includes(query.toLowerCase())
      }).slice(0, 12)
    : employees.slice(0, 12)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleSelect(id: string) {
    onChange(id)
    setQuery('')
    setOpen(false)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
    setQuery('')
    setOpen(false)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    if (!open) setOpen(true)
    if (value) onChange('') // clear selection when typing
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      {/* Input */}
      <div
        onClick={() => { if (!disabled) { setOpen(true); setTimeout(() => inputRef.current?.focus(), 10) } }}
        className={cn(
          'flex items-center gap-2 w-full text-sm border rounded-lg px-3 py-2 cursor-text transition-colors',
          'bg-[var(--bg-base)] text-[var(--text-1)] border-[var(--border)]',
          open ? 'border-[var(--accent)]' : 'hover:border-[var(--text-3)]',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <Search size={13} className="text-[var(--text-3)] flex-shrink-0" />
        <input
          ref={inputRef}
          value={open ? query : displayName}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={value ? displayName : placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent outline-none text-[var(--text-1)] placeholder:text-[var(--text-3)] min-w-0"
        />
        {value
          ? <button type="button" onClick={handleClear} className="text-[var(--text-3)] hover:text-[var(--text-1)] flex-shrink-0"><X size={13} /></button>
          : <ChevronDown size={13} className={cn('text-[var(--text-3)] flex-shrink-0 transition-transform', open && 'rotate-180')} />
        }
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-xl border border-[var(--border)] shadow-xl overflow-hidden"
          style={{ backgroundColor: 'var(--bg-surface)' }}>
          {filtered.length === 0 ? (
            <div className="py-4 text-center text-xs text-[var(--text-3)]">Sin resultados</div>
          ) : (
            <ul className="max-h-52 overflow-y-auto py-1">
              {filtered.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(e.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[var(--bg-hover)] transition-colors',
                      value === e.id && 'bg-[var(--accent)]/10',
                    )}
                  >
                    <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                      {e.firstName?.[0]}{e.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--text-1)] truncate">
                        {e.firstName} {e.lastName}
                      </div>
                      <div className="text-[11px] text-[var(--text-3)] truncate">
                        {[e.positionName, e.departmentName].filter(Boolean).join(' · ')}{e.cedula ? ` · ${e.cedula}` : ''}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {employees.length > 12 && query.length === 0 && (
            <div className="px-3 py-1.5 border-t border-[var(--border)] text-[10px] text-[var(--text-3)]">
              Escribe para filtrar ({employees.length} empleados)
            </div>
          )}
        </div>
      )}
    </div>
  )
}
