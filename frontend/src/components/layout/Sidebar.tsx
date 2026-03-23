import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, DollarSign, Clock, UserPlus,
  GraduationCap, Gift, Star, BarChart2, Settings, ChevronDown, Upload, Table2, UserCog, LogOut, CalendarDays, CheckSquare, Briefcase, Heart,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { useAuthStore, hasModuleAccess } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'

interface NavItem {
  label: string
  icon: React.ElementType
  to: string
  module?: string
  badge?: { value: string | number; color: 'red' | 'green' | 'blue' }
  disabled?: boolean
}

const mainItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard', module: 'dashboard' },
]

const moduleItems: NavItem[] = [
  { label: 'Empleados',             icon: Users,      to: '/empleados',     module: 'empleados' },
  { label: 'Nómina',      icon: DollarSign, to: '/nomina',        module: 'nomina' },
  { label: 'Asistencia y Horarios', icon: Clock,      to: '/asistencia',    module: 'asistencia'},
  { label: 'Eventos y Calendario', icon: CalendarDays, to: '/eventos',     module: 'eventos' },
  { label: 'Tareas',               icon: CheckSquare,  to: '/tareas',      module: 'tareas' },
  { label: 'Fuerza Laboral',       icon: Briefcase,    to: '/fuerza-laboral', module: 'fuerza-laboral' },
  { label: 'Bienestar',            icon: Heart,        to: '/bienestar',      module: 'bienestar' },
  // { label: 'Reclutamiento',         icon: UserPlus,   to: '/reclutamiento', module: 'reclutamiento', badge: { value: 12, color: 'green' } },
]

const comingItems: NavItem[] = [
  { label: 'Capacitación', icon: GraduationCap, to: '#', disabled: true },
  { label: 'Beneficios',   icon: Gift,          to: '#', disabled: true },
  { label: 'Evaluaciones', icon: Star,          to: '#', disabled: true },
  { label: 'Reportes',     icon: BarChart2,     to: '#', disabled: true },
]

const toolsItems: NavItem[] = [
  { label: 'Carga Masiva', icon: Upload, to: '/carga-masiva', module: 'carga-masiva' },
]

const systemItems: NavItem[] = [
  { label: 'Maestros',      icon: Table2,   to: '/tablas',        module: 'tablas' },
  { label: 'Usuarios',      icon: UserCog,  to: '/usuarios',      module: 'usuarios' },
  { label: 'Configuración', icon: Settings, to: '/configuracion', module: 'configuracion' },
]

const badgeColors: Record<string, string> = {
  red:   'bg-red-500 text-white',
  green: 'bg-emerald-500 text-white',
  blue:  'bg-blue-500 text-white',
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="px-3 pt-5 pb-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)]">
        {label}
      </span>
    </div>
  )
}

function NavItemRow({ item, permissions, rol }: { item: NavItem; permissions: string[] | undefined; rol?: string }) {
  const Icon = item.icon

  if (item.module && !hasModuleAccess(permissions, item.module, rol)) return null

  if (item.disabled) {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2 mx-2 rounded-lg opacity-45 cursor-not-allowed"
        title="Próximamente"
      >
        <Icon size={16} className="text-[var(--text-2)] flex-shrink-0" />
        <span className="text-sm text-[var(--text-2)] flex-1">{item.label}</span>
      </div>
    )
  }

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 mx-2 rounded-lg transition-all group relative',
          isActive
            ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
            : 'text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-1)]',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--accent)]" />
          )}
          <Icon size={16} className="flex-shrink-0" />
          <span className="text-sm flex-1 font-medium">{item.label}</span>
          {item.badge && (
            <span
              className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                badgeColors[item.badge.color],
              )}
            >
              {item.badge.value}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

export function Sidebar() {
  const user        = useAuthStore((s) => s.user)
  const logout      = useAuthStore((s) => s.logout)
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)
  const permissions = user?.permissions
  const rol         = user?.rol
  const navigate    = useNavigate()

  if (!sidebarOpen) return null

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-60 flex flex-col z-20"
      style={{ backgroundColor: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border)]">
        <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center font-bold text-white text-sm">
          BX
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[var(--text-1)]">BEX HRIS</div>
          <div className="text-[10px] text-[var(--text-3)]">Sistema de RRHH</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        <SectionLabel label="Principal" />
        {mainItems.map((item) => <NavItemRow key={item.to} item={item} permissions={permissions} rol={rol} />)}

        <SectionLabel label="Módulos" />
        {moduleItems.map((item) => <NavItemRow key={item.to} item={item} permissions={permissions} rol={rol} />)}

        <SectionLabel label="Próximamente" />
        {/* {comingItems.map((item) => <NavItemRow key={item.label} item={item} permissions={permissions} rol={rol} />)} */}

        <SectionLabel label="Herramientas" />
        {toolsItems.map((item) => <NavItemRow key={item.to} item={item} permissions={permissions} rol={rol} />)}

        <SectionLabel label="Sistema" />
        {systemItems.map((item) => <NavItemRow key={item.to} item={item} permissions={permissions} rol={rol} />)}
      </nav>

      {/* User footer */}
      {user && (
        <div className="border-t border-[var(--border)] p-3 space-y-1">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {getInitials(user.nombre)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[var(--text-1)] truncate">{user.nombre}</div>
              <div className="text-xs text-[var(--text-3)] truncate">
                {user.rol === 'admin' ? 'Administrador' : user.rol}
              </div>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-[var(--text-2)] hover:bg-red-500/10 hover:text-red-500 transition-colors"
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      )}
    </aside>
  )
}
