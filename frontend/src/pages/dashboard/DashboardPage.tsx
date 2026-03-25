import { Users, DollarSign, AlertCircle, FileWarning, CheckSquare } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { KpiCard } from '@/components/shared/KpiCard'
import { Badge } from '@/components/shared/Badge'
import { Avatar } from '@/components/shared/Avatar'
import { cn, formatCurrency } from '@/lib/utils'
import { dashboardService, DashboardStats } from '@/services/dashboard.service'
import { eventsService, CalendarEvent } from '@/services/events.service'
import { tasksService } from '@/services/tasks.service'

// ─── Status mapping ────────────────────────────────────────────────────────────
const statusVariant: Record<string, 'success' | 'info' | 'warning' | 'neutral'> = {
  active:     'success',
  on_leave:   'info',
  terminated: 'neutral',
  inactive:   'neutral',
}

const statusLabel: Record<string, string> = {
  active:     'Activo',
  on_leave:   'Licencia',
  terminated: 'Terminado',
  inactive:   'Inactivo',
}

// ─── Activity mapping ──────────────────────────────────────────────────────────
const entityLabels: Record<string, string> = {
  employee:   'empleado',
  payroll:    'nómina',
  leave:      'solicitud de ausencia',
  event:      'evento',
  user:       'usuario',
  department: 'departamento',
  position:   'posición',
  task:       'tarea',
}

const actionColors: Record<string, string> = {
  CREATE: 'bg-emerald-400',
  UPDATE: 'bg-blue-400',
  DELETE: 'bg-red-400',
  APPROVE:'bg-violet-400',
  REJECT: 'bg-amber-400',
}

const actionLabels: Record<string, string> = {
  CREATE: 'creado',
  UPDATE: 'actualizado',
  DELETE: 'eliminado',
  APPROVE:'aprobado',
  REJECT: 'rechazado',
}

function activityText(action: string, entityType: string): string {
  const entity = entityLabels[entityType] ?? entityType
  const verb   = actionLabels[action]    ?? action.toLowerCase()
  const cap    = entity.charAt(0).toUpperCase() + entity.slice(1)
  return `${cap} ${verb}`
}

// ─── Fallback mock data ────────────────────────────────────────────────────────
const MOCK_STATS: DashboardStats = {
  totalEmployees:    248,
  newThisMonth:      3,
  pendingLeaves:     7,
  payrollSum:        284000,
  expiringContracts: 2,
  byDepartment: [
    { name: 'TI',        value: 58 },
    { name: 'Ventas',    value: 47 },
    { name: 'Ops',       value: 39 },
    { name: 'Finanzas',  value: 28 },
    { name: 'Marketing', value: 22 },
  ],
  recentEmployees: [
    { id: '1', firstName: 'Ana',    lastName: 'García',    status: 'active',   positionName: 'Desarrolladora Sr.',  departmentName: 'TI'       },
    { id: '2', firstName: 'Carlos', lastName: 'Martínez',  status: 'active',   positionName: 'Analista Financiero', departmentName: 'Finanzas' },
    { id: '3', firstName: 'María',  lastName: 'Rodríguez', status: 'on_leave', positionName: 'Diseñadora UX',       departmentName: 'Marketing'},
    { id: '4', firstName: 'Luis',   lastName: 'Pérez',     status: 'active',   positionName: 'Gerente de Ventas',   departmentName: 'Ventas'   },
  ],
  recentActivity: [
    { action: 'UPDATE', entityType: 'employee', createdAt: new Date(Date.now() - 5  * 60000).toISOString(), userName: 'Admin' },
    { action: 'CREATE', entityType: 'payroll',  createdAt: new Date(Date.now() - 22 * 60000).toISOString(), userName: 'Admin' },
    { action: 'APPROVE',entityType: 'leave',    createdAt: new Date(Date.now() - 60 * 60000).toISOString(), userName: 'Admin' },
  ],
}

