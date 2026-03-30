import { useState, useMemo, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Calendar, Plus, Trash2, Pencil, X, Save, Loader2,
  Gift, FileText, GraduationCap, Search, ClipboardList,
  Users, Mail, ChevronLeft, ChevronRight, Bell, Settings,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/shared/PageHeader'
import { eventsService, type CalendarEvent, type EventType, type CreateEventDto, type EventTypeConfig } from '@/services/events.service'
import { departmentsService } from '@/services/departments.service'
import { empleadosService } from '@/services/empleados.service'

/* ─── date helper: evita el desfase UTC → local ──────────────────── */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d)
}
function localTodayStr(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

/* ─── meta ───────────────────────────────────────────────────────── */

const TYPE_META: Record<EventType, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  birthday:        { label: 'Cumpleaños',          color: 'text-pink-500',    bg: 'bg-pink-500/10',    icon: Gift },
  contract_expiry: { label: 'Contrato por vencer', color: 'text-amber-500',   bg: 'bg-amber-500/10',   icon: FileText },
  training:        { label: 'Capacitación',         color: 'text-blue-500',    bg: 'bg-blue-500/10',    icon: GraduationCap },
  audit:           { label: 'Auditoría',            color: 'text-violet-500',  bg: 'bg-violet-500/10',  icon: ClipboardList },
  meeting:         { label: 'Reunión',              color: 'text-cyan-500',    bg: 'bg-cyan-500/10',    icon: Users },
  other:           { label: 'Otro',                 color: 'text-[var(--text-3)]', bg: 'bg-[var(--bg-surface)]', icon: Bell },
}

const ALL_TYPES = Object.keys(TYPE_META) as EventType[]

function daysLabel(daysAway: number) {
  if (daysAway === 0) return { text: 'Hoy', cls: 'bg-red-500/15 text-red-500' }
  if (daysAway === 1) return { text: 'Mañana', cls: 'bg-orange-500/15 text-orange-500' }
  if (daysAway <= 7)  return { text: `${daysAway}d`, cls: 'bg-amber-500/15 text-amber-600' }
  return { text: `${daysAway}d`, cls: 'bg-[var(--bg-surface)] text-[var(--text-3)]' }
}

/* ─── small shared components ────────────────────────────────────── */

const inputCls = [
  'w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors',
  'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-1)]',
  'focus:border-[var(--accent)] placeholder:text-[var(--text-3)]',
].join(' ')

const labelCls = 'block text-xs font-semibold text-[var(--text-2)] mb-1.5 uppercase tracking-wide'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className={labelCls}>{label}</label>{children}</div>
}

function TypeBadge({ type }: { type: EventType }) {
  const m = TYPE_META[type]
  const Icon = m.icon
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold', m.bg, m.color)}>
      <Icon size={10} />{m.label}
    </span>
  )
}

/* ─── mini calendar ──────────────────────────────────────────────── */

