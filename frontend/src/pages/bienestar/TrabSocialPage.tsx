import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { socialCasesService, SocialCase, SocialCaseType } from '@/services/social-cases.service'
import { empleadosService } from '@/services/empleados.service'
import { Plus, X, Trash2, Loader2, Heart, ChevronDown, Edit2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { EmployeeSearchSelect } from '@/components/shared/EmployeeSearchSelect'

const TYPE_LABEL: Record<SocialCaseType, string> = {
  asistencia_medica:    'Asistencia Médica',
  asistencia_economica: 'Asistencia Económica',
  visita_domiciliaria:  'Visita Domiciliaria',
  consejeria:           'Consejería',
  permiso_especial:     'Permiso Especial',
  otro:                 'Otro',
}

const TYPE_COLOR: Record<SocialCaseType, string> = {
  asistencia_medica:    'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  asistencia_economica: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  visita_domiciliaria:  'bg-green-500/15 text-green-700 dark:text-green-400',
  consejeria:           'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  permiso_especial:     'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  otro:                 'bg-[var(--bg-hover)] text-[var(--text-3)]',
}

const STATUS_LABEL = { open: 'Abierto', in_progress: 'En proceso', closed: 'Cerrado' }
const STATUS_COLOR = {
  open:        'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  in_progress: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  closed:      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', color)}>{label}</span>
}

interface CloseModal { caseId: string; resolution: string }

