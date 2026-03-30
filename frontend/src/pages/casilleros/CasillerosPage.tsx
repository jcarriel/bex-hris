import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Wrench, Search, X, Trash2, UserCheck, Package,
  ChevronDown, AlertTriangle, Loader2, Settings2, Lock, LockOpen, LockKeyhole,
  Pencil, Check, LayoutGrid,
} from 'lucide-react'
import { toast } from 'sonner'
import { lockersService, type Locker, type LockerStatus } from '@/services/lockers.service'
import { empleadosService } from '@/services/empleados.service'
import { cn } from '@/lib/utils'
import { useAuthStore, hasAction } from '@/store/authStore'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

function formatDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

const STATUS_LABEL: Record<LockerStatus, string> = {
  available:   'Disponible',
  occupied:    'Ocupado',
  maintenance: 'Mantenimiento',
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon: Icon }: {
  label: string; value: number; color: string; icon: React.ElementType
}) {
  return (
    <div className="rounded-xl border p-4 flex items-center gap-4"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-bold text-[var(--text-1)] leading-none">{value}</p>
        <p className="text-xs text-[var(--text-3)] mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ─── Locker card ──────────────────────────────────────────────────────────────
function LockerCard({ locker, selected, onClick, editMode, onDelete, onRelease }: {
  locker: Locker; selected: boolean; onClick: () => void
  editMode?: boolean; onDelete?: () => void; onRelease?: () => void
}) {
  const av = locker.status === 'available'
  const oc = locker.status === 'occupied'
  const mn = locker.status === 'maintenance'

  return (
    <button
      onClick={onClick}
      title={oc ? (locker.employeeName ?? '') : STATUS_LABEL[locker.status]}
      className={cn(
        'group relative flex flex-col items-center justify-between rounded-xl border-2 p-2 transition-all duration-150 cursor-pointer select-none overflow-hidden',
        'w-[84px] h-[108px]',
        selected && 'scale-[0.97]',
        av && [
          'border-emerald-500/30 bg-emerald-500/5',
          'hover:bg-emerald-500/12 hover:border-emerald-400/60 hover:shadow-lg hover:-translate-y-0.5',
          selected && 'ring-2 ring-emerald-400 ring-offset-1',
        ],
        oc && [
          'border-red-500/40 bg-red-500/8',
          'hover:bg-red-500/14 hover:border-red-400/70 hover:shadow-lg hover:-translate-y-0.5',
          selected && 'ring-2 ring-red-400 ring-offset-1',
        ],
        mn && [
          'border-amber-500/35 bg-amber-500/8',
          'hover:bg-amber-500/14 hover:border-amber-400/60 hover:shadow-lg hover:-translate-y-0.5',
          selected && 'ring-2 ring-amber-400 ring-offset-1',
        ],
      )}
    >
      {/* Number tag */}
      <div className={cn(
        'absolute top-0 inset-x-0 py-1 text-[9px] font-bold tracking-wider text-center',
        av && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
        oc && 'bg-red-500/15 text-red-500',
        mn && 'bg-amber-500/15 text-amber-500',
      )}>
        {locker.section}-{locker.number.padStart(2, '0')}
      </div>

      {/* Center content */}
      <div className="flex flex-col items-center gap-1 flex-1 justify-center w-full pt-4">
        {av && (
          <>
            <div className="w-9 h-9 rounded-full border-2 border-dashed border-emerald-400/50 flex items-center justify-center group-hover:border-emerald-400 group-hover:bg-emerald-500/10 transition-all">
              <LockOpen size={15} className="text-emerald-400 group-hover:text-emerald-500" />
            </div>
            <p className="text-[9px] text-emerald-500/70 font-medium group-hover:text-emerald-500 transition-colors">Libre</p>
          </>
        )}
        {oc && (
          <>
            <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold shadow-md flex-shrink-0">
              {getInitials(locker.employeeName ?? '?')}
            </div>
            <p className="text-[9px] text-red-400 font-semibold text-center leading-tight line-clamp-2 w-full px-0.5">
              {locker.employeeName?.split(' ')[0]}
            </p>
          </>
        )}
        {mn && (
          <>
            <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center">
              <Wrench size={15} className="text-amber-500" />
            </div>
            <p className="text-[9px] text-amber-500 font-medium">Mant.</p>
          </>
        )}
      </div>

      {/* Lock icon bottom */}
      <div className="pb-1.5">
        {av && <LockOpen size={11} className="text-emerald-400/60" />}
        {oc && <Lock size={11} className="text-red-400" />}
        {mn && <LockKeyhole size={11} className="text-amber-400/70" />}
      </div>

      {/* Edit mode overlays */}
      {editMode && oc && (
        <>
          {/* Release (top-left) */}
          <button
            onClick={(e) => { e.stopPropagation(); onRelease?.() }}
            className="absolute top-1 left-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md hover:bg-emerald-600 transition-colors"
            title="Liberar (cancelar asignación)"
          >
            <LockOpen size={8} />
          </button>
          {/* Delete (top-right) */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.() }}
            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
            title="Eliminar casillero"
          >
            <X size={8} />
          </button>
        </>
      )}
      {editMode && !oc && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete?.() }}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-2)] flex items-center justify-center shadow-sm hover:bg-red-500 hover:text-white hover:border-transparent transition-all"
          title="Eliminar casillero"
        >
          <X size={8} />
        </button>
      )}
    </button>
  )
}

