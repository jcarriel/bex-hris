import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { novedadesService, Novedad, NovedadType, NovedadStatus } from '@/services/novedades.service'
import { empleadosService } from '@/services/empleados.service'
import { Plus, X, Trash2, Loader2, MessageSquare, CheckCheck, Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatDateTime } from '@/lib/utils'
import { EmployeeSearchSelect } from '@/components/shared/EmployeeSearchSelect'
import { useAuthStore, hasAction } from '@/store/authStore'
import { useMayordomoScope } from '@/hooks/useMayordomoScope'
import { ConfirmDialog } from '@/components/empleados/ConfirmDialog'

// ─── Labels y colores ─────────────────────────────────────────────────────────

const TYPE_LABEL: Record<NovedadType, string> = {
  revision_nomina: 'Revisión de rol de pagos',
  reclamo:         'Reclamo',
  solicitud:       'Solicitud general',
  otro:            'Otro',
}

const TYPE_COLOR: Record<NovedadType, string> = {
  revision_nomina: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  reclamo:         'bg-red-500/15 text-red-700 dark:text-red-400',
  solicitud:       'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  otro:            'bg-gray-500/15 text-gray-600 dark:text-gray-400',
}

const STATUS_LABEL: Record<NovedadStatus, string> = {
  pending:     'Pendiente',
  in_progress: 'En proceso',
  resolved:    'Resuelto',
}

const STATUS_COLOR: Record<NovedadStatus, string> = {
  pending:     'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  in_progress: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  resolved:    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
}

const STATUS_ICON: Record<NovedadStatus, React.ReactNode> = {
  pending:     <Clock size={12} />,
  in_progress: <AlertCircle size={12} />,
  resolved:    <CheckCheck size={12} />,
}

function Badge({ label, color, icon }: { label: string; color: string; icon?: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', color)}>
      {icon}
      {label}
    </span>
  )
}

// ─── Formulario nueva novedad ─────────────────────────────────────────────────

interface CreateForm {
  employeeId: string
  type: NovedadType
  description: string
  date: string
}

const EMPTY_FORM: CreateForm = {
  employeeId: '',
  type: 'revision_nomina',
  description: '',
  date: new Date().toISOString().slice(0, 10),
}

// ─── Modal respuesta ──────────────────────────────────────────────────────────

interface RespondTarget {
  id: string
  description: string
  type: NovedadType
  employeeName: string
  currentResponse?: string
  currentStatus: NovedadStatus
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function NovedadesPage() {
  const qc = useQueryClient()
  const user      = useAuthStore((s) => s.user)
  const canCreate = hasAction(user?.permissions, 'bienestar:crear', user?.rol)
  const canEdit   = hasAction(user?.permissions, 'bienestar:editar', user?.rol)
  const canDelete = hasAction(user?.permissions, 'bienestar:eliminar', user?.rol)
  const { filterByEmployeeId } = useMayordomoScope('bienestar')

  const [filterType,     setFilterType]     = useState<string>('all')
  const [filterStatus,   setFilterStatus]   = useState<string>('all')
  const [filterEmployee, setFilterEmployee] = useState<string>('all')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo,   setFilterDateTo]   = useState<string>('')
  const [showCreate,     setShowCreate]     = useState(false)
  const [respondTarget,  setRespondTarget]  = useState<RespondTarget | null>(null)
  const [confirmDelete,  setConfirmDelete]  = useState<string | null>(null)
  const [form,           setForm]           = useState<CreateForm>(EMPTY_FORM)
  const [response,       setResponse]       = useState('')
  const [responseStatus, setResponseStatus] = useState<NovedadStatus>('in_progress')

  // Datos
  const { data: all = [], isLoading } = useQuery({
    queryKey: ['novedades'],
    queryFn: novedadesService.getAll,
    staleTime: 30_000,
  })

