import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leavesService, Leave } from '@/services/leaves.service'
import { empleadosService } from '@/services/empleados.service'
import { Plus, Check, X, Trash2, Loader2, Palmtree, AlertTriangle, FileDown, ChevronLeft, ChevronRight, CalendarDays, List } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import jsPDF from 'jspdf'
import { EmployeeSearchSelect } from '@/components/shared/EmployeeSearchSelect'

const LEAVE_TYPES_LABEL: Record<string, string> = {
  vacation: 'Vacaciones',
  medical: 'Médico',
  maternity: 'Maternidad',
  personal: 'Personal',
  unpaid: 'Sin pago',
}

const STATUS_LABEL: Record<string, string> = {
  pending:  'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
}

const STATUS_COLOR: Record<string, string> = {
  pending:  'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  approved: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  rejected: 'bg-red-500/15 text-red-500',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLOR[status] || 'bg-[var(--bg-hover)] text-[var(--text-3)]')}>
      {STATUS_LABEL[status] || status}
    </span>
  )
}

interface NewLeaveForm {
  employeeId: string
  startDate: string
  endDate: string
  reason: string
}

function calcDays(start: string, end: string) {
  if (!start || !end) return 0
  const diff = new Date(end).getTime() - new Date(start).getTime()
  return Math.max(1, Math.round(diff / 86400000) + 1)
}