// ─── Employee search select ───────────────────────────────────────────────────
function EmployeeSelect({ value, onChange, employees, placeholder = 'Buscar empleado...' }: {
  value: string; onChange: (id: string, name: string) => void
  employees: any[]; placeholder?: string
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const selected = employees.find((e) => e.id === value)
  const filtered = employees.filter((e) =>
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(q.toLowerCase()) ||
    e.cedula?.includes(q)
  ).slice(0, 8)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-lg border transition-colors text-left"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-base)', color: 'var(--text-1)' }}
      >
        <span className={selected ? 'text-[var(--text-1)]' : 'text-[var(--text-3)]'}>
          {selected ? `${selected.firstName} ${selected.lastName}` : placeholder}
        </span>
        <ChevronDown size={14} className="text-[var(--text-3)] flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-xl border shadow-xl overflow-hidden"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Nombre o cédula..."
                className="w-full pl-7 pr-3 py-1.5 text-sm rounded-lg border outline-none"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-base)', color: 'var(--text-1)' }} />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {value && (
              <button onClick={() => { onChange('', ''); setOpen(false); setQ('') }}
                className="w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 text-left flex items-center gap-2">
                <X size={13} /> Desasignar
              </button>
            )}
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-xs text-[var(--text-3)] text-center">Sin resultados</p>
            ) : filtered.map((e) => (
              <button key={e.id} onClick={() => { onChange(e.id, `${e.firstName} ${e.lastName}`); setOpen(false); setQ('') }}
                className={cn('w-full px-3 py-2.5 text-left hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-2.5',
                  e.id === value && 'bg-[var(--accent-soft)]')}>
                <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                  {getInitials(`${e.firstName} ${e.lastName}`)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-[var(--text-1)] font-medium truncate">{e.firstName} {e.lastName}</p>
                  <p className="text-[11px] text-[var(--text-3)] truncate">{e.positionName ?? e.cedula ?? ''}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Quick assign panel (for available lockers) ───────────────────────────────
function QuickAssignPanel({ locker, employees, onClose, onUpdate, onDelete }: {
  locker: Locker; employees: any[]
  onClose: () => void; onUpdate: (data: Partial<Locker>) => void; onDelete?: () => void
}) {
  const [empId, setEmpId] = useState('')
  const [notes, setNotes] = useState(locker.notes ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="fixed top-0 right-0 bottom-0 z-40 w-80 flex flex-col shadow-2xl"
      style={{ backgroundColor: 'var(--bg-surface)', borderLeft: '1px solid var(--border)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-hover)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <LockOpen size={15} className="text-emerald-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--text-1)]">
              {locker.section}-{locker.number.padStart(2, '0')}
            </h2>
            <p className="text-[11px] text-emerald-500">Casillero disponible</p>
          </div>
        </div>
        <button onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors">
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div>
          <p className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">Asignar a empleado</p>
          <EmployeeSelect value={empId} onChange={(id, name) => setEmpId(id)} employees={employees} />
        </div>
        <div>
          <p className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">Notas</p>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            placeholder="Número de llave, observaciones..."
            className="w-full text-sm rounded-lg border px-3 py-2 outline-none resize-none"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-base)', color: 'var(--text-1)' }} />
        </div>
        <div>
          <p className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">Marcar como</p>
          <button
            onClick={() => onUpdate({ status: 'maintenance', notes: notes || null })}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold text-amber-500 hover:bg-amber-500/10 transition-colors"
            style={{ borderColor: 'var(--border)' }}>
            <Wrench size={13} /> Enviar a mantenimiento
          </button>
        </div>
      </div>

      <div className="p-4 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => onUpdate({ employeeId: empId || null, notes: notes || null })}
          disabled={!empId}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-40 transition-all"
        >
          <Lock size={14} /> Asignar y bloquear
        </button>
        {onDelete && (!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm text-[var(--text-3)] hover:bg-red-500/10 hover:text-red-400 transition-colors border"
            style={{ borderColor: 'var(--border)' }}>
            <Trash2 size={13} /> Eliminar casillero
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)}
              className="flex-1 py-2 rounded-xl border text-sm text-[var(--text-2)] hover:bg-[var(--bg-hover)]"
              style={{ borderColor: 'var(--border)' }}>Cancelar</button>
            <button onClick={onDelete}
              className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600">
              Confirmar</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Detail panel (for occupied / maintenance lockers) ────────────────────────
function DetailPanel({ locker, employees, onClose, onUpdate, onDelete }: {
  locker: Locker; employees: any[]
  onClose: () => void; onUpdate: (data: Partial<Locker>) => void; onDelete?: () => void
}) {
  const [empId, setEmpId] = useState(locker.employeeId ?? '')
  const [notes, setNotes] = useState(locker.notes ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [reassigning, setReassigning] = useState(false)

  const oc = locker.status === 'occupied'
  const mn = locker.status === 'maintenance'

  const hasChanges = empId !== (locker.employeeId ?? '') || notes !== (locker.notes ?? '')

  const handleSave = () => {
    const payload: Partial<Locker> = { notes: notes || null }
    if (empId !== (locker.employeeId ?? '')) payload.employeeId = empId || null
    onUpdate(payload)
  }

  return (
    <div className="fixed top-0 right-0 bottom-0 z-40 w-80 flex flex-col shadow-2xl"
      style={{ backgroundColor: 'var(--bg-surface)', borderLeft: '1px solid var(--border)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-hover)' }}>
        <div className="flex items-center gap-2.5">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center',
            oc ? 'bg-red-500/15' : 'bg-amber-500/15')}>
            {oc ? <Lock size={15} className="text-red-500" /> : <Wrench size={15} className="text-amber-500" />}
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--text-1)]">
              {locker.section}-{locker.number.padStart(2, '0')}
            </h2>
            <p className={cn('text-[11px]', oc ? 'text-red-400' : 'text-amber-400')}>
              {oc ? 'Casillero ocupado' : 'En mantenimiento'}
            </p>
          </div>
        </div>
        <button onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors">
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Occupied: employee card */}
        {oc && (
          <div>
            <p className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">Empleado asignado</p>
            {!reassigning ? (
              <div className="rounded-xl border p-3 flex items-center gap-3"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-hover)' }}>
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {getInitials(locker.employeeName ?? '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-1)] truncate">{locker.employeeName}</p>
                  <p className="text-xs text-[var(--text-3)] truncate">{locker.employeePosition ?? '—'}</p>
                </div>
                <button onClick={() => setReassigning(true)}
                  className="text-[10px] text-[var(--text-3)] hover:text-[var(--accent)] transition-colors px-1.5 py-1 rounded hover:bg-[var(--bg-card)]">
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <EmployeeSelect value={empId} onChange={(id) => setEmpId(id)} employees={employees} />
                <button onClick={() => { setReassigning(false); setEmpId(locker.employeeId ?? '') }}
                  className="text-xs text-[var(--text-3)] hover:text-[var(--text-1)]">Cancelar cambio</button>
              </div>
            )}
            {locker.assignedDate && (
              <p className="text-[11px] text-[var(--text-3)] mt-1.5 flex items-center gap-1">
                <UserCheck size={11} /> Desde {formatDate(locker.assignedDate)}
              </p>
            )}
          </div>
        )}

        {/* Maintenance: toggle back */}
        {mn && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 flex items-start gap-2.5">
            <AlertTriangle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-500">En mantenimiento</p>
              <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">Este casillero no puede asignarse mientras esté en esta condición.</p>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <p className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">Notas</p>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            placeholder="Número de llave, observaciones..."
            className="w-full text-sm rounded-lg border px-3 py-2 outline-none resize-none"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-base)', color: 'var(--text-1)' }} />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
        {/* Primary action */}
        {oc ? (
          <button
            onClick={() => onUpdate({ employeeId: null, notes: notes || null })}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-all"
          >
            <LockOpen size={14} /> Liberar casillero
          </button>
        ) : (
          <button
            onClick={() => onUpdate({ status: 'available', notes: notes || null })}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-all"
          >
            <LockOpen size={14} /> Marcar disponible
          </button>
        )}
        {hasChanges && (
          <button onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-90 transition-all">
            Guardar cambios
          </button>
        )}
        {onDelete && (!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm text-[var(--text-3)] hover:bg-red-500/10 hover:text-red-400 transition-colors border"
            style={{ borderColor: 'var(--border)' }}>
            <Trash2 size={13} /> Eliminar casillero
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)}
              className="flex-1 py-2 rounded-xl border text-sm text-[var(--text-2)] hover:bg-[var(--bg-hover)]"
              style={{ borderColor: 'var(--border)' }}>Cancelar</button>
            <button onClick={onDelete}
              className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600">
              Confirmar</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Occupied delete confirm modal ────────────────────────────────────────────
function OccupiedDeleteModal({ locker, onReleaseAndDelete, onCancel }: {
  locker: Locker
  onReleaseAndDelete: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="rounded-2xl border shadow-2xl w-full max-w-xs"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>

        <div className="p-5 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <Lock size={22} className="text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-1)]">Casillero ocupado</h3>
            <p className="text-xs text-[var(--text-3)] mt-1.5 leading-relaxed">
              El casillero <strong className="text-[var(--text-1)]">{locker.section}-{locker.number.padStart(2,'0')}</strong> está
              asignado a <strong className="text-[var(--text-1)]">{locker.employeeName}</strong>.
              Para eliminarlo primero debes desocuparlo.
            </p>
          </div>
          <div className="w-full rounded-xl border border-amber-500/30 bg-amber-500/8 px-3 py-2.5 flex items-start gap-2 text-left">
            <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Al liberar y eliminar, el empleado quedará sin casillero asignado.
            </p>
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border text-sm text-[var(--text-2)] hover:bg-[var(--bg-hover)]"
            style={{ borderColor: 'var(--border)' }}>
            Cancelar
          </button>
          <button onClick={onReleaseAndDelete}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 flex items-center justify-center gap-1.5">
            <LockOpen size={13} /> Liberar y eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Grid size picker ─────────────────────────────────────────────────────────
const MAX_COLS = 10
const MAX_ROWS = 8

function GridSizePicker({ rows, cols, onChange }: {
  rows: number; cols: number; onChange: (r: number, c: number) => void
}) {
  const [hover, setHover] = useState<[number, number] | null>(null)
  const displayRows = hover ? hover[0] : rows
  const displayCols = hover ? hover[1] : cols

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-[var(--text-3)]">Distribución de la grilla</label>
        <span className="text-xs font-bold text-[var(--accent)]">
          {displayRows} × {displayCols} = {displayRows * displayCols} casilleros
        </span>
      </div>
      <div
        className="inline-flex flex-col gap-0.5 p-2 rounded-xl border bg-[var(--bg-base)] w-full"
        style={{ borderColor: 'var(--border)' }}
        onMouseLeave={() => setHover(null)}
      >
        {Array.from({ length: MAX_ROWS }, (_, r) => (
          <div key={r} className="flex gap-0.5 justify-between">
            {Array.from({ length: MAX_COLS }, (_, c) => {
              const active = r < displayRows && c < displayCols
              return (
                <div
                  key={c}
                  onMouseEnter={() => setHover([r + 1, c + 1])}
                  onClick={() => { onChange(r + 1, c + 1); setHover(null) }}
                  className={cn(
                    'flex-1 h-5 rounded-sm cursor-pointer transition-all duration-75',
                    active
                      ? 'bg-[var(--accent)] opacity-80'
                      : 'bg-[var(--bg-hover)] hover:bg-[var(--accent)]/30',
                  )}
                />
              )
            })}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[var(--text-3)]">Máx. {MAX_ROWS} filas × {MAX_COLS} columnas</p>
    </div>
  )
}

// ─── Create modal ─────────────────────────────────────────────────────────────
function CreateModal({ sections, employees, onClose, onCreate }: {
  sections: string[]; employees: any[]
  onClose: () => void; onCreate: (lockers: { number: string; section: string; employeeId?: string }[]) => void
}) {
  const [section, setSection] = useState(sections[0] ?? '')
  const [newSection, setNewSection] = useState('')
  const [bulk, setBulk] = useState(true)
  const [rows, setRows] = useState(2)
  const [cols, setCols] = useState(5)
  const [start, setStart] = useState(1)
  const [singleNum, setSingleNum] = useState('')
  const [empId, setEmpId] = useState('')

  const finalSection = section === '__new__' ? newSection.trim().toUpperCase() : section
  const total = rows * cols

  const handleCreate = () => {
    if (!finalSection) return toast.error('Ingresa el nombre de la sección')
    if (bulk) {
      const items = Array.from({ length: total }, (_, i) => ({
        number: String(start + i).padStart(2, '0'),
        section: finalSection,
      }))
      onCreate(items)
    } else {
      if (!singleNum.trim()) return toast.error('Ingresa el número del casillero')
      onCreate([{ number: singleNum.trim(), section: finalSection, employeeId: empId || undefined }])
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="rounded-2xl border shadow-2xl w-full max-w-sm"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-bold text-[var(--text-1)]">Nuevo casillero</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-hover)]">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Section */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider block mb-1.5">Sección</label>
            <select value={section} onChange={(e) => setSection(e.target.value)}
              className="w-full text-sm border rounded-lg px-3 py-2 outline-none"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-base)', color: 'var(--text-1)' }}>
              {sections.map((s) => <option key={s} value={s}>{s}</option>)}
              <option value="__new__">+ Nueva sección</option>
            </select>
            {section === '__new__' && (
              <input value={newSection} onChange={(e) => setNewSection(e.target.value)}
                placeholder="Nombre de sección (ej: D, Planta 2)"
                className="mt-2 w-full text-sm border rounded-lg px-3 py-2 outline-none"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-base)', color: 'var(--text-1)' }} />
            )}
          </div>

          {/* Mode toggle */}
          <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-hover)]">
            <button onClick={() => setBulk(true)}
              className={cn('flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                bulk ? 'bg-[var(--bg-surface)] text-[var(--text-1)] shadow-sm' : 'text-[var(--text-3)]')}>
              Creación masiva
            </button>
            <button onClick={() => setBulk(false)}
              className={cn('flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                !bulk ? 'bg-[var(--bg-surface)] text-[var(--text-1)] shadow-sm' : 'text-[var(--text-3)]')}>
              Individual
            </button>
          </div>

          {bulk ? (
            <div className="space-y-3">
              {/* Visual grid picker */}
              <GridSizePicker rows={rows} cols={cols} onChange={(r, c) => { setRows(r); setCols(c) }} />

              {/* Manual inputs + range preview */}
              <div className="flex gap-2">
                <div className="w-24">
                  <label className="text-xs text-[var(--text-3)] block mb-1">Desde nº</label>
                  <input type="number" min={1} value={start}
                    onChange={(e) => setStart(Math.max(1, Number(e.target.value)))}
                    className="w-full text-sm border rounded-lg px-3 py-2 outline-none"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-base)', color: 'var(--text-1)' }} />
                </div>
                <div className="flex-1 rounded-xl bg-[var(--bg-hover)] border px-3 py-2 text-xs"
                  style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[var(--text-3)]">Rango creado</p>
                  <p className="font-bold text-[var(--text-1)] mt-0.5">
                    {finalSection || '?'}-{String(start).padStart(2, '0')} → {finalSection || '?'}-{String(start + total - 1).padStart(2, '0')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--text-3)] block mb-1">Número</label>
                <input value={singleNum} onChange={(e) => setSingleNum(e.target.value)}
                  placeholder="ej: 01, 12, A"
                  className="w-full text-sm border rounded-lg px-3 py-2 outline-none"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-base)', color: 'var(--text-1)' }} />
              </div>
              <div>
                <label className="text-xs text-[var(--text-3)] block mb-1">Asignar empleado (opcional)</label>
                <EmployeeSelect value={empId} onChange={(id) => setEmpId(id)} employees={employees} />
              </div>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border text-sm text-[var(--text-2)] hover:bg-[var(--bg-hover)]"
            style={{ borderColor: 'var(--border)' }}>
            Cancelar
          </button>
          <button onClick={handleCreate}
            className="flex-1 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-90">
            {bulk ? `Crear ${total} casilleros` : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function CasillerosPage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canCreate = hasAction(user?.permissions, 'casilleros:crear', user?.rol)
  const canEdit   = hasAction(user?.permissions, 'casilleros:editar', user?.rol)
  const canDelete = hasAction(user?.permissions, 'casilleros:eliminar', user?.rol)
  const [selected, setSelected] = useState<Locker | null>(null)
  const [activeSection, setActiveSection] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [sectionCols, setSectionCols] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('locker-cols') ?? '{}') } catch { return {} }
  })
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [occupiedDeleteTarget, setOccupiedDeleteTarget] = useState<Locker | null>(null)

  const updateCols = (section: string, n: number) => {
    const v = Math.max(1, Math.min(12, n))
    const next = { ...sectionCols, [section]: v }
    setSectionCols(next)
    localStorage.setItem('locker-cols', JSON.stringify(next))
  }

  const { data: lockers = [], isLoading } = useQuery({
    queryKey: ['lockers'],
    queryFn: lockersService.getAll,
    staleTime: 30_000,
  })

  const { data: stats = { total: 0, available: 0, occupied: 0, maintenance: 0 } } = useQuery({
    queryKey: ['lockers-stats'],
    queryFn: lockersService.getStats,
    staleTime: 30_000,
  })

  const { data: empResult } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => empleadosService.getAll({ limit: 9999 }),
    staleTime: 60_000,
  })
  const employees: any[] = (empResult as any)?.data?.filter((e: any) => e.status === 'active') ?? []

  const sections = useMemo(() => {
    const s = [...new Set(lockers.map((l) => l.section))].sort()
    return s
  }, [lockers])

  const filtered = useMemo(() => {
    return lockers.filter((l) => {
      const matchSection = activeSection === 'all' || l.section === activeSection
      const matchSearch = !search ||
        `${l.section}-${l.number}`.toLowerCase().includes(search.toLowerCase()) ||
        (l.employeeName ?? '').toLowerCase().includes(search.toLowerCase())
      return matchSection && matchSearch
    })
  }, [lockers, activeSection, search])

  const grouped = useMemo(() => {
    const map = new Map<string, Locker[]>()
    for (const l of filtered) {
      if (!map.has(l.section)) map.set(l.section, [])
      map.get(l.section)!.push(l)
    }
    return map
  }, [filtered])

  const updateM = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Locker> }) => lockersService.update(id, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['lockers'] })
      qc.invalidateQueries({ queryKey: ['lockers-stats'] })
      setSelected(updated)
      toast.success('Casillero actualizado')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al actualizar'),
  })

  const deleteM = useMutation({
    mutationFn: (id: string) => lockersService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lockers'] })
      qc.invalidateQueries({ queryKey: ['lockers-stats'] })
      setSelected(null)
      toast.success('Casillero eliminado')
    },
    onError: () => toast.error('Error al eliminar'),
  })

  const createM = useMutation({
    mutationFn: (items: { number: string; section: string; employeeId?: string }[]) =>
      Promise.all(items.map((item) => lockersService.create(item))),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['lockers'] })
      qc.invalidateQueries({ queryKey: ['lockers-stats'] })
      setShowCreate(false)
      toast.success(`${vars.length} casillero${vars.length > 1 ? 's' : ''} creado${vars.length > 1 ? 's' : ''}`)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al crear'),
  })

  const releaseAndDeleteM = useMutation({
    mutationFn: async (locker: Locker) => {
      await lockersService.update(locker.id, { employeeId: null })
      await lockersService.delete(locker.id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lockers'] })
      qc.invalidateQueries({ queryKey: ['lockers-stats'] })
      setOccupiedDeleteTarget(null)
      toast.success('Casillero liberado y eliminado')
    },
    onError: () => toast.error('Error al eliminar'),
  })

  const releaseM = useMutation({
    mutationFn: (id: string) => lockersService.update(id, { employeeId: null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lockers'] })
      qc.invalidateQueries({ queryKey: ['lockers-stats'] })
      toast.success('Casillero liberado')
    },
    onError: () => toast.error('Error al liberar'),
  })

  const handleLockerDelete = (locker: Locker) => {
    if (locker.status === 'occupied') {
      setOccupiedDeleteTarget(locker)
    } else {
      deleteM.mutate(locker.id)
    }
  }

  const handleAddOne = (section: string, items: Locker[]) => {
    const maxNum = items.reduce((max, l) => {
      const n = parseInt(l.number, 10)
      return isNaN(n) ? max : Math.max(max, n)
    }, 0)
    createM.mutate([{ number: String(maxNum + 1).padStart(2, '0'), section }])
  }

  const handleRemoveLast = (items: Locker[]) => {
    const sorted = [...items].sort((a, b) => {
      const na = parseInt(a.number, 10) || 0
      const nb = parseInt(b.number, 10) || 0
      return nb - na
    })
    const last = sorted[0]
    if (last) handleLockerDelete(last)
  }

  return (
    <div className="space-y-5" style={{ paddingRight: selected ? '22rem' : 0, transition: 'padding 0.2s' }}>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="Total casilleros" value={stats.total}       icon={Package}   color="bg-[var(--accent-soft)] text-[var(--accent)]" />
        <StatCard label="Disponibles"      value={stats.available}   icon={Plus}      color="bg-emerald-500/15 text-emerald-500" />
        <StatCard label="Ocupados"         value={stats.occupied}    icon={Lock}      color="bg-red-500/15 text-red-500" />
        <StatCard label="Mantenimiento"    value={stats.maintenance} icon={Wrench}    color="bg-amber-500/15 text-amber-500" />
      </div>

      {/* Toolbar */}
      <div className="rounded-xl border p-3 flex flex-wrap items-center gap-3"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

        {/* Section tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          <button onClick={() => setActiveSection('all')}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              activeSection === 'all' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-2)] hover:bg-[var(--bg-hover)]')}>
            Todas
          </button>
          {sections.map((s) => (
            <button key={s} onClick={() => setActiveSection(s)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                activeSection === s ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-2)] hover:bg-[var(--bg-hover)]')}>
              {s}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-40">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar casillero o empleado..."
            className="w-full pl-7 pr-3 py-1.5 text-sm rounded-lg border outline-none"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-base)', color: 'var(--text-1)' }} />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-1)]">
              <X size={12} />
            </button>
          )}
        </div>

        {/* New button */}
        {canCreate && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-90 transition-opacity flex-shrink-0">
            <Plus size={14} />
            Nuevo casillero
          </button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-[var(--text-3)]" />
        </div>
      ) : grouped.size === 0 ? (
        <div className="flex flex-col items-center py-24 text-[var(--text-3)]">
          <Package size={40} className="opacity-20 mb-3" />
          <p className="text-sm font-medium">Sin casilleros</p>
          <p className="text-xs mt-1">Crea tu primera sección con el botón "Nuevo casillero"</p>
        </div>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([section, items]) => {
            const cols = sectionCols[section] ?? 5
            const rows = Math.ceil(items.length / cols)
            const isEditing = editingSection === section

            return (
              <div key={section}>
                {/* Section header */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                      isEditing ? 'bg-amber-500/15' : 'bg-[var(--accent-soft)]')}>
                      {isEditing
                        ? <Pencil size={13} className="text-amber-500" />
                        : <Settings2 size={13} className="text-[var(--accent)]" />}
                    </div>
                    <h3 className="text-sm font-bold text-[var(--text-1)]">Sección {section}</h3>
                  </div>
                  <div className="h-px flex-1" style={{ backgroundColor: 'var(--border)' }} />
                  <span className="text-xs text-[var(--text-3)]">
                    {items.filter((l) => l.status === 'available').length} disp. / {items.length} total
                  </span>
                  {(canEdit || canDelete) && (
                    <button
                      onClick={() => { setEditingSection(isEditing ? null : section); setSelected(null) }}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                        isEditing
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                          : 'border text-[var(--text-2)] hover:bg-[var(--bg-hover)]',
                      )}
                      style={isEditing ? {} : { borderColor: 'var(--border)' }}
                    >
                      {isEditing ? <><Check size={12} /> Listo</> : <><Pencil size={12} /> Editar</>}
                    </button>
                  )}
                </div>

                {/* Edit toolbar — slides in */}
                {isEditing && (
                  <div className="mb-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 flex flex-wrap items-center gap-5">
                    {/* Layout controls */}
                    <div className="flex items-center gap-4">
                      {/* Cols */}
                      <div className="flex items-center gap-2">
                        <LayoutGrid size={13} className="text-amber-500 flex-shrink-0" />
                        <span className="text-xs text-[var(--text-3)]">Columnas</span>
                        <div className="flex items-center gap-1 bg-[var(--bg-base)] border rounded-lg px-1.5 py-0.5" style={{ borderColor: 'var(--border)' }}>
                          <button onClick={() => updateCols(section, cols - 1)} disabled={cols <= 1}
                            className="w-5 h-5 flex items-center justify-center rounded text-[var(--text-2)] hover:bg-[var(--bg-hover)] disabled:opacity-30 font-bold text-sm">−</button>
                          <input
                            type="number" min={1} max={12} value={cols}
                            onChange={(e) => updateCols(section, Number(e.target.value))}
                            className="w-7 text-center text-sm font-bold bg-transparent outline-none text-[var(--text-1)]"
                          />
                          <button onClick={() => updateCols(section, cols + 1)} disabled={cols >= 12}
                            className="w-5 h-5 flex items-center justify-center rounded text-[var(--text-2)] hover:bg-[var(--bg-hover)] disabled:opacity-30 font-bold text-sm">+</button>
                        </div>
                      </div>
                      {/* Rows (derived, but editable — changes cols) */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text-3)]">Filas</span>
                        <div className="flex items-center gap-1 bg-[var(--bg-base)] border rounded-lg px-1.5 py-0.5" style={{ borderColor: 'var(--border)' }}>
                          <button onClick={() => updateCols(section, Math.ceil(items.length / (rows - 1)))} disabled={rows <= 1}
                            className="w-5 h-5 flex items-center justify-center rounded text-[var(--text-2)] hover:bg-[var(--bg-hover)] disabled:opacity-30 font-bold text-sm">−</button>
                          <input
                            type="number" min={1} max={items.length} value={rows}
                            onChange={(e) => { const r = Math.max(1, Number(e.target.value)); updateCols(section, Math.ceil(items.length / r)) }}
                            className="w-7 text-center text-sm font-bold bg-transparent outline-none text-[var(--text-1)]"
                          />
                          <button onClick={() => updateCols(section, Math.ceil(items.length / (rows + 1)))} disabled={rows >= items.length}
                            className="w-5 h-5 flex items-center justify-center rounded text-[var(--text-2)] hover:bg-[var(--bg-hover)] disabled:opacity-30 font-bold text-sm">+</button>
                        </div>
                      </div>
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        {rows} × {cols} = {items.length} casilleros
                      </span>
                    </div>

                    {/* Mini live preview */}
                    <div className="ml-auto flex flex-col gap-0.5">
                      {Array.from({ length: Math.min(rows, 6) }, (_, r) => (
                        <div key={r} className="flex gap-0.5">
                          {Array.from({ length: cols }, (_, c) => {
                            const locker = items[r * cols + c]
                            return (
                              <div key={c} className={cn('w-3 h-3 rounded-[3px] transition-colors',
                                !locker          ? 'opacity-0' :
                                locker.status === 'occupied'    ? 'bg-red-400' :
                                locker.status === 'maintenance' ? 'bg-amber-400' :
                                'bg-emerald-400'
                              )} />
                            )
                          })}
                        </div>
                      ))}
                      {rows > 6 && <p className="text-[9px] text-[var(--text-3)] text-center">+{rows - 6} filas</p>}
                    </div>
                    {/* Legend */}
                    <div className="flex items-center gap-3 text-[10px] text-[var(--text-3)]">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block"/>Libre</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block"/>Ocupado</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block"/>Mant.</span>
                    </div>
                    {/* Edit hint + add/remove controls */}
                    <div className="w-full flex items-center justify-between mt-1">
                      <p className="text-[10px] text-amber-600/70 dark:text-amber-400/60 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-500 inline-flex items-center justify-center flex-shrink-0"><LockOpen size={8}/></span> Liberar
                        <span className="ml-2 w-4 h-4 rounded-full bg-red-500/20 text-red-400 inline-flex items-center justify-center flex-shrink-0"><X size={8}/></span> Eliminar
                      </p>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleRemoveLast(items)}
                          disabled={items.length === 0}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold text-[var(--text-2)] hover:bg-red-500/10 hover:text-red-400 hover:border-red-400/30 disabled:opacity-30 transition-all"
                          style={{ borderColor: 'var(--border)' }}
                          title={`Quitar último (${items.at(-1)?.section}-${items.at(-1)?.number.padStart(2,'0') ?? ''})`}
                        >
                          <X size={11} /> Quitar
                        </button>
                        <button
                          onClick={() => handleAddOne(section, items)}
                          disabled={createM.isPending}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                          <Plus size={11} /> Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lockers grid */}
                <div
                  className="grid gap-2.5 mx-auto"
                  style={{ gridTemplateColumns: `repeat(${cols}, 84px)`, width: 'fit-content' }}
                >
                  {items.map((locker) => (
                    <LockerCard
                      key={locker.id}
                      locker={locker}
                      selected={selected?.id === locker.id}
                      onClick={() => { if (!isEditing) setSelected(selected?.id === locker.id ? null : locker) }}
                      editMode={isEditing && (canEdit || canDelete)}
                      onDelete={canDelete ? () => handleLockerDelete(locker) : undefined}
                      onRelease={() => releaseM.mutate(locker.id)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Side panel — quick assign for available, detail for occupied/maintenance */}
      {selected && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setSelected(null)} />
          {selected.status === 'available' ? (
            <QuickAssignPanel
              locker={selected}
              employees={employees}
              onClose={() => setSelected(null)}
              onUpdate={(data) => updateM.mutate({ id: selected.id, data })}
              onDelete={canDelete ? () => deleteM.mutate(selected.id) : undefined}
            />
          ) : (
            <DetailPanel
              locker={selected}
              employees={employees}
              onClose={() => setSelected(null)}
              onUpdate={(data) => updateM.mutate({ id: selected.id, data })}
              onDelete={canDelete ? () => deleteM.mutate(selected.id) : undefined}
            />
          )}
        </>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateModal
          sections={sections.length > 0 ? sections : ['A']}
          employees={employees}
          onClose={() => setShowCreate(false)}
          onCreate={(items) => createM.mutate(items)}
        />
      )}

      {/* Occupied delete confirmation */}
      {occupiedDeleteTarget && (
        <OccupiedDeleteModal
          locker={occupiedDeleteTarget}
          onReleaseAndDelete={() => releaseAndDeleteM.mutate(occupiedDeleteTarget)}
          onCancel={() => setOccupiedDeleteTarget(null)}
        />
      )}
    </div>
  )
}