  const { data: empResult } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => empleadosService.getAll({ limit: 9999 }),
    staleTime: 60_000,
  })
  const employees: any[] = (empResult as any)?.data ?? []
  const empMap = new Map(employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`]))

  // Filtros
  const novedades = filterByEmployeeId(
    all.filter((n) =>
      (filterType     === 'all' || n.type     === filterType) &&
      (filterStatus   === 'all' || n.status   === filterStatus) &&
      (filterEmployee === 'all' || n.employeeId === filterEmployee) &&
      (!filterDateFrom || n.date >= filterDateFrom) &&
      (!filterDateTo   || n.date <= filterDateTo)
    )
  )

  // Mutaciones
  const createM = useMutation({
    mutationFn: () => novedadesService.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['novedades'] })
      toast.success('Novedad registrada')
      setShowCreate(false)
      setForm(EMPTY_FORM)
    },
    onError: () => toast.error('Error al registrar novedad'),
  })

  const updateM = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: NovedadStatus; response?: string } }) =>
      novedadesService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['novedades'] })
      toast.success('Novedad actualizada')
      setRespondTarget(null)
      setResponse('')
    },
    onError: () => toast.error('Error al actualizar novedad'),
  })

  const deleteM = useMutation({
    mutationFn: novedadesService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['novedades'] }); toast.success('Eliminada') },
    onError: () => toast.error('Error al eliminar'),
  })

  const thCls = 'border-b border-[var(--border)] px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-3)]'
  const tdCls = 'border-b border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text-2)]'

  return (
    <div className="space-y-4">
      {/* Filtros + botón */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tipo */}
          <div className="flex gap-1 flex-wrap">
            {(['all', ...Object.keys(TYPE_LABEL)] as string[]).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  filterType === t
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-hover)] text-[var(--text-2)]',
                )}
              >
                {t === 'all' ? 'Todos los tipos' : TYPE_LABEL[t as NovedadType]}
              </button>
            ))}
          </div>
          {/* Estado */}
          <div className="flex gap-1">
            {(['all', 'pending', 'in_progress', 'resolved'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  filterStatus === s
                    ? 'bg-[var(--text-2)] text-[var(--bg-surface)]'
                    : 'bg-[var(--bg-hover)] text-[var(--text-3)]',
                )}
              >
                {s === 'all' ? 'Todos' : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          {/* Empleado */}
          <div className="flex items-center gap-2">
            <EmployeeSearchSelect
              value={filterEmployee === 'all' ? '' : filterEmployee}
              onChange={(id) => setFilterEmployee(id || 'all')}
              employees={employees.filter((e) => e.status === 'active')}
              placeholder="Filtrar por empleado..."
              className="w-52"
            />
            {filterEmployee !== 'all' && (
              <button
                onClick={() => setFilterEmployee('all')}
                className="text-xs text-[var(--text-3)] hover:text-[var(--text-1)] underline"
              >
                Ver todos
              </button>
            )}
          </div>
          {/* Rango de fechas */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="h-8 px-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-1)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              title="Desde"
            />
            <span className="text-xs text-[var(--text-3)]">—</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="h-8 px-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-1)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              title="Hasta"
            />
            {(filterDateFrom || filterDateTo) && (
              <button
                onClick={() => { setFilterDateFrom(''); setFilterDateTo('') }}
                className="text-[var(--text-3)] hover:text-[var(--text-1)]"
                title="Limpiar fechas"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90"
          >
            <Plus size={14} /> Nueva Novedad
          </button>
        )}
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-[var(--text-3)]" size={20} />
        </div>
      ) : novedades.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-[var(--text-3)]">
          <MessageSquare size={36} className="mb-2 opacity-30" />
          <div className="text-sm">No hay novedades registradas</div>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--bg-surface)]">
          <table className="w-full">
            <thead className="bg-[var(--bg-hover)]">
              <tr>
                {['Fecha', 'Empleado', 'Tipo', 'Descripción', 'Estado', 'Respuesta', ''].map((h) => (
                  <th key={h} className={thCls}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {novedades.map((n) => (
                <tr key={n.id} className="hover:bg-[var(--bg-hover)/30] transition-colors">
                  <td className={cn(tdCls, 'whitespace-nowrap')}>{n.date}</td>
                  <td className={cn(tdCls, 'font-medium text-[var(--text-1)] whitespace-nowrap')}>
                    {empMap.get(n.employeeId) || n.employeeId}
                  </td>
                  <td className={tdCls}>
                    <Badge label={TYPE_LABEL[n.type] || n.type} color={TYPE_COLOR[n.type] || ''} />
                  </td>
                  <td className={cn(tdCls, 'max-w-[220px]')}>
                    <span className="line-clamp-2 text-[var(--text-2)]">{n.description}</span>
                  </td>
                  <td className={tdCls}>
                    <Badge
                      label={STATUS_LABEL[n.status] || n.status}
                      color={STATUS_COLOR[n.status] || ''}
                      icon={STATUS_ICON[n.status]}
                    />
                  </td>
                  <td className={cn(tdCls, 'max-w-[200px]')}>
                    {n.response ? (
                      <div className="space-y-0.5">
                        <p className="line-clamp-2 text-xs text-[var(--text-2)]">{n.response}</p>
                        {n.respondedDate && (
                          <p className="text-[10px] text-[var(--text-3)]">{formatDateTime(n.respondedDate)}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-[var(--text-3)]">—</span>
                    )}
                  </td>
                  <td className={cn(tdCls, 'text-right')}>
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && n.status !== 'resolved' && (
                        <button
                          onClick={() => {
                            setRespondTarget({
                              id: n.id,
                              description: n.description,
                              type: n.type,
                              employeeName: empMap.get(n.employeeId) || n.employeeId,
                              currentResponse: n.response,
                              currentStatus: n.status,
                            })
                            setResponse(n.response || '')
                            setResponseStatus(n.status === 'pending' ? 'in_progress' : n.status)
                          }}
                          title="Responder"
                          className="p-1.5 rounded-lg hover:bg-blue-500/10 hover:text-blue-600 transition-colors text-[var(--text-3)]"
                        >
                          <MessageSquare size={13} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setConfirmDelete(n.id)}
                          title="Eliminar"
                          className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors text-[var(--text-3)]"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Nueva novedad */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] shadow-2xl w-full max-w-md mx-4 p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[var(--text-1)]">Nueva Novedad</h2>
              <button onClick={() => setShowCreate(false)} className="text-[var(--text-3)] hover:text-[var(--text-1)]">
                <X size={16} />
              </button>
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
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as NovedadType })}
                className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-base)] text-[var(--text-1)] outline-none focus:border-[var(--accent)]"
              >
                {(Object.entries(TYPE_LABEL) as [NovedadType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-[var(--text-3)] font-medium block mb-1">Fecha</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-base)] text-[var(--text-1)] outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="text-xs text-[var(--text-3)] font-medium block mb-1">Descripción / Motivo</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Describa la novedad o solicitud..."
                className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-base)] text-[var(--text-1)] outline-none focus:border-[var(--accent)] resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-2)] hover:bg-[var(--bg-hover)]"
              >
                Cancelar
              </button>
              <button
                onClick={() => createM.mutate()}
                disabled={!form.employeeId || !form.description || createM.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {createM.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Responder / actualizar estado */}
      {respondTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setRespondTarget(null)}
        >
          <div
            className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] shadow-2xl w-full max-w-md mx-4 p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[var(--text-1)]">Responder novedad</h2>
              <button onClick={() => setRespondTarget(null)} className="text-[var(--text-3)] hover:text-[var(--text-1)]">
                <X size={16} />
              </button>
            </div>

            {/* Info de la novedad */}
            <div className="rounded-lg bg-[var(--bg-hover)] p-3 space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Badge label={TYPE_LABEL[respondTarget.type]} color={TYPE_COLOR[respondTarget.type]} />
                <span className="font-medium text-[var(--text-1)]">{respondTarget.employeeName}</span>
              </div>
              <p className="text-[var(--text-2)] text-xs leading-relaxed">{respondTarget.description}</p>
            </div>

            <div>
              <label className="text-xs text-[var(--text-3)] font-medium block mb-1">Estado</label>
              <select
                value={responseStatus}
                onChange={(e) => setResponseStatus(e.target.value as NovedadStatus)}
                className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-base)] text-[var(--text-1)] outline-none focus:border-[var(--accent)]"
              >
                <option value="in_progress">En proceso</option>
                <option value="resolved">Resuelto</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-[var(--text-3)] font-medium block mb-1">Respuesta / Comentario</label>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={3}
                placeholder="Escribe la respuesta o acción tomada..."
                className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-base)] text-[var(--text-1)] outline-none focus:border-[var(--accent)] resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setRespondTarget(null)}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-2)] hover:bg-[var(--bg-hover)]"
              >
                Cancelar
              </button>
              <button
                onClick={() =>
                  updateM.mutate({ id: respondTarget.id, data: { status: responseStatus, response } })
                }
                disabled={updateM.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {updateM.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar novedad"
        description="¿Estás seguro de que deseas eliminar esta novedad?"
        confirmLabel="Eliminar"
        loading={deleteM.isPending}
        onConfirm={() => { deleteM.mutate(confirmDelete!); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
