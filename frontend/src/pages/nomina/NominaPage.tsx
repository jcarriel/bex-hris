import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DollarSign, Users, TrendingDown, Wallet,
  Search, Trash2, X, Eye, ChevronLeft, ChevronRight,
  FileDown, Loader2, ClipboardList, Check,
} from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { cn } from '@/lib/utils'
import { nominaService, type PayrollRecord } from '@/services/nomina.service'
import { departmentsService } from '@/services/departments.service'
import { marcacionService, type Marcacion } from '@/services/marcacion.service'

/* ─── helpers ────────────────────────────────────────────────────── */

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const COMPANY_NAME = 'BIOEXPORTVAL S.A.S.'

const fmt    = (n: number) =>
  new Intl.NumberFormat('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0)
const fmtUSD = (n: number) => `$${fmt(n)}`

const periodLabel = (year: number, month: number) => `${MONTHS[month - 1]} ${year}`

/** Compute totals from individual fields — do NOT use DB-stored totals */
function calcTotals(r: PayrollRecord) {
  const totalIncome =
    (r.earnedSalary       ?? 0) +
    (r.reserveFunds       ?? 0) +
    (r.twelfthSalary      ?? 0) +
    (r.fourteenthSalary   ?? 0) +
    (r.responsibilityBonus?? 0) +
    (r.productivityBonus  ?? 0) +
    (r.foodAllowance      ?? 0) +
    (r.vacation           ?? 0) +
    (r.overtimeValue50    ?? 0) +
    (r.otherIncome        ?? 0) +
    (r.medicalLeave       ?? 0)

  const totalDeductions =
    (r.quincena           ?? 0) +
    (r.advance            ?? 0) +
    (r.iessContribution   ?? 0) +
    (r.incomeTax          ?? 0) +
    (r.iessLoan           ?? 0) +
    (r.companyLoan        ?? 0) +
    (r.spouseExtension    ?? 0) +
    (r.nonWorkDays        ?? 0) +
    (r.otherDeductions    ?? 0) +
    (r.foodDeduction      ?? 0)

  return {
    totalIncome,
    totalDeductions,
    totalToPay: totalIncome - totalDeductions,
  }
}

const PAGE_SIZE = 15

/* ─── PDF generator ─────────────────────────────────────────────── */

function buildRolHtml(r: PayrollRecord): string {
  const monthName = MONTHS[r.month - 1]
  const t         = calcTotals(r)

  const incomeItems = [
    { label: 'Sueldo',                                          value: r.earnedSalary       ?? 0 },
    { label: 'Fondos Reserva',                                  value: r.reserveFunds       ?? 0 },
    { label: 'Décimo Tercero',                                  value: r.twelfthSalary      ?? 0 },
    { label: 'Décimo Cuarto',                                   value: r.fourteenthSalary   ?? 0 },
    { label: 'Bonificación Responsabilidad',                    value: r.responsibilityBonus?? 0 },
    { label: 'Bonificación Productividad',                      value: r.productivityBonus  ?? 0 },
    { label: 'Alimentación (ART 14 LEY SEG SOCIAL)',            value: r.foodAllowance      ?? 0 },
    { label: 'Vacaciones',                                      value: r.vacation           ?? 0 },
    { label: `Horas Extras 50% (${r.overtimeHours50 ?? 0})`,   value: r.overtimeValue50    ?? 0 },
    { label: 'Descanso Médico',                                 value: r.medicalLeave       ?? 0 },
    { label: 'Otros Ingresos',                                  value: r.otherIncome        ?? 0 },
  ].filter(i => i.value > 0)

  const deductionItems = [
    { label: 'Quincena',            value: r.quincena         ?? 0 },
    { label: 'Anticipo',            value: r.advance          ?? 0 },
    { label: '9.45% IESS',          value: r.iessContribution ?? 0 },
    { label: 'Impuesto a la Renta', value: r.incomeTax        ?? 0 },
    { label: 'Préstamo IESS',       value: r.iessLoan         ?? 0 },
    { label: 'Préstamo Empresarial',value: r.companyLoan      ?? 0 },
    { label: 'Extensión Conyugal',  value: r.spouseExtension  ?? 0 },
    { label: 'Días No Laborados',   value: r.nonWorkDays      ?? 0 },
    { label: 'Alimentación',        value: r.foodDeduction    ?? 0 },
    { label: 'Otros Descuentos',    value: r.otherDeductions  ?? 0 },
  ].filter(i => i.value > 0)

  const itemRow = (label: string, value: number) =>
    `<div class="item-row"><div class="item-label">${label}</div><div class="item-value">$${value.toFixed(2)}</div></div>`

  return `
    <div class="container">
      <div class="header">
        <div class="company-info">
          <div class="company-name">${COMPANY_NAME}</div>
          <div class="company-details">
            SEGUNDA OESTE 205A Y AV PRINC / SAMBORONDON<br>
            RUC: 0992989464001
          </div>
        </div>
      </div>
      <div class="title">Rol de Pagos Individual</div>
      <div class="period">Período: ${monthName} ${r.year}</div>
      <div class="employee-section">
        <div class="employee-label">Empleado:</div>
        <div class="employee-info">
          <div>${r.employeeName}</div>
          <div>C.I.: ${r.cedula}</div>
          ${r.position ? `<div>Cargo: ${r.position}</div>` : ''}
        </div>
        <div class="work-days">Días Trabajados: ${r.workDays || 30}</div>
      </div>
      <div class="content">
        <div class="column">
          <div class="column-title income-title">Ingresos</div>
          ${incomeItems.map(i => itemRow(i.label, i.value)).join('')}
          <div class="total-row">
            <div class="total-label">Total Ingresos</div>
            <div class="total-value total-income-value">$${t.totalIncome.toFixed(2)}</div>
          </div>
        </div>
        <div class="column">
          <div class="column-title deduction-title">Egresos</div>
          ${deductionItems.map(i => itemRow(i.label, i.value)).join('')}
          <div class="total-row">
            <div class="total-label">Total Egresos</div>
            <div class="total-value total-deduction-value">$${t.totalDeductions.toFixed(2)}</div>
          </div>
        </div>
      </div>
      <div class="net-pay-section">
        <div class="net-pay-label">Total a Recibir</div>
        <div class="net-pay-value">$${t.totalToPay.toFixed(2)}</div>
      </div>
      <div class="signature-section">
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-label">Firma Empleador</div>
        </div>
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-label">${r.employeeName}</div>
          <div class="signature-name">C.I.: ${r.cedula}</div>
        </div>
      </div>
    </div>`
}

const PDF_STYLES = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Arial', sans-serif; color: #333; background: white; }
.container { width: 80%; max-width: 800px; margin: 0 auto; padding: 20px 5px 24px; background: white; min-height: 45vh; flex-direction: column; }
.header { border: 1px solid #333; padding: 10px 12px; margin-bottom: 10px; }
.company-name { font-weight: bold; font-size: 10px; margin-bottom: 3px; }
.company-details { font-size: 10px; color: #666; line-height: 1.4; }
.title { text-align: center; font-size: 12px; font-weight: bold; margin: 6px 0 3px; color: #333; }
.period { text-align: center; font-size: 11px; color: #666; margin-bottom: 10px; }
.employee-section { margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #ddd; }
.employee-label { font-weight: bold; font-size: 10px; margin-bottom: 3px; }
.employee-info { font-size: 11px; line-height: 1.7; }
.work-days { text-align: right; font-size: 10px; margin-top: 4px; }
.content { display: flex; gap: 40px; margin-bottom: 10px; }
.column { flex: 1; }
.column-title { font-weight: bold; font-size: 12px; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 2px solid #333; }
.income-title, .deduction-title { color: #000; }
.item-row { display: flex; justify-content: space-between; font-size: 10px; padding: 2px 0; margin-bottom: 1px; }
.item-label { flex: 1; }
.item-value { text-align: right; min-width: 80px; font-weight: 500; }
.total-row { display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; margin-top: 8px; padding-top: 6px; border-top: 1px solid #333; color: #000; }
.total-label { flex: 1; }
.total-value { text-align: right; min-width: 80px; font-weight: bold; }
.net-pay-section { border-top: 3px solid #333; border-bottom: 3px solid #333; padding: 10px 0; margin: 12px 0 16px; display: flex; justify-content: space-between; align-items: center; }
.net-pay-label { font-weight: bold; font-size: 12px; color: #000; }
.net-pay-value { font-size: 14px; font-weight: bold; color: #000; }
.signature-section { display: flex; justify-content: space-between; margin-top: 30px; gap: 40px; flex-grow: 1; align-items: flex-end; padding-top: 25px; }
.signature-block { flex: 1; text-align: center; flex-direction: column; height: 140px; }
.signature-line { border-top: 1px solid #333; flex: 1; margin-bottom: 5px; }
.signature-label { font-size: 11px; font-weight: bold; color: #000; }
.signature-name { font-size: 11px; color: #000; margin-top: 2px; }
`

async function exportPdf(records: PayrollRecord[], filename: string) {
  if (!records.length) return

  const pdf  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  const pageW = 210

  for (let i = 0; i < records.length; i++) {
    const r = records[i]

    // Render inside an isolated iframe so the app's oklch CSS variables
    // never bleed in (html2canvas doesn't support oklch)
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;border:none;visibility:hidden;'
    document.body.appendChild(iframe)

    try {
      const doc = iframe.contentDocument!
      doc.open()
      doc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${PDF_STYLES}</style></head><body>${buildRolHtml(r)}</body></html>`)
      doc.close()

      // Wait for iframe to layout
      await new Promise<void>((resolve) => {
        if (iframe.contentWindow!.document.readyState === 'complete') resolve()
        else iframe.addEventListener('load', () => resolve(), { once: true })
      })

      const body   = doc.body
      const canvas = await html2canvas(body, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width:  body.scrollWidth,
        height: body.scrollHeight,
        windowWidth:  body.scrollWidth,
        windowHeight: body.scrollHeight,
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const imgH_mm = (canvas.height * pageW) / canvas.width

      if (i > 0) pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, 0, pageW, imgH_mm)
    } finally {
      document.body.removeChild(iframe)
    }
  }

  pdf.save(filename)
}

/* ─── Filter select ─────────────────────────────────────────────── */

function FilterSelect({ value, onChange, placeholder, options }: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  options: string[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'px-2.5 py-1.5 text-xs rounded-lg border outline-none transition-colors',
        'bg-[var(--bg-card)] text-[var(--text-1)] border-[var(--border)]',
        'focus:border-[var(--accent)]',
        value && 'border-[var(--accent)] text-[var(--accent)]',
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

/* ─── Stat card ─────────────────────────────────────────────────── */

function StatCard({ label, value, icon, color }: {
  label: string; value: string; icon: React.ReactNode; color: string
}) {
  return (
    <div className="rounded-xl border p-4 flex items-center gap-3"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', color)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-[var(--text-3)] uppercase tracking-wide font-semibold leading-none mb-1">{label}</p>
        <p className="text-sm font-bold text-[var(--text-1)] truncate">{value}</p>
      </div>
    </div>
  )
}

/* ─── Rol de pagos panel ─────────────────────────────────────────── */

function RolDePagos({ record, onClose }: { record: PayrollRecord; onClose: () => void }) {
  const t = calcTotals(record)

  const section = (title: string, rows: [string, number][]) => (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] px-4 py-2 border-b"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
        {title}
      </div>
      {rows.filter(([, v]) => v !== 0 && v != null).map(([label, value]) => (
        <div key={label} className="flex justify-between items-center px-4 py-1.5 border-b last:border-0 text-xs"
          style={{ borderColor: 'var(--border)' }}>
          <span className="text-[var(--text-2)]">{label}</span>
          <span className="font-medium text-[var(--text-1)] tabular-nums">{fmtUSD(value)}</span>
        </div>
      ))}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-lg h-full overflow-y-auto flex flex-col"
        style={{ backgroundColor: 'var(--bg-card)', borderLeft: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-1)]">Rol de Pagos</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportPdf([record], `Rol_${record.cedula}_${record.year}${String(record.month).padStart(2,'0')}.pdf`)}
              title="Exportar PDF"
              className="p-1.5 rounded-md text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent)] transition-colors">
              <FileDown size={16} />
            </button>
            <button onClick={onClose}
              className="p-1.5 rounded-md text-[var(--text-3)] hover:bg-[var(--bg-hover)] transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Employee info */}
        <div className="px-5 py-4 border-b space-y-1" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-bold text-[var(--text-1)]">{record.employeeName}</p>
          <div className="flex gap-4 text-xs text-[var(--text-2)]">
            <span>Cédula: <strong>{record.cedula}</strong></span>
            <span>Cargo: <strong>{record.position}</strong></span>
          </div>
          <div className="flex gap-4 text-xs text-[var(--text-2)]">
            <span>Forma de pago: <strong>{record.paymentMethod || '—'}</strong></span>
            {record.accountNumber && <span>Cuenta: <strong>{record.accountNumber}</strong></span>}
          </div>
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: 'var(--border)' }}>
          {section('Ingresos', [
            ['Sueldo Ganado',            record.earnedSalary],
            ['Fondos de Reserva',        record.reserveFunds],
            ['XII Sueldo',               record.twelfthSalary],
            ['XIV Sueldo',               record.fourteenthSalary],
            ['Bon. Responsabilidad',     record.responsibilityBonus],
            ['Bon. Productividad',       record.productivityBonus],
            ['Alimentación',             record.foodAllowance],
            ['Vacaciones',               record.vacation],
            ['Horas Extras 50% (Valor)', record.overtimeValue50],
            ['Descanso Médico',          record.medicalLeave],
            ['Otros Ingresos',           record.otherIncome],
          ])}
          <div className="flex justify-between items-center px-4 py-2 text-xs font-bold"
            style={{ backgroundColor: 'var(--bg-surface)' }}>
            <span className="text-[var(--text-1)]">Total Ingresos</span>
            <span className="text-[var(--accent)] tabular-nums">{fmtUSD(t.totalIncome)}</span>
          </div>

          {section('Egresos', [
            ['Quincena',            record.quincena],
            ['Anticipo',            record.advance],
            ['9.45% IESS',          record.iessContribution],
            ['Impuesto a la Renta', record.incomeTax],
            ['Préstamo IESS',       record.iessLoan],
            ['Préstamo Empresarial',record.companyLoan],
            ['Extensión Conyugal',  record.spouseExtension],
            ['Días No Laborados',   record.nonWorkDays],
            ['Alimentación (desc.)',record.foodDeduction],
            ['Otros Descuentos',    record.otherDeductions],
          ])}
          <div className="flex justify-between items-center px-4 py-2 text-xs font-bold"
            style={{ backgroundColor: 'var(--bg-surface)' }}>
            <span className="text-[var(--text-1)]">Total Egresos</span>
            <span className="text-red-500 tabular-nums">{fmtUSD(t.totalDeductions)}</span>
          </div>
        </div>

        {/* Total a pagar */}
        <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[var(--text-1)]">TOTAL A PAGAR</span>
            <span className="text-xl font-bold text-[var(--accent)] tabular-nums">{fmtUSD(t.totalToPay)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Attendance import modal ────────────────────────────────────── */

interface AttendanceRow {
  employeeName: string
  cedula: string
  totalMinutes: number
  days: number
}

function aggregateAttendance(records: Marcacion[]): AttendanceRow[] {
  const map = new Map<string, AttendanceRow>()

  for (const rec of records) {
    const key = rec.cedula || rec.employeeName
    if (!map.has(key)) {
      map.set(key, { employeeName: rec.employeeName, cedula: rec.cedula, totalMinutes: 0, days: 0 })
    }
    const row = map.get(key)!

    // Parse totalTime "HH:MM" or "HH:MM:SS" → minutes
    if (rec.totalTime) {
      const parts = rec.totalTime.split(':').map(Number)
      const minutes = (parts[0] || 0) * 60 + (parts[1] || 0)
      row.totalMinutes += minutes
    }
    if (rec.dailyAttendance === 'Presente' || rec.firstCheckIn) {
      row.days += 1
    }
  }

  return Array.from(map.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName))
}

function AttendanceImportModal({
  year,
  month,
  onClose,
  onConfirm,
}: {
  year: number
  month: number
  onClose: () => void
  onConfirm: (rows: AttendanceRow[]) => void
}) {
  const { data: marcaciones = [], isLoading, isError } = useQuery({
    queryKey: ['marcacion-period', year, month],
    queryFn: () => marcacionService.getPeriodByYearMonth(year, month),
    staleTime: 60_000,
  })

  const rows = useMemo(() => aggregateAttendance(marcaciones), [marcaciones])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="font-semibold text-sm text-[var(--text-1)]">Importar Horas desde Asistencia</h2>
            <p className="text-xs text-[var(--text-3)] mt-0.5">{MONTHS[month - 1]} {year}</p>
          </div>
          <button onClick={onClose} className="text-[var(--text-3)] hover:text-[var(--text-1)]"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-16 gap-2 text-[var(--text-3)] text-sm">
              <Loader2 size={16} className="animate-spin" /> Cargando datos de asistencia...
            </div>
          )}
          {isError && (
            <div className="text-center py-12 text-sm text-red-500">Error al cargar datos de asistencia.</div>
          )}
          {!isLoading && !isError && rows.length === 0 && (
            <div className="text-center py-12 text-sm text-[var(--text-3)]">
              No hay registros de asistencia para {MONTHS[month - 1]} {year}.
            </div>
          )}
          {!isLoading && rows.length > 0 && (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-hover)' }}>
                  {['Empleado', 'Cédula', 'Días Asistidos', 'Horas Totales'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider text-[var(--text-3)] border-b" style={{ borderColor: 'var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.cedula || r.employeeName} className="border-b hover:bg-[var(--bg-hover)] transition-colors" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-2.5 font-medium text-[var(--text-1)]">{r.employeeName}</td>
                    <td className="px-4 py-2.5 font-mono text-[var(--text-2)]">{r.cedula}</td>
                    <td className="px-4 py-2.5 text-[var(--text-2)]">{r.days}</td>
                    <td className="px-4 py-2.5 font-semibold text-[var(--accent)]">
                      {Math.floor(r.totalMinutes / 60)}h {r.totalMinutes % 60}m
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs text-[var(--text-3)]">{rows.length} empleados encontrados</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-2)] hover:bg-[var(--bg-hover)]">Cancelar</button>
            <button
              onClick={() => { onConfirm(rows); onClose() }}
              disabled={rows.length === 0 || isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              <Check size={14} /> Usar estos datos
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────────────────── */

export function NominaPage() {
  const qc = useQueryClient()

  const currentYear  = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const [selYear,         setSelYear]         = useState(currentYear)
  const [selMonth,        setSelMonth]        = useState(currentMonth)
  const [search,          setSearch]          = useState('')
  const [filterType,      setFilterType]      = useState('')
  const [filterDept,      setFilterDept]      = useState('')
  const [filterPosition,  setFilterPosition]  = useState('')
  const [page,            setPage]            = useState(1)
  const [viewing,         setViewing]         = useState<PayrollRecord | null>(null)
  const [confirmDeleteId, setConfirm]         = useState<string | null>(null)
  const [confirmPeriod,   setConfirmPeriod]   = useState(false)
  const [selectedIds,       setSelectedIds]       = useState<Set<string>>(new Set())
  const [exporting,         setExporting]         = useState(false)
  const [showAttImport,     setShowAttImport]     = useState(false)
  const [importedHours,     setImportedHours]     = useState<Map<string, AttendanceRow>>(new Map())

  /* Load departments for id→name resolution */
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn:  departmentsService.getAll,
  })
  const deptMap = useMemo(
    () => new Map(departments.map((d) => [d.id, d.name])),
    [departments],
  )

  /* Load all to derive available years */
  const { data: all = [], isLoading } = useQuery({
    queryKey: ['payroll-all'],
    queryFn:  nominaService.getAll,
  })

  const availableYears = useMemo(() => {
    const s   = new Set(all.map((r) => r.year))
    const arr = Array.from(s).sort((a, b) => b - a)
    return arr.length ? arr : [currentYear]
  }, [all, currentYear])

  /* Records for selected period */
  const periodRecords = useMemo(
    () => all.filter((r) => r.year === selYear && r.month === selMonth),
    [all, selYear, selMonth],
  )

  /* Unique filter options derived from period records */
  const filterOptions = useMemo(() => {
    const deptIds = [...new Set(periodRecords.map((r) => r.departmentId).filter(Boolean))]
    return {
      types:     [...new Set(periodRecords.map((r) => r.payrollType).filter(Boolean))].sort(),
      depts:     deptIds
        .map((id) => ({ id, name: deptMap.get(id) ?? id }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      positions: [...new Set(periodRecords.map((r) => r.position).filter(Boolean))].sort(),
    }
  }, [periodRecords, deptMap])

  const activeFilters = [filterType, filterDept, filterPosition].filter(Boolean).length

  /* Filtered */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return periodRecords.filter((r) => {
      if (filterType     && r.payrollType   !== filterType)     return false
      if (filterDept     && r.departmentId  !== filterDept)     return false
      if (filterPosition && r.position      !== filterPosition) return false
      if (q && !(
        r.employeeName?.toLowerCase().includes(q) ||
        r.cedula?.includes(q)
      )) return false
      return true
    })
  }, [periodRecords, search, filterType, filterDept, filterPosition])

  /* Pagination */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  /* Computed totals (full period, not just page) */
  const totals = useMemo(() => ({
    employees:       periodRecords.length,
    totalIncome:     periodRecords.reduce((s, r) => s + calcTotals(r).totalIncome,     0),
    totalDeductions: periodRecords.reduce((s, r) => s + calcTotals(r).totalDeductions, 0),
    totalToPay:      periodRecords.reduce((s, r) => s + calcTotals(r).totalToPay,      0),
  }), [periodRecords])

  /* Mutations */
  const deleteMutation = useMutation({
    mutationFn: (id: string) => nominaService.deleteOne(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['payroll-all'] }); setConfirm(null) },
  })

  const deletePeriodMutation = useMutation({
    mutationFn: () => nominaService.deleteByPeriod(selYear, selMonth),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['payroll-all'] }); setConfirmPeriod(false) },
  })

  /* Selection helpers */
  const pageIds     = pageRows.map((r) => r.id)
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
  const someSelected = pageIds.some((id) => selectedIds.has(id))

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds((s) => { const n = new Set(s); pageIds.forEach((id) => n.delete(id)); return n })
    } else {
      setSelectedIds((s) => { const n = new Set(s); pageIds.forEach((id) => n.add(id)); return n })
    }
  }

  const toggleOne = (id: string) => {
    setSelectedIds((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  /* PDF export */
  const handleExport = async () => {
    setExporting(true)
    const toExport = selectedIds.size > 0
      ? filtered.filter((r) => selectedIds.has(r.id))
      : filtered
    const filename = `Roles_Pago_${MONTHS[selMonth - 1]}_${selYear}.pdf`
    try {
      await exportPdf(toExport, filename)
    } finally {
      setExporting(false)
    }
  }

  const resetFilters = () => { setSearch(''); setFilterType(''); setFilterDept(''); setFilterPosition(''); setPage(1); setSelectedIds(new Set()) }
  const handleYearChange  = (y: number) => { setSelYear(y);  resetFilters(); setImportedHours(new Map()) }
  const handleMonthChange = (m: number) => { setSelMonth(m); resetFilters(); setImportedHours(new Map()) }

  const handleAttendanceImportConfirm = (rows: AttendanceRow[]) => {
    const map = new Map<string, AttendanceRow>()
    rows.forEach((r) => { map.set(r.cedula || r.employeeName, r) })
    setImportedHours(map)
    toast.success(`Datos de asistencia importados: ${rows.length} empleados`)
  }

  return (
    <>
      {viewing && <RolDePagos record={viewing} onClose={() => setViewing(null)} />}
      {showAttImport && (
        <AttendanceImportModal
          year={selYear}
          month={selMonth}
          onClose={() => setShowAttImport(false)}
          onConfirm={handleAttendanceImportConfirm}
        />
      )}

      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-1)]">Nómina / Payroll</h2>
          </div>

          {/* Period selectors */}
          <div className="flex items-center gap-2">
            <select
              value={selYear}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="px-3 py-2 text-sm rounded-lg border outline-none bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-1)] focus:border-[var(--accent)] transition-colors"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              value={selMonth}
              onChange={(e) => handleMonthChange(Number(e.target.value))}
              className="px-3 py-2 text-sm rounded-lg border outline-none bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-1)] focus:border-[var(--accent)] transition-colors"
            >
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Empleados"      value={String(totals.employees)}
            icon={<Users size={16} className="text-blue-500" />}           color="bg-blue-500/10" />
          <StatCard label="Total Ingresos" value={fmtUSD(totals.totalIncome)}
            icon={<DollarSign size={16} className="text-[var(--accent)]" />} color="bg-[var(--accent-soft)]" />
          <StatCard label="Total Egresos"  value={fmtUSD(totals.totalDeductions)}
            icon={<TrendingDown size={16} className="text-red-500" />}     color="bg-red-500/10" />
          <StatCard label="Total a Pagar"  value={fmtUSD(totals.totalToPay)}
            icon={<Wallet size={16} className="text-emerald-500" />}       color="bg-emerald-500/10" />
        </div>

        {/* Attendance import banner */}
        {importedHours.size > 0 && (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
              <ClipboardList size={15} />
              <span className="font-medium">
                Datos de asistencia importados para {MONTHS[selMonth - 1]} {selYear}
              </span>
              <span className="text-xs opacity-70">— {importedHours.size} empleados · Las horas aparecen en la tabla</span>
            </div>
            <button
              onClick={() => setImportedHours(new Map())}
              className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200 transition-colors">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Table card */}
        <div className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

          {/* Toolbar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b flex-wrap"
            style={{ borderColor: 'var(--border)' }}>
            <span className="text-sm font-semibold text-[var(--text-1)]">
              {periodLabel(selYear, selMonth)}
            </span>
            <span className="text-xs text-[var(--text-3)]">· {periodRecords.length} registros</span>

            <div className="flex-1" />

            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Buscar empleado..."
                className="pl-8 pr-7 py-1.5 text-xs rounded-lg border outline-none w-44 bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] transition-colors"
              />
              {search && (
                <button onClick={() => { setSearch(''); setPage(1) }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-1)]">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Import from Attendance */}
            <button
              onClick={() => setShowAttImport(true)}
              title="Importar horas desde asistencia"
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                importedHours.size > 0
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-400/30'
                  : 'text-[var(--text-2)] border border-[var(--border)] hover:bg-[var(--bg-hover)]',
              )}>
              <ClipboardList size={13} />
              {importedHours.size > 0 ? `Asistencia (${importedHours.size})` : 'Importar Asistencia'}
            </button>

            {/* Export PDF */}
            <button
              onClick={handleExport}
              disabled={exporting || filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-40 transition-opacity">
              {exporting
                ? <Loader2 size={13} className="animate-spin" />
                : <FileDown size={13} />}
              {selectedIds.size > 0
                ? `Exportar (${selectedIds.size})`
                : 'Exportar PDF'}
            </button>

            {/* Delete period */}
            {confirmPeriod ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-2)]">¿Eliminar período completo?</span>
                <button
                  onClick={() => deletePeriodMutation.mutate()}
                  disabled={deletePeriodMutation.isPending}
                  className="text-xs px-2.5 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">
                  Eliminar
                </button>
                <button onClick={() => setConfirmPeriod(false)}
                  className="text-[var(--text-3)] hover:text-[var(--text-1)]">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmPeriod(true)}
                disabled={periodRecords.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition-colors">
                <Trash2 size={13} />
                Eliminar período
              </button>
            )}
          </div>

          {/* Filter bar */}
          {periodRecords.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 border-b flex-wrap"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-3)]">Filtros</span>

              <FilterSelect
                value={filterType}
                onChange={(v) => { setFilterType(v); setPage(1) }}
                placeholder="Tipo de nómina"
                options={filterOptions.types}
              />
              <select
                value={filterDept}
                onChange={(e) => { setFilterDept(e.target.value); setPage(1) }}
                className={cn(
                  'px-2.5 py-1.5 text-xs rounded-lg border outline-none transition-colors',
                  'bg-[var(--bg-card)] text-[var(--text-1)] border-[var(--border)]',
                  'focus:border-[var(--accent)]',
                  filterDept && 'border-[var(--accent)] text-[var(--accent)]',
                )}
              >
                <option value="">Centro de costo</option>
                {filterOptions.depts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <FilterSelect
                value={filterPosition}
                onChange={(v) => { setFilterPosition(v); setPage(1) }}
                placeholder="Cargo"
                options={filterOptions.positions}
              />

              {activeFilters > 0 && (
                <button
                  onClick={() => { setFilterType(''); setFilterDept(''); setFilterPosition(''); setPage(1) }}
                  className="flex items-center gap-1 text-xs text-[var(--text-3)] hover:text-red-500 transition-colors ml-1">
                  <X size={12} />
                  Limpiar ({activeFilters})
                </button>
              )}
            </div>
          )}

          {/* Table */}
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface)' }}>
                {/* Checkbox select-all */}
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                    onChange={toggleAll}
                    className="cursor-pointer accent-[var(--accent)]"
                  />
                </th>
                {[
                  'Apellidos y Nombres','Cédula','Cargo',
                  ...(importedHours.size > 0 ? ['Horas Asist.'] : []),
                  'Total Ingresos','Total Egresos','Total a Pagar','',
                ].map((h) => (
                  <th key={h}
                    className={cn(
                      'text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)] px-4 py-3',
                      ['Total Ingresos','Total Egresos','Total a Pagar','Horas Asist.'].includes(h) ? 'text-right' : 'text-left',
                    )}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={importedHours.size > 0 ? 9 : 8} className="text-center py-10 text-xs text-[var(--text-3)]">Cargando...</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={importedHours.size > 0 ? 9 : 8} className="text-center py-12 text-xs text-[var(--text-3)]">
                    {search
                      ? 'Sin resultados para la búsqueda'
                      : 'No hay registros de nómina para este período'}
                  </td>
                </tr>
              )}
              {pageRows.map((row) => {
                const t = calcTotals(row)
                return (
                  <tr key={row.id}
                    className={cn(
                      'border-t hover:bg-[var(--bg-hover)] transition-colors',
                      selectedIds.has(row.id) && 'bg-[var(--accent-soft)]',
                    )}
                    style={{ borderColor: 'var(--border)' }}>
                    {confirmDeleteId === row.id ? (
                      <td colSpan={importedHours.size > 0 ? 9 : 8} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[var(--text-2)]">
                            ¿Eliminar registro de <strong>{row.employeeName}</strong>?
                          </span>
                          <button
                            onClick={() => deleteMutation.mutate(row.id)}
                            disabled={deleteMutation.isPending}
                            className="text-xs px-2.5 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">
                            Eliminar
                          </button>
                          <button onClick={() => setConfirm(null)}
                            className="text-[var(--text-3)] hover:text-[var(--text-1)]">
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(row.id)}
                            onChange={() => toggleOne(row.id)}
                            className="cursor-pointer accent-[var(--accent)]"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-[var(--text-1)] max-w-[200px] truncate">
                          {row.employeeName}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-2)] font-mono text-xs">{row.cedula}</td>
                        <td className="px-4 py-3 text-[var(--text-2)] max-w-[160px] truncate">{row.position}</td>
                        {importedHours.size > 0 && (() => {
                          const att = importedHours.get(row.cedula)
                          return (
                            <td className="px-4 py-3 text-right tabular-nums text-xs">
                              {att
                                ? <span className="text-emerald-600 dark:text-emerald-400 font-medium">{Math.floor(att.totalMinutes / 60)}h {att.totalMinutes % 60}m</span>
                                : <span className="text-[var(--text-3)]">—</span>
                              }
                            </td>
                          )
                        })()}
                        <td className="px-4 py-3 text-right tabular-nums text-[var(--text-2)]">
                          {fmtUSD(t.totalIncome)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-red-500">
                          {fmtUSD(t.totalDeductions)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-[var(--accent)]">
                          {fmtUSD(t.totalToPay)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => setViewing(row)}
                              title="Ver rol de pagos"
                              className="p-1.5 rounded-md text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent)] transition-colors">
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => setConfirm(row.id)}
                              title="Eliminar registro"
                              className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor: 'var(--bg-surface)', borderTop: '2px solid var(--border)' }}>
                  <td />
                  <td colSpan={importedHours.size > 0 ? 4 : 3} className="px-4 py-2.5 text-xs font-semibold text-[var(--text-2)]">
                    TOTALES ({filtered.length} registros)
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs font-bold text-[var(--text-1)] tabular-nums">
                    {fmtUSD(filtered.reduce((s, r) => s + calcTotals(r).totalIncome, 0))}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs font-bold text-red-500 tabular-nums">
                    {fmtUSD(filtered.reduce((s, r) => s + calcTotals(r).totalDeductions, 0))}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs font-bold text-[var(--accent)] tabular-nums">
                    {fmtUSD(filtered.reduce((s, r) => s + calcTotals(r).totalToPay, 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t"
              style={{ borderColor: 'var(--border)' }}>
              <span className="text-xs text-[var(--text-3)]">
                Página {safePage} de {totalPages} · {filtered.length} registros
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="p-1.5 rounded-md text-[var(--text-2)] hover:bg-[var(--bg-hover)] disabled:opacity-30 transition-colors">
                  <ChevronLeft size={15} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .reduce<(number | '…')[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, i) =>
                    p === '…' ? (
                      <span key={`e${i}`} className="px-1 text-xs text-[var(--text-3)]">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={cn(
                          'w-7 h-7 rounded-md text-xs font-medium transition-colors',
                          safePage === p
                            ? 'bg-[var(--accent)] text-white'
                            : 'text-[var(--text-2)] hover:bg-[var(--bg-hover)]',
                        )}>
                        {p}
                      </button>
                    ),
                  )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="p-1.5 rounded-md text-[var(--text-2)] hover:bg-[var(--bg-hover)] disabled:opacity-30 transition-colors">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
