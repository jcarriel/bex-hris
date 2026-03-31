import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUiStore } from '@/store/uiStore'
import { useAuthStore, hasAction } from '@/store/authStore'
import { useMayordomoScope } from '@/hooks/useMayordomoScope'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  UserPlus, Eye, Pencil, Trash2, UserX,
  ChevronLeft, ChevronRight, Users, Loader2, FileDown, X, Plus,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { toast } from 'sonner'
import { empleadosService } from '@/services/empleados.service'
import { departmentsService } from '@/services/departments.service'
import { positionsService } from '@/services/positions.service'
import { laborsService, type Labor } from '@/services/labors.service'
import { maestroGeneralService, type MaestroGeneral, type MaestroGeneralFormData } from '@/services/maestro-general.service'
import { catalogService } from '@/services/catalog.service'
import { EmpleadoForm } from '@/components/empleados/EmpleadoForm'
import { EmpleadoSheet } from '@/components/empleados/EmpleadoSheet'
import { ConfirmDialog } from '@/components/empleados/ConfirmDialog'
import { Avatar } from '@/components/shared/Avatar'
import { Badge } from '@/components/shared/Badge'
import type { Empleado, EmpleadoFormData } from '@/types/empleado.types'
import { cn, formatCurrency } from '@/lib/utils'
import { DayPicker, type DateRange } from 'react-day-picker'
import { es } from 'react-day-picker/locale'
import 'react-day-picker/style.css'

// ─── Sort icon ────────────────────────────────────────────────────────────────
function SortIcon({ col, sortBy, sortDir }: { col: string; sortBy: string; sortDir: string }) {
  if (col !== sortBy) return <span className="ml-1 text-[var(--text-3)] opacity-30">↕</span>
  return <span className="ml-1 text-[var(--accent)]">{sortDir === 'asc' ? '↑' : '↓'}</span>
}

// ─── Status helpers ───────────────────────────────────────────────────────────
const statusMap: Record<Empleado['status'], { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  active:     { label: 'Activo',      variant: 'success' },
  inactive:   { label: 'Inactivo',    variant: 'neutral' },
}

// ─── Export columns definition ────────────────────────────────────────────────
type ColKey = keyof Empleado | 'departmentName' | 'positionName' | 'laborName' | 'statusLabel'

interface ExportCol {
  key:     ColKey
  label:   string
  get:     (e: Empleado, depts: { id: string; name: string }[]) => string
  default: boolean
}

const EXPORT_COLS: ExportCol[] = [
  { key: 'firstName',        label: 'Nombre',             get: (e) => e.firstName,                                                     default: true  },
  { key: 'lastName',         label: 'Apellido',            get: (e) => e.lastName,                                                      default: true  },
  { key: 'cedula',           label: 'Cédula',              get: (e) => e.cedula ?? '',                                                  default: true  },
  { key: 'email',            label: 'Email',               get: (e) => e.email ?? '',                                                   default: true  },
  { key: 'phone',            label: 'Teléfono',            get: (e) => e.phone ?? '',                                                   default: true  },
  { key: 'departmentName',   label: 'Centro de Costo',     get: (e, ds) => e.departmentName ?? ds.find((d) => d.id === e.departmentId)?.name ?? '', default: true  },
  { key: 'positionName',     label: 'Cargo',               get: (e) => e.positionName ?? '',                                            default: true  },
  { key: 'laborName',        label: 'Labor',               get: (e) => e.laborName ?? '',                                              default: true  },
  { key: 'statusLabel',      label: 'Estado',              get: (e) => statusMap[e.status]?.label ?? e.status,                         default: true  },
  { key: 'baseSalary',       label: 'Salario Base',        get: (e) => e.baseSalary?.toString() ?? '',                                 default: true  },
  { key: 'hireDate',         label: 'Fecha Ingreso',       get: (e) => e.hireDate?.slice(0, 10) ?? '',                                 default: true  },
  { key: 'contratoTipo',     label: 'Tipo Contrato',       get: (e) => e.contratoTipo ?? '',                                           default: true  },
  { key: 'contratoActual',   label: 'Contrato Actual',     get: (e) => e.contratoActual ?? '',                                         default: true  },
  { key: 'contractEndDate',  label: 'Fin Contrato',        get: (e) => e.contractEndDate?.slice(0, 10) ?? '',                         default: false },
  { key: 'genero',           label: 'Género',              get: (e) => e.genero === 'M' ? 'Masculino' : e.genero === 'F' ? 'Femenino' : e.genero ?? '', default: false },
  { key: 'dateOfBirth',      label: 'Fecha Nacimiento',    get: (e) => e.dateOfBirth?.slice(0, 10) ?? '',                             default: false },
  { key: 'estadoCivil',      label: 'Estado Civil',        get: (e) => e.estadoCivil ?? '',                                            default: false },
  { key: 'procedencia',      label: 'Procedencia',         get: (e) => e.procedencia ?? '',                                            default: false },
  { key: 'direccion',        label: 'Dirección',           get: (e) => e.direccion ?? '',                                              default: false },
  { key: 'passport',         label: 'Pasaporte',           get: (e) => e.passport ?? '',                                               default: false },
  { key: 'bankName',         label: 'Banco',               get: (e) => e.bankName ?? '',                                               default: false },
  { key: 'bankAccount',      label: 'Cuenta Bancaria',     get: (e) => e.bankAccount ?? '',                                            default: false },
  { key: 'accountType',      label: 'Tipo Cuenta',         get: (e) => e.accountType ?? '',                                            default: false },
  { key: 'hijos',            label: 'Hijos',               get: (e) => e.hijos?.toString() ?? '',                                      default: false },
  { key: 'nivelAcademico',   label: 'Nivel Académico',     get: (e) => e.nivelAcademico ?? '',                                         default: false },
  { key: 'especialidad',     label: 'Especialidad',        get: (e) => e.especialidad ?? '',                                           default: false },
  { key: 'afiliacion',       label: 'Afiliación',          get: (e) => e.afiliacion ?? '',                                             default: false },
  { key: 'terminationDate',  label: 'Fecha Terminación',   get: (e) => e.terminationDate?.slice(0, 10) ?? '',                         default: false },
  { key: 'terminationReason',label: 'Motivo Terminación',  get: (e) => e.terminationReason ?? '',                                     default: false },
]