function MiniCalendar({ events, onSelectDate }: { events: CalendarEvent[]; onSelectDate: (d: string) => void }) {
  const [cursor, setCursor] = useState(() => new Date())

  const year = cursor.getFullYear()
  const month = cursor.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const todayStr = localTodayStr()

  // map date → event types
  const eventMap = useMemo(() => {
    const m = new Map<string, Set<EventType>>()
    events.forEach((e) => {
      if (!m.has(e.eventDate)) m.set(e.eventDate, new Set())
      m.get(e.eventDate)!.add(e.type)
    })
    return m
  }, [events])

  const monthLabel = cursor.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <button onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="p-1 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-2)] transition-colors">
          <ChevronLeft size={14} />
        </button>
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold capitalize text-[var(--text-1)]">{cursor.toLocaleDateString('es-ES', { month: 'long' })}</span>
          <div className="flex items-center gap-0.5">
            <button onClick={() => setCursor(new Date(year - 1, month, 1))}
              className="p-0.5 rounded text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors text-[10px] leading-none">▲</button>
            <span className="text-xs font-semibold text-[var(--accent)] w-10 text-center">{year}</span>
            <button onClick={() => setCursor(new Date(year + 1, month, 1))}
              className="p-0.5 rounded text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors text-[10px] leading-none">▼</button>
          </div>
        </div>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="p-1 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-2)] transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="p-3">
        {/* day labels */}
        <div className="grid grid-cols-7 mb-1">
          {['D','L','M','X','J','V','S'].map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold text-[var(--text-3)] py-1">{d}</div>
          ))}
        </div>

        {/* cells */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const types = eventMap.get(dateStr)
            const isToday = dateStr === todayStr
            return (
              <button key={dateStr} onClick={() => onSelectDate(dateStr)}
                className={cn(
                  'relative flex flex-col items-center justify-center h-8 rounded-lg text-xs transition-colors',
                  isToday ? 'font-bold text-white' : 'text-[var(--text-2)] hover:bg-[var(--bg-hover)]',
                )}
                style={isToday ? { backgroundColor: 'var(--accent)' } : undefined}>
                {day}
                {types && (
                  <div className="absolute bottom-0.5 flex gap-0.5">
                    {[...types].slice(0, 3).map((t) => (
                      <div key={t} className={cn('w-1 h-1 rounded-full', TYPE_META[t].color.replace('text-', 'bg-'))} />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ─── event form ─────────────────────────────────────────────────── */

const EMPTY_FORM: CreateEventDto = {
  type: 'training',
  title: '',
  description: '',
  eventDate: new Date().toISOString().split('T')[0],
  employeeId: '',
  daysNotice: 7,
}

function EventForm({
  initial, onSave, onCancel, saving,
}: {
  initial: CreateEventDto
  onSave: (d: CreateEventDto) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<CreateEventDto>(initial)
  const set = (k: keyof CreateEventDto, v: unknown) => setForm((p) => ({ ...p, [k]: v }))

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => empleadosService.getAll({ limit: 9999 }).then((r: any) => r?.data ?? r ?? []),
  })

  return (
    <div className="rounded-2xl border mb-6 overflow-hidden"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
        <div className="flex items-center gap-2">
          <Calendar size={16} style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-semibold text-[var(--text-1)]">
            {initial.title ? 'Editar evento' : 'Nuevo evento'}
          </span>
        </div>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-2)] transition-colors">
          <X size={15} />
        </button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); onSave(form) }} className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Tipo de evento">
            <select value={form.type} onChange={(e) => set('type', e.target.value)} className={inputCls}>
              {ALL_TYPES.map((t) => (
                <option key={t} value={t}>{TYPE_META[t].label}</option>
              ))}
            </select>
          </Field>
          <Field label="Fecha">
            <input type="date" value={form.eventDate} onChange={(e) => set('eventDate', e.target.value)}
              required className={inputCls} />
          </Field>
        </div>

        <Field label="Título *">
          <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)}
            required placeholder="Nombre del evento..." className={inputCls} />
        </Field>

        <Field label="Descripción">
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
            rows={2} placeholder="Detalles del evento..." className={cn(inputCls, 'resize-none')} />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Empleado relacionado (opcional)">
            <select value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)} className={inputCls}>
              <option value="">Sin empleado específico</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
              ))}
            </select>
          </Field>
          <Field label="Notificar con (días de anticipación)">
            <input type="number" min={0} max={90} value={form.daysNotice}
              onChange={(e) => set('daysNotice', parseInt(e.target.value) || 0)} className={inputCls} />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button type="button" onClick={onCancel}
            className="px-4 py-2 text-sm border rounded-lg text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-colors"
            style={{ borderColor: 'var(--border)' }}>
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent)' }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Guardar
          </button>
        </div>
      </form>
    </div>
  )
}

/* ─── event card ─────────────────────────────────────────────────── */

