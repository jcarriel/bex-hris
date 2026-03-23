import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, HelpCircle, Search, Menu, CheckCheck, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'
import { useUiStore } from '@/store/uiStore'
import { notificationsService, AppNotification } from '@/services/notifications.service'

const routeTitles: Record<string, { title: string; sub: string }> = {
  '/dashboard':    { title: 'Dashboard',             sub: 'Inicio / Dashboard' },
  '/empleados':    { title: 'Empleados',             sub: 'Módulos / Empleados' },
  '/nomina':       { title: 'Nómina',      sub: 'Módulos / Nómina' },
  '/asistencia':   { title: 'Asistencia y Horarios', sub: 'Módulos / Asistencia' },
  '/reclutamiento':{ title: 'Reclutamiento',         sub: 'Módulos / Reclutamiento' },
  '/configuracion': { title: 'Configuración',          sub: 'Sistema / Configuración' },
  '/carga-masiva':  { title: 'Carga Masiva',           sub: 'Herramientas / Carga Masiva' },
  '/tablas':        { title: 'Maestros',     sub: 'Sistema / Maestros' },
  '/usuarios':      { title: 'Usuarios',     sub: 'Sistema / Usuarios' },
  '/eventos':       { title: 'Eventos y Calendario', sub: 'Módulos / Eventos' },
  '/tareas':        { title: 'Tareas',       sub: 'Módulos / Tareas' },
}

const NOTIF_ICONS: Record<string, string> = {
  task_assigned:  '📋',
  task_status:    '🔄',
  task_reassigned:'👤',
  task_completed: '✅',
  task_deleted:   '🗑️',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Ahora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()

  const { data: count = 0 } = useQuery({
    queryKey: ['notif-count'],
    queryFn: notificationsService.getUnreadCount,
    refetchInterval: 15000,       // poll every 15s
    staleTime: 0,
    refetchOnWindowFocus: true,   // also refresh when user returns to tab
  })

  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.getAll(20),
    enabled: open,
    staleTime: 0,          // always re-fetch when panel opens
    refetchOnMount: true,
  })

  // Whenever the panel opens, immediately re-fetch so the list is fresh
  useEffect(() => {
    if (open) refetchNotifications()
  }, [open])

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notif-count'] }); qc.invalidateQueries({ queryKey: ['notifications'] }); },
  })

  const markAllRead = useMutation({
    mutationFn: notificationsService.markAllRead,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notif-count'] }); qc.invalidateQueries({ queryKey: ['notifications'] }); },
  })

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-md text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-1)] transition-colors"
      >
        <Bell size={17} />
        {count > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-[var(--accent)]" />
              <span className="text-sm font-semibold text-[var(--text-1)]">Notificaciones</span>
              {count > 0 && (
                <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">{count}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {count > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="p-1 rounded text-[var(--text-3)] hover:text-[var(--accent)] transition-colors"
                  title="Marcar todas como leídas"
                >
                  <CheckCheck size={14} />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded text-[var(--text-3)] hover:text-[var(--text-1)]">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border)]">
            {notifications.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-2 text-[var(--text-3)]">
                <Bell size={20} className="opacity-30" />
                <span className="text-xs">Sin notificaciones</span>
              </div>
            ) : (
              notifications.map((n: AppNotification) => (
                <div
                  key={n.id}
                  onClick={() => { if (!n.read) markRead.mutate(n.id) }}
                  className={cn(
                    'flex gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-[var(--bg-hover)]',
                    !n.read && 'bg-[var(--accent)]/5',
                  )}
                >
                  <span className="text-base flex-shrink-0 mt-0.5">
                    {NOTIF_ICONS[n.type] || '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-xs font-medium leading-snug', !n.read ? 'text-[var(--text-1)]' : 'text-[var(--text-2)]')}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-[var(--text-3)] flex-shrink-0 mt-0.5">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-3)] mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                  {!n.read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function Topbar() {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)

  const pathKey = Object.keys(routeTitles).find((k) =>
    location.pathname.startsWith(k),
  ) || '/dashboard'
  const { title, sub } = routeTitles[pathKey]

  return (
    <header
      className="h-18 fixed top-0 right-0 left-60 z-10 flex items-center px-5 gap-4"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Sidebar toggle */}
      <button
        onClick={toggleSidebar}
        className="p-1.5 rounded-md text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-1)] transition-colors lg:hidden"
      >
        <Menu size={18} />
      </button>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-semibold text-[var(--text-1)] leading-none">{title}</h2>
        <p className="text-[11px] text-[var(--text-3)] mt-0.5">{sub}</p>
      </div>

      {/* Search */}
      <div className="relative hidden sm:flex items-center">
        <Search size={14} className="absolute left-2.5 text-[var(--text-3)]" />
        <input
          type="text"
          placeholder="Buscar..."
          className={cn(
            'w-48 pl-8 pr-3 py-1.5 text-sm rounded-lg border outline-none transition-colors',
            'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-1)]',
            'placeholder:text-[var(--text-3)] focus:border-[var(--accent)]',
          )}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Notifications */}
        <NotificationBell />

        {/* Help */}
        <button className="p-2 rounded-md text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-1)] transition-colors">
          <HelpCircle size={17} />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={cn(
            'relative w-[52px] h-7 rounded-full border transition-colors flex-shrink-0',
            theme === 'dark'
              ? 'bg-[var(--bg-card)] border-[var(--border)]'
              : 'bg-slate-200 border-slate-300',
          )}
          title={theme === 'dark' ? 'Cambiar a claro' : 'Cambiar a oscuro'}
        >
          <span
            className={cn(
              'absolute top-0.5 w-6 h-6 rounded-full transition-transform flex items-center justify-center text-[11px]',
              theme === 'dark'
                ? 'left-0.5 bg-[var(--accent)] translate-x-0'
                : 'left-0.5 bg-white translate-x-[24px] shadow-sm',
            )}
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </span>
        </button>

      </div>
    </header>
  )
}
