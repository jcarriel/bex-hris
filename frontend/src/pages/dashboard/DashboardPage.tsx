import { Users, DollarSign, AlertCircle, Briefcase } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { KpiCard } from '@/components/shared/KpiCard'
import { Badge } from '@/components/shared/Badge'
import { Avatar } from '@/components/shared/Avatar'
import { cn } from '@/lib/utils'

// ─── Static mock data ─────────────────────────────────────────────────────────
const recentEmployees = [
  { id: '1', name: 'Ana García',      cargo: 'Desarrolladora Sr.',   dpto: 'TI',       estado: 'activo'    },
  { id: '2', name: 'Carlos Martínez', cargo: 'Analista Financiero',  dpto: 'Finanzas',  estado: 'activo'    },
  { id: '3', name: 'María Rodríguez', cargo: 'Diseñadora UX',        dpto: 'Marketing', estado: 'vacaciones'},
  { id: '4', name: 'Luis Pérez',      cargo: 'Gerente de Ventas',    dpto: 'Ventas',    estado: 'activo'    },
  { id: '5', name: 'Sofia Torres',    cargo: 'Coordinadora RRHH',    dpto: 'RRHH',      estado: 'licencia'  },
]

const activityFeed = [
  { id: 1, color: 'bg-emerald-400', text: 'Ana García completó su perfil al 100%',    time: 'Hace 5 min' },
  { id: 2, color: 'bg-blue-400',    text: 'Nómina de Marzo 2026 fue generada',         time: 'Hace 22 min' },
  { id: 3, color: 'bg-amber-400',   text: 'Luis Pérez marcó ausencia sin justificar',  time: 'Hace 1 h'   },
  { id: 4, color: 'bg-violet-400',  text: '3 nuevas solicitudes de vacaciones',        time: 'Hace 2 h'   },
  { id: 5, color: 'bg-red-400',     text: 'Vacante "Dev Backend" recibió 5 candidatos',time: 'Hace 3 h'   },
  { id: 6, color: 'bg-teal-400',    text: 'Carlos Martínez fue promovido a Sr.',       time: 'Hace 5 h'   },
]

const deptData = [
  { name: 'TI',        value: 58 },
  { name: 'Ventas',    value: 47 },
  { name: 'Ops',       value: 39 },
  { name: 'Finanzas',  value: 28 },
  { name: 'Marketing', value: 22 },
  { name: 'Otros',     value: 54 },
]

const recruitPie = [
  { name: 'En revisión', value: 48, color: '#4f7cff' },
  { name: 'Entrevistas', value: 30, color: '#22c983' },
  { name: 'Ofertas',     value: 14, color: '#f5a623' },
  { name: 'Rechazados',  value: 8,  color: '#ff5f72' },
]

const upcomingEvents = [
  { label: 'Evaluaciones Q1',         days: 3,  color: 'bg-red-500/15 text-red-400' },
  { label: 'Vencimiento contratos',   days: 7,  color: 'bg-amber-500/15 text-amber-400' },
  { label: 'Capacitación liderazgo',  days: 12, color: 'bg-blue-500/15 text-blue-400' },
  { label: 'Revisión salarial anual', days: 18, color: 'bg-violet-500/15 text-violet-400' },
  { label: 'Renovación póliza ARS',   days: 25, color: 'bg-emerald-500/15 text-emerald-400' },
]

const estadoVariant: Record<string, 'success' | 'info' | 'warning' | 'neutral'> = {
  activo:     'success',
  vacaciones: 'info',
  licencia:   'warning',
  inactivo:   'neutral',
}

const estadoLabel: Record<string, string> = {
  activo:     'Activo',
  vacaciones: 'Vacaciones',
  licencia:   'Licencia',
  inactivo:   'Inactivo',
}

// ─── Custom tooltip for bar chart ────────────────────────────────────────────
function BarTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm shadow-xl">
      <p className="text-[var(--text-2)] mb-0.5">{label}</p>
      <p className="text-[var(--text-1)] font-semibold">{payload[0].value} empleados</p>
    </div>
  )
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Total empleados"
          value="248"
          icon={Users}
          trend="+3"
          trendLabel="+3 incorporaciones este mes"
          color="blue"
        />
        <KpiCard
          title="Nómina mensual"
          value="$284K"
          icon={DollarSign}
          trend="+2.1%"
          trendLabel="Respecto al mes anterior"
          color="green"
        />
        <KpiCard
          title="Ausencias hoy"
          value="7"
          icon={AlertCircle}
          trend="3 sin justificar"
          trendLabel="Requieren atención"
          color="amber"
        />
        <KpiCard
          title="Vacantes abiertas"
          value="12"
          icon={Briefcase}
          trendLabel="Sin cambios recientes"
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
              <button className="text-xs text-[var(--accent)] hover:opacity-80 transition-opacity font-medium">
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
                {recentEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={emp.name} size="sm" />
                        <span className="font-medium text-[var(--text-1)]">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[var(--text-2)]">{emp.cargo}</td>
                    <td className="px-5 py-3 text-[var(--text-2)]">{emp.dpto}</td>
                    <td className="px-5 py-3">
                      <Badge variant={estadoVariant[emp.estado]}>
                        {estadoLabel[emp.estado]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Activity feed */}
        <Card>
          <CardHeader title="Actividad reciente" />
          <div className="p-4 space-y-1">
            {activityFeed.map((item) => (
              <div key={item.id} className="flex gap-3 px-2 py-2.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
                <div className="flex-shrink-0 mt-1.5">
                  <span className={cn('w-2 h-2 rounded-full block', item.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-1)] leading-snug">{item.text}</p>
                  <p className="text-xs text-[var(--text-3)] mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Bar chart by department */}
        <Card>
          <CardHeader title="Empleados por departamento" />
          <div className="p-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} layout="vertical" margin={{ left: 0, right: 16 }}>
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

        {/* Pie chart recruitment */}
        <Card>
          <CardHeader title="Estado de reclutamiento" />
          <div className="p-4 h-56 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={recruitPie}
                  cx="40%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {recruitPie.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>{value}</span>
                  )}
                />
                <Tooltip
                  formatter={(value) => [`${value} candidatos`]}
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--text-1)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Upcoming events */}
        <Card>
          <CardHeader title="Próximos eventos" />
          <div className="p-4 space-y-2">
            {upcomingEvents.map((ev, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
              >
                <span className="text-sm text-[var(--text-1)]">{ev.label}</span>
                <span className={cn('text-xs font-medium px-2 py-1 rounded-md', ev.color)}>
                  {ev.days}d
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
