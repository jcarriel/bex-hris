import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { Bell, HelpCircle, Search, Menu, CheckCheck, X, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'
import { useUiStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { notificationsService, AppNotification } from '@/services/notifications.service'
import { GlobalSearch } from '@/components/shared/GlobalSearch'

type Crumb = { label: string; href?: string }
const routeTitles: Record<string, { title: string; crumbs: Crumb[] }> = {
  '/dashboard':     { title: 'Dashboard',             crumbs: [{ label: 'Inicio', href: '/dashboard' }, { label: 'Dashboard' }] },
  '/empleados':     { title: 'Empleados',             crumbs: [{ label: 'Módulos' }, { label: 'Empleados', href: '/empleados' }] },
  '/nomina':        { title: 'Nómina',                crumbs: [{ label: 'Módulos' }, { label: 'Nómina', href: '/nomina' }] },
  '/asistencia':    { title: 'Asistencia y Horarios', crumbs: [{ label: 'Módulos' }, { label: 'Asistencia', href: '/asistencia' }] },
  '/reclutamiento': { title: 'Reclutamiento',         crumbs: [{ label: 'Módulos' }, { label: 'Reclutamiento', href: '/reclutamiento' }] },
  '/configuracion': { title: 'Configuración',         crumbs: [{ label: 'Sistema' }, { label: 'Configuración', href: '/configuracion' }] },
  '/carga-masiva':  { title: 'Carga Masiva',          crumbs: [{ label: 'Herramientas' }, { label: 'Carga Masiva', href: '/carga-masiva' }] },
  '/tablas':        { title: 'Maestros',              crumbs: [{ label: 'Sistema' }, { label: 'Maestros', href: '/tablas' }] },
  '/usuarios':      { title: 'Usuarios',              crumbs: [{ label: 'Sistema' }, { label: 'Usuarios', href: '/usuarios' }] },
  '/eventos':       { title: 'Eventos y Calendario',  crumbs: [{ label: 'Módulos' }, { label: 'Eventos', href: '/eventos' }] },
  '/tareas':        { title: 'Tareas',                crumbs: [{ label: 'Módulos' }, { label: 'Tareas', href: '/tareas' }] },
  '/bienestar':     { title: 'Bienestar',             crumbs: [{ label: 'Módulos' }, { label: 'Bienestar', href: '/bienestar' }] },
  '/fuerza-laboral':{ title: 'Fuerza Laboral',        crumbs: [{ label: 'Módulos' }, { label: 'Fuerza Laboral', href: '/fuerza-laboral' }] },
  '/casilleros':    { title: 'Casilleros',            crumbs: [{ label: 'Módulos' }, { label: 'Casilleros', href: '/casilleros' }] },
  '/mayordomos':    { title: 'Mayordomos',            crumbs: [{ label: 'Módulos' }, { label: 'Mayordomos', href: '/mayordomos' }] },
}

const NOTIF_META: Record<string, { icon: string; color: string; nav?: string }> = {
  // Tasks
  task_assigned:   { icon: '📋', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  task_status:     { icon: '🔄', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400' },
  task_reassigned: { icon: '👤', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
  task_completed:  { icon: '✅', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  task_deleted:    { icon: '🗑️', color: 'bg-red-500/10 text-red-500' },
  // HR events
  birthday:        { icon: '🎂', color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400', nav: '/eventos' },
  contract_expiry: { icon: '📋', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', nav: '/empleados' },
  // Leaves
  leave_approved:  { icon: '✅', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', nav: '/bienestar/vacaciones' },
  leave_rejected:  { icon: '❌', color: 'bg-red-500/10 text-red-500', nav: '/bienestar/vacaciones' },
  leave_pending:   { icon: '⏳', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', nav: '/bienestar/vacaciones' },
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
  const navigate = useNavigate()

  const { data: count = 0 } = useQuery({
    queryKey: ['notif-count'],
    queryFn: notificationsService.getUnreadCount,
    refetchInterval: 15000,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })

  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.getAll(20),
    enabled: open,
    staleTime: 0,
    refetchOnMount: true,
  })

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

  const deleteOne = useMutation({
    mutationFn: (id: string) => notificationsService.deleteOne(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notif-count'] }); qc.invalidateQueries({ queryKey: ['notifications'] }); },
  })

  const deleteAll = useMutation({
    mutationFn: notificationsService.deleteAll,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notif-count'] }); qc.invalidateQueries({ queryKey: ['notifications'] }); },
  })

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
              {notifications.length > 0 && (
                <button
                  onClick={() => deleteAll.mutate()}
                  disabled={deleteAll.isPending}
                  className="p-1 rounded text-[var(--text-3)] hover:text-red-500 transition-colors"
                  title="Limpiar todas"
                >
                  <Trash2 size={14} />
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
              notifications.map((n: AppNotification) => {
                const meta = NOTIF_META[n.type] ?? { icon: '🔔', color: 'bg-[var(--bg-hover)] text-[var(--text-2)]' }
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.read) markRead.mutate(n.id)
                      if (meta.nav) { setOpen(false); navigate(meta.nav) }
                    }}
                    className={cn(
                      'group flex gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-[var(--bg-hover)]',
                      !n.read && 'bg-[var(--accent)]/5',
                    )}
                  >
                    <span className={cn('text-sm w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', meta.color)}>
                      {meta.icon}
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
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteOne.mutate(n.id) }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 hover:text-red-500 text-[var(--text-3)] transition-all flex-shrink-0"
                      title="Eliminar"
                    >
                      <X size={11} />
                    </button>
                    {!n.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

export function Topbar() {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const toggleSidebar   = useUiStore((s) => s.toggleSidebar)
  const sidebarOpen     = useUiStore((s) => s.sidebarOpen)
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen)
  const avatarColor     = useUiStore((s) => s.avatarColor)
  const avatarEmoji     = useUiStore((s) => s.avatarEmoji)
  const user            = useAuthStore((s) => s.user)
  const [searchOpen, setSearchOpen] = useState(false)

  const avatarContent = user ? (avatarEmoji || getInitials(user.nombre)) : '?'

  const pathKey = Object.keys(routeTitles).find((k) =>
    location.pathname.startsWith(k),
  ) || '/dashboard'
  const { title, crumbs } = routeTitles[pathKey]

  // Ctrl+K / Cmd+K opens global search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <header
      className="h-18 fixed top-0 right-0 z-10 flex items-center px-5 gap-4 transition-all"
      style={{
        left: sidebarOpen ? '15rem' : '3.5rem',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Sidebar toggle (mobile) */}
      <button
        onClick={toggleSidebar}
        className="p-1.5 rounded-md text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-1)] transition-colors lg:hidden"
      >
        <Menu size={18} />
      </button>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-semibold text-[var(--text-1)] leading-none">{title}</h2>
        <p className="text-[11px] text-[var(--text-3)] mt-0.5 flex items-center gap-1 flex-wrap">
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="opacity-40">/</span>}
              {crumb.href ? (
                <Link to={crumb.href} className="hover:text-[var(--accent)] transition-colors">{crumb.label}</Link>
              ) : (
                <span>{crumb.label}</span>
              )}
            </span>
          ))}
        </p>
      </div>

      {/* Search input — opens modal on click */}
      <div className="relative hidden sm:flex items-center">
        <Search size={14} className="absolute left-2.5 text-[var(--text-3)]" />
        <input
          type="text"
          readOnly
          placeholder="Buscar..."
          onClick={() => setSearchOpen(true)}
          className={cn(
            'w-48 pl-8 pr-16 py-1.5 text-sm rounded-lg border outline-none transition-colors cursor-pointer',
            'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-1)]',
            'placeholder:text-[var(--text-3)] hover:border-[var(--accent)]',
          )}
        />
        <kbd className="absolute right-2 text-[10px] text-[var(--text-3)] font-mono bg-[var(--bg-hover)] px-1.5 py-0.5 rounded pointer-events-none">
          Ctrl K
        </kbd>
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

        {/* Separator */}
        <div className="w-px h-5 mx-1" style={{ backgroundColor: 'var(--border)' }} />

        {/* User avatar + role — opens preferences */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-[var(--bg-hover)] transition-colors group"
          title="Preferencias"
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ring-2 ring-transparent group-hover:ring-[var(--accent)] transition-all"
            style={{ backgroundColor: avatarColor }}
          >
            {avatarContent}
          </div>
          <div className="hidden md:block text-left leading-none">
            <div className="text-xs font-medium text-[var(--text-1)]">{user?.nombre ?? 'Usuario'}</div>
            <div className="text-[10px] text-[var(--text-3)] capitalize">
              {user?.rol === 'admin' ? 'Administrador' : (user?.rol ?? 'Usuario')}
            </div>
          </div>
        </button>
      </div>

      {/* Global search modal */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  )
}
