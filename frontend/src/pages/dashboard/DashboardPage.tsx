import {
  Users, DollarSign, AlertCircle, FileWarning, CheckSquare, MessageSquare,
  ChevronRight, Calendar, TrendingUp, WifiOff,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { KpiCard } from '@/components/shared/KpiCard'
import { Badge } from '@/components/shared/Badge'
import { Avatar } from '@/components/shared/Avatar'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn, formatCurrency } from '@/lib/utils'
import { dashboardService, DashboardStats } from '@/services/dashboard.service'
import { eventsService, CalendarEvent } from '@/services/events.service'
import { tasksService } from '@/services/tasks.service'
import { useAuthStore } from '@/store/authStore'

// ─── Greeting ─────────────────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12)  return 'Buenos días'
  if (h >= 12 && h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTH_NAMES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function formatDate(): string {
  const d = new Date()
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

// ─── Status mapping ────────────────────────────────────────────────────────────
const statusVariant: Record<string, 'success' | 'info' | 'warning' | 'neutral'> = {
  active:     'success',
  inactive:   'neutral',
}

const statusLabel: Record<string, string> = {
  active:     'Activo',
  inactive:   'Inactivo',
}

// ─── Activity mapping ──────────────────────────────────────────────────────────
const entityLabels: Record<string, string> = {
  employee:   'empleado',
  payroll:    'nómina',
  leave:      'solicitud de ausencia',
  novedad:    'novedad',
  event:      'evento',
  user:       'usuario',
  department: 'departamento',
  position:   'posición',
  task:       'tarea',
}

const actionColors: Record<string, string> = {
  CREATE:    'bg-emerald-400',
  UPDATE:    'bg-blue-400',
  DELETE:    'bg-red-400',
  APPROVE:   'bg-violet-400',
  REJECT:    'bg-amber-400',
  TERMINATE: 'bg-orange-400',
  RESOLVE:   'bg-teal-400',
}

const actionLabels: Record<string, string> = {
  CREATE:    'creado',
  UPDATE:    'actualizado',
  DELETE:    'eliminado',
  APPROVE:   'aprobado',
  REJECT:    'rechazado',
  TERMINATE: 'desvinculado',
  RESOLVE:   'resuelto',
}

function activityText(action: string, entityType: string): string {
  const entity = entityLabels[entityType] ?? entityType
  const verb   = actionLabels[action]    ?? action.toLowerCase()
  const cap    = entity.charAt(0).toUpperCase() + entity.slice(1)
  return `${cap} ${verb}`
}

// ─── Fallback mock data ────────────────────────────────────────────────────────
const MOCK_STATS: DashboardStats = {
  totalEmployees:       248,
  statusBreakdown:      { active: 230, inactive: 10 },
  newThisMonth:         3,
  pendingLeaves:        7,
  pendingNovedades:     4,
  payrollSum:           284000,
  expiringContracts:    2,
  expiringContractsList:[],
  byDepartment: [
    { name: 'TI', value: 58 }, { name: 'Ventas', value: 47 },
    { name: 'Ops', value: 39 }, { name: 'Finanzas', value: 28 },
    { name: 'Marketing', value: 22 },
  ],
  recentEmployees: [
    { id: '1', firstName: 'Ana',    lastName: 'García',    status: 'active',   positionName: 'Desarrolladora Sr.', departmentName: 'TI' },
    { id: '2', firstName: 'Carlos', lastName: 'Martínez',  status: 'active',   positionName: 'Analista',           departmentName: 'Finanzas' },
    { id: '3', firstName: 'María',  lastName: 'Rodríguez', status: 'on_leave', positionName: 'Diseñadora UX',      departmentName: 'Marketing' },
  ],
  recentActivity: [
    { action: 'UPDATE', entityType: 'employee', createdAt: new Date(Date.now() - 5  * 60000).toISOString(), userName: 'Admin' },
    { action: 'CREATE', entityType: 'payroll',  createdAt: new Date(Date.now() - 22 * 60000).toISOString(), userName: 'Admin' },
    { action: 'APPROVE',entityType: 'leave',    createdAt: new Date(Date.now() - 60 * 60000).toISOString(), userName: 'Admin' },
  ],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysUntil(dateStr: string): number {
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
  return Math.round((new Date(y, m - 1, d).getTime() - now.getTime()) / 86400000)
}

function eventColor(days: number): string {
  if (days <= 3)  return 'bg-red-500/15 text-red-400'
  if (days <= 7)  return 'bg-amber-500/15 text-amber-400'
  if (days <= 14) return 'bg-blue-500/15 text-blue-400'
  return 'bg-emerald-500/15 text-emerald-400'
}

function contractColor(days: number): string {
  if (days <= 7)  return 'text-red-500 bg-red-500/10'
  if (days <= 15) return 'text-amber-500 bg-amber-500/10'
  return 'text-emerald-600 bg-emerald-500/10'
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

// ─── Custom Pie tooltip ───────────────────────────────────────────────────────
function PieTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm shadow-xl">
      <p className="font-medium text-[var(--text-1)]">{payload[0].name}</p>
      <p className="text-[var(--text-2)]">{payload[0].value} empleados</p>
    </div>
  )
}

// ─── Card wrapper ──────────────────────────────────────────────────────────────
function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-xl border border-[var(--border)] bg-[var(--bg-card)]', className)}>
      {children}
    </div>
  )
}

