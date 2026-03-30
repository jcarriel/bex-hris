import { useState, useEffect } from 'react'
import { useParams, useNavigate, useBlocker } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Pencil, UserX, Mail, Phone, MapPin,
  Calendar, Briefcase, DollarSign, Hash, Loader2, User,
} from 'lucide-react'
import { toast } from 'sonner'
import { empleadosService } from '@/services/empleados.service'
import { leavesService } from '@/services/leaves.service'
import type { Leave } from '@/services/leaves.service'
import { tasksService } from '@/services/tasks.service'
import { api } from '@/services/api'
import { Avatar } from '@/components/shared/Avatar'
import { Badge } from '@/components/shared/Badge'
import { EmpleadoForm } from '@/components/empleados/EmpleadoForm'
import { EmpleadoSheet } from '@/components/empleados/EmpleadoSheet'
import { ConfirmDialog } from '@/components/empleados/ConfirmDialog'
import type { Empleado, EmpleadoFormData } from '@/types/empleado.types'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { useAuthStore, hasAction } from '@/store/authStore'

// ─── Tenure helper ───────────────────────────────────────────────────────────
function tenureStr(hireDateStr: string): string {
  const [y, m, d] = hireDateStr.split('T')[0].split('-').map(Number)
  const hire = new Date(y, m - 1, d)
  const now = new Date()
  let years = now.getFullYear() - hire.getFullYear()
  let months = now.getMonth() - hire.getMonth()
  if (now.getDate() < hire.getDate()) months--
  if (months < 0) { years--; months += 12 }
  if (years === 0 && months === 0) return 'Menos de 1 mes'
  const parts: string[] = []
  if (years > 0) parts.push(`${years} año${years !== 1 ? 's' : ''}`)
  if (months > 0) parts.push(`${months} mes${months !== 1 ? 'es' : ''}`)
  return parts.join(', ')
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const statusMap: Record<Empleado['status'], { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  active:     { label: 'Activo',      variant: 'success' },
  inactive:   { label: 'Inactivo',    variant: 'neutral' },
}

const genderLabels: Record<string, string> = { M: 'Masculino', F: 'Femenino', O: 'Otro' }

const leaveTypeLabels: Record<string, string> = {
  vacation: 'Vacación',
  medical: 'Médico',
  maternity: 'Maternidad',
  personal: 'Personal',
}

// ─── Info row component ───────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | number | null }) {
  if (value == null || value === '') return null
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-[var(--bg-hover)]">
        <Icon size={14} className="text-[var(--text-3)]" />
      </div>
      <div>
        <p className="text-xs text-[var(--text-3)]">{label}</p>
        <p className="text-sm text-[var(--text-1)] font-medium">{value}</p>
      </div>
    </div>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
    >
      <h3 className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-3 pb-2 border-b"
        style={{ borderColor: 'var(--border-color)' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

// ─── Leaves tab ───────────────────────────────────────────────────────────────
function LeavesTab({ employeeId }: { employeeId: string }) {
  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ['leaves', 'employee', employeeId],
    queryFn: () => leavesService.getByEmployee(employeeId),
  })

  const approvedVacationDays = leaves
    .filter((l: Leave) => l.status === 'approved' && l.type === 'vacation')
    .reduce((sum: number, l: Leave) => sum + (l.days ?? 0), 0)

  const leaveStatusVariant = (status: Leave['status']): 'warning' | 'success' | 'danger' => {
    if (status === 'pending') return 'warning'
    if (status === 'approved') return 'success'
    return 'danger'
  }
  const leaveStatusLabel: Record<Leave['status'], string> = {
    pending: 'Pendiente',
    approved: 'Aprobado',
    rejected: 'Rechazado',
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={22} className="animate-spin text-[var(--text-3)]" />
      </div>
    )
  }

  return (
    <div>
      {/* Summary */}
      <div className="mb-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <Calendar size={15} className="text-[var(--accent)]" />
        <span className="text-sm text-[var(--text-2)]">Días de vacación aprobados:</span>
        <span className="text-sm font-bold text-[var(--text-1)]">{approvedVacationDays}</span>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-2)] uppercase tracking-wide">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-2)] uppercase tracking-wide">Desde</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-2)] uppercase tracking-wide">Hasta</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-2)] uppercase tracking-wide">Estado</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-2)] uppercase tracking-wide">Días</th>
            </tr>
          </thead>
          <tbody>
            {leaves.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-14 text-[var(--text-3)] text-sm">
                  Sin permisos o vacaciones registradas
                </td>
              </tr>
            ) : (
              leaves.map((leave: Leave) => (
                <tr key={leave.id} className="border-b transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ borderColor: 'var(--border-color)' }}>
                  <td className="px-4 py-3 text-[var(--text-1)]">
                    {leaveTypeLabels[leave.type] ?? leave.type}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-2)]">{formatDate(leave.startDate)}</td>
                  <td className="px-4 py-3 text-[var(--text-2)]">{formatDate(leave.endDate)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={leaveStatusVariant(leave.status)}>
                      {leaveStatusLabel[leave.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--text-1)] font-medium">{leave.days}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tasks tab ────────────────────────────────────────────────────────────────
function TasksTab({ employeeId }: { employeeId: string }) {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', 'employee', employeeId],
    queryFn: () => tasksService.getAll({ assignedTo: employeeId }),
  })

  const taskStatusVariant = (status: string): 'neutral' | 'info' | 'success' => {
    if (status === 'in_progress') return 'info'
    if (status === 'completed') return 'success'
    return 'neutral'
  }
  const taskStatusLabel: Record<string, string> = {
    pending: 'Pendiente',
    in_progress: 'En progreso',
    completed: 'Completado',
    cancelled: 'Cancelado',
    paused: 'Pausado',
    rejected: 'Rechazado',
  }
  const taskPriorityVariant = (priority: string): 'danger' | 'warning' | 'neutral' => {
    if (priority === 'high') return 'danger'
    if (priority === 'medium') return 'warning'
    return 'neutral'
  }
  const taskPriorityLabel: Record<string, string> = {
    high: 'Alta',
    medium: 'Media',
    low: 'Baja',
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={22} className="animate-spin text-[var(--text-3)]" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
            <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-2)] uppercase tracking-wide">Título</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-2)] uppercase tracking-wide">Estado</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-2)] uppercase tracking-wide">Prioridad</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-2)] uppercase tracking-wide">Vence</th>
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center py-14 text-[var(--text-3)] text-sm">
                Sin tareas asignadas
              </td>
            </tr>
          ) : (
            tasks.map((task) => (
              <tr key={task.id} className="border-b transition-colors hover:bg-[var(--bg-hover)]"
                style={{ borderColor: 'var(--border-color)' }}>
                <td className="px-4 py-3 text-[var(--text-1)] max-w-xs">
                  <span className="line-clamp-1">{task.title}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={taskStatusVariant(task.status)}>
                    {taskStatusLabel[task.status] ?? task.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={taskPriorityVariant(task.priority)}>
                    {taskPriorityLabel[task.priority] ?? task.priority}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-[var(--text-2)]">
                  {task.dueDate ? formatDate(task.dueDate) : '—'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Audit log types ──────────────────────────────────────────────────────────
interface AuditLog {
  id: string
  action: string
  entityType: string
  changes?: string
  performedBy?: string
  performedByName?: string
  createdAt: string
}

interface ChangeDiff { field: string; from: string; to: string }

const FIELD_LABELS: Record<string, string> = {
  baseSalary: 'Salario base', positionId: 'Cargo', departmentId: 'Centro de Costo',
  status: 'Estado', firstName: 'Nombre', lastName: 'Apellido',
  contractEndDate: 'Fin de contrato', hireDate: 'Fecha ingreso',
  contratoActual: 'Contrato actual', email: 'Email', phone: 'Teléfono',
  terminationDate: 'Fecha terminación', terminationReason: 'Motivo terminación',
}

function parseChanges(raw?: string): ChangeDiff[] {
  if (!raw) return []
  try {
    const obj = JSON.parse(raw)
    return Object.entries(obj).map(([field, val]: [string, any]) => {
      if (val && typeof val === 'object' && ('from' in val || 'to' in val)) {
        return { field: FIELD_LABELS[field] ?? field, from: String(val.from ?? '—'), to: String(val.to ?? '—') }
      }
      return { field: FIELD_LABELS[field] ?? field, from: '—', to: String(val ?? '—') }
    }).filter((c) => c.from !== c.to)
  } catch { return [] }
}

const ACTION_META: Record<string, { dot: string; label: string; symbol: string }> = {
  CREATE:  { dot: 'bg-emerald-500/15 text-emerald-500', label: 'Creado',       symbol: '+' },
  UPDATE:  { dot: 'bg-blue-500/15 text-blue-500',       label: 'Actualizado',  symbol: '✎' },
  DELETE:  { dot: 'bg-red-500/15 text-red-500',         label: 'Eliminado',    symbol: '✕' },
  APPROVE: { dot: 'bg-violet-500/15 text-violet-500',   label: 'Aprobado',     symbol: '✓' },
  REJECT:  { dot: 'bg-amber-500/15 text-amber-500',     label: 'Rechazado',    symbol: '✗' },
}

const ENTITY_LABELS: Record<string, string> = {
  employee: 'Empleado', leave: 'Permiso/Vacación', task: 'Tarea',
  payroll: 'Nómina', user: 'Usuario',
}

// ─── History tab ──────────────────────────────────────────────────────────────
function HistoryTab({ employeeId }: { employeeId: string }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', 'employee', employeeId],
    queryFn: async () => {
      const res = await api.get('/audit-logs', { params: { employeeId, limit: 50 } })
      return (res.data?.data ?? res.data ?? []) as AuditLog[]
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={22} className="animate-spin text-[var(--text-3)]" />
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 text-[var(--text-3)]">
        <span className="text-4xl mb-3 opacity-20">📋</span>
        <p className="text-sm">Sin historial registrado</p>
      </div>
    )
  }

  return (
    <div className="space-y-0 max-w-2xl">
      {logs.map((log, i) => {
        const meta = ACTION_META[log.action] ?? { dot: 'bg-[var(--bg-hover)] text-[var(--text-2)]', label: log.action, symbol: '•' }
        const diffs = parseChanges(log.changes)
        const isLast = i === logs.length - 1
        return (
          <div key={log.id} className="flex gap-4">
            {/* Timeline spine */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold', meta.dot)}>
                {meta.symbol}
              </div>
              {!isLast && <div className="w-px flex-1 my-1" style={{ backgroundColor: 'var(--border)' }} />}
            </div>

            {/* Content */}
            <div className={cn('flex-1 pb-5', isLast && 'pb-0')}>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-sm font-semibold text-[var(--text-1)]">
                  {meta.label} · {ENTITY_LABELS[log.entityType] ?? log.entityType}
                </span>
                <span className="text-[11px] text-[var(--text-3)]">{log.createdAt ? formatDate(log.createdAt) : '—'}</span>
              </div>
              {log.performedByName && (
                <p className="text-xs text-[var(--text-3)] mt-0.5">por {log.performedByName}</p>
              )}
              {diffs.length > 0 && (
                <div className="mt-2 space-y-1">
                  {diffs.map((c, j) => (
                    <div key={j} className="text-xs rounded-lg px-3 py-1.5 flex flex-wrap gap-2 items-center"
                      style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
                      <span className="text-[var(--text-3)] font-medium">{c.field}:</span>
                      {c.from !== '—' && <span className="line-through text-red-400">{c.from}</span>}
                      {c.from !== '—' && <span className="text-[var(--text-3)]">→</span>}
                      <span className="text-emerald-400 font-medium">{c.to}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function EmpleadoDetallePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const user    = useAuthStore((s) => s.user)
  const canView = hasAction(user?.permissions, 'empleados:ver', user?.rol)
  const canEdit = hasAction(user?.permissions, 'empleados:editar', user?.rol)

  // Redirect if user lacks view permission
  useEffect(() => {
    if (!canView) navigate('/empleados', { replace: true })
  }, [canView, navigate])

  const [editOpen, setEditOpen]             = useState(false)
  const [terminateOpen, setTerminateOpen]   = useState(false)
  const [terminateReason, setTerminateReason] = useState('')
  const [activeTab, setActiveTab] = useState<'info' | 'leaves' | 'tasks' | 'history'>('info')

  // ── Unsaved changes guard ─────────────────────────────────────────────────
  const blocker = useBlocker(editOpen)

  useEffect(() => {
    if (!editOpen) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [editOpen])

  // ── Fetch employee ────────────────────────────────────────────────────────
  const { data: empleado, isLoading, isError } = useQuery({
    queryKey: ['empleado', id],
    queryFn: () => empleadosService.getById(id!),
    enabled: !!id,
  })

  // ── Update ────────────────────────────────────────────────────────────────
  const { mutateAsync: updateEmpleado, isPending: updating } = useMutation({
    mutationFn: (data: Partial<EmpleadoFormData>) => empleadosService.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleado', id] })
      queryClient.invalidateQueries({ queryKey: ['empleados'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setEditOpen(false)
      toast.success('Empleado actualizado')
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e?.response?.data?.message ?? 'Error al actualizar')
    },
  })

  // ── Terminate ─────────────────────────────────────────────────────────────
  const { mutateAsync: terminate, isPending: terminating } = useMutation({
    mutationFn: () =>
      empleadosService.terminate(id!, {
        terminationDate: new Date().toISOString().split('T')[0],
        reason: terminateReason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleado', id] })
      queryClient.invalidateQueries({ queryKey: ['empleados'] })
      setTerminateOpen(false)
      toast.success('Empleado terminado')
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e?.response?.data?.message ?? 'Error al terminar empleado')
    },
  })

  // ── States ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-[var(--text-3)]" />
      </div>
    )
  }

  if (isError || !empleado) {
    return (
      <div className="text-center py-24">
        <p className="text-[var(--text-2)]">No se encontró el empleado.</p>
        <button onClick={() => navigate('/empleados')} className="mt-4 text-sm text-[var(--accent)] hover:opacity-80">
          ← Volver a empleados
        </button>
      </div>
    )
  }

  const status = statusMap[empleado.status]
  const fullName = `${empleado.firstName} ${empleado.lastName}`

  return (
    <div>
      {/* Back */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/empleados')}
          className="p-2 rounded-lg border border-[var(--border-color)] text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="text-xs text-[var(--text-3)]">Módulos / Empleados / {fullName}</div>
      </div>

      {/* Profile header card */}
      <div
        className="rounded-xl border p-6 mb-5 flex flex-wrap items-start gap-6"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        <Avatar name={fullName} src={empleado.profilePhoto} size="lg" />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-[var(--text-1)]">{fullName}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="text-sm text-[var(--text-2)]">
            {empleado.positionName ?? '—'} · {empleado.departmentName ?? '—'}
          </p>
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-[var(--text-3)]">
            {empleado.email && <span>{empleado.email}</span>}
            {empleado.cedula && <span>CI: {empleado.cedula}</span>}
            {empleado.laborName && <span>Labor: {empleado.laborName}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {canEdit && (
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-1)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <Pencil size={14} />
              Editar
            </button>
          )}
          {canEdit && empleado.status !== 'inactive' && (
            <button
              onClick={() => setTerminateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
            >
              <UserX size={14} />
              Terminar
            </button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 border-b border-[var(--border)]">
        {[
          { key: 'info', label: 'Información' },
          { key: 'leaves', label: 'Permisos y Vacaciones' },
          { key: 'tasks', label: 'Tareas' },
          { key: 'history', label: 'Historial' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === key
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-2)] hover:text-[var(--text-1)]',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Contact */}
          <Section title="Información de contacto">
            <InfoRow icon={Mail}  label="Email"      value={empleado.email} />
            <InfoRow icon={Phone} label="Teléfono"   value={empleado.phone} />
            <InfoRow icon={MapPin}label="Dirección"  value={empleado.direccion} />
            <InfoRow icon={MapPin}label="Procedencia" value={empleado.procedencia} />
          </Section>

          {/* Employment */}
          <Section title="Información laboral">
            <InfoRow icon={Briefcase} label="Centro de Costo"   value={empleado.departmentName} />
            <InfoRow icon={Briefcase} label="Cargo"             value={empleado.positionName} />
            <InfoRow icon={Briefcase} label="Labor"             value={empleado.laborName} />
            <InfoRow icon={Calendar}  label="Fecha de ingreso"  value={empleado.hireDate ? formatDate(empleado.hireDate) : undefined} />
            {empleado.hireDate && (
              <InfoRow icon={Calendar} label="Antigüedad" value={tenureStr(empleado.hireDate)} />
            )}
            <InfoRow icon={Hash}      label="Tipo de Contrato"  value={empleado.contratoTipo} />
            <InfoRow icon={Hash}      label="Contrato Actual"   value={empleado.contratoActual} />
            {empleado.contractEndDate && (
              <InfoRow icon={Calendar} label="Vencimiento contrato" value={formatDate(empleado.contractEndDate)} />
            )}
            <InfoRow icon={Hash} label="Afiliación" value={empleado.afiliacion} />
          </Section>

          {/* Personal */}
          <Section title="Datos personales">
            <InfoRow icon={Hash}     label="Cédula"              value={empleado.cedula} />
            <InfoRow icon={Calendar} label="Fecha de nacimiento" value={empleado.dateOfBirth ? formatDate(empleado.dateOfBirth) : undefined} />
            <InfoRow icon={User}     label="Género"              value={empleado.genero ? genderLabels[empleado.genero] : undefined} />
            <InfoRow icon={Hash}     label="Estado Civil"        value={empleado.estadoCivil} />
            <InfoRow icon={Hash}     label="Hijos"               value={empleado.hijos != null ? empleado.hijos : undefined} />
            <InfoRow icon={Hash}     label="Nivel Académico"     value={empleado.nivelAcademico} />
            <InfoRow icon={Hash}     label="Especialidad"        value={empleado.especialidad} />
            <InfoRow icon={Hash}     label="Pasaporte"           value={empleado.passport} />
          </Section>

          {/* Salary */}
          <Section title="Compensación">
            <InfoRow icon={DollarSign} label="Salario base"     value={formatCurrency(empleado.baseSalary)} />
            <InfoRow icon={Hash}       label="Banco"            value={empleado.bankName} />
            <InfoRow icon={Hash}       label="Número de cuenta" value={empleado.bankAccount} />
            <InfoRow icon={Hash}       label="Tipo de cuenta"   value={empleado.accountType} />
          </Section>

          {/* Termination info */}
          {empleado.status === 'inactive' && (
            <Section title="Baja / Inactivo">
              <InfoRow icon={Calendar} label="Fecha de baja" value={empleado.terminationDate ? formatDate(empleado.terminationDate) : undefined} />
              <InfoRow icon={Hash}     label="Motivo"               value={empleado.terminationReason} />
            </Section>
          )}
        </div>
      )}

      {activeTab === 'leaves' && <LeavesTab employeeId={id!} />}
      {activeTab === 'tasks'  && <TasksTab  employeeId={id!} />}
      {activeTab === 'history' && <HistoryTab employeeId={id!} />}

      {/* Edit sheet */}
      <EmpleadoSheet
        open={editOpen}
        title={`Editar: ${fullName}`}
        onClose={() => setEditOpen(false)}
      >
        <EmpleadoForm
          key={empleado.id}
          defaultValues={empleado}
          onSubmit={async (data) => { await updateEmpleado(data) }}
          onCancel={() => setEditOpen(false)}
          isLoading={updating}
        />
      </EmpleadoSheet>

      {/* Terminate confirm */}
      <ConfirmDialog
        open={terminateOpen}
        title={`¿Terminar a ${fullName}?`}
        description="El empleado será marcado como Terminado. Esta acción puede afectar nómina y otros módulos."
        confirmLabel="Sí, terminar"
        variant="danger"
        loading={terminating}
        onConfirm={() => terminate()}
        onCancel={() => setTerminateOpen(false)}
      />

      {/* Navigation blocker when edit sheet is open */}
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="¿Salir sin guardar?"
        description="Tienes cambios sin guardar en el formulario. Si sales ahora, se perderán."
        confirmLabel="Salir de todas formas"
        variant="danger"
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </div>
  )
}