function EventCard({
  event, onEdit, onDelete,
}: {
  event: CalendarEvent
  onEdit?: () => void
  onDelete?: () => void
}) {
  const meta  = TYPE_META[event.type]
  const Icon  = meta.icon
  const days  = event.daysAway ?? 0
  const badge = daysLabel(days)
  const dateStr = parseLocalDate(event.eventDate).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div className={cn('flex items-start gap-3 p-3.5 rounded-xl border transition-colors hover:bg-[var(--bg-hover)]')}
      style={{ borderColor: 'var(--border)' }}>
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5', meta.bg)}>
        <Icon size={16} className={meta.color} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-1)] truncate">{event.title}</p>
            {event.employeeName && (
              <p className="text-xs text-[var(--text-3)] truncate">{event.employeeName}</p>
            )}
            {event.description && (
              <p className="text-xs text-[var(--text-2)] mt-0.5 line-clamp-2">{event.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-bold', badge.cls)}>{badge.text}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <TypeBadge type={event.type} />
            <span className="text-[10px] text-[var(--text-3)] capitalize">{dateStr}</span>
            {event.isAuto && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-surface)] text-[var(--text-3)]">Auto</span>
            )}
          </div>
          {!event.isAuto && (onEdit || onDelete) && (
            <div className="flex gap-1">
              {onEdit && (
                <button onClick={onEdit} className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-3)] hover:text-[var(--accent)] transition-colors">
                  <Pencil size={11} />
                </button>
              )}
              {onDelete && (
                <button onClick={onDelete} className="p-1 rounded hover:bg-red-500/10 text-[var(--text-3)] hover:text-red-500 transition-colors">
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── notification config panel ──────────────────────────────────── */

function NotifConfigPanel({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['event-configs'],
    queryFn: eventsService.getConfigs,
  })

  // local draft state — key: type → { daysNotice, enabled }
  const [draft, setDraft] = useState<Record<string, { daysNotice: number; enabled: boolean }>>({})
  const [saving, setSaving] = useState<string | null>(null)

  // init draft when configs load
  useEffect(() => {
    const m: Record<string, { daysNotice: number; enabled: boolean }> = {}
    configs.forEach((c) => { m[c.type] = { daysNotice: c.daysNotice, enabled: c.enabled } })
    setDraft(m)
  }, [configs])

  const handleSave = async (type: string) => {
    const d = draft[type]
    if (!d) return
    setSaving(type)
    try {
      await eventsService.updateConfig(type, d.daysNotice, d.enabled)
      qc.invalidateQueries({ queryKey: ['event-configs'] })
      toast.success(`Configuración guardada`)
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="rounded-2xl border mb-6 overflow-hidden"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

      <div className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
        <div className="flex items-center gap-2">
          <Settings size={15} style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-semibold text-[var(--text-1)]">Configuración de notificaciones</span>
          <span className="text-xs text-[var(--text-3)] ml-1">— días de anticipación por tipo de evento</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-2)] transition-colors">
          <X size={15} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-[var(--text-3)]" /></div>
      ) : (
        <div className="p-4 space-y-2">
          <p className="text-xs text-[var(--text-3)] mb-4 px-1">
            El digest diario (7:00 AM) envía un email cuando un evento ocurre hoy <strong>o</strong> cuando faltan exactamente los días configurados.
          </p>
          {configs.map((cfg) => {
            const meta = TYPE_META[cfg.type as EventType]
            const Icon = meta?.icon ?? Bell
            const d = draft[cfg.type] ?? { daysNotice: cfg.daysNotice, enabled: cfg.enabled }
            const dirty = d.daysNotice !== cfg.daysNotice || d.enabled !== cfg.enabled
            return (
              <div key={cfg.type}
                className="flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors"
                style={{ borderColor: 'var(--border)', backgroundColor: d.enabled ? undefined : 'var(--bg-surface)' }}>

                {/* icon + label */}
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', meta?.bg ?? 'bg-[var(--bg-surface)]')}>
                  <Icon size={15} className={meta?.color ?? 'text-[var(--text-3)]'} />
                </div>
                <span className={cn('text-sm font-medium flex-1', d.enabled ? 'text-[var(--text-1)]' : 'text-[var(--text-3)]')}>
                  {meta?.label ?? cfg.type}
                </span>

                {/* days input */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-[var(--text-3)]">Notificar</span>
                  <input
                    type="number" min={0} max={365} disabled={!d.enabled}
                    value={d.daysNotice}
                    onChange={(e) => setDraft((p) => ({ ...p, [cfg.type]: { ...p[cfg.type], daysNotice: parseInt(e.target.value) || 0 } }))}
                    className={cn('w-16 text-center px-2 py-1.5 text-sm rounded-lg border outline-none transition-colors',
                      'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-1)] focus:border-[var(--accent)]',
                      !d.enabled && 'opacity-50 cursor-not-allowed')}
                  />
                  <span className="text-xs text-[var(--text-3)]">días antes</span>
                </div>

                {/* enabled toggle */}
                <button
                  onClick={() => setDraft((p) => ({ ...p, [cfg.type]: { ...p[cfg.type], enabled: !p[cfg.type].enabled } }))}
                  className={cn(
                    'relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0',
                    d.enabled ? 'bg-[var(--accent)]' : 'bg-[var(--border)]',
                  )}>
                  <span className={cn('inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow-sm',
                    d.enabled ? 'translate-x-4' : 'translate-x-0.5')} />
                </button>

                {/* save button — only if dirty */}
                <button
                  onClick={() => handleSave(cfg.type)}
                  disabled={!dirty || saving === cfg.type}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                    dirty
                      ? 'text-white'
                      : 'opacity-0 pointer-events-none',
                  )}
                  style={dirty ? { backgroundColor: 'var(--accent)' } : undefined}>
                  {saving === cfg.type
                    ? <Loader2 size={11} className="animate-spin" />
                    : <Save size={11} />}
                  Guardar
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── main page ──────────────────────────────────────────────────── */

export function EventosPage() {
  const qc = useQueryClient()

  const [showForm, setShowForm]         = useState(false)
  const [editEvent, setEditEvent]       = useState<CalendarEvent | null>(null)
  const [deletingId, setDeletingId]     = useState<string | null>(null)
  const [typeFilter, setTypeFilter]     = useState<EventType | 'all'>('all')
  const [search, setSearch]             = useState('')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [sendingDigest, setSendingDigest] = useState(false)
  const [showConfig, setShowConfig]     = useState(false)

  // fetch upcoming (30 days) for sidebar/calendar
  const { data: upcoming = [], isLoading: loadingUpcoming } = useQuery({
    queryKey: ['events-upcoming'],
    queryFn:  () => eventsService.getUpcoming(60),
    refetchInterval: 5 * 60 * 1000,
  })

  // fetch all manual events for the list
  const { data: allEvents = [], isLoading: loadingAll } = useQuery({
    queryKey: ['events-all'],
    queryFn:  () => eventsService.getAll(),
  })

  // combine for display
  const displayEvents = useMemo(() => {
    // upcoming already has auto + manual merged; use it for filtered view
    let list = upcoming
    if (typeFilter !== 'all') list = list.filter((e) => e.type === typeFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((e) =>
        e.title.toLowerCase().includes(q) ||
        (e.employeeName ?? '').toLowerCase().includes(q) ||
        (e.description ?? '').toLowerCase().includes(q)
      )
    }
    if (selectedDate) list = list.filter((e) => e.eventDate === selectedDate)
    return list
  }, [upcoming, typeFilter, search, selectedDate])

  // stats
  const stats = useMemo(() => {
    const today = upcoming.filter((e) => e.daysAway === 0).length
    const week  = upcoming.filter((e) => (e.daysAway ?? 99) <= 7).length
    const month = upcoming.length
    const auto  = upcoming.filter((e) => e.isAuto).length
    return { today, week, month, auto }
  }, [upcoming])

  // type filter counts
  const typeCounts = useMemo(() => {
    const c: Record<string, number> = { all: upcoming.length }
    upcoming.forEach((e) => { c[e.type] = (c[e.type] ?? 0) + 1 })
    return c
  }, [upcoming])

  /* mutations */
  const createMut = useMutation({
    mutationFn: eventsService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events-upcoming'] })
      qc.invalidateQueries({ queryKey: ['events-all'] })
      toast.success('Evento creado')
      setShowForm(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al crear'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateEventDto> }) =>
      eventsService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events-upcoming'] })
      qc.invalidateQueries({ queryKey: ['events-all'] })
      toast.success('Evento actualizado')
      setEditEvent(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al actualizar'),
  })

  const deleteMut = useMutation({
    mutationFn: eventsService.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events-upcoming'] })
      qc.invalidateQueries({ queryKey: ['events-all'] })
      toast.success('Evento eliminado')
      setDeletingId(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al eliminar'),
  })

  const handleDigest = async () => {
    setSendingDigest(true)
    try {
      const r = await eventsService.sendDigest()
      toast.success(r.message)
    } catch {
      toast.error('Error al enviar el digest')
    } finally {
      setSendingDigest(false)
    }
  }

  const handleSave = useCallback((data: CreateEventDto) => {
    if (editEvent) {
      updateMut.mutate({ id: editEvent.id, data })
    } else {
      createMut.mutate(data)
    }
  }, [editEvent, createMut, updateMut])

  const openEdit = useCallback((e: CalendarEvent) => {
    setEditEvent(e)
    setShowForm(false)
  }, [])

  const saving = createMut.isPending || updateMut.isPending

  return (
    <div>
      <PageHeader
        title="Eventos y Calendario"
        description="Gestiona capacitaciones, auditorías y eventos; visualiza cumpleaños y contratos próximos"
        breadcrumb={[{ label: 'Módulos' }, { label: 'Eventos' }]}
      />

      {/* ── stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Hoy', value: stats.today, color: 'text-red-500', bg: 'bg-red-500/10' },
          { label: 'Esta semana', value: stats.week, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Próx. 60 días', value: stats.month, color: 'text-[var(--accent)]', bg: 'bg-[var(--accent-soft)]' },
          { label: 'Automáticos', value: stats.auto, color: 'text-violet-500', bg: 'bg-violet-500/10' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border p-4"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className={cn('text-2xl font-bold', s.color)}>{s.value}</div>
            <div className="text-xs text-[var(--text-3)] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-6 items-start">

        {/* ── main content ── */}
        <div className="flex-1 min-w-0">

          {/* toolbar */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {/* search */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar evento..." className={cn(inputCls, 'pl-8 w-48 text-xs py-1.5')} />
            </div>

            {/* type filters */}
            {(['all', ...Object.keys(TYPE_META)] as (EventType | 'all')[]).map((t) => {
              const isAll = t === 'all'
              const meta = isAll ? null : TYPE_META[t]
              return (
                <button key={t} onClick={() => { setTypeFilter(t); setSelectedDate(null) }}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors',
                    typeFilter === t
                      ? (isAll ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-soft)]' : `${meta!.bg} ${meta!.color} border-current`)
                      : 'border-[var(--border)] text-[var(--text-3)] hover:border-[var(--accent)]',
                  )}>
                  {!isAll && (() => { const Icon = meta!.icon; return <Icon size={10} /> })()}
                  {isAll ? 'Todos' : meta!.label}
                  {typeCounts[t] != null && (
                    <span className="ml-0.5 opacity-70">{typeCounts[t]}</span>
                  )}
                </button>
              )
            })}

            <div className="ml-auto flex gap-2">
              {selectedDate && (
                <button onClick={() => setSelectedDate(null)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs border rounded-lg text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-colors"
                  style={{ borderColor: 'var(--border)' }}>
                  <X size={11} /> {parseLocalDate(selectedDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </button>
              )}

              <button onClick={() => { setShowConfig((v) => !v); setShowForm(false); setEditEvent(null) }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border font-semibold transition-colors',
                  showConfig
                    ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg-hover)]',
                )}>
                <Settings size={12} /> Notificaciones
              </button>

              <button onClick={handleDigest} disabled={sendingDigest}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border font-semibold text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-60"
                style={{ borderColor: 'var(--border)' }}>
                {sendingDigest ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                Enviar digest
              </button>

              <button onClick={() => { setShowForm(true); setEditEvent(null) }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-semibold text-white transition-colors"
                style={{ backgroundColor: 'var(--accent)' }}>
                <Plus size={13} /> Nuevo evento
              </button>
            </div>
          </div>

          {/* config panel */}
          {showConfig && <NotifConfigPanel onClose={() => setShowConfig(false)} />}

          {/* form */}
          {(showForm || editEvent) && (
            <EventForm
              initial={editEvent
                ? { type: editEvent.type as any, title: editEvent.title, description: editEvent.description, eventDate: editEvent.eventDate, employeeId: editEvent.employeeId, daysNotice: editEvent.daysNotice }
                : EMPTY_FORM}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditEvent(null) }}
              saving={saving}
            />
          )}

          {/* events list */}
          <div className="rounded-2xl border overflow-hidden"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="px-5 py-3.5 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
              <Calendar size={14} style={{ color: 'var(--accent)' }} />
              <span className="text-sm font-semibold text-[var(--text-1)]">
                {selectedDate
                  ? parseLocalDate(selectedDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
                  : `Próximos eventos${typeFilter !== 'all' ? ` · ${TYPE_META[typeFilter as EventType]?.label}` : ''}`}
              </span>
              <span className="ml-auto text-xs text-[var(--text-3)]">{displayEvents.length} evento{displayEvents.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {loadingUpcoming ? (
                <div className="flex items-center justify-center py-16 gap-2 text-[var(--text-3)]">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Cargando...</span>
                </div>
              ) : displayEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl mb-4 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
                    <Calendar size={28} className="text-[var(--text-3)]" />
                  </div>
                  <p className="text-sm font-medium text-[var(--text-2)]">Sin eventos</p>
                  <p className="text-xs text-[var(--text-3)] mt-1">No hay eventos para los filtros seleccionados</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {displayEvents.map((e) => (
                    <div key={e.id}>
                      {deletingId === e.id ? (
                        <div className="flex items-center justify-between p-3 rounded-xl border bg-red-500/5" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-sm text-red-500">¿Eliminar <strong>{e.title}</strong>?</span>
                          <div className="flex gap-2">
                            <button onClick={() => deleteMut.mutate(e.id)} disabled={deleteMut.isPending}
                              className="px-3 py-1 text-xs font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                              {deleteMut.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Eliminar'}
                            </button>
                            <button onClick={() => setDeletingId(null)}
                              className="px-3 py-1 text-xs border rounded-lg text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-colors"
                              style={{ borderColor: 'var(--border)' }}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <EventCard
                          event={e}
                          onEdit={e.isAuto ? undefined : () => openEdit(e)}
                          onDelete={e.isAuto ? undefined : () => setDeletingId(e.id)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── sidebar: mini calendar ── */}
        <div className="w-64 flex-shrink-0 space-y-4 hidden lg:block">
          <MiniCalendar
            events={upcoming}
            onSelectDate={(d) => setSelectedDate((prev) => prev === d ? null : d)}
          />

          {/* upcoming birthdays */}
          <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
              <Gift size={13} className="text-pink-500" />
              <span className="text-xs font-semibold text-[var(--text-1)]">Próximos cumpleaños</span>
            </div>
            <div className="p-2 space-y-1">
              {upcoming.filter((e) => e.type === 'birthday').slice(0, 5).map((e) => {
                const badge = daysLabel(e.daysAway ?? 0)
                return (
                  <div key={e.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--text-1)] truncate">{e.employeeName}</p>
                      <p className="text-[10px] text-[var(--text-3)] capitalize">
                        {parseLocalDate(e.eventDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2', badge.cls)}>
                      {badge.text}
                    </span>
                  </div>
                )
              })}
              {upcoming.filter((e) => e.type === 'birthday').length === 0 && (
                <p className="text-xs text-[var(--text-3)] text-center py-3">Sin cumpleaños próximos</p>
              )}
            </div>
          </div>

          {/* expiring contracts */}
          <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
              <FileText size={13} className="text-amber-500" />
              <span className="text-xs font-semibold text-[var(--text-1)]">Contratos por vencer</span>
            </div>
            <div className="p-2 space-y-1">
              {upcoming.filter((e) => e.type === 'contract_expiry').slice(0, 5).map((e) => {
                const badge = daysLabel(e.daysAway ?? 0)
                return (
                  <div key={e.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--text-1)] truncate">{e.employeeName}</p>
                      <p className="text-[10px] text-[var(--text-3)]">
                        {parseLocalDate(e.eventDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2', badge.cls)}>
                      {badge.text}
                    </span>
                  </div>
                )
              })}
              {upcoming.filter((e) => e.type === 'contract_expiry').length === 0 && (
                <p className="text-xs text-[var(--text-3)] text-center py-3">Sin contratos por vencer</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