function CardHeader({ title, icon: Icon, action }: { title: string; icon?: React.ElementType; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} className="text-[var(--accent)]" />}
        <h3 className="text-sm font-semibold text-[var(--text-1)]">{title}</h3>
      </div>
      {action}
    </div>
  )
}

function LinkBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-0.5 text-xs text-[var(--accent)] hover:opacity-80 font-medium transition-opacity"
    >
      {label} <ChevronRight size={12} />
    </button>
  )
}

// ─── Loading skeleton ──────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-20 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]" />
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]" />)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">
        <div className="h-64 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]" />
        <div className="h-64 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-56 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]" />)}
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.getStats,
    staleTime: 0,
  })

  const { data: upcomingEvents = [] } = useQuery<CalendarEvent[]>({
    queryKey: ['events-upcoming'],
    queryFn: () => eventsService.getUpcoming(30),
    staleTime: 120000,
  })

  const { data: myTasksRaw = [] } = useQuery({
    queryKey: ['my-tasks-dash'],
    queryFn: tasksService.getMyTasks,
    staleTime: 60000,
  })
  const pendingTasks = (myTasksRaw as any[]).filter((t: any) => t.status !== 'completed' && t.status !== 'rejected')

  if (isLoading) return <LoadingSkeleton />

  const s: DashboardStats = stats ?? MOCK_STATS

  const activeRatio = s.totalEmployees > 0
    ? Math.round((s.statusBreakdown.active / s.totalEmployees) * 100)
    : 0

  const donutData = [
    { name: 'Activos',   value: s.statusBreakdown.active,     color: '#48bb78' },
    { name: 'Inactivos', value: s.statusBreakdown.inactive,   color: '#94a3b8' },
    { name: 'Licencia',  value: s.statusBreakdown.on_leave,   color: '#f59e0b' },
  ].filter((d) => d.value > 0)

  const firstName = user?.nombre?.split(' ')[0] ?? 'Usuario'

  return (
    <div className="space-y-5">
      {isError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm">
          <WifiOff size={16} className="flex-shrink-0" />
          <span>No se pudo conectar con el servidor. Los datos mostrados son de ejemplo y no reflejan información real.</span>
        </div>
      )}

      {/* ── Greeting banner ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {firstName[0]}
            </div>
            <div>
              <p className="text-xs text-[var(--text-3)] font-medium">{formatDate()}</p>
              <h2 className="text-lg font-bold text-[var(--text-1)]">
                {getGreeting()}, {firstName} 👋
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {s.pendingLeaves > 0 && (
              <button
                onClick={() => navigate('/bienestar/permisos')}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
              >
                <AlertCircle size={12} />
                {s.pendingLeaves} ausencia{s.pendingLeaves !== 1 ? 's' : ''} pendiente{s.pendingLeaves !== 1 ? 's' : ''}
              </button>
            )}
            {s.pendingNovedades > 0 && (
              <button
                onClick={() => navigate('/bienestar/novedades')}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
              >
                <MessageSquare size={12} />
                {s.pendingNovedades} novedad{s.pendingNovedades !== 1 ? 'es' : ''} sin responder
              </button>
            )}
            {s.expiringContracts > 0 && (
              <button
                onClick={() => navigate('/empleados')}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors"
              >
                <FileWarning size={12} />
                {s.expiringContracts} contrato{s.expiringContracts !== 1 ? 's' : ''} por vencer
              </button>
            )}
          </div>
        </div>
        {/* Thin accent line at bottom */}
        <div className="h-0.5 bg-gradient-to-r from-[var(--accent)] via-emerald-300 to-transparent opacity-60" />
      </div>

      {/* ── KPI grid ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <KpiCard
          title="Total empleados"
          value={s.totalEmployees}
          icon={Users}
          trend={s.newThisMonth > 0 ? `+${s.newThisMonth} este mes` : undefined}
          color="green"
          progress={activeRatio}
          trendLabel={`${activeRatio}% activos`}
          onClick={() => navigate('/empleados')}
        />
        <KpiCard
          title="Nómina mensual"
          value={formatCurrency(s.payrollSum)}
          icon={DollarSign}
          trendLabel="Total del mes anterior"
          color="blue"
          onClick={() => navigate('/nomina')}
        />
        <KpiCard
          title="Ausencias pendientes"
          value={s.pendingLeaves}
          icon={AlertCircle}
          trendLabel="Solicitudes por aprobar"
          color="amber"
          onClick={() => navigate('/bienestar/permisos')}
        />
        <KpiCard
          title="Novedades sin responder"
          value={s.pendingNovedades}
          icon={MessageSquare}
          trendLabel="Requieren atención"
          color="rose"
          onClick={() => navigate('/bienestar/novedades')}
        />
        <KpiCard
          title="Contratos por vencer"
          value={s.expiringContracts}
          icon={FileWarning}
          trendLabel="Próximos 30 días"
          color="purple"
          onClick={() => navigate('/empleados')}
        />
      </div>

      {/* ── Main grid: tabla empleados + actividad ────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        {/* Recent employees */}
        <Card>
          <CardHeader
            title="Empleados recientes"
            icon={Users}
            action={<LinkBtn label="Ver todos" onClick={() => navigate('/empleados')} />}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {['Empleado', 'Cargo', 'Departamento', 'Estado'].map((h) => (
                    <th key={h} className="text-left px-5 py-2.5 text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.recentEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState
                        icon={Users}
                        title="Sin empleados registrados"
                        description="Agrega tu primer empleado para comenzar"
                        action={{ label: '+ Nuevo empleado', onClick: () => navigate('/empleados') }}
                      />
                    </td>
                  </tr>
                ) : s.recentEmployees.map((emp) => {
                  const fullName = `${emp.firstName} ${emp.lastName}`
                  return (
                    <tr
                      key={emp.id}
                      onClick={() => navigate(`/empleados/${emp.id}`)}
                      className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={fullName} size="sm" />
                          <span className="font-medium text-[var(--text-1)] text-sm">{fullName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-[var(--text-2)]">{emp.positionName || '—'}</td>
                      <td className="px-5 py-3 text-sm text-[var(--text-2)]">{emp.departmentName || '—'}</td>
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
          <CardHeader title="Actividad reciente" icon={TrendingUp} />
          <div className="p-3 space-y-0.5">
            {s.recentActivity.length === 0 ? (
              <EmptyState icon={TrendingUp} title="Sin actividad reciente" />
            ) : s.recentActivity.map((item, idx) => (
              <div key={idx} className="flex gap-3 px-2 py-2.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
                <span className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', actionColors[item.action] ?? 'bg-gray-400')} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-1)] leading-snug">
                    {activityText(item.action, item.entityType)}
                    {item.userName ? <span className="text-[var(--text-3)]"> · {item.userName}</span> : ''}
                  </p>
                  <p className="text-[11px] text-[var(--text-3)] mt-0.5">{timeAgo(item.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Bottom grid ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Donut: distribución de empleados */}
        <Card>
          <CardHeader title="Estado de empleados" icon={Users} />
          <div className="p-3">
            {donutData.length === 0 ? (
              <EmptyState icon={Users} title="Sin datos" className="py-8" />
            ) : (
              <>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={68}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {donutData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <ReTooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 mt-1">
                  {donutData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-[var(--text-2)]">{d.name}</span>
                      </div>
                      <span className="font-semibold text-[var(--text-1)]">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Contratos por vencer — lista real */}
        <Card>
          <CardHeader
            title="Contratos por vencer"
            icon={FileWarning}
            action={<LinkBtn label="Ver empleados" onClick={() => navigate('/empleados')} />}
          />
          <div className="p-3 space-y-1">
            {s.expiringContractsList.length === 0 ? (
              <EmptyState
                icon={FileWarning}
                title="Sin contratos próximos a vencer"
                description="No hay contratos que venzan en los próximos 30 días"
                className="py-8"
              />
            ) : s.expiringContractsList.map((emp) => (
              <div
                key={emp.id}
                onClick={() => navigate(`/empleados/${emp.id}`)}
                className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-[var(--bg-hover)] cursor-pointer transition-colors gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-1)] truncate">
                    {emp.firstName} {emp.lastName}
                  </p>
                  <p className="text-[11px] text-[var(--text-3)] truncate">{emp.positionName || '—'}</p>
                </div>
                <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0', contractColor(emp.daysAway))}>
                  {emp.daysAway === 0 ? 'Hoy' : `${emp.daysAway}d`}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Mis tareas */}
        <Card>
          <CardHeader
            title="Mis tareas"
            icon={CheckSquare}
            action={<LinkBtn label="Ver todas" onClick={() => navigate('/tareas')} />}
          />
          <div className="p-3 space-y-0.5">
            {pendingTasks.length === 0 ? (
              <EmptyState
                icon={CheckSquare}
                title="Sin tareas pendientes"
                description="¡Estás al día con todas tus tareas!"
                className="py-8"
              />
            ) : pendingTasks.slice(0, 5).map((task: any) => (
              <div
                key={task.id}
                onClick={() => navigate('/tareas')}
                className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
              >
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0',
                  task.status === 'in_progress' ? 'bg-blue-400' :
                  task.status === 'paused' ? 'bg-amber-400' : 'bg-[var(--text-3)]',
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-1)] truncate">{task.title}</p>
                  {task.dueDate && (
                    <p className="text-[11px] text-[var(--text-3)]">{task.dueDate.slice(0, 10)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Próximos eventos */}
        <Card>
          <CardHeader title="Próximos eventos" icon={Calendar} />
          <div className="p-3 space-y-1">
            {upcomingEvents.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Sin eventos próximos"
                className="py-8"
              />
            ) : upcomingEvents.slice(0, 5).map((ev, i) => {
              const days = ev.daysAway ?? daysUntil(ev.eventDate)
              return (
                <div
                  key={ev.id ?? i}
                  className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <span className="text-sm text-[var(--text-1)] truncate flex-1 mr-2">{ev.title}</span>
                  <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0', eventColor(days))}>
                    {days <= 0 ? 'Hoy' : `${days}d`}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
