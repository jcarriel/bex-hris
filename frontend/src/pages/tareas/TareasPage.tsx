import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DragDropContext, Droppable, Draggable, DropResult,
} from '@hello-pangea/dnd'
import {
  Plus, X, CheckCircle2, CirclePause, Circle,
  User, Calendar, MessageSquare, Send,
  UserCheck, Trash2, RefreshCw, XCircle, Loader2,
  GripVertical,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { useAuthStore, hasAction } from '@/store/authStore'
import { tasksService, Task, TaskStatus, TaskPriority } from '@/services/tasks.service'
import { api } from '@/services/api'

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserOption { id: string; nombre: string; username: string; email: string }

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<TaskStatus, {
  label: string; color: string; bg: string; border: string;
  headerBg: string; headerText: string; dropBg: string;
  icon: React.ElementType
}> = {
  pending: {
    label: 'Pendiente',
    color: 'text-slate-600 dark:text-slate-300',
    bg: 'bg-slate-50 dark:bg-slate-800/60',
    border: 'border-slate-200 dark:border-slate-700',
    headerBg: 'bg-slate-100 dark:bg-slate-800',
    headerText: 'text-slate-700 dark:text-slate-200',
    dropBg: 'bg-slate-100/80 dark:bg-slate-700/30',
    icon: Circle,
  },
  in_progress: {
    label: 'En progreso',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50/60 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    headerBg: 'bg-gradient-to-r from-blue-500 to-blue-600',
    headerText: 'text-white',
    dropBg: 'bg-blue-50 dark:bg-blue-900/30',
    icon: RefreshCw,
  },
  paused: {
    label: 'Pausada',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50/60 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    headerBg: 'bg-gradient-to-r from-amber-400 to-orange-500',
    headerText: 'text-white',
    dropBg: 'bg-amber-50 dark:bg-amber-900/30',
    icon: CirclePause,
  },
  completed: {
    label: 'Completada',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50/60 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    headerBg: 'bg-gradient-to-r from-emerald-500 to-teal-600',
    headerText: 'text-white',
    dropBg: 'bg-emerald-50 dark:bg-emerald-900/30',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rechazada',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50/60 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    headerBg: 'bg-gradient-to-r from-red-500 to-rose-600',
    headerText: 'text-white',
    dropBg: 'bg-red-50 dark:bg-red-900/30',
    icon: XCircle,
  },
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string; dot: string; border: string }> = {
  low:    { label: 'Baja',  color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-700',   dot: 'bg-slate-400', border: 'border-slate-300 dark:border-slate-600' },
  medium: { label: 'Media', color: 'text-amber-700 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/30',  dot: 'bg-amber-400', border: 'border-amber-200 dark:border-amber-700' },
  high:   { label: 'Alta',  color: 'text-red-600 dark:text-red-400',   bg: 'bg-red-50 dark:bg-red-900/30',    dot: 'bg-red-500',   border: 'border-red-200 dark:border-red-700' },
}

const PRIORITY_LEFT_BORDER: Record<TaskPriority, string> = {
  low:    'border-l-slate-300',
  medium: 'border-l-amber-400',
  high:   'border-l-red-500',
}

const ASSIGNEE_TRANSITIONS: Record<TaskStatus, { to: TaskStatus; label: string; variant: 'accent' | 'danger' | 'neutral' }[]> = {
  pending:     [{ to: 'in_progress', label: 'Iniciar',   variant: 'accent' }, { to: 'rejected', label: 'Rechazar', variant: 'danger' }],
  in_progress: [{ to: 'paused',      label: 'Pausar',    variant: 'neutral' }, { to: 'completed', label: 'Completar', variant: 'accent' }],
  paused:      [{ to: 'in_progress', label: 'Reanudar',  variant: 'accent' }, { to: 'completed', label: 'Completar', variant: 'accent' }],
  completed:   [{ to: 'pending',     label: 'Reabrir',   variant: 'neutral' }],
  rejected:    [],
}

const BOARD_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'paused', 'completed']

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d)
}