export function TrabSocialPage() {
  const qc = useQueryClient()
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [closeModal, setCloseModal] = useState<CloseModal | null>(null)
  const [form, setForm] = useState({ employeeId: '', type: 'asistencia_medica' as SocialCaseType, title: '', description: '', date: new Date().toISOString().split('T')[0] })

  const { data: cases = [], isLoading } = useQuery({ queryKey: ['social-cases'], queryFn: socialCasesService.getAll, staleTime: 30_000 })
  const { data: empResult } = useQuery({ queryKey: ['employees-all'], queryFn: () => empleadosService.getAll({ limit: 9999 }), staleTime: 60_000 })
  const employees: any[] = (empResult as any)?.data ?? []
  const empMap = new Map(employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`]))

  const filtered = cases.filter((c) =>
    (filterStatus === 'all' || c.status === filterStatus) &&
    (filterType === 'all' || c.type === filterType)
  )

  const createM = useMutation({
    mutationFn: () => socialCasesService.create({ employeeId: form.employeeId, type: form.type, title: form.title, description: form.description, date: form.date }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['social-cases'] }); toast.success('Caso creado'); setShowCreate(false); setForm({ employeeId: '', type: 'asistencia_medica', title: '', description: '', date: new Date().toISOString().split('T')[0] }) },
    onError: () => toast.error('Error al crear caso'),
  })

  const updateM = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => socialCasesService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['social-cases'] }); toast.success('Caso actualizado'); setCloseModal(null) },
    onError: () => toast.error('Error al actualizar'),
  })

  const deleteM = useMutation({
    mutationFn: socialCasesService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['social-cases'] }); toast.success('Eliminado') },
    onError: () => toast.error('Error'),
  })

  const thCls = 'border-b border-[var(--border)] px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-3)]'
  const tdCls = 'border-b border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text-2)]'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 flex-wrap">
            {['all', 'open', 'in_progress', 'closed'].map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', filterStatus === s ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-hover)] text-[var(--text-2)]')}>
                {s === 'all' ? 'Todos' : STATUS_LABEL[s as keyof typeof STATUS_LABEL]}
              </button>
            ))}
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="text-xs border border-[var(--border)] rounded-lg px-2 py-1.5 bg-[var(--bg-surface)] text-[var(--text-2)] outline-none">
            <option value="all">Todos los tipos</option>
            {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90">
          <Plus size={14} /> Nuevo Caso
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[var(--text-3)]" size={20} /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-[var(--text-3)]">
          <Heart size={36} className="mb-2 opacity-30" />
          <div className="text-sm">No hay casos de trabajo social</div>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--bg-surface)]">
          <table className="w-full">
            <thead className="bg-[var(--bg-hover)]">
              <tr>{['Empleado', 'Tipo', 'Título', 'Fecha', 'Estado', 'Resolución', ''].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-[var(--bg-hover)/30] transition-colors">
                  <td className={cn(tdCls, 'font-medium text-[var(--text-1)]')}>{empMap.get(c.employeeId) || c.employeeId}</td>
                  <td className={tdCls}><Badge label={TYPE_LABEL[c.type as SocialCaseType] || c.type} color={TYPE_COLOR[c.type as SocialCaseType] || ''} /></td>
                  <td className={cn(tdCls, 'max-w-[180px]')}>
                    <div className="font-medium text-[var(--text-1)] truncate">{c.title}</div>
                    {c.description && <div className="text-xs text-[var(--text-3)] truncate">{c.description}</div>}
                  </td>
                  <td className={tdCls}>{c.date}</td>
                  <td className={tdCls}><Badge label={STATUS_LABEL[c.status] || c.status} color={STATUS_COLOR[c.status as keyof typeof STATUS_COLOR] || ''} /></td>
                  <td className={cn(tdCls, 'max-w-[160px] truncate text-[var(--text-3)]')}>{c.resolution || '—'}</td>
                  <td className={cn(tdCls, 'text-right')}>
                    <div className="flex items-center justify-end gap-1">
                      {c.status === 'open' && (
                        <button onClick={() => updateM.mutate({ id: c.id, data: { status: 'in_progress' } })} title="Marcar en proceso" className="p-1.5 rounded-lg hover:bg-blue-500/10 hover:text-blue-600 transition-colors text-[var(--text-3)] text-xs font-medium">En proceso</button>
                      )}
                      {c.status === 'in_progress' && (
                        <button onClick={() => setCloseModal({ caseId: c.id, resolution: '' })} title="Cerrar caso" className="p-1.5 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors text-[var(--text-3)] text-xs font-medium">Cerrar</button>
                      )}
                      <button onClick={() => { if (confirm('¿Eliminar este caso?')) deleteM.mutate(c.id) }} title="Eliminar" className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors text-[var(--text-3)]"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreate(false)}>
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] shadow-2xl w-full max-w-md mx-4 p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[var(--text-1)]">Nuevo Caso de Trabajo Social</h2>
              <button onClick={() => setShowCreate(false)} className="text-[var(--text-3)] hover:text-[var(--text-1)]"><X size={16} /></button>
            </div>
            {[
              { label: 'Empleado', el: <EmployeeSearchSelect value={form.employeeId} onChange={(id) => setForm({ ...form, employeeId: id })} employees={employees.filter((e) => e.status === 'active')} /> },
              { label: 'Tipo', el: <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as SocialCaseType })} className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-base)] text-[var(--text-1)] outline-none focus:border-[var(--accent)]">{Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select> },
              { label: 'Título', el: <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Descripción breve..." className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-base)] text-[var(--text-1)] outline-none focus:border-[var(--accent)]" /> },
              { label: 'Fecha', el: <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-base)] text-[var(--text-1)] outline-none focus:border-[var(--accent)]" /> },
              { label: 'Notas (opcional)', el: <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-base)] text-[var(--text-1)] outline-none focus:border-[var(--accent)] resize-none" /> },
            ].map(({ label, el }) => (
              <div key={label}><label className="text-xs text-[var(--text-3)] font-medium block mb-1">{label}</label>{el}</div>
            ))}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-2)] hover:bg-[var(--bg-hover)]">Cancelar</button>
              <button onClick={() => createM.mutate()} disabled={!form.employeeId || !form.title || createM.isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {createM.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Crear Caso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Case Modal */}
      {closeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setCloseModal(null)}>
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] shadow-2xl w-full max-w-md mx-4 p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[var(--text-1)]">Cerrar Caso</h2>
              <button onClick={() => setCloseModal(null)} className="text-[var(--text-3)] hover:text-[var(--text-1)]"><X size={16} /></button>
            </div>
            <div>
              <label className="text-xs text-[var(--text-3)] font-medium block mb-1">Resolución / Notas de cierre</label>
              <textarea
                value={closeModal.resolution}
                onChange={(e) => setCloseModal({ ...closeModal, resolution: e.target.value })}
                rows={3}
                placeholder="Describe cómo se resolvió el caso..."
                className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-base)] text-[var(--text-1)] outline-none focus:border-[var(--accent)] resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setCloseModal(null)} className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-2)] hover:bg-[var(--bg-hover)]">Cancelar</button>
              <button
                onClick={() => updateM.mutate({ id: closeModal.caseId, data: { status: 'closed', resolution: closeModal.resolution, resolvedDate: new Date().toISOString().split('T')[0] } })}
                disabled={updateM.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {updateM.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Cerrar Caso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
