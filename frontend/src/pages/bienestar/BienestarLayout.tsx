import { NavLink, Outlet } from 'react-router-dom'
import { Palmtree, FileCheck, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/bienestar/vacaciones', label: 'Vacaciones', icon: Palmtree },
  { to: '/bienestar/permisos',   label: 'Permisos',   icon: FileCheck },
  { to: '/bienestar/trabajo-social', label: 'Trabajo Social', icon: Heart },
]

export function BienestarLayout() {
  return (
    <div className="p-6 max-w-9xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-1)] flex items-center gap-2">
          <Heart size={20} className="text-[var(--accent)]" />
          Bienestar
        </h1>
        <p className="text-sm text-[var(--text-3)] mt-0.5">Gestión de vacaciones, permisos y bienestar del empleado</p>
      </div>
      <div className="flex gap-1 border-b border-[var(--border)]">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-3)] hover:text-[var(--text-1)]',
              )
            }
          >
            <Icon size={14} />
            {label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  )
}
