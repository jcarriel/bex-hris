import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leavesService, Leave } from '@/services/leaves.service'
import { empleadosService } from '@/services/empleados.service'
import { Plus, Check, X, Trash2, Loader2, FileCheck } from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatDateTime } from '@/lib/utils'
import { EmployeeSearchSelect } from '@/components/shared/EmployeeSearchSelect'
import { useAuthStore, hasModuleAccess, hasAction } from '@/store/authStore'
import { useMayordomoScope } from '@/hooks/useMayordomoScope'
import { ConfirmDialog } from '@/components/empleados/ConfirmDialog'


const TYPE_LABEL: Record<string, string> = {
  medical:         'Médico',
  maternity:       'Maternidad',
  personal:        'Personal',
  ausentismo:      'Ausentismo',
  paternidad:      'Paternidad',
}

const TYPE_COLOR: Record<string, string> = {
  medical:         'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  maternity:       'bg-pink-500/15 text-pink-700 dark:text-pink-400',
  personal:        'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  ausentismo:      'bg-red-500/15 text-red-700 dark:text-red-400',
  paternidad:      'bg-sky-500/15 text-sky-700 dark:text-sky-400',
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
  const user       = useAuthStore((s) => s.user)
  const canApprove = hasModuleAccess(user?.permissions, 'bienestar:aprobar', user?.rol)
  const canCreate  = hasAction(user?.permissions, 'bienestar:crear', user?.rol)
  const canDelete  = hasAction(user?.permissions, 'bienestar:eliminar', user?.rol)
  const { filterByEmployeeId } = useMayordomoScope('bienestar')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterEmployee, setFilterEmployee] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [confirmDelete,  setConfirmDelete]  = useState<string | null>(null)
  const [confirmApprove, setConfirmApprove] = useState<string | null>(null)
  const [confirmReject,  setConfirmReject]  = useState<string | null>(null)
  const [form, setForm] = useState<Form>({ employeeId: '', type: 'personal', startDate: '', endDate: '', reason: '' })

  const { data: allLeaves = [], isLoading } = useQuery({ queryKey: ['leaves'], queryFn: leavesService.getAll, staleTime: 30_000 })
  const { data: empResult } = useQuery({ queryKey: ['employees-all'], queryFn: () => empleadosService.getAll({ limit: 9999 }), staleTime: 60_000 })
  const employees: any[] = (empResult as any)?.data ?? []
  const empMap = new Map(employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`]))

  const leaves = filterByEmployeeId(allLeaves.filter((l) =>
    l.type !== 'vacation' &&
    (filterType === 'all' || l.type === filterType) &&
    (filterStatus === 'all' || l.status === filterStatus) &&
    (filterEmployee === 'all' || l.employeeId === filterEmployee)
  ))

  const createM = useMutation({
    mutationFn: () => leavesService.create({ employeeId: form.employeeId, type: form.type as any, startDate: form.startDate, endDate: form.endDate, days: calcDays(form.startDate, form.endDate), reason: form.reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); toast.success('Permiso creado'); setShowModal(false); setForm({ employeeId: '', type: 'personal', startDate: '', endDate: '', reason: '' }) },
    onError: () => toast.error('Error al crear permiso'),
  })
  const approveM = useMutation({ mutationFn: leavesService.approve, onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); qc.invalidateQueries({ queryKey: ['dashboard-stats'] }); toast.success('Aprobado') }, onError: () => toast.error('Error') })
  const rejectM  = useMutation({ mutationFn: leavesService.reject,  onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); qc.invalidateQueries({ queryKey: ['dashboard-stats'] }); toast.success('Rechazado') }, onError: () => toast.error('Error') })
  const deleteM  = useMutation({ mutationFn: leavesService.delete,  onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); toast.success('Eliminado') }, onError: () => toast.error('Error') })

  const thCls = 'border-b border-[var(--border)] px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-3)]'
  const tdCls = 'border-b border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text-2)]'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 flex-wrap">
            {['all', ...Object.keys(TYPE_LABEL)].map((t) => (
              <button key={t} onClick={() => setFilterType(t)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', filterType === t ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-hover)] text-[var(--text-2)]')}>
                {t === 'all' ? 'Todos los tipos' : TYPE_LABEL[t]}
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
          <div className="flex items-center gap-2">
            <EmployeeSearchSelect
              value={filterEmployee === 'all' ? '' : filterEmployee}
              onChange={(id) => setFilterEmployee(id || 'all')}
              employees={employees.filter((e) => e.status === 'active')}
              placeholder="Filtrar por empleado..."
              className="w-52"
            />
            {filterEmployee !== 'all' && (
              <button onClick={() => setFilterEmployee('all')} className="text-xs text-[var(--text-3)] hover:text-[var(--text-1)] underline">
                Ver todos
              </button>
            )}
          </div>
        </div>
        {canCreate && (
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90">
            <Plus size={14} /> Nuevo Permiso
          </button>
        )}
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
              <tr>{['Empleado', 'Tipo', 'Desde', 'Hasta', 'Días', 'Estado', 'Ingresado por', 'Aprobado/Rechazado por', 'Motivo', ''].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr>
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
                  <td className={tdCls}>
                    <div className="space-y-0.5">
                      <span className="text-xs font-medium">{l.submittedByName || '—'}</span>
                      {l.createdAt && <div className="text-[10px] text-[var(--text-3)]">{formatDateTime(l.createdAt)}</div>}
                    </div>
                  </td>
                  <td className={tdCls}>
                    {l.approvedByName
                      ? <div className="space-y-0.5"><span className="text-xs font-medium">{l.approvedByName}</span>{l.approvedDate && <div className="text-[10px] text-[var(--text-3)]">{formatDateTime(l.approvedDate)}</div>}</div>
                      : <span className="text-[var(--text-3)]">—</span>}
                  </td>
                  <td className={cn(tdCls, 'max-w-[180px] truncate text-[var(--text-3)]')}>{l.reason || '—'}</td>
                  <td className={cn(tdCls, 'text-right')}>
                    <div className="flex items-center justify-end gap-1">
                      {l.status === 'pending' && canApprove && (
                        <>
                          <button onClick={() => setConfirmApprove(l.id)} title="Aprobar" className="p-1.5 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors text-[var(--text-3)]"><Check size={13} /></button>
                          <button onClick={() => setConfirmReject(l.id)} title="Rechazar" className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors text-[var(--text-3)]"><X size={13} /></button>
                        </>
                      )}
                      {canDelete && (
                        <button onClick={() => setConfirmDelete(l.id)} title="Eliminar" className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors text-[var(--text-3)]"><Trash2 size={13} /></button>
                      )}
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
              <EmployeeSearchSelect
                value={form.employeeId}
                onChange={(id) => setForm({ ...form, employeeId: id })}
                employees={employees.filter((e) => e.status === 'active')}
              />
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
      <ConfirmDialog
        open={!!confirmApprove}
        title="Aprobar permiso"
        description="¿Confirmas la aprobación de este permiso?"
        confirmLabel="Aprobar"
        loading={approveM.isPending}
        onConfirm={() => { approveM.mutate(confirmApprove!); setConfirmApprove(null) }}
        onCancel={() => setConfirmApprove(null)}
      />
      <ConfirmDialog
        open={!!confirmReject}
        title="Rechazar permiso"
        description="¿Confirmas el rechazo de este permiso?"
        confirmLabel="Rechazar"
        variant="danger"
        loading={rejectM.isPending}
        onConfirm={() => { rejectM.mutate(confirmReject!); setConfirmReject(null) }}
        onCancel={() => setConfirmReject(null)}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar permiso"
        description="¿Estás seguro de que deseas eliminar este permiso?"
        confirmLabel="Eliminar"
        loading={deleteM.isPending}
        onConfirm={() => { deleteM.mutate(confirmDelete!); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