// ─── Export modal ──────────────────────────────────────────────────────────────
function ExportModal({
  open, onClose, onExport, loading,
}: {
  open: boolean
  onClose: () => void
  onExport: (cols: ColKey[], format: 'xlsx' | 'pdf') => void
  loading: boolean
}) {
  const [selected, setSelected] = useState<Set<ColKey>>(
    () => new Set(EXPORT_COLS.filter((c) => c.default).map((c) => c.key)),
  )
  const [format, setFormat] = useState<'xlsx' | 'pdf'>('xlsx')

  const allChecked = selected.size === EXPORT_COLS.length
  const toggleAll  = () => setSelected(allChecked ? new Set() : new Set(EXPORT_COLS.map((c) => c.key)))
  const toggle     = (key: ColKey) => setSelected((s) => {
    const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-semibold text-[var(--text-1)]">Exportar empleados</h3>
          <button onClick={onClose} className="p-1 rounded text-[var(--text-3)] hover:text-[var(--text-1)]">
            <FileDown size={16} className="rotate-180 opacity-0 pointer-events-none" />
            ✕
          </button>
        </div>

        {/* Format */}
        <div className="px-5 py-3 border-b flex items-center gap-3" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wide">Formato</span>
          {(['xlsx', 'pdf'] as const).map((f) => (
            <button key={f}
              onClick={() => setFormat(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                format === f
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'border-[var(--border)] text-[var(--text-2)] hover:border-[var(--accent)]',
              )}>
              {f === 'xlsx' ? 'Excel (.xlsx)' : 'PDF (.pdf)'}
            </button>
          ))}
        </div>

        {/* Column list */}
        <div className="flex items-center justify-between px-5 py-2 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
          <span className="text-xs font-semibold text-[var(--text-2)]">Columnas ({selected.size}/{EXPORT_COLS.length})</span>
          <button onClick={toggleAll} className="text-xs text-[var(--accent)] hover:underline">
            {allChecked ? 'Desmarcar todo' : 'Seleccionar todo'}
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-3 grid grid-cols-2 gap-x-4 gap-y-2">
          {EXPORT_COLS.map((col) => (
            <label key={col.key} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={selected.has(col.key)}
                onChange={() => toggle(col.key)}
                className="accent-[var(--accent)] cursor-pointer"
              />
              <span className="text-xs text-[var(--text-2)] group-hover:text-[var(--text-1)] transition-colors truncate">
                {col.label}
              </span>
            </label>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
            Cancelar
          </button>
          <button
            disabled={selected.size === 0 || loading}
            onClick={() => onExport(Array.from(selected), format)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-40 transition-opacity">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
            Exportar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Maestro Export Modal ─────────────────────────────────────────────────────
interface MaestroExportCol { key: keyof MaestroGeneral; label: string; default: boolean }
const MAESTRO_EXPORT_COLS: MaestroExportCol[] = [
  { key: 'tipoTrabajador',  label: 'Tipo Trabajador',  default: true  },
  { key: 'apellidos',       label: 'Apellidos',         default: true  },
  { key: 'nombres',         label: 'Nombres',           default: true  },
  { key: 'cedula',          label: 'Cédula',            default: true  },
  { key: 'centroDeCosto',   label: 'Centro de Costo',   default: true  },
  { key: 'labor',           label: 'Labor',             default: true  },
  { key: 'fechaIngreso',    label: 'Fecha Ingreso',     default: true  },
  { key: 'semanaIngreso',   label: 'Semana Ingreso',    default: false },
  { key: 'fechaNacimiento', label: 'Fecha Nacimiento',  default: false },
  { key: 'tituloBachiller', label: 'Título Bachiller',  default: false },
  { key: 'semanaSalida',    label: 'Semana Salida',     default: false },
  { key: 'fechaSalida',     label: 'Fecha Salida',      default: false },
  { key: 'estado',          label: 'Estado',            default: true  },
]

function MaestroExportModal({ open, onClose, data }: { open: boolean; onClose: () => void; data: MaestroGeneral[] }) {
  const [selected, setSelected] = useState<Set<keyof MaestroGeneral>>(
    () => new Set(MAESTRO_EXPORT_COLS.filter((c) => c.default).map((c) => c.key))
  )

  if (!open) return null

  const toggle = (k: keyof MaestroGeneral) =>
    setSelected((prev) => { const s = new Set(prev); s.has(k) ? s.delete(k) : s.add(k); return s })

  const handleExport = () => {
    const cols = MAESTRO_EXPORT_COLS.filter((c) => selected.has(c.key))
    const rows = data.map((row) => {
      const obj: Record<string, unknown> = {}
      cols.forEach((c) => { obj[c.label] = row[c.key] ?? '' })
      return obj
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = cols.map((c) => ({ wch: Math.max(c.label.length, 12) }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Maestro General')
    XLSX.writeFile(wb, `maestro-general-${new Date().toISOString().slice(0, 10)}.xlsx`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-[420px] rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
          <div>
            <h2 className="text-base font-semibold text-[var(--text-1)]">Exportar Maestro General</h2>
            <p className="text-xs text-[var(--text-3)] mt-0.5">Selecciona los campos a incluir</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-3)]"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-3 grid grid-cols-2 gap-x-4 gap-y-2">
          {MAESTRO_EXPORT_COLS.map((col) => (
            <label key={col.key} className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" checked={selected.has(col.key)} onChange={() => toggle(col.key)}
                className="accent-[var(--accent)] cursor-pointer" />
              <span className="text-xs text-[var(--text-2)] group-hover:text-[var(--text-1)] transition-colors truncate">{col.label}</span>
            </label>
          ))}
        </div>
        <div className="px-5 py-4 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--border-color)' }}>
          <span className="text-xs text-[var(--text-3)]">{data.length} registros</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border transition-colors"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-2)' }}>Cancelar</button>
            <button disabled={selected.size === 0} onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-40 transition-opacity">
              <FileDown size={14} /> Exportar Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Maestro Form Sheet ───────────────────────────────────────────────────────
const EMPTY_MAESTRO_FORM: MaestroGeneralFormData = {
  tipoTrabajador: '', fechaIngreso: null, semanaIngreso: null,
  apellidos: '', nombres: null, cedula: '', centroDeCosto: '', labor: '',
  fechaNacimiento: null, tituloBachiller: '', semanaSalida: null,
  fechaSalida: null, estado: 'ACTIVO',
}

function weekOfYear(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00')
  // Use UTC to avoid DST offsets shifting the day count
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = date.getUTCDay() || 7          // Mon=1 … Sun=7
  date.setUTCDate(date.getUTCDate() + 4 - day) // advance to nearest Thursday
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

function MaestroSheet({
  open, onClose, initial, onSave, saving,
}: {
  open: boolean; onClose: () => void
  initial: MaestroGeneralFormData | null
  onSave: (data: MaestroGeneralFormData) => void
  saving: boolean
}) {
  const [form, setForm] = useState<MaestroGeneralFormData>(initial ?? EMPTY_MAESTRO_FORM)

  useEffect(() => { setForm(initial ?? EMPTY_MAESTRO_FORM) }, [initial, open])

  // Auto-calculate semanas when dates change
  useEffect(() => {
    if (form.fechaIngreso) setForm((p) => ({ ...p, semanaIngreso: weekOfYear(form.fechaIngreso!) }))
    else setForm((p) => ({ ...p, semanaIngreso: null }))
  }, [form.fechaIngreso])

  useEffect(() => {
    if (form.fechaSalida) setForm((p) => ({ ...p, semanaSalida: weekOfYear(form.fechaSalida!) }))
    else setForm((p) => ({ ...p, semanaSalida: null }))
  }, [form.fechaSalida])

  const { data: tiposTrabajador = [] } = useQuery({
    queryKey: ['catalogs', 'tipo_trabajador'],
    queryFn: () => catalogService.getByType('tipo_trabajador'),
    staleTime: 60_000,
    enabled: open,
  })
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsService.getAll(),
    staleTime: 60_000,
    enabled: open,
  })
  const { data: labors = [] } = useQuery({
    queryKey: ['labors'],
    queryFn: () => laborsService.getAll(),
    staleTime: 60_000,
    enabled: open,
  })

  if (!open) return null

  const set = (k: keyof MaestroGeneralFormData, v: unknown) =>
    setForm((prev) => ({ ...prev, [k]: v === '' ? null : v }))

  const inputCls = 'w-full h-9 px-3 text-sm rounded-lg border outline-none bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] transition-colors'
  const readOnlyCls = 'w-full h-9 px-3 text-sm rounded-lg border bg-[var(--bg-hover)] border-[var(--border-color)] text-[var(--text-3)] cursor-not-allowed select-none'
  const labelCls = 'block text-xs font-medium text-[var(--text-3)] mb-1'

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm">
      <div className="w-[440px] h-full flex flex-col shadow-2xl" style={{ backgroundColor: 'var(--bg-card)', borderLeft: '1px solid var(--border-color)' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
          <h2 className="text-base font-semibold text-[var(--text-1)]">{initial ? 'Editar Registro' : 'Nuevo Registro'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-3)]"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tipo Trabajador</label>
              <select value={form.tipoTrabajador ?? ''} onChange={(e) => set('tipoTrabajador', e.target.value)} className={inputCls}>
                <option value="">— Seleccionar —</option>
                {tiposTrabajador.map((t) => <option key={t.id} value={t.value}>{t.value}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Estado</label>
              <select value={form.estado ?? 'ACTIVO'} onChange={(e) => set('estado', e.target.value)} className={inputCls}>
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Apellidos *</label>
            <input value={form.apellidos} onChange={(e) => set('apellidos', e.target.value)} placeholder="Apellidos" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Nombres</label>
            <input value={form.nombres ?? ''} onChange={(e) => set('nombres', e.target.value)} placeholder="Nombres" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Cédula *</label>
            <input value={form.cedula} onChange={(e) => set('cedula', e.target.value)} placeholder="0000000000" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Centro de Costo</label>
              <select value={form.centroDeCosto ?? ''} onChange={(e) => set('centroDeCosto', e.target.value)} className={inputCls}>
                <option value="">— Seleccionar —</option>
                {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Labor</label>
              <select value={form.labor ?? ''} onChange={(e) => set('labor', e.target.value)} className={inputCls}>
                <option value="">— Seleccionar —</option>
                {labors.map((l) => <option key={l.id} value={l.name}>{l.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Fecha Ingreso</label>
              <input type="date" value={form.fechaIngreso ?? ''} onChange={(e) => set('fechaIngreso', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Semana Ingreso <span className="text-[var(--accent)] ml-1">auto</span></label>
              <input readOnly tabIndex={-1} value={form.semanaIngreso ?? ''} className={readOnlyCls} placeholder="—" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Fecha Nacimiento</label>
              <input type="date" value={form.fechaNacimiento ?? ''} onChange={(e) => set('fechaNacimiento', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Título Bachiller</label>
              <input value={form.tituloBachiller ?? ''} onChange={(e) => set('tituloBachiller', e.target.value)} placeholder="Título" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Fecha Salida</label>
              <input type="date" value={form.fechaSalida ?? ''} onChange={(e) => set('fechaSalida', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Semana Salida <span className="text-[var(--accent)] ml-1">auto</span></label>
              <input readOnly tabIndex={-1} value={form.semanaSalida ?? ''} className={readOnlyCls} placeholder="—" />
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: 'var(--border-color)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border transition-colors"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-2)' }}>Cancelar</button>
          <button disabled={saving || !form.cedula || !form.apellidos} onClick={() => onSave(form)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-40 transition-opacity">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {initial ? 'Guardar Cambios' : 'Crear Registro'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
// ─── Maestro General Tab ──────────────────────────────────────────────────────
type ColFilter = 'text' | 'select' | 'date' | null

// ─── Date range filter popup ──────────────────────────────────────────────────

function DateRangeFilter({
  fromKey, toKey, colFilters, setFilter,
}: {
  fromKey: string
  toKey: string
  colFilters: Record<string, string>
  setFilter: (key: string, val: string) => void
}) {
  const [open, setOpen] = useState(false)
  // Local range state — DayPicker owns it during selection
  const [range, setRange] = useState<DateRange | undefined>(() => {
    const f = colFilters[fromKey]
    const t = colFilters[toKey]
    if (!f && !t) return undefined
    return {
      from: f ? new Date(f + 'T00:00:00') : undefined,
      to:   t ? new Date(t + 'T00:00:00') : undefined,
    }
  })

  const hasFilter = !!(range?.from || range?.to)
  const fmt = (d?: Date) => d ? `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}` : '—'

  const handleSelect = (r: DateRange | undefined) => {
    setRange(r)
    // Only apply filter when range is complete (both from and to selected)
    if (r?.from && r?.to) {
      setFilter(fromKey, r.from.toISOString().slice(0, 10))
      setFilter(toKey,   r.to.toISOString().slice(0, 10))
    } else if (!r?.from && !r?.to) {
      setFilter(fromKey, '')
      setFilter(toKey, '')
    }
  }

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setRange(undefined)
    setFilter(fromKey, '')
    setFilter(toKey, '')
  }

  return (
    <div className="relative mt-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center justify-between gap-1 h-6 px-1.5 text-[11px] rounded border outline-none transition-colors',
          'bg-[var(--bg-surface)] text-[var(--text-1)] hover:border-[var(--accent)]',
          hasFilter ? 'border-[var(--accent)]' : 'border-[var(--border-color)]',
        )}
      >
        <span className={cn('text-[10px] truncate', hasFilter ? 'text-[var(--text-1)]' : 'text-[var(--text-3)]')}>
          {hasFilter ? `${fmt(range?.from)}›${fmt(range?.to)}` : 'Rango...'}
        </span>
        {hasFilter && (
          <span onClick={clear} className="text-[var(--text-3)] hover:text-red-400 leading-none">×</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute z-50 mt-1 rounded-xl shadow-xl border p-2"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', left: 0, minWidth: 260 }}
          >
            <DayPicker
              locale={es}
              mode="range"
              selected={range}
              onSelect={handleSelect}
              style={{ '--rdp-accent-color': 'var(--accent)', '--rdp-accent-background-color': 'var(--accent-soft)' } as React.CSSProperties}
            />
          </div>
        </>
      )}
    </div>
  )
}

interface MaestroCols {
  key: keyof MaestroGeneral
  label: string
  filter: ColFilter
  mono?: boolean
}

const MAESTRO_COLS: MaestroCols[] = [
  { key: 'tipoTrabajador',  label: 'Tipo',            filter: 'select' },
  { key: 'apellidos',       label: 'Apellidos',        filter: 'text'   },
  { key: 'nombres',         label: 'Nombres',          filter: 'text'   },
  { key: 'cedula',          label: 'Cédula',           filter: 'text', mono: true },
  { key: 'centroDeCosto',   label: 'Centro de Costo',  filter: 'select' },
  { key: 'labor',           label: 'Labor',            filter: 'select' },
  { key: 'fechaIngreso',    label: 'F. Ingreso',       filter: 'date'   },
  { key: 'semanaIngreso',   label: 'Sem.',             filter: 'select' },
  { key: 'fechaNacimiento', label: 'F. Nacimiento',    filter: 'date'   },
  { key: 'tituloBachiller', label: 'Bachiller',        filter: 'select' },
  { key: 'fechaSalida',     label: 'F. Salida',        filter: 'date'   },
  { key: 'estado',          label: 'Estado',           filter: 'select' },
]

// ─── Inactivate dialog ────────────────────────────────────────────────────────
function InactivateDialog({
  open, row, loading, onConfirm, onCancel,
}: {
  open: boolean
  row: MaestroGeneral | null
  loading?: boolean
  onConfirm: (fechaSalida: string | null, observacion: string | null) => void
  onCancel: () => void
}) {
  const [fecha, setFecha]           = useState('')
  const [observacion, setObservacion] = useState('')
  useEffect(() => { if (open) { setFecha(''); setObservacion('') } }, [open])
  if (!open || !row) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-500/15">
            <UserX size={18} className="text-amber-500" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-1)]">Inactivar registro</h2>
            <p className="text-xs text-[var(--text-3)] mt-0.5">{row.apellidos} {row.nombres ?? ''} · {row.cedula}</p>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-2)] mb-1">Fecha de salida <span className="text-[var(--text-3)]">(opcional)</span></label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border text-sm bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-1)] focus:border-[var(--accent)] outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-2)] mb-1">Observación <span className="text-[var(--text-3)]">(opcional)</span></label>
          <textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            rows={3}
            placeholder="Motivo de salida, notas..."
            className="w-full px-3 py-2 rounded-lg border text-sm bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] outline-none transition-colors resize-none"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onCancel} disabled={loading}
            className="px-4 py-2 rounded-lg text-sm border transition-colors"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-2)' }}>
            Cancelar
          </button>
          <button onClick={() => onConfirm(fecha || null, observacion || null)} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Procesando...</> : 'Inactivar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function MaestroGeneralTab() {
  const queryClient = useQueryClient()
  const [colFilters, setColFilters] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  // CRUD state
  const [sheetOpen,         setSheetOpen]         = useState(false)
  const [editingRow,        setEditingRow]         = useState<MaestroGeneral | null>(null)
  const [deleteTarget,      setDeleteTarget]       = useState<MaestroGeneral | null>(null)
  const [inactivateTarget,  setInactivateTarget]   = useState<MaestroGeneral | null>(null)
  const [exportModalOpen,   setExportModalOpen]    = useState(false)

  const { data = [], isLoading } = useQuery({
    queryKey: ['maestro-general'],
    queryFn: () => maestroGeneralService.getAll(),
    staleTime: 30_000,
  })

  const createMutation = useMutation({
    mutationFn: (d: MaestroGeneralFormData) => maestroGeneralService.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['maestro-general'] }); setSheetOpen(false); toast.success('Registro creado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al crear'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, d }: { id: string; d: MaestroGeneralFormData }) => maestroGeneralService.update(id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['maestro-general'] }); setSheetOpen(false); setEditingRow(null); toast.success('Registro actualizado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al actualizar'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => maestroGeneralService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['maestro-general'] }); setDeleteTarget(null); toast.success('Registro eliminado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al eliminar'),
  })
  const inactivateMutation = useMutation({
    mutationFn: ({ row, fechaSalida, observacion }: { row: MaestroGeneral; fechaSalida: string | null; observacion: string | null }) =>
      maestroGeneralService.update(row.id, {
        tipoTrabajador: row.tipoTrabajador, fechaIngreso: row.fechaIngreso,
        semanaIngreso: row.semanaIngreso, apellidos: row.apellidos,
        nombres: row.nombres, cedula: row.cedula,
        centroDeCosto: row.centroDeCosto, labor: row.labor,
        fechaNacimiento: row.fechaNacimiento, tituloBachiller: row.tituloBachiller,
        semanaSalida: row.semanaSalida, fechaSalida: fechaSalida ?? row.fechaSalida,
        estado: 'INACTIVO', observacion,
      }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['maestro-general'] }); setInactivateTarget(null); toast.success('Registro inactivado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al inactivar'),
  })

  const openCreate = () => { setEditingRow(null); setSheetOpen(true) }
  const openEdit   = (row: MaestroGeneral) => { setEditingRow(row); setSheetOpen(true) }
  const handleSave = (formData: MaestroGeneralFormData) => {
    if (editingRow) updateMutation.mutate({ id: editingRow.id, d: formData })
    else createMutation.mutate(formData)
  }
  const saving = createMutation.isPending || updateMutation.isPending

  const setFilter = (key: string, val: string) => {
    setColFilters((prev) => ({ ...prev, [key]: val }))
    setPage(1)
  }

  const activeFilters = Object.values(colFilters).filter(Boolean).length

  // Unique values for select columns (from full dataset)
  const options = useMemo(() => {
    const uniq = (fn: (r: MaestroGeneral) => string) =>
      [...new Set(data.map(fn).filter(Boolean))].sort()
    return {
      tipoTrabajador:  uniq((r) => r.tipoTrabajador),
      centroDeCosto:   uniq((r) => r.centroDeCosto),
      labor:           uniq((r) => r.labor),
      tituloBachiller: uniq((r) => r.tituloBachiller),
      semanaIngreso:   [...new Set(data.map((r) => String(r.semanaIngreso ?? '')).filter(Boolean))].sort((a, b) => Number(a) - Number(b)),
      estado:          uniq((r) => r.estado),
    } as Record<string, string[]>
  }, [data])

  // Client-side filtering
  const filtered = useMemo(() => data.filter((row) =>
    MAESTRO_COLS.every((col) => {
      if (col.filter === 'date') {
        const from = colFilters[col.key + '_from']
        const to   = colFilters[col.key + '_to']
        if (!from && !to) return true
        const v = String(row[col.key] ?? '').slice(0, 10)
        if (!v) return false
        if (from && v < from) return false
        if (to   && v > to)   return false
        return true
      }
      const f = colFilters[col.key]
      if (!f) return true
      const v = String(row[col.key] ?? '').toLowerCase()
      return col.filter === 'select' ? v === f.toLowerCase() : v.includes(f.toLowerCase())
    }),
  ), [data, colFilters])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page])

  const filterInputCls = 'w-full mt-1 h-6 px-1.5 text-[11px] rounded border outline-none bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] transition-colors'

  return (
    <div className="space-y-3">
      {/* CRUD sheets / modals */}
      <MaestroSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditingRow(null) }}
        initial={editingRow ? {
          tipoTrabajador: editingRow.tipoTrabajador, fechaIngreso: editingRow.fechaIngreso,
          semanaIngreso: editingRow.semanaIngreso, apellidos: editingRow.apellidos,
          nombres: editingRow.nombres, cedula: editingRow.cedula,
          centroDeCosto: editingRow.centroDeCosto, labor: editingRow.labor,
          fechaNacimiento: editingRow.fechaNacimiento, tituloBachiller: editingRow.tituloBachiller,
          semanaSalida: editingRow.semanaSalida, fechaSalida: editingRow.fechaSalida,
          estado: editingRow.estado,
        } : null}
        onSave={handleSave}
        saving={saving}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar Registro"
        description={deleteTarget ? `¿Eliminar a ${deleteTarget.apellidos} ${deleteTarget.nombres ?? ''} (${deleteTarget.cedula})?` : ''}
        confirmLabel="Eliminar"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
      <InactivateDialog
        open={!!inactivateTarget}
        row={inactivateTarget}
        loading={inactivateMutation.isPending}
        onConfirm={(fechaSalida, observacion) => inactivateTarget && inactivateMutation.mutate({ row: inactivateTarget, fechaSalida, observacion })}
        onCancel={() => setInactivateTarget(null)}
      />
      <MaestroExportModal open={exportModalOpen} onClose={() => setExportModalOpen(false)} data={filtered} />

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--text-3)]">
          {filtered.length !== data.length
            ? <><span className="font-medium text-[var(--text-2)]">{filtered.length}</span> de {data.length} registros</>
            : <><span className="font-medium text-[var(--text-2)]">{data.length}</span> registros</>
          }
        </span>
        <div className="flex items-center gap-2">
          {activeFilters > 0 && (
            <button onClick={() => { setColFilters({}); setPage(1) }}
              className="flex items-center gap-1 text-xs text-[var(--accent)] hover:opacity-80">
              <X size={11} /> Limpiar {activeFilters} filtro{activeFilters > 1 ? 's' : ''}
            </button>
          )}
          <button onClick={() => setExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-2)' }}>
            <FileDown size={13} /> Exportar
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity">
            <Plus size={13} /> Nuevo
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)' }}>
                {MAESTRO_COLS.map((col) => (
                  <th key={col.key} className="px-3 py-2 text-left align-top" style={{ minWidth: col.filter ? 110 : 80 }}>
                    <span className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wide whitespace-nowrap">
                      {col.label}
                      {(col.filter === 'date'
                        ? (colFilters[col.key + '_from'] || colFilters[col.key + '_to'])
                        : colFilters[col.key]
                      ) && <span className="ml-1 text-[var(--accent)]">●</span>}
                    </span>

                    {col.filter === 'select' && (
                      <select
                        value={colFilters[col.key] ?? ''}
                        onChange={(e) => setFilter(col.key, e.target.value)}
                        className={filterInputCls}
                      >
                        <option value="">Todos</option>
                        {(options[col.key] ?? []).map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    )}

                    {col.filter === 'text' && (
                      <input
                        value={colFilters[col.key] ?? ''}
                        onChange={(e) => setFilter(col.key, e.target.value)}
                        placeholder="Filtrar..."
                        className={filterInputCls}
                      />
                    )}

                    {col.filter === 'date' && (
                      <DateRangeFilter
                        fromKey={col.key + '_from'}
                        toKey={col.key + '_to'}
                        colFilters={colFilters}
                        setFilter={setFilter}
                      />
                    )}
                  </th>
                ))}
                <th className="px-3 py-2 text-left align-top w-16">
                  <span className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wide">Acc.</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={MAESTRO_COLS.length + 1} className="text-center py-20">
                  <div className="flex flex-col items-center gap-3 text-[var(--text-3)]">
                    <Loader2 size={24} className="animate-spin" /><span className="text-sm">Cargando...</span>
                  </div>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={MAESTRO_COLS.length + 1} className="text-center py-20">
                  <div className="flex flex-col items-center gap-3 text-[var(--text-3)]">
                    <Users size={36} className="opacity-40" />
                    <p className="text-sm">{data.length === 0 ? 'Sin registros cargados' : 'Sin resultados para los filtros aplicados'}</p>
                  </div>
                </td></tr>
              ) : paginated.map((row) => (
                <tr key={row.id} className="border-b hover:bg-[var(--bg-hover)] transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                  {MAESTRO_COLS.map((col) => {
                    const val = row[col.key]
                    if (col.key === 'estado') {
                      const activo = String(val ?? '').toUpperCase() === 'ACTIVO'
                      return (
                        <td key={col.key} className="px-3 py-2.5">
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                            activo ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-gray-500/15 text-gray-500',
                          )}>
                            {activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                      )
                    }
                    return (
                      <td key={col.key} className={cn('px-3 py-2.5 text-xs text-[var(--text-2)]', col.mono && 'font-mono')}>
                        {val ?? '—'}
                      </td>
                    )
                  })}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(row)} title="Editar"
                        className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-3)] hover:text-[var(--accent)] transition-colors">
                        <Pencil size={13} />
                      </button>
                      {String(row.estado ?? '').toUpperCase() === 'ACTIVO' && (
                        <button onClick={() => setInactivateTarget(row)} title="Inactivar"
                          className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-3)] hover:text-amber-500 transition-colors">
                          <UserX size={13} />
                        </button>
                      )}
                      <button onClick={() => setDeleteTarget(row)} title="Eliminar"
                        className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-3)] hover:text-red-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <span className="text-xs text-[var(--text-3)]">Página {page} de {totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-md border border-[var(--border-color)] text-[var(--text-2)] hover:bg-[var(--bg-hover)] disabled:opacity-40">
                <ChevronLeft size={15} />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-md border border-[var(--border-color)] text-[var(--text-2)] hover:bg-[var(--bg-hover)] disabled:opacity-40">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

type OuterTab = 'art42' | 'maestro'

export function EmpleadosPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [outerTab, setOuterTab] = useState<OuterTab>('art42')

  // ── Permissions ─────────────────────────────────────────────────────────────
  const user = useAuthStore((s) => s.user)
  const canView   = hasAction(user?.permissions, 'empleados:ver', user?.rol)
  const canCreate = hasAction(user?.permissions, 'empleados:crear', user?.rol)
  const canEdit   = hasAction(user?.permissions, 'empleados:editar', user?.rol)
  const canDelete = hasAction(user?.permissions, 'empleados:eliminar', user?.rol)
  const { filterEmployees, isScoped } = useMayordomoScope('empleados')

  // Persistent filters via uiStore
  const { empleadoFilters, setEmpleadoFilters } = useUiStore()
  const { search, dept: deptFilter, position: positionFilter, status: statusFilter, page, sortBy, sortDir } = empleadoFilters

  const [debouncedSearch, setDebouncedSearch] = useState(search)
  const limit = 14

  const setSearch = (v: string) => setEmpleadoFilters({ search: v })
  const setDeptFilter = (v: string) => setEmpleadoFilters({ dept: v, page: 1 })
  const setPositionFilter = (v: string) => setEmpleadoFilters({ position: v, page: 1 })
  const setStatusFilter = (v: string) => setEmpleadoFilters({ status: v, page: 1 })
  const setPage = (p: number) => setEmpleadoFilters({ page: p })

  const handleSort = (col: string) => {
    if (col === sortBy) {
      setEmpleadoFilters({ sortDir: sortDir === 'asc' ? 'desc' : 'asc' })
    } else {
      setEmpleadoFilters({ sortBy: col, sortDir: 'asc' })
    }
  }

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setEmpleadoFilters({ page: 1 }) }, 350)
    return () => clearTimeout(t)
  }, [search])

  // Sheet state
  const [sheetOpen, setSheetOpen]             = useState(false)
  const [editingEmpleado, setEditingEmpleado] = useState<Empleado | null>(null)

  // Delete state
  const [deleteTarget, setDeleteTarget]       = useState<Empleado | null>(null)
  const [exportModal, setExportModal]         = useState(false)
  const [exporting, setExporting]             = useState(false)

  // Column filters (client-side)
  const [art42ColFilters, setArt42ColFilters] = useState<Record<string, string>>({})
  const setArt42Filter = (key: string, val: string) => setArt42ColFilters((prev) => ({ ...prev, [key]: val }))
  const clearArt42Filters = () => setArt42ColFilters({})
  const activeArt42Filters = Object.values(art42ColFilters).filter(Boolean).length

  // Inactivar state
  const [inactivarTarget, setInactivarTarget] = useState<Empleado | null>(null)
  const [exitDate, setExitDate]               = useState('')
  const [exitDateError, setExitDateError]     = useState('')

  // ── Data fetching ───────────────────────────────────────────────────────────
  // Scoped mode: fetch all employees once and filter/paginate client-side
  const { data: scopedData, isLoading: scopedLoading } = useQuery({
    queryKey: ['empleados-scoped'],
    queryFn: () => empleadosService.getAll({ limit: 9999 }),
    enabled: isScoped,
    staleTime: 60_000,
  })

  // Fetch all employees at once for client-side filtering & pagination
  const { data, isLoading: normalLoading } = useQuery({
    queryKey: ['empleados', { departmentId: deptFilter, positionId: positionFilter, status: statusFilter, search: debouncedSearch }],
    queryFn: () =>
      empleadosService.getAll({
        limit: 9999,
        departmentId: deptFilter || undefined,
        positionId: positionFilter || undefined,
        status: (statusFilter as Empleado['status']) || undefined,
        search: debouncedSearch || undefined,
      }),
    enabled: !isScoped,
  })

  const isLoading = isScoped ? scopedLoading : normalLoading

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentsService.getAll,
  })

  const { data: positions = [] } = useQuery({
    queryKey: ['positions'],
    queryFn: () => positionsService.getAll(),
  })

  const { data: labors = [] } = useQuery<Labor[]>({
    queryKey: ['labors'],
    queryFn: () => laborsService.getAll(),
  })

  // All employees (scoped or normal) — no pagination yet
  const allEmployees = useMemo(() => {
    if (isScoped) {
      const q = debouncedSearch.toLowerCase()
      return filterEmployees(scopedData?.data ?? []).filter((e) =>
        (!q || `${e.firstName} ${e.lastName} ${e.email ?? ''} ${(e as any).cedula ?? ''}`.toLowerCase().includes(q))
      )
    }
    return data?.data ?? []
  }, [isScoped, scopedData, filterEmployees, debouncedSearch, data])

  const total = allEmployees.length

  const sortedRaw = useMemo(() => [...allEmployees].sort((a, b) => {
    const aVal = (a as any)[sortBy] ?? ''
    const bVal = (b as any)[sortBy] ?? ''
    const cmp = String(aVal).localeCompare(String(bVal))
    return sortDir === 'asc' ? cmp : -cmp
  }), [allEmployees, sortBy, sortDir])

  const colFiltered = useMemo(() => sortedRaw.filter((e) => {
    const f = art42ColFilters
    if (f.empleado && !`${e.firstName} ${e.lastName} ${e.cedula ?? ''}`.toLowerCase().includes(f.empleado.toLowerCase())) return false
    if (f.departamento) {
      const dname = e.departmentName ?? departments.find((d) => d.id === e.departmentId)?.name ?? ''
      if (dname !== f.departamento) return false
    }
    if (f.cargo && (e.positionName ?? '') !== f.cargo) return false
    if (f.labor && (e.laborName ?? '') !== f.labor) return false
    if (f.contratoTipo && (e.contratoTipo ?? '') !== f.contratoTipo) return false
    if (f.contratoActual && !(e.contratoActual ?? '').toLowerCase().includes(f.contratoActual.toLowerCase())) return false
    if (f.estado && e.status !== f.estado) return false
    return true
  }), [sortedRaw, art42ColFilters, departments])

  const totalPages = Math.max(1, Math.ceil(colFiltered.length / limit))
  const paginated  = useMemo(() => colFiltered.slice((page - 1) * limit, page * limit), [colFiltered, page, limit])

  // ── Mutations ───────────────────────────────────────────────────────────────
  const { mutateAsync: createEmpleado, isPending: creating } = useMutation({
    mutationFn: empleadosService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setSheetOpen(false)
      toast.success('Empleado creado exitosamente')
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e?.response?.data?.message ?? 'Error al crear empleado')
    },
  })

  const { mutateAsync: updateEmpleado, isPending: updating } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EmpleadoFormData> }) =>
      empleadosService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setSheetOpen(false)
      setEditingEmpleado(null)
      toast.success('Empleado actualizado')
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e?.response?.data?.message ?? 'Error al actualizar empleado')
    },
  })

  const { mutateAsync: deleteEmpleado, isPending: deleting } = useMutation({
    mutationFn: empleadosService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setDeleteTarget(null)
      toast.success('Empleado eliminado')
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e?.response?.data?.message ?? 'Error al eliminar empleado')
    },
  })

  const { mutateAsync: inactivarEmpleado, isPending: inactivating } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EmpleadoFormData> }) =>
      empleadosService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] })
      queryClient.invalidateQueries({ queryKey: ['empleados-scoped'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setInactivarTarget(null)
      setExitDate('')
      toast.success('Empleado inactivado')
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e?.response?.data?.message ?? 'Error al inactivar empleado')
    },
  })

  // ── Handlers ────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingEmpleado(null)
    setSheetOpen(true)
  }

  const openEdit = (emp: Empleado) => {
    setEditingEmpleado(emp)
    setSheetOpen(true)
  }

  const closeSheet = () => {
    setSheetOpen(false)
    setEditingEmpleado(null)
  }

  const handleSubmit = async (data: EmpleadoFormData) => {
    if (editingEmpleado) {
      await updateEmpleado({ id: editingEmpleado.id, data })
    } else {
      await createEmpleado(data)
    }
  }

  // ── Export ──────────────────────────────────────────────────────────────────
  const handleExport = async (selectedCols: ColKey[], format: 'xlsx' | 'pdf') => {
    setExporting(true)
    try {
      const empList = colFiltered
      const cols    = EXPORT_COLS.filter((c) => selectedCols.includes(c.key))
      const date    = new Date().toISOString().slice(0, 10)

      if (format === 'xlsx') {
        const rows = empList.map((e) =>
          Object.fromEntries(cols.map((c) => [c.label, c.get(e, departments)])),
        )
        const ws = XLSX.utils.json_to_sheet(rows)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Empleados')
        XLSX.writeFile(wb, `Empleados_${date}.xlsx`)
      } else {
        const doc  = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
        const head = [cols.map((c) => c.label)]
        const body = empList.map((e) => cols.map((c) => c.get(e, departments)))
        doc.setFontSize(11)
        doc.text(`Empleados — ${date}`, 14, 14)
        autoTable(doc, {
          head,
          body,
          startY:    20,
          styles:    { fontSize: 7, cellPadding: 2 },
          headStyles:{ fillColor: [44, 160, 91], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 250, 247] },
          margin: { left: 10, right: 10 },
        })
        doc.save(`Empleados_${date}.pdf`)
      }

      setExportModal(false)
    } catch {
      toast.error('Error al exportar empleados')
    } finally {
      setExporting(false)
    }
  }

  // ── Columns ─────────────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<Empleado>[]>(
    () => [
      {
        id: 'empleado',
        header: 'Empleado',
        cell: ({ row: { original: e } }) => (
          <div className="flex items-center gap-3">
            <Avatar name={`${e.firstName} ${e.lastName}`} size="sm" src={e.profilePhoto} />
            <div>
              <p className="font-medium text-[var(--text-1)]">
                {e.firstName} {e.lastName}
              </p>
              <p className="text-xs text-[var(--text-3)]">{e.email}</p>
            </div>
          </div>
        ),
      },
      {
        id: 'departamento',
        header: 'Centro de Costo',
        cell: ({ row: { original: e } }) => (
          <span className="text-[var(--text-2)]">
            {e.departmentName ?? departments.find((d) => d.id === e.departmentId)?.name ?? '—'}
          </span>
        ),
      },
      {
        id: 'cargo',
        header: 'Cargo',
        cell: ({ row: { original: e } }) => (
          <span className="text-[var(--text-2)]">{e.positionName ?? '—'}</span>
        ),
      },
      {
        id: 'labor',
        header: 'Labor',
        cell: ({ row: { original: e } }) => (
          <span className="text-[var(--text-2)]">{e.laborName ?? '—'}</span>
        ),
      },
      {
        id: 'contratoTipo',
        header: 'Tipo Contrato',
        cell: ({ row: { original: e } }) => (
          <span className="text-[var(--text-2)]">{e.contratoTipo ?? '—'}</span>
        ),
      },
      {
        id: 'contratoActual',
        header: 'Contrato Actual',
        cell: ({ row: { original: e } }) => (
          <span className="text-[var(--text-2)]">{e.contratoActual ?? '—'}</span>
        ),
      },
      {
        id: 'estado',
        header: 'Estado',
        cell: ({ row: { original: e } }) => {
          const s = statusMap[e.status]
          return <Badge variant={s.variant}>{s.label}</Badge>
        },
      },
      {
        id: 'acciones',
        header: '',
        cell: ({ row: { original: e } }) => (
          <div className="flex items-center gap-1 justify-end">
            <button
              onClick={() => navigate(`/empleados/${e.id}`)}
              title={canView ? 'Ver detalle' : 'Sin permiso para ver detalle'}
              disabled={!canView}
              className="p-1.5 rounded-md text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--text-3)]"
            >
              <Eye size={15} />
            </button>
            {canEdit && (
              <button
                onClick={() => openEdit(e)}
                title="Editar"
                className="p-1.5 rounded-md text-[var(--text-3)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors"
              >
                <Pencil size={15} />
              </button>
            )}
            {canEdit && e.status === 'active' && (
              <button
                onClick={() => { setInactivarTarget(e); setExitDate(''); setExitDateError('') }}
                title="Inactivar"
                className="p-1.5 rounded-md text-[var(--text-3)] hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                <UserX size={15} />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => setDeleteTarget(e)}
                title="Eliminar"
                className="p-1.5 rounded-md text-[var(--text-3)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ),
      },
    ],
    [departments, navigate, canView, canEdit, canDelete, setInactivarTarget, setExitDate, setExitDateError], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const table = useReactTable({
    data: paginated,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  })

  const outerTabCls = (active: boolean) => cn(
    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
    active
      ? 'bg-[var(--accent)] text-white shadow-sm'
      : 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-hover)]',
  )

  return (
    <div>
      {/* Outer tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl mb-5 w-fit"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <button className={outerTabCls(outerTab === 'art42')}   onClick={() => setOuterTab('art42')}>Artículo 42</button>
        <button className={outerTabCls(outerTab === 'maestro')} onClick={() => setOuterTab('maestro')}>Maestro General</button>
      </div>

      {outerTab === 'maestro' && <MaestroGeneralTab />}

      {outerTab === 'art42' && <>
      <ExportModal
        open={exportModal}
        onClose={() => setExportModal(false)}
        onExport={handleExport}
        loading={exporting}
      />

      {/* Top bar */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[var(--text-3)]">
          {colFiltered.length !== total
            ? <><span className="font-medium text-[var(--text-2)]">{colFiltered.length}</span> de {total} empleados</>
            : <><span className="font-medium text-[var(--text-2)]">{total}</span> empleado{total !== 1 ? 's' : ''}</>
          }
        </span>
        <div className="flex items-center gap-2">
          {activeArt42Filters > 0 && (
            <button onClick={clearArt42Filters}
              className="flex items-center gap-1 text-xs text-[var(--accent)] hover:opacity-80">
              <X size={11} /> Limpiar {activeArt42Filters} filtro{activeArt42Filters > 1 ? 's' : ''}
            </button>
          )}
          <button
            onClick={() => setExportModal(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors disabled:opacity-50"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-2)' }}
          >
            <FileDown size={13} /> Exportar
          </button>
          {canCreate && (
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
            >
              <UserPlus size={13} /> Nuevo empleado
            </button>
          )}
        </div>
      </div>

      {/* Table card */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => {
                const sortColMap: Record<string, string> = {
                  empleado: 'firstName',
                  departamento: 'departmentName',
                  cargo: 'positionName',
                  estado: 'status',
                }
                const colFilterInputCls = 'w-full mt-1 h-6 px-1.5 text-[11px] rounded border outline-none bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] transition-colors'
                const contratoTipoOpts = [...new Set(sortedRaw.map((e) => e.contratoTipo ?? '').filter(Boolean))].sort()
                return (
                  <tr key={hg.id} className="border-b" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-hover)' }}>
                    {hg.headers.map((h) => {
                      const sortCol = sortColMap[h.id]
                      const isSortable = !!sortCol
                      return (
                        <th
                          key={h.id}
                          className="text-left px-3 py-2 align-top"
                          style={{ minWidth: ['empleado'].includes(h.id) ? 180 : 110 }}
                        >
                          <span
                            className={cn(
                              'inline-flex items-center text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wide whitespace-nowrap',
                              isSortable && 'cursor-pointer select-none hover:text-[var(--text-1)]',
                              art42ColFilters[h.id] && 'text-[var(--accent)]',
                            )}
                            onClick={isSortable ? () => handleSort(sortCol) : undefined}
                          >
                            {flexRender(h.column.columnDef.header, h.getContext())}
                            {isSortable && <SortIcon col={sortCol} sortBy={sortBy} sortDir={sortDir} />}
                            {art42ColFilters[h.id] && <span className="ml-1">●</span>}
                          </span>

                          {h.id === 'empleado' && (
                            <input value={art42ColFilters.empleado ?? ''} onChange={(e) => setArt42Filter('empleado', e.target.value)}
                              placeholder="Filtrar..." className={colFilterInputCls} />
                          )}
                          {h.id === 'departamento' && (
                            <select value={art42ColFilters.departamento ?? ''} onChange={(e) => setArt42Filter('departamento', e.target.value)} className={colFilterInputCls}>
                              <option value="">Todos</option>
                              {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                            </select>
                          )}
                          {h.id === 'cargo' && (
                            <select value={art42ColFilters.cargo ?? ''} onChange={(e) => setArt42Filter('cargo', e.target.value)} className={colFilterInputCls}>
                              <option value="">Todos</option>
                              {positions.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                            </select>
                          )}
                          {h.id === 'labor' && (
                            <select value={art42ColFilters.labor ?? ''} onChange={(e) => setArt42Filter('labor', e.target.value)} className={colFilterInputCls}>
                              <option value="">Todos</option>
                              {labors.map((l) => <option key={l.id} value={l.name}>{l.name}</option>)}
                            </select>
                          )}
                          {h.id === 'contratoTipo' && (
                            <select value={art42ColFilters.contratoTipo ?? ''} onChange={(e) => setArt42Filter('contratoTipo', e.target.value)} className={colFilterInputCls}>
                              <option value="">Todos</option>
                              {contratoTipoOpts.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          )}
                          {h.id === 'contratoActual' && (
                            <input value={art42ColFilters.contratoActual ?? ''} onChange={(e) => setArt42Filter('contratoActual', e.target.value)}
                              placeholder="Filtrar..." className={colFilterInputCls} />
                          )}
                          {h.id === 'estado' && (
                            <select value={art42ColFilters.estado ?? ''} onChange={(e) => setArt42Filter('estado', e.target.value)} className={colFilterInputCls}>
                              <option value="">Todos</option>
                              <option value="active">Activo</option>
                              <option value="inactive">Inactivo</option>
                            </select>
                          )}
                        </th>
                      )
                    })}
                  </tr>
                )
              })}
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3 text-[var(--text-3)]">
                      <Loader2 size={24} className="animate-spin" />
                      <span className="text-sm">Cargando empleados...</span>
                    </div>
                  </td>
                </tr>
              ) : colFiltered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3 text-[var(--text-3)]">
                      <Users size={36} className="opacity-40" />
                      <div>
                        <p className="text-sm font-medium text-[var(--text-2)]">Sin empleados</p>
                        <p className="text-xs mt-0.5">
                          {activeArt42Filters > 0
                            ? 'Prueba cambiando los filtros'
                            : 'Crea el primer empleado usando el botón de arriba'}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b transition-colors hover:bg-[var(--bg-hover)]"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3 border-t"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <span className="text-xs text-[var(--text-3)]">
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-md border border-[var(--border-color)] text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-md border border-[var(--border-color)] text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      </> /* end art42 */}

      {/* Sheet — Create / Edit */}
      <EmpleadoSheet
        open={sheetOpen}
        title={editingEmpleado ? `Editar: ${editingEmpleado.firstName} ${editingEmpleado.lastName}` : 'Nuevo empleado'}
        onClose={closeSheet}
      >
        <EmpleadoForm
          key={editingEmpleado?.id ?? 'new'}
          defaultValues={editingEmpleado ?? undefined}
          onSubmit={handleSubmit}
          onCancel={closeSheet}
          isLoading={creating || updating}
        />
      </EmpleadoSheet>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar empleado"
        description={
          deleteTarget
            ? `¿Estás seguro de que deseas eliminar a ${deleteTarget.firstName} ${deleteTarget.lastName}? Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
        loading={deleting}
        onConfirm={() => deleteTarget && deleteEmpleado(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Inactivar modal */}
      {inactivarTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !inactivating && setInactivarTarget(null)} />
          <div
            className="relative rounded-xl shadow-xl w-full max-w-sm"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                <UserX size={16} className="text-amber-500" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-1)]">Inactivar empleado</h3>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">
              <p className="text-sm text-[var(--text-2)]">
                ¿Deseas inactivar a <strong className="text-[var(--text-1)]">{inactivarTarget.firstName} {inactivarTarget.lastName}</strong>?
              </p>
              <div>
                <label className="block text-xs font-medium text-[var(--text-2)] mb-1">
                  Fecha de salida <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={exitDate}
                  onChange={(e) => { setExitDate(e.target.value); setExitDateError('') }}
                  className={cn(
                    'w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors',
                    'bg-[var(--bg-base)] text-[var(--text-1)]',
                    exitDateError
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-[var(--border-color)] focus:border-[var(--accent)]',
                  )}
                />
                {exitDateError && <p className="text-xs text-red-400 mt-1">{exitDateError}</p>}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => setInactivarTarget(null)}
                disabled={inactivating}
                className="px-4 py-2 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                disabled={inactivating}
                onClick={() => {
                  if (!exitDate) { setExitDateError('La fecha de salida es requerida'); return }
                  inactivarEmpleado({
                    id: inactivarTarget.id,
                    data: { status: 'inactive', contractEndDate: exitDate },
                  })
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-amber-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {inactivating && <Loader2 size={13} className="animate-spin" />}
                Inactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