function formatDate(d: string) {
  if (!d) return d
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function datesOverlap(start1: string, end1: string, start2: string, end2: string) {
  return start1 <= end2 && start2 <= end1
}

// ─── PDF Generation ───────────────────────────────────────────────────────────
function generateVacationPDF(leave: Leave, emp: any) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const margin = 20
  const col = W - margin * 2

  // ── Color palette ──
  const BLUE: [number, number, number]  = [30, 64, 175]
  const GRAY: [number, number, number]  = [100, 116, 139]
  const LIGHT: [number, number, number] = [241, 245, 249]
  const BLACK: [number, number, number] = [15, 23, 42]

  let y = 0

  // ── Header bar ──
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, W, 28, 'F')

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('BEX HRIS', margin, 12)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Sistema de Gestión de Recursos Humanos', margin, 18)

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('SOLICITUD DE VACACIONES', W - margin, 12, { align: 'right' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`No. ${leave.id.slice(0, 8).toUpperCase()}`, W - margin, 18, { align: 'right' })

  y = 36

  // ── Status pill ──
  const statusColors: Record<string, [number,number,number]> = {
    pending:  [234, 179, 8],
    approved: [22, 163, 74],
    rejected: [220, 38, 38],
  }
  const statusLabels: Record<string, string> = { pending: 'PENDIENTE', approved: 'APROBADA', rejected: 'RECHAZADA' }
  const sColor = statusColors[leave.status] ?? GRAY
  doc.setFillColor(...sColor)
  doc.roundedRect(W - margin - 36, y - 6, 36, 8, 2, 2, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(statusLabels[leave.status] ?? leave.status, W - margin - 18, y - 0.5, { align: 'center' })

  // ── Section: Datos del Empleado ──
  y += 4
  doc.setFillColor(...BLUE)
  doc.rect(margin, y, col, 7, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('DATOS DEL EMPLEADO', margin + 3, y + 5)
  y += 10

  const empName = emp ? `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() : '—'
  const rows1: [string, string, string, string][] = [
    ['Nombres y Apellidos', empName,       'Cédula',        emp?.cedula ?? '—'],
    ['Cargo',     emp?.positionName ?? '—', 'Departamento',  emp?.departmentName ?? '—'],
    ['Fecha de Ingreso', emp?.hireDate ? formatDate(emp.hireDate) : '—', 'Estado', emp?.status === 'active' ? 'Activo' : (emp?.status ?? '—')],
  ]

  doc.setTextColor(...BLACK)
  rows1.forEach(([l1, v1, l2, v2]) => {
    doc.setFillColor(...LIGHT)
    doc.rect(margin, y, col / 2, 8, 'F')
    doc.rect(margin + col / 2, y, col / 2, 8, 'F')
    doc.setDrawColor(200, 210, 220)
    doc.rect(margin, y, col / 2, 8, 'S')
    doc.rect(margin + col / 2, y, col / 2, 8, 'S')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GRAY)
    doc.text(l1, margin + 2, y + 3)
    doc.text(l2, margin + col / 2 + 2, y + 3)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...BLACK)
    doc.text(v1, margin + 2, y + 7)
    doc.text(v2, margin + col / 2 + 2, y + 7)
    y += 10
  })

  y += 4

  // ── Section: Detalle de la Solicitud ──
  doc.setFillColor(...BLUE)
  doc.rect(margin, y, col, 7, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('DETALLE DE LA SOLICITUD', margin + 3, y + 5)
  y += 10

  const rows2: [string, string, string, string][] = [
    ['Fecha de Inicio', formatDate(leave.startDate), 'Fecha de Fin', formatDate(leave.endDate)],
    ['Número de Días', `${leave.days} día(s)`,       'Tipo',         'Vacaciones'],
    ['Fecha de Solicitud', leave.createdAt ? formatDate(leave.createdAt.split('T')[0]) : '—', 'Aprobado por', leave.approvedBy ?? '—'],
  ]

  rows2.forEach(([l1, v1, l2, v2]) => {
    doc.setFillColor(...LIGHT)
    doc.rect(margin, y, col / 2, 8, 'F')
    doc.rect(margin + col / 2, y, col / 2, 8, 'F')
    doc.setDrawColor(200, 210, 220)
    doc.rect(margin, y, col / 2, 8, 'S')
    doc.rect(margin + col / 2, y, col / 2, 8, 'S')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GRAY)
    doc.text(l1, margin + 2, y + 3)
    doc.text(l2, margin + col / 2 + 2, y + 3)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...BLACK)
    doc.text(v1, margin + 2, y + 7)
    doc.text(v2, margin + col / 2 + 2, y + 7)
    y += 10
  })

  // ── Motivo ──
  y += 2
  doc.setFillColor(...LIGHT)
  doc.setDrawColor(200, 210, 220)
  doc.rect(margin, y, col, 16, 'FD')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRAY)
  doc.text('MOTIVO / OBSERVACIONES', margin + 2, y + 4)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...BLACK)
  const motivoLines = doc.splitTextToSize(leave.reason || 'Sin observaciones.', col - 6)
  doc.text(motivoLines, margin + 2, y + 10)
  y += 22

  // ── Legal text ──
  y += 2
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...GRAY)
  const legalText = `El/La suscrito/a, identificado/a con los datos arriba indicados, solicita formalmente el período de vacaciones comprendido entre el ${formatDate(leave.startDate)} y el ${formatDate(leave.endDate)}, por un total de ${leave.days} día(s) hábiles, de conformidad con lo establecido en el Código de Trabajo del Ecuador y la normativa interna de la empresa.`
  const legalLines = doc.splitTextToSize(legalText, col)
  doc.text(legalLines, margin, y)
  y += legalLines.length * 4 + 6

  // ── Signatures ──
  doc.setFillColor(...BLUE)
  doc.rect(margin, y, col, 7, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('FIRMAS Y APROBACIONES', margin + 3, y + 5)
  y += 14

  const sigW = col / 3
  const sigLabels = ['EMPLEADO SOLICITANTE', 'JEFE INMEDIATO', 'RECURSOS HUMANOS']
  const sigNames  = [empName, '', '']

  sigLabels.forEach((label, i) => {
    const x = margin + i * sigW
    doc.setDrawColor(...BLUE)
    doc.setLineWidth(0.4)
    doc.line(x + 4, y + 14, x + sigW - 4, y + 14)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLUE)
    doc.text(label, x + sigW / 2, y + 19, { align: 'center' })
    if (sigNames[i]) {
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...GRAY)
      doc.text(sigNames[i], x + sigW / 2, y + 23, { align: 'center' })
    }
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text('Firma', x + sigW / 2, y + 9, { align: 'center' })
  })

  y += 30

  // ── Footer ──
  doc.setFillColor(...LIGHT)
  doc.rect(0, 287 - 12, W, 12, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text(`Generado el ${new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })} — BEX HRIS · Sistema de Gestión de RRHH`, W / 2, 287 - 4, { align: 'center' })

  // ── Save ──
  const fileName = `Vacaciones_${empName.replace(/\s+/g, '_')}_${leave.startDate}.pdf`
  doc.save(fileName)
}

// ─── Team Availability Calendar ───────────────────────────────────────────────
const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function TeamCalendar({ leaves, empMap }: { leaves: Leave[]; empMap: Map<string, string> }) {
  const now = new Date()
  const [viewYear,  setViewYear]  = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth()) // 0-11

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  // Monday-based offset (0=Mon … 6=Sun)
  const startOffset = (firstDay.getDay() + 6) % 7
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7

  // Build a map: "YYYY-MM-DD" -> { approved: string[], pending: string[] }
  const dayMap = useMemo(() => {
    const map = new Map<string, { approved: string[]; pending: string[] }>()
    const vacLeaves = leaves.filter(l => l.type === 'vacation' && l.status !== 'rejected')
    for (const l of vacLeaves) {
      const [sy, sm, sd] = l.startDate.split('-').map(Number)
      const [ey, em, ed] = l.endDate.split('-').map(Number)
      const start = new Date(sy, sm - 1, sd)
      const end   = new Date(ey, em - 1, ed)
      const empName = empMap.get(l.employeeId) || l.employeeId
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
          const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
          if (!map.has(key)) map.set(key, { approved: [], pending: [] })
          if (l.status === 'approved') map.get(key)!.approved.push(empName)
          else map.get(key)!.pending.push(empName)
        }
      }
    }
    return map
  }, [leaves, empMap, viewYear, viewMonth])

  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--bg-surface)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-hover)]">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[var(--bg-surface)] transition-colors text-[var(--text-2)]"><ChevronLeft size={15} /></button>
        <span className="text-sm font-semibold text-[var(--text-1)]">{MONTH_NAMES[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[var(--bg-surface)] transition-colors text-[var(--text-2)]"><ChevronRight size={15} /></button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-[var(--border)] text-[11px]">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />Aprobado</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />Pendiente</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {DAY_NAMES.map(d => (
          <div key={d} className="px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)] border-b border-[var(--border)]">{d}</div>
        ))}
        {Array.from({ length: totalCells }, (_, i) => {
          const dayNum = i - startOffset + 1
          const isValid = dayNum >= 1 && dayNum <= daysInMonth
          const key = isValid ? `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}` : ''
          const entry = isValid ? dayMap.get(key) : undefined
          const isToday = key === todayStr
          const hasAny = entry && (entry.approved.length + entry.pending.length) > 0

          return (
            <div key={i} className={cn(
              'min-h-[80px] p-1 border-b border-r border-[var(--border)] last:border-r-0 relative',
              !isValid && 'bg-[var(--bg-hover)]/40',
              isToday && 'bg-[var(--accent)]/5',
            )}>
              {isValid && (
                <>
                  <span className={cn(
                    'text-[11px] font-semibold inline-flex items-center justify-center w-5 h-5 rounded-full mb-0.5',
                    isToday ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-3)]',
                  )}>{dayNum}</span>
                  <div className="space-y-0.5">
                    {entry?.approved.slice(0, 2).map((name, idx) => (
                      <div key={idx} title={name} className="flex items-center gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded px-1 py-0.5">
                        <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">{getInitials(name)}</span>
                        <span className="text-[10px] font-medium truncate">{name.split(' ')[0]}</span>
                      </div>
                    ))}
                    {entry?.pending.slice(0, 2).map((name, idx) => (
                      <div key={idx} title={name} className="flex items-center gap-1 bg-amber-400/10 text-amber-700 dark:text-amber-400 rounded px-1 py-0.5">
                        <span className="w-4 h-4 rounded-full bg-amber-400 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">{getInitials(name)}</span>
                        <span className="text-[10px] font-medium truncate">{name.split(' ')[0]}</span>
                      </div>
                    ))}
                    {hasAny && (entry!.approved.length + entry!.pending.length) > 2 && (
                      <div className="text-[9px] text-[var(--text-3)] pl-1">+{entry!.approved.length + entry!.pending.length - 2} más</div>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function VacacionesPage() {
  const qc = useQueryClient()
  const [activeTab,         setActiveTab]         = useState<'list' | 'calendar'>('list')
  const [filterStatus,      setFilterStatus]      = useState<string>('all')
  const [selectedEmployee,  setSelectedEmployee]  = useState<string>('all')
  const [showModal,         setShowModal]         = useState(false)
  const [form,              setForm]              = useState<NewLeaveForm>({ employeeId: '', startDate: '', endDate: '', reason: '' })

  /* ── All leaves ── */
  const { data: allLeaves = [], isLoading } = useQuery({
    queryKey: ['leaves'],
    queryFn: leavesService.getAll,
    staleTime: 30_000,
  })

  /* ── Employees ── */
  const { data: empResult } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => empleadosService.getAll({ limit: 9999 }),
    staleTime: 60_000,
  })
  const employees: any[] = (empResult as any)?.data ?? []
  const empMap  = new Map(employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`]))
  const empFull = new Map(employees.map((e) => [e.id, e]))

  /* ── Vacation balance for selected employee ── */
  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['leave-balance', selectedEmployee],
    queryFn: () => leavesService.getBalance(selectedEmployee),
    enabled: selectedEmployee !== 'all',
    staleTime: 30_000,
  })

  /* ── Existing leaves for employee being edited in modal (for overlap check) ── */
  const { data: empExistingLeaves = [] } = useQuery({
    queryKey: ['leaves-by-employee', form.employeeId],
    queryFn: () => leavesService.getByEmployee(form.employeeId),
    enabled: !!form.employeeId,
    staleTime: 30_000,
  })

  /* ── Overlap detection ── */
  const overlapWarnings: Leave[] = useMemo(() => {
    if (!form.employeeId || !form.startDate || !form.endDate) return []
    return empExistingLeaves.filter((l) =>
      l.status !== 'rejected' &&
      datesOverlap(form.startDate, form.endDate, l.startDate, l.endDate)
    )
  }, [form.startDate, form.endDate, form.employeeId, empExistingLeaves])

  /* ── Vacation period usage (same year as startDate) ── */
  const vacationPeriodYear = form.startDate ? form.startDate.split('-')[0] : null
  const existingVacationDays = useMemo(() => {
    if (!vacationPeriodYear) return 0
    return empExistingLeaves
      .filter((l) => l.type === 'vacation' && l.status !== 'rejected' && l.startDate.startsWith(vacationPeriodYear))
      .reduce((sum, l) => sum + (l.days || 0), 0)
  }, [empExistingLeaves, vacationPeriodYear])

  /* ── Table rows ── */
  const leaves = allLeaves.filter((l) =>
    l.type === 'vacation' &&
    (filterStatus === 'all' || l.status === filterStatus) &&
    (selectedEmployee === 'all' || l.employeeId === selectedEmployee)
  )

  /* ── Mutations ── */
  const createM = useMutation({
    mutationFn: () => leavesService.create({
      employeeId: form.employeeId,
      type: 'vacation',
      startDate: form.startDate,
      endDate: form.endDate,
      days: calcDays(form.startDate, form.endDate),
      reason: form.reason,
    }),
    onSuccess: (newLeave) => {
      qc.invalidateQueries({ queryKey: ['leaves'] })
      qc.invalidateQueries({ queryKey: ['leave-balance', form.employeeId] })
      qc.invalidateQueries({ queryKey: ['leaves-by-employee', form.employeeId] })
      const emp = empFull.get(form.employeeId)
      generateVacationPDF(newLeave, emp)
      toast.success('Solicitud creada — documento descargado')
      setShowModal(false)
      setForm({ employeeId: '', startDate: '', endDate: '', reason: '' })
    },
    onError: () => toast.error('Error al crear solicitud'),
  })

  const approveM = useMutation({
    mutationFn: leavesService.approve,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); toast.success('Aprobado') },
    onError: () => toast.error('Error al aprobar'),
  })

  const rejectM = useMutation({
    mutationFn: leavesService.reject,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); toast.success('Rechazado') },
    onError: () => toast.error('Error al rechazar'),
  })

  const deleteM = useMutation({
    mutationFn: leavesService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); toast.success('Eliminado') },
    onError: () => toast.error('Error al eliminar'),
  })

  const thCls = 'border-b border-[var(--border)] px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-3)]'
  const tdCls = 'border-b border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text-2)]'

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-hover)] w-fit">
          <button onClick={() => setActiveTab('list')}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              activeTab === 'list' ? 'bg-[var(--bg-surface)] text-[var(--text-1)] shadow-sm' : 'text-[var(--text-3)] hover:text-[var(--text-2)]')}>
            <List size={13} /> Lista
          </button>
          <button onClick={() => setActiveTab('calendar')}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              activeTab === 'calendar' ? 'bg-[var(--bg-surface)] text-[var(--text-1)] shadow-sm' : 'text-[var(--text-3)] hover:text-[var(--text-2)]')}>
            <CalendarDays size={13} /> Disponibilidad
          </button>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90">
          <Plus size={14} /> Nueva Solicitud
        </button>
      </div>

      {/* Calendar view */}
      {activeTab === 'calendar' && (
        <TeamCalendar leaves={allLeaves} empMap={empMap} />
      )}

      {activeTab === 'list' && (<>
      {/* Header filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Status filter tabs */}
        {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              filterStatus === s ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-hover)] text-[var(--text-2)] hover:bg-[var(--bg-hover)]'
            )}>
            {s === 'all' ? 'Todos' : STATUS_LABEL[s]}
          </button>
        ))}

        {/* Employee selector (filtro) */}
        <div className="flex items-center gap-2">
          <EmployeeSearchSelect
            value={selectedEmployee === 'all' ? '' : selectedEmployee}
            onChange={(id) => setSelectedEmployee(id || 'all')}
            employees={employees.filter((e) => e.status === 'active')}
            placeholder="Filtrar por empleado..."
            className="w-56"
          />
          {selectedEmployee !== 'all' && (
            <button onClick={() => setSelectedEmployee('all')} className="text-xs text-[var(--text-3)] hover:text-[var(--text-1)] underline">
              Ver todos
            </button>
          )}
        </div>
      </div>

      {/* Vacation balance cards (only when a specific employee is selected) */}
      {selectedEmployee !== 'all' && (
        <div className="grid grid-cols-3 gap-3">
          {balanceLoading ? (
            <div className="col-span-3 flex items-center gap-2 text-xs text-[var(--text-3)] py-2">
              <Loader2 size={13} className="animate-spin" /> Cargando balance...
            </div>
          ) : balance ? (
            <>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-[var(--text-3)] mb-1">Días Acumulados</p>
                <p className="text-2xl font-bold text-[var(--text-1)]">{balance.accrued}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-[var(--text-3)] mb-1">Días Usados</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{balance.used}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-[var(--text-3)] mb-1">Días Disponibles</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{balance.available}</p>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16 text-[var(--text-3)]"><Loader2 className="animate-spin" size={20} /></div>
      ) : leaves.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-[var(--text-3)]">
          <Palmtree size={36} className="mb-2 opacity-30" />
          <div className="text-sm">No hay solicitudes de vacaciones</div>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--bg-surface)]">
          <table className="w-full">
            <thead className="bg-[var(--bg-hover)]">
              <tr>
                {['Empleado', 'Desde', 'Hasta', 'Días', 'Estado', 'Aprobado', 'Motivo', ''].map((h) => (
                  <th key={h} className={thCls}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l.id} className="hover:bg-[var(--bg-hover)/30] transition-colors">
                  <td className={cn(tdCls, 'font-medium text-[var(--text-1)]')}>{empMap.get(l.employeeId) || l.employeeId}</td>
                  <td className={tdCls}>{l.startDate}</td>
                  <td className={tdCls}>{l.endDate}</td>
                  <td className={cn(tdCls, 'font-bold text-[var(--accent)] text-center')}>{l.days}</td>
                  <td className={tdCls}><StatusBadge status={l.status} /></td>
                  <td className={tdCls}>
                    {l.approvedDate
                      ? <span className="text-xs">{formatDate(l.approvedDate)}</span>
                      : <span className="text-[var(--text-3)]">—</span>}
                  </td>
                  <td className={cn(tdCls, 'max-w-[200px] truncate text-[var(--text-3)]')}>{l.reason || '—'}</td>
                  <td className={cn(tdCls, 'text-right')}>
                    <div className="flex items-center justify-end gap-1">
                      {l.status === 'pending' && (
                        <>
                          <button onClick={() => approveM.mutate(l.id)} disabled={approveM.isPending} title="Aprobar" className="p-1.5 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors text-[var(--text-3)]"><Check size={13} /></button>
                          <button onClick={() => rejectM.mutate(l.id)} disabled={rejectM.isPending} title="Rechazar" className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors text-[var(--text-3)]"><X size={13} /></button>
                        </>
                      )}
                      <button
                        onClick={() => generateVacationPDF(l, empFull.get(l.employeeId))}
                        title="Descargar PDF"
                        className="p-1.5 rounded-lg hover:bg-blue-500/10 hover:text-blue-500 transition-colors text-[var(--text-3)]"
                      >
                        <FileDown size={13} />
                      </button>
                      <button onClick={() => { if (confirm('¿Eliminar esta solicitud?')) deleteM.mutate(l.id) }} title="Eliminar" className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors text-[var(--text-3)]"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </>)}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] shadow-2xl w-full max-w-md mx-4 p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[var(--text-1)]">Nueva Solicitud de Vacaciones</h2>
              <button onClick={() => setShowModal(false)} className="text-[var(--text-3)] hover:text-[var(--text-1)]"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--text-3)] font-medium block mb-1">Empleado</label>
                <EmployeeSearchSelect
                  value={form.employeeId}
                  onChange={(id) => setForm({ ...form, employeeId: id, startDate: '', endDate: '' })}
                  employees={employees.filter((e) => e.status === 'active')}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--text-3)] font-medium block mb-1">Desde</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-base)] text-[var(--text-1)] outline-none focus:border-[var(--accent)]" />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-3)] font-medium block mb-1">Hasta</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-base)] text-[var(--text-1)] outline-none focus:border-[var(--accent)]" />
                </div>
              </div>

              {form.startDate && form.endDate && (() => {
                const newDays  = calcDays(form.startDate, form.endDate)
                const total    = existingVacationDays + newDays
                const overNew  = newDays > 15
                const overTot  = total > 15
                const hasExisting = existingVacationDays > 0
                return (
                  <div className="space-y-1.5">
                    <div className={cn('text-xs font-medium flex items-center gap-1.5', overNew ? 'text-red-500' : 'text-[var(--accent)]')}>
                      {overNew && <AlertTriangle size={13} className="flex-shrink-0" />}
                      {newDays} día(s) solicitados
                      {overNew && <span className="font-normal">— máximo 15 días por solicitud</span>}
                    </div>
                    {hasExisting && (
                      <div className={cn('rounded-lg px-3 py-2 text-xs flex items-start gap-1.5',
                        overTot ? 'bg-red-500/10 border border-red-400/40 text-red-600 dark:text-red-400'
                                : 'bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-2)]')}>
                        {overTot && <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />}
                        <span>
                          Ya tiene <strong>{existingVacationDays}</strong> día(s) de vacaciones en {vacationPeriodYear}.
                          {' '}Con esta solicitud el total sería <strong>{total}/15</strong> días.
                          {overTot && ' Se supera el límite del período.'}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Overlap warnings */}
              {overlapWarnings.length > 0 && (
                <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 space-y-1">
                  {overlapWarnings.map((l) => (
                    <div key={l.id} className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                      <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                      <span>
                        Se superpone con permiso existente del{' '}
                        <strong>{formatDate(l.startDate)}</strong> al{' '}
                        <strong>{formatDate(l.endDate)}</strong>
                        {' '}(<StatusBadge status={l.status} />)
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="text-xs text-[var(--text-3)] font-medium block mb-1">Motivo (opcional)</label>
                <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2}
                  className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-base)] text-[var(--text-1)] outline-none focus:border-[var(--accent)] resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-2)] hover:bg-[var(--bg-hover)]">Cancelar</button>
              <button onClick={() => createM.mutate()} disabled={
                !form.employeeId || !form.startDate || !form.endDate || createM.isPending ||
                calcDays(form.startDate, form.endDate) > 15 ||
                (existingVacationDays + calcDays(form.startDate, form.endDate)) > 15
              }
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {createM.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
