import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leavesService, Leave } from '@/services/leaves.service'
import { empleadosService } from '@/services/empleados.service'
import { Plus, Check, X, Trash2, Loader2, FileCheck } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const TYPE_LABEL: Record<string, string> = {
  medical:   'Médico',
  maternity: 'Maternidad',
  personal:  'Personal',
  unpaid:    'Sin pago',
}

const TYPE_COLOR: Record<string, string> = {
  medical:   'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  maternity: 'bg-pink-500/15 text-pink-700 dark:text-pink-400',
  personal:  'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  unpaid:    'bg-[var(--bg-hover)] text-[var(--text-3)]',
}

const STATUS_LABEL: Record<string, string> = { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' }
const STATUS_COLOR: Record<string, string> = {
  pending:  'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  approved: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  rejected: 'bg-red-500/15 text-red-500',
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', color)}>{label}</span>
}

function calcDays(start: string, end: string) {
  if (!start || !end) return 0
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1)
}

interface Form {
  employeeId: string
  type: string
  startDate: string
  endDate: string
  reason: string
}

export function PermisosPage() {
  const qc = useQueryClient()
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<Form>({ employeeId: '', type: 'personal', startDate: '', endDate: '', reason: '' })

  const { data: allLeaves = [], isLoading } = useQuery({ queryKey: ['leaves'], queryFn: leavesService.getAll, staleTime: 30_000 })
  const { data: empResult } = useQuery({ queryKey: ['employees-all'], queryFn: () => empleadosService.getAll({ limit: 9999 }), staleTime: 60_000 })
  const employees: any[] = (empResult as any)?.data ?? []
  const empMap = new Map(employees.map((e) => [e.id, e.nombre || `${e.primerNombre} ${e.primerApellido}`]))

  const leaves = allLeaves.filter((l) =>
    l.type !== 'vacation' &&
    (filterType === 'all' || l.type === filterType) &&
    (filterStatus === 'all' || l.status === filterStatus)
  )

  const createM = useMutation({
    mutationFn: () => leavesService.create({ employeeId: form.employeeId, type: form.type as any, startDate: form.startDate, endDate: form.endDate, days: calcDays(form.startDate, form.endDate), reason: form.reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); toast.success('Permiso creado'); setShowModal(false); setForm({ employeeId: '', type: 'personal', startDate: '', endDate: '', reason: '' }) },
    onError: () => toast.error('Error al crear permiso'),
  })
  const approveM = useMutation({ mutationFn: leavesService.approve, onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); toast.success('Aprobado') }, onError: () => toast.error('Error') })
  const rejectM  = useMutation({ mutationFn: leavesService.reject,  onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); toast.success('Rechazado') }, onError: () => toast.error('Error') })
  const deleteM  = useMutation({ mutationFn: leavesService.delete,  onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); toast.success('Eliminado') }, onError: () => toast.error('Error') })

  const thCls = 'border-b border-[var(--border)] px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-3)]'
  const tdCls = 'border-b border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text-2)]'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {['all', ...Object.keys(TYPE_LABEL)].map((t) => (
              <button key={t} onClick={() => setFilterType(t)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', filterType === t ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-hover)] text-[var(--text-2)]')}>
                {t === 'all' ? 'Todos' : TYPE_LABEL[t]}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {['all', 'pending', 'approved', 'rejected'].map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', filterStatus === s ? 'bg-[var(--text-2)] text-[var(--bg-surface)]' : 'bg-[var(--bg-hover)] text-[var(--text-3)]')}>
                {s === 'all' ? 'Todos' : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90">
          <Plus size={14} /> Nuevo Permiso
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[var(--text-3)]" size={20} /></div>
      ) : leaves.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-[var(--text-3)]">
          <FileCheck size={36} className="mb-2 opacity-30" />
          <div className="text-sm">No hay permisos registrados</div>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--bg-surface)]">
          <table className="w-full">
            <thead className="bg-[var(--bg-hover)]">
              <tr>{['Empleado', 'Tipo', 'Desde', 'Hasta', 'Días', 'Estado', 'Motivo', ''].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l.id} className="hover:bg-[var(--bg-hover)/30] transition-colors">
                  <td className={cn(tdCls, 'font-medium text-[var(--text-1)]')}>{empMap.get(l.employeeId) || l.employeeId}</td>
                  <td className={tdCls}><Badge label={TYPE_LABEL[l.type] || l.type} color={TYPE_COLOR[l.type] || ''} /></td>
                  <td className={tdCls}>{l.startDate}</td>
                  <td className={tdCls}>{l.endDate}</td>
                  <td className={cn(tdCls, 'text-center font-bold text-[var(--accent)]')}>{l.days}</td>
                  <td className={tdCls}><Badge label={STATUS_LABEL[l.status] || l.status} color={STATUS_COLOR[l.status] || ''} /></td>
                  <td className={cn(tdCls, 'max-w-[180px] truncate text-[var(--text-3)]')}>{l.reason || '—'}</td>
                  <td className={cn(tdCls, 'text-right')}>
                    <div className="flex items-center justify-end gap-1">
                      {l.status === 'pending' && (
                        <>
                          <button onClick={() => approveM.mutate(l.id)} title="Aprobar" className="p-1.5 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors text-[var(--text-3)]"><Check size={13} /></button>
                          <button onClick={() => rejectM.mutate(l.id)} title="Rechazar" className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors text-[var(--text-3)]"><X size={13} /></button>
                        </>
                      )}
                      <button onClick={() => { if (confirm('¿Eliminar?')) deleteM.mutate(l.id) }} title="Eliminar" className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors text-[var(--text-3)]"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] shadow-2xl w-full max-w-md mx-4 p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[var(--text-1)]">Nuevo Permiso / Ausencia</h2>
              <button onClick={() => setShowModal(false)} className="text-[var(--text-3)] hover:text-[var(--text-1)]"><X size={16} /></button>
            </div>
            <div>
              <label className="text-xs text-[var(--text-3)] font-medium block mb-1">Empleado</label>
              <select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-base)] text-[var(--text-1)] outline-none focus:border-[var(--accent)]">
                <option value="">Seleccionar...</option>
                {employees.filter(e => e.status === 'active').map((e) => <option key={e.id} value={e.id}>{e.nombre || `${e.primerNombre} ${e.primerApellido}`}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-3)] font-medium block mb-1">Tipo</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-base)] text-[var(--text-1)] outline-none focus:border-[var(--accent)]">
                {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--text-3)] font-medium block mb-1">Desde</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-base)] text-[var(--text-1)] outline-none focus:border-[var(--accent)]" />
              </div>
              <div>
                <label className="text-xs text-[var(--text-3)] font-medium block mb-1">Hasta</label>
                <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-base)] text-[var(--text-1)] outline-none focus:border-[var(--accent)]" />
              </div>
            </div>
            {form.startDate && form.endDate && <div className="text-xs text-[var(--accent)] font-medium">{calcDays(form.startDate, form.endDate)} día(s)</div>}
            <div>
              <label className="text-xs text-[var(--text-3)] font-medium block mb-1">Motivo</label>
              <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-base)] text-[var(--text-1)] outline-none focus:border-[var(--accent)] resize-none" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-2)] hover:bg-[var(--bg-hover)]">Cancelar</button>
              <button onClick={() => createM.mutate()} disabled={!form.employeeId || !form.startDate || !form.endDate || createM.isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {createM.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