function dueDateLabel(dueDate: string) {
  const d = parseDate(dueDate)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.floor((d.getTime() - today.getTime()) / 86400000)
  if (diff < 0)  return { text: `Vence hace ${-diff}d`, urgent: true }
  if (diff === 0) return { text: 'Vence hoy', urgent: true }
  if (diff === 1) return { text: 'Vence mañana', urgent: false }
  return { text: `Vence en ${diff}d`, urgent: false }
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({
  task, onClick, dragHandleProps, isDragging,
}: {
  task: Task
  onClick: () => void
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  isDragging?: boolean
}) {
  const pri = PRIORITY_CONFIG[task.priority]
  const due = dueDateLabel(task.dueDate)

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-[var(--bg-surface)] border border-[var(--border)] border-l-4 rounded-xl p-3.5 cursor-pointer',
        'hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group select-none',
        PRIORITY_LEFT_BORDER[task.priority],
        isDragging && 'shadow-xl rotate-1 scale-[1.02] border-[var(--accent)]',
      )}
    >
      {/* Header: priority badge + drag handle */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className={cn(
          'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border',
          pri.bg, pri.color, pri.border,
        )}>
          <span className={cn('w-1.5 h-1.5 rounded-full', pri.dot)} />
          {pri.label}
        </span>
        <div
          {...dragHandleProps}
          onClick={(e) => e.stopPropagation()}
          className="p-0.5 rounded text-[var(--text-3)] opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={13} />
        </div>
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-[var(--text-1)] leading-snug line-clamp-2 group-hover:text-[var(--accent)] transition-colors mb-2">
        {task.title}
      </p>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-[var(--text-3)] mb-2.5 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Footer: date + assignee */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border)]">
        <span className={cn(
          'text-[11px] flex items-center gap-1 font-medium',
          due.urgent ? 'text-red-500' : 'text-[var(--text-3)]',
        )}>
          <Calendar size={10} />
          {due.text}
        </span>
        {task.assigneeName ? (
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-[9px] font-bold text-[var(--accent)]">
              {getInitials(task.assigneeName)}
            </div>
            <span className="text-[11px] text-[var(--text-3)] max-w-[80px] truncate">{task.assigneeName}</span>
          </div>
        ) : (
          <span className="text-[11px] text-[var(--text-3)] flex items-center gap-1 italic">
            <User size={10} /> Sin asignar
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Status Column ────────────────────────────────────────────────────────────
function StatusColumn({
  status, tasks, onCardClick, isOver,
}: {
  status: TaskStatus; tasks: Task[]; onCardClick: (t: Task) => void; isOver?: boolean
}) {
  const cfg = STATUS_CONFIG[status]
  return (
    <div className={cn(
      'rounded-2xl border flex flex-col min-h-[300px] overflow-hidden transition-shadow duration-150',
      cfg.border,
      isOver && 'shadow-lg ring-2 ring-[var(--accent)] ring-offset-1',
    )}>
      {/* Column header */}
      <div className={cn('flex items-center gap-2 px-4 py-3', cfg.headerBg)}>
        <cfg.icon size={14} className={cfg.headerText} />
        <span className={cn('text-xs font-bold uppercase tracking-wider flex-1', cfg.headerText)}>
          {cfg.label}
        </span>
        <span className={cn(
          'text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[22px] text-center',
          'bg-white/25 backdrop-blur-sm',
          cfg.headerText,
        )}>
          {tasks.length}
        </span>
      </div>

      {/* Cards area */}
      <div className={cn(
        'flex flex-col gap-2 p-2.5 flex-1 transition-colors duration-150',
        isOver ? cfg.dropBg : 'bg-[var(--bg-card)]',
      )}>
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} onClick={() => onCardClick(t)} />
        ))}
        {tasks.length === 0 && !isOver && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-6">
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center opacity-30', cfg.bg)}>
              <cfg.icon size={16} className={cfg.color} />
            </div>
            <span className="text-[11px] text-[var(--text-3)] italic">Sin tareas</span>
          </div>
        )}
        {isOver && (
          <div className={cn(
            'flex-1 flex items-center justify-center rounded-xl border-2 border-dashed min-h-[60px]',
            cfg.border, cfg.color, 'opacity-60',
          )}>
            <span className="text-xs font-medium">Soltar aquí</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Task Form ────────────────────────────────────────────────────────────────
function TaskForm({ users, onSave, onClose, isPending }: {
  users: UserOption[]; onSave: (data: any) => void; onClose: () => void; isPending: boolean
}) {
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', priority: 'medium' as TaskPriority, assignedTo: '' })
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={isPending ? undefined : onClose}>
      <form
        className="bg-[var(--bg-surface)] rounded-2xl shadow-2xl border border-[var(--border)] w-full max-w-md mx-4 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); if (!form.title.trim() || !form.dueDate || isPending) return; onSave({ ...form, assignedTo: form.assignedTo || undefined }) }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[var(--text-1)]">Nueva Tarea</h2>
            <p className="text-xs text-[var(--text-3)]">Completa los detalles para crear la tarea</p>
          </div>
          <button type="button" onClick={onClose} disabled={isPending}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-3)] disabled:opacity-40">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-[var(--text-2)] mb-1.5 block">Título <span className="text-red-400">*</span></label>
            <input required value={form.title} onChange={(e) => set('title', e.target.value)} disabled={isPending}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-1)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-50 transition-all"
              placeholder="¿Qué hay que hacer?" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-2)] mb-1.5 block">Descripción</label>
            <textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} disabled={isPending}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-1)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 resize-none disabled:opacity-50 transition-all"
              placeholder="Detalles adicionales..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--text-2)] mb-1.5 block">Fecha límite <span className="text-red-400">*</span></label>
              <input required type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} disabled={isPending}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-1)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-50 transition-all" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-2)] mb-1.5 block">Prioridad</label>
              <select value={form.priority} onChange={(e) => set('priority', e.target.value)} disabled={isPending}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-1)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-50 transition-all">
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-2)] mb-1.5 block">Asignar a</label>
            <select value={form.assignedTo} onChange={(e) => set('assignedTo', e.target.value)} disabled={isPending}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-1)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-50 transition-all">
              <option value="">Sin asignar</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.nombre || u.username}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={isPending}
            className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-40">
            Cancelar
          </button>
          <button type="submit" disabled={isPending}
            className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-[var(--accent)] text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-70 flex items-center justify-center gap-2">
            {isPending ? <><Loader2 size={14} className="animate-spin" /> Creando...</> : <><Plus size={14} /> Crear Tarea</>}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── MetaBlock ─────────────────────────────────────────────────────────────────