// ─── Helper: days until a date ─────────────────────────────────────────────────
function daysUntil(dateStr: string): number {
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
  const then = new Date(y, m - 1, d)
  return Math.round((then.getTime() - now.getTime()) / 86400000)
}

function eventColor(days: number): string {
  if (days <= 3)  return 'bg-red-500/15 text-red-400'
  if (days <= 7)  return 'bg-amber-500/15 text-amber-400'
  if (days <= 14) return 'bg-blue-500/15 text-blue-400'
  return 'bg-emerald-500/15 text-emerald-400'
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'Ahora'
  if (m < 60) return `Hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `Hace ${h} h`
  return `Hace ${Math.floor(h / 24)} d`
}

// ─── Custom tooltip for bar chart ─────────────────────────────────────────────
function BarTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm shadow-xl">
      <p className="text-[var(--text-2)] mb-0.5">{label}</p>
      <p className="text-[var(--text-1)] font-semibold">{payload[0].value} empleados</p>
    </div>
  )
}

// ─── Card wrapper ──────────────────────────────────────────────────────────────
function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn('rounded-xl border', className)}
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      {children}
    </div>
  )
}

function CardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
      <h3 className="text-sm font-semibold text-[var(--text-1)]">{title}</h3>
      {action}
    </div>
  )
}

// ─── Loading skeleton ──────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">
        <div className="h-64 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]" />
        <div className="h-64 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-56 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]" />
        ))}
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const navigate = useNavigate()

  const {
    data: stats,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.getStats,
    staleTime: 60000,
  })

  const { data: upcomingEvents = [] } = useQuery<CalendarEvent[]>({
    queryKey: ['events-upcoming'],
    queryFn:  () => eventsService.getUpcoming(30),
    staleTime: 120000,
  })

  const { data: myTasksRaw = [] } = useQuery({
    queryKey: ['my-tasks-dash'],
    queryFn:  tasksService.getMyTasks,
    staleTime: 60000,
  })
  const pendingTasks = (myTasksRaw as any[]).filter((t: any) => t.status !== 'completed' && t.status !== 'rejected')

  if (isLoading) return <LoadingSkeleton />

  // On error fall back to mock data so the page still renders
  const s: DashboardStats = (isError || !stats) ? MOCK_STATS : stats

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Total empleados"
          value={String(s.totalEmployees)}
          icon={Users}
          trend={`+${s.newThisMonth}`}
          trendLabel={`+${s.newThisMonth} incorporaciones este mes`}
          color="blue"
        />
        <KpiCard
          title="Nómina mensual"
          value={formatCurrency(s.payrollSum)}
          icon={DollarSign}
          trendLabel="Total nómina del mes"
          color="green"
        />
        <KpiCard
          title="Ausencias pendientes"
          value={String(s.pendingLeaves)}
          icon={AlertCircle}
          trendLabel="Solicitudes por aprobar"
          color="amber"
        />
        <KpiCard
          title="Contratos por vencer"
          value={String(s.expiringContracts)}
          icon={FileWarning}
          trendLabel="Próximos 30 días"
          color="purple"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">
        {/* Employees table */}
        <Card>
          <CardHeader
            title="Empleados recientes"
            action={
              <button
                onClick={() => navigate('/empleados')}
                className="text-xs text-[var(--accent)] hover:opacity-80 transition-opacity font-medium"
              >
                Ver todos →
              </button>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {['Empleado', 'Cargo', 'Departamento', 'Estado'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-xs font-medium text-[var(--text-2)] uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.recentEmployees.map((emp) => {
                  const fullName = `${emp.firstName} ${emp.lastName}`
                  return (
                    <tr
                      key={emp.id}
                      onClick={() => navigate(`/empleados/${emp.id}`)}
                      className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={fullName} size="sm" />
                          <span className="font-medium text-[var(--text-1)]">{fullName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[var(--text-2)]">{emp.positionName}</td>
                      <td className="px-5 py-3 text-[var(--text-2)]">{emp.departmentName}</td>
                      <td className="px-5 py-3">
                        <Badge variant={statusVariant[emp.status] ?? 'neutral'}>
                          {statusLabel[emp.status] ?? emp.status}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Activity feed */}
        <Card>
          <CardHeader title="Actividad reciente" />
          <div className="p-4 space-y-1">
            {s.recentActivity.length === 0 ? (
              <p className="text-sm text-[var(--text-3)] py-4 text-center">Sin actividad reciente</p>
            ) : (
              s.recentActivity.map((item, idx) => (
                <div key={idx} className="flex gap-3 px-2 py-2.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
                  <div className="flex-shrink-0 mt-1.5">
                    <span className={cn('w-2 h-2 rounded-full block', actionColors[item.action] ?? 'bg-gray-400')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-1)] leading-snug">
                      {activityText(item.action, item.entityType)}
                      {item.userName ? ` · ${item.userName}` : ''}
                    </p>
                    <p className="text-xs text-[var(--text-3)] mt-0.5">{timeAgo(item.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4">
        {/* Bar chart by department */}
        <Card>
          <CardHeader title="Empleados por departamento" />
          <div className="p-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.byDepartment} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={65}
                  tick={{ fontSize: 12, fill: 'var(--text-2)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<BarTooltip />} cursor={{ fill: 'var(--bg-hover)' }} />
                <Bar dataKey="value" fill="#4f7cff" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Expiring contracts info card */}
        <Card>
          <CardHeader title="Contratos por vencer" />
          <div className="p-5 flex flex-col items-center justify-center h-56 gap-3">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold"
              style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              {s.expiringContracts}
            </div>
            <p className="text-sm text-[var(--text-2)] text-center">
              {s.expiringContracts === 0
                ? 'No hay contratos por vencer en los próximos 30 días'
                : `contrato${s.expiringContracts > 1 ? 's' : ''} vence${s.expiringContracts === 1 ? '' : 'n'} en los próximos 30 días`}
            </p>
            {s.expiringContracts > 0 && (
              <button
                onClick={() => navigate('/empleados?filter=expiring')}
                className="text-xs text-[var(--accent)] hover:opacity-80 font-medium"
              >
                Ver empleados →
              </button>
            )}
          </div>
        </Card>

        {/* My pending tasks */}
        <Card>
          <CardHeader
            title="Mis tareas"
            action={
              <button onClick={() => navigate('/tareas')} className="text-xs text-[var(--accent)] hover:opacity-80 transition-opacity font-medium">
                Ver todas →
              </button>
            }
          />
          <div className="p-4 space-y-1">
            {pendingTasks.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-2 text-[var(--text-3)]">
                <CheckSquare size={20} className="opacity-30" />
                <span className="text-xs">Sin tareas pendientes</span>
              </div>
            ) : (
              pendingTasks.slice(0, 5).map((task: any) => (
                <div
                  key={task.id}
                  onClick={() => navigate('/tareas')}
                  className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                >
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0',
                    task.status === 'in_progress' ? 'bg-blue-400' :
                    task.status === 'paused' ? 'bg-amber-400' : 'bg-[var(--text-3)]',
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-1)] truncate leading-snug">{task.title}</p>
                    {task.dueDate && (
                      <p className="text-[11px] text-[var(--text-3)]">{task.dueDate.slice(0, 10)}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Upcoming events */}
        <Card>
          <CardHeader title="Próximos eventos" />
          <div className="p-4 space-y-2">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-[var(--text-3)] py-6 text-center">Sin eventos próximos</p>
            ) : (
              upcomingEvents.slice(0, 5).map((ev, i) => {
                const days = ev.daysAway ?? daysUntil(ev.eventDate)
                return (
                  <div
                    key={ev.id ?? i}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <span className="text-sm text-[var(--text-1)] truncate flex-1 mr-2">{ev.title}</span>
                    <span className={cn('text-xs font-medium px-2 py-1 rounded-md flex-shrink-0', eventColor(days))}>
                      {days <= 0 ? 'Hoy' : `${days}d`}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