function MetaBlock({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border)]">
      <div className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider flex items-center gap-1 mb-1.5">
        <Icon size={10} /> {label}
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  )
}

const ACTION_LABELS: Record<string, string> = {
  created: 'creación',
  status_change: 'cambio de estado',
  reassign: 'reasignación',
}

// ─── Task Detail Panel ─────────────────────────────────────────────────────────
function TaskDetailPanel({ task, users, currentUserId, isAdmin, canDeletePerm, onClose, onRefresh }: {
  task: Task; users: UserOption[]; currentUserId: string; isAdmin: boolean; canDeletePerm: boolean; onClose: () => void; onRefresh: () => void;
}) {
  const qc = useQueryClient()
  const cfg   = STATUS_CONFIG[task.status]
  const pri   = PRIORITY_CONFIG[task.priority]
  const due   = dueDateLabel(task.dueDate)
  const [comment, setComment]                 = useState('')
  const [confirmDelete, setConfirmDelete]     = useState(false)
  const [showReassign, setShowReassign]       = useState(false)
  const [reassignTo, setReassignTo]           = useState(task.assignedTo || '')
  const [rejectNote, setRejectNote]           = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)

  const isCreator  = task.createdBy  === currentUserId
  const isAssignee = task.assignedTo === currentUserId
  const canAct     = isAssignee || isAdmin
  const canDelete  = (isCreator || isAdmin) && canDeletePerm
  const canReassign= isCreator  || isAdmin
  const transitions = canAct ? (ASSIGNEE_TRANSITIONS[task.status] ?? []) : []

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['task-comments', task.id],
    queryFn: () => tasksService.getComments(task.id),
    staleTime: 0,
    refetchOnMount: true,
  })

  const changeStatus = useMutation({
    mutationFn: ({ status, note }: { status: TaskStatus; note?: string }) =>
      tasksService.changeStatus(task.id, status, note),
    onSuccess: () => { onRefresh(); refetchComments(); setShowRejectInput(false) },
  })

  const reassign = useMutation({
    mutationFn: (assignedTo: string) => tasksService.reassign(task.id, assignedTo),
    onSuccess: () => { setShowReassign(false); onRefresh(); refetchComments() },
  })

  const deleteTask = useMutation({
    mutationFn: () => tasksService.delete(task.id),
    onSuccess: () => { onClose(); onRefresh() },
  })

  const addComment = useMutation({
    mutationFn: (text: string) => tasksService.addComment(task.id, text),
    onSuccess: () => { setComment(''); refetchComments() },
  })

  const handleTransition = (to: TaskStatus) => {
    if (to === 'rejected') { setShowRejectInput(true); return }
    changeStatus.mutate({ status: to })
  }

  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40 backdrop-blur-sm" />
      <div
        className="w-full max-w-lg bg-[var(--bg-surface)] border-l border-[var(--border)] flex flex-col h-full overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={cn('px-5 py-4 border-b border-[var(--border)]', cfg.bg)}>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={cn(
                  'inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full',
                  cfg.headerBg, cfg.headerText,
                )}>
                  <cfg.icon size={10} />
                  {cfg.label}
                </span>
                <span className={cn(
                  'text-[11px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-full border',
                  pri.bg, pri.color, pri.border,
                )}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', pri.dot)} />
                  {pri.label}
                </span>
              </div>
              <h2 className="text-base font-bold text-[var(--text-1)] leading-snug">{task.title}</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-[var(--bg-hover)] text-[var(--text-3)] flex-shrink-0 mt-0.5">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3">
            <MetaBlock label="Vence" icon={Calendar}>
              <span className={cn('text-sm font-semibold', due.urgent ? 'text-red-500' : 'text-[var(--text-1)]')}>
                {parseDate(task.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              {due.urgent && <span className="text-[11px] text-red-400 font-medium">{due.text}</span>}
            </MetaBlock>
            <MetaBlock label="Asignado a" icon={User}>
              {task.assigneeName ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-[9px] font-bold text-[var(--accent)]">
                    {getInitials(task.assigneeName)}
                  </div>
                  <span className="text-sm font-medium text-[var(--text-1)]">{task.assigneeName}</span>
                </div>
              ) : (
                <span className="text-sm text-[var(--text-3)] italic">Sin asignar</span>
              )}
            </MetaBlock>
            <MetaBlock label="Creado por" icon={UserCheck}>
              <span className="text-sm text-[var(--text-2)]">{task.creatorName || '—'}</span>
            </MetaBlock>
            <MetaBlock label="Fecha creación" icon={Calendar}>
              <span className="text-sm text-[var(--text-2)]">
                {new Date(task.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </MetaBlock>
          </div>

          {/* Description */}
          {task.description && (
            <div className="bg-[var(--bg-card)] rounded-xl p-3.5 border border-[var(--border)]">
              <div className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-2">Descripción</div>
              <p className="text-sm text-[var(--text-2)] leading-relaxed whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Completion / rejection notes */}
          {task.completionNotes && (
            <div className={cn('border rounded-xl p-3.5', task.status === 'rejected'
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800')}>
              <div className={cn('text-xs font-bold mb-1.5 uppercase tracking-wider', task.status === 'rejected' ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400')}>
                {task.status === 'rejected' ? 'Motivo de rechazo' : 'Notas de cierre'}
              </div>
              <p className={cn('text-sm', task.status === 'rejected' ? 'text-red-800 dark:text-red-300' : 'text-emerald-800 dark:text-emerald-300')}>
                {task.completionNotes}
              </p>
            </div>
          )}

          {/* Role notice */}
          {!canAct && !isCreator && (
            <div className="flex items-center gap-2 text-xs text-[var(--text-3)] bg-[var(--bg-card)] rounded-xl px-3 py-2.5 border border-[var(--border)]">
              <User size={12} />
              Solo el creador o el asignado pueden gestionar esta tarea.
            </div>
          )}

          {/* Status transitions */}
          {transitions.length > 0 && !showRejectInput && (
            <div>
              <div className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-2.5">Acciones</div>
              <div className="flex flex-wrap gap-2">
                {transitions.map((t) => (
                  <button key={t.to} onClick={() => handleTransition(t.to)}
                    disabled={changeStatus.isPending}
                    className={cn(
                      'px-4 py-2 text-sm rounded-xl font-semibold border transition-all flex items-center gap-1.5 disabled:opacity-60',
                      t.variant === 'accent'  && 'bg-[var(--accent)] text-white border-[var(--accent)] hover:opacity-90 shadow-sm',
                      t.variant === 'danger'  && 'bg-red-50 text-red-600 border-red-300 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-700',
                      t.variant === 'neutral' && cn(STATUS_CONFIG[t.to].bg, STATUS_CONFIG[t.to].color, STATUS_CONFIG[t.to].border, 'hover:opacity-80'),
                    )}>
                    {changeStatus.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reject input */}
          {showRejectInput && (
            <div className="space-y-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">Motivo del rechazo (opcional)</div>
              <textarea rows={2} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
                disabled={changeStatus.isPending}
                className="w-full px-3 py-2 text-sm rounded-xl border border-red-300 dark:border-red-700 bg-white dark:bg-red-900/30 text-[var(--text-1)] outline-none resize-none disabled:opacity-50"
                placeholder="Explica brevemente por qué rechazas la tarea..." />
              <div className="flex gap-2">
                <button onClick={() => setShowRejectInput(false)} disabled={changeStatus.isPending}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg-hover)] disabled:opacity-40">
                  Cancelar
                </button>
                <button onClick={() => changeStatus.mutate({ status: 'rejected', note: rejectNote || undefined })}
                  disabled={changeStatus.isPending}
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 disabled:opacity-70 flex items-center justify-center gap-1.5">
                  {changeStatus.isPending ? <><Loader2 size={12} className="animate-spin" /> Procesando...</> : 'Confirmar rechazo'}
                </button>
              </div>
            </div>
          )}

          {/* Reassign */}
          {canReassign && (
            <div>
              <button onClick={() => setShowReassign((v) => !v)}
                className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1.5">
                <UserCheck size={12} />
                Reasignar tarea
              </button>
              {showReassign && (
                <div className="mt-2.5 flex gap-2">
                  <select value={reassignTo} onChange={(e) => setReassignTo(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-1)] outline-none focus:border-[var(--accent)]">
                    <option value="">Sin asignar</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.nombre || u.username}</option>)}
                  </select>
                  <button onClick={() => reassign.mutate(reassignTo)} disabled={reassign.isPending}
                    className="px-4 py-2 text-sm rounded-xl bg-[var(--accent)] text-white font-semibold hover:opacity-90 disabled:opacity-70 flex items-center gap-1.5">
                    {reassign.isPending ? <><Loader2 size={12} className="animate-spin" />Guardando</> : 'Guardar'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Activity */}
          <div>
            <div className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <MessageSquare size={11} /> Actividad
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {(comments as any[]).map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[var(--accent)]/15 flex items-center justify-center text-[10px] font-bold text-[var(--accent)] flex-shrink-0 mt-0.5 border border-[var(--accent)]/20">
                    {getInitials(c.userName || '?')}
                  </div>
                  <div className="flex-1 min-w-0 bg-[var(--bg-card)] rounded-xl px-3 py-2.5 border border-[var(--border)]">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-bold text-[var(--text-1)]">{c.userName}</span>
                      <span className="text-[10px] text-[var(--text-3)]">
                        {new Date(c.createdAt).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {c.action && c.action !== 'comment' && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                          {ACTION_LABELS[c.action] ?? c.action}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--text-2)] leading-relaxed">{c.comment}</p>
                  </div>
                </div>
              ))}
              {(comments as any[]).length === 0 && (
                <p className="text-xs text-[var(--text-3)] italic text-center py-4">Sin actividad aún</p>
              )}
            </div>
          </div>
        </div>

        {/* Comment input */}
        {task.status === 'pending' || task.status === 'rejected' ? (
          <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--bg-card)]">
            <p className="text-xs text-[var(--text-3)] text-center italic flex items-center justify-center gap-1.5">
              <MessageSquare size={11} />
              {task.status === 'pending'
                ? 'Los comentarios están disponibles una vez iniciada la tarea'
                : 'No se pueden agregar comentarios a tareas rechazadas'}
            </p>
          </div>
        ) : (
          <div className="px-5 py-3 border-t border-[var(--border)] flex gap-2 bg-[var(--bg-card)]">
            <textarea value={comment} onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (comment.trim()) addComment.mutate(comment.trim()) } }}
              disabled={addComment.isPending}
              rows={1} placeholder="Escribe un comentario..."
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-1)] outline-none focus:border-[var(--accent)] resize-none disabled:opacity-50 transition-all" />
            <button onClick={() => { if (comment.trim()) addComment.mutate(comment.trim()) }}
              disabled={!comment.trim() || addComment.isPending}
              className="p-2 rounded-xl bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-40 transition-opacity flex-shrink-0">
              {addComment.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        )}

        {/* Delete */}
        {canDelete && (
          <div className="px-5 pb-4 pt-2 border-t border-[var(--border)]">
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-xl text-red-500 hover:bg-red-500/10 transition-colors font-medium">
                <Trash2 size={12} /> Eliminar tarea
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(false)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg-hover)]">
                  Cancelar
                </button>
                <button onClick={() => deleteTask.mutate()} disabled={deleteTask.isPending}
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 disabled:opacity-70 flex items-center justify-center gap-1.5">
                  {deleteTask.isPending ? <><Loader2 size={12} className="animate-spin" />Eliminando...</> : 'Confirmar eliminación'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── DnD-aware StatusColumn wrapper ───────────────────────────────────────────
function DroppableColumn({
  status, tasks, onCardClick,
}: {
  status: TaskStatus; tasks: Task[]; onCardClick: (t: Task) => void
}) {
  return (
    <Droppable droppableId={status}>
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col h-full">
          <div className={cn(
            'rounded-2xl border flex flex-col min-h-[300px] overflow-hidden transition-all duration-150',
            STATUS_CONFIG[status].border,
            snapshot.isDraggingOver && 'shadow-lg ring-2 ring-[var(--accent)]/60',
          )}>
            {/* Column header */}
            <div className={cn('flex items-center gap-2 px-4 py-3', STATUS_CONFIG[status].headerBg)}>
              {(() => { const Ic = STATUS_CONFIG[status].icon; return <Ic size={14} className={STATUS_CONFIG[status].headerText} /> })()}
              <span className={cn('text-xs font-bold uppercase tracking-wider flex-1', STATUS_CONFIG[status].headerText)}>
                {STATUS_CONFIG[status].label}
              </span>
              <span className={cn(
                'text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[22px] text-center bg-white/25',
                STATUS_CONFIG[status].headerText,
              )}>
                {tasks.length}
              </span>
            </div>

            {/* Cards area */}
            <div className={cn(
              'flex flex-col gap-2 p-2.5 flex-1 transition-colors duration-150',
              snapshot.isDraggingOver ? STATUS_CONFIG[status].dropBg : 'bg-[var(--bg-card)]',
            )}>
              {tasks.map((t, index) => (
                <Draggable key={t.id} draggableId={t.id} index={index}>
                  {(drag, dragSnap) => (
                    <div ref={drag.innerRef} {...drag.draggableProps}>
                      <TaskCard
                        task={t}
                        onClick={() => onCardClick(t)}
                        dragHandleProps={drag.dragHandleProps as any}
                        isDragging={dragSnap.isDragging}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {tasks.length === 0 && !snapshot.isDraggingOver && (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 py-6">
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center opacity-30', STATUS_CONFIG[status].bg)}>
                    {(() => { const Ic = STATUS_CONFIG[status].icon; return <Ic size={16} className={STATUS_CONFIG[status].color} /> })()}
                  </div>
                  <span className="text-[11px] text-[var(--text-3)] italic">Sin tareas</span>
                </div>
              )}
              {snapshot.isDraggingOver && tasks.length === 0 && (
                <div className={cn(
                  'flex-1 flex items-center justify-center rounded-xl border-2 border-dashed min-h-[60px]',
                  STATUS_CONFIG[status].border, STATUS_CONFIG[status].color, 'opacity-60',
                )}>
                  <span className="text-xs font-semibold">Soltar aquí</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Droppable>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function TareasPage() {
  const user    = useAuthStore((s) => s.user)
  const qc      = useQueryClient()
  const isAdmin = user?.rol === 'admin'
  const canCreate = hasAction(user?.permissions, 'tareas:crear', user?.rol)
  const canDelete = hasAction(user?.permissions, 'tareas:eliminar', user?.rol)
  const [showForm, setShowForm]         = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [filter, setFilter]             = useState<'all' | 'mine'>('mine')
  const [searchQ, setSearchQ]           = useState('')
  const [showRejected, setShowRejected] = useState(false)

  // Track optimistic status changes during drag
  const draggingRef = useRef<{ id: string; from: TaskStatus; to: TaskStatus } | null>(null)

  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ['tasks', filter],
    queryFn: () => filter === 'mine' ? tasksService.getMyTasks() : tasksService.getAll(),
  })

  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => api.get<{ success: boolean; data: UserOption[] }>('/users').then((r) => r.data.data),
  })

  const { data: stats } = useQuery({
    queryKey: ['task-stats'],
    queryFn: tasksService.getStats,
  })

  const createTask = useMutation({
    mutationFn: tasksService.create,
    onSuccess: () => { setShowForm(false); refetch(); qc.invalidateQueries({ queryKey: ['task-stats'] }) },
  })

  const dragStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      tasksService.changeStatus(id, status),
    onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ['task-stats'] }) },
    onError: () => { refetch() }, // revert on failure
  })

  // Keep detail panel in sync with fresh task data
  useEffect(() => {
    if (selectedTask) {
      const fresh = tasks.find((t) => t.id === selectedTask.id)
      if (fresh) setSelectedTask(fresh)
    }
  }, [tasks])

  const filtered = tasks.filter((t) =>
    !searchQ || t.title.toLowerCase().includes(searchQ.toLowerCase()) || t.description?.toLowerCase().includes(searchQ.toLowerCase())
  )

  const byStatus = (status: TaskStatus) => filtered.filter((t) => t.status === status)
  const rejectedTasks = byStatus('rejected')

  const handleRefresh = () => { refetch(); qc.invalidateQueries({ queryKey: ['task-stats'] }) }

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId) return // same column — no action

    const newStatus = destination.droppableId as TaskStatus
    dragStatus.mutate({ id: draggableId, status: newStatus })
  }

  return (
    <div className="p-5 h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-1)]">Tareas</h1>
          <p className="text-xs text-[var(--text-3)]">Gestiona y da seguimiento a las tareas del equipo</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
            {(['mine', 'all'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn(
                  'px-4 py-2 text-xs font-semibold transition-all',
                  filter === f
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--text-2)] hover:bg-[var(--bg-hover)]',
                )}>
                {f === 'mine' ? 'Mis tareas' : 'Todas'}
              </button>
            ))}
          </div>
          <input type="text" value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Buscar tarea..."
            className="px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-1)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 w-40 transition-all" />
          {canCreate && (
            <button onClick={() => setShowForm(true)} disabled={createTask.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-60 shadow-sm">
              <Plus size={13} /> Nueva tarea
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="flex gap-2 flex-wrap">
          {([...BOARD_STATUSES, 'rejected'] as TaskStatus[]).map((s) => {
            const cfg = STATUS_CONFIG[s]
            const count = (stats as any)[s] ?? 0
            return (
              <div key={s} className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium',
                cfg.bg, cfg.border,
              )}>
                <cfg.icon size={12} className={cfg.color} />
                <span className={cn('font-bold text-sm', cfg.color)}>{count}</span>
                <span className="text-[var(--text-3)]">{cfg.label}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Board */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center gap-3">
          <RefreshCw size={20} className="animate-spin text-[var(--accent)]" />
          <span className="text-sm text-[var(--text-3)]">Cargando tareas...</span>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 flex flex-col gap-3 overflow-auto pb-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {BOARD_STATUSES.map((s) => (
                <DroppableColumn key={s} status={s} tasks={byStatus(s)} onCardClick={setSelectedTask} />
              ))}
            </div>

            {/* Rejected section (collapsible) */}
            {rejectedTasks.length > 0 && (
              <div className="mt-1">
                <button
                  onClick={() => setShowRejected((v) => !v)}
                  className="flex items-center gap-2 text-xs font-bold text-red-500 hover:text-red-600 mb-2.5 transition-colors"
                >
                  <XCircle size={13} />
                  {showRejected ? 'Ocultar' : 'Ver'} rechazadas ({rejectedTasks.length})
                </button>
                {showRejected && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    <StatusColumn status="rejected" tasks={rejectedTasks} onCardClick={setSelectedTask} />
                  </div>
                )}
              </div>
            )}
          </div>
        </DragDropContext>
      )}

      {/* Task form modal */}
      {showForm && (
        <TaskForm users={users} onSave={(data) => createTask.mutate(data)} onClose={() => !createTask.isPending && setShowForm(false)} isPending={createTask.isPending} />
      )}

      {/* Task detail panel */}
      {selectedTask && (
        <TaskDetailPanel
          key={selectedTask.id}
          task={selectedTask}
          users={users}
          currentUserId={user?.id || ''}
          isAdmin={isAdmin}
          canDeletePerm={canDelete}
          onClose={() => setSelectedTask(null)}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  )
}
