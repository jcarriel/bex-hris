import { useState, useRef, useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Upload, Download, FileSpreadsheet, CheckCircle2,
  XCircle, AlertTriangle, ChevronRight, Loader2, X,
} from 'lucide-react'
import {
  bulkUploadService,
  generateXlsxTemplate,
  readXlsxPreview,
  TEMPLATES,
} from '@/services/bulk-upload.service'
import type { BulkUploadResult, TemplateName } from '@/services/bulk-upload.service'
import { cn } from '@/lib/utils'

// ─── Tab definitions ──────────────────────────────────────────────────────────
interface TabDef { key: TemplateName; label: string; icon: string }

const TABS: TabDef[] = [
  { key: 'employees', label: 'Empleados',  icon: '👥' },
  { key: 'payroll',   label: 'Nómina',     icon: '💰' },
  { key: 'marcacion', label: 'Asistencia', icon: '🕐' },
]

const XLSX_ACCEPT = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

// ─── Shared layout helpers ────────────────────────────────────────────────────
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn('rounded-xl border', className)}
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
    >
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-3">
      {children}
    </h3>
  )
}

// ─── Result Panel ─────────────────────────────────────────────────────────────
function ResultPanel({ result, onClose }: { result: BulkUploadResult; onClose: () => void }) {
  const hasErrors   = result.errors.length > 0
  const hasNotFound = (result.notFoundEmployees?.length ?? 0) > 0

  return (
    <Card className="overflow-hidden">
      <div
        className={cn(
          'flex items-center justify-between px-5 py-4 border-b',
          hasErrors ? 'bg-amber-500/5' : 'bg-emerald-500/5',
        )}
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-2">
          {hasErrors
            ? <AlertTriangle size={18} className="text-amber-400" />
            : <CheckCircle2  size={18} className="text-emerald-400" />}
          <span className="font-semibold text-[var(--text-1)] text-sm">Resultado de la carga</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-[var(--text-3)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* KPIs */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 divide-x border-b"
        style={{ borderColor: 'var(--border-color)' }}
      >
        {[
          { label: 'Procesados',   value: result.processedCount, color: 'text-[var(--text-1)]' },
          { label: 'Creados',      value: result.createdCount,   color: 'text-emerald-400' },
          { label: 'Actualizados', value: result.updatedCount,   color: 'text-blue-400' },
          { label: 'Errores',      value: result.errors.length,  color: result.errors.length ? 'text-red-400' : 'text-[var(--text-3)]' },
        ].map((kpi) => (
          <div key={kpi.label} className="flex flex-col items-center py-4 px-2">
            <span className={cn('text-2xl font-bold', kpi.color)}>{kpi.value}</span>
            <span className="text-xs text-[var(--text-3)] mt-0.5">{kpi.label}</span>
          </div>
        ))}
      </div>

      {/* Errors */}
      {hasErrors && (
        <div className="p-5">
          <SectionTitle>Errores por fila</SectionTitle>
          <div className="max-h-56 overflow-y-auto rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-hover)' }}>
                  <th className="text-left px-3 py-2 text-xs text-[var(--text-3)] font-medium w-16">Fila</th>
                  <th className="text-left px-3 py-2 text-xs text-[var(--text-3)] font-medium">Mensaje</th>
                </tr>
              </thead>
              <tbody>
                {result.errors.map((err, i) => (
                  <tr key={i} className="border-b last:border-0" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="px-3 py-2 text-[var(--text-3)] font-mono">{err.row}</td>
                    <td className="px-3 py-2 text-red-400">{err.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Not found employees */}
      {hasNotFound && (
        <div className="px-5 pb-5">
          <SectionTitle>Empleados no encontrados ({result.notFoundEmployees!.length})</SectionTitle>
          <div className="max-h-40 overflow-y-auto rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-hover)' }}>
                  <th className="text-left px-3 py-2 text-xs text-[var(--text-3)] font-medium w-16">Fila</th>
                  <th className="text-left px-3 py-2 text-xs text-[var(--text-3)] font-medium">Cédula</th>
                  <th className="text-left px-3 py-2 text-xs text-[var(--text-3)] font-medium">Nombre</th>
                </tr>
              </thead>
              <tbody>
                {result.notFoundEmployees!.map((emp, i) => (
                  <tr key={i} className="border-b last:border-0" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="px-3 py-2 text-[var(--text-3)] font-mono">{emp.row}</td>
                    <td className="px-3 py-2 text-[var(--text-2)]">{emp.cedula}</td>
                    <td className="px-3 py-2 text-[var(--text-1)]">{emp.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── Dropzone ─────────────────────────────────────────────────────────────────
interface DropzoneProps {
  file: File | null
  onFile: (f: File) => void
  onClear: () => void
}

function Dropzone({ file, onFile, onClear }: DropzoneProps) {
  const inputRef  = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) onFile(dropped)
  }, [onFile])

  if (file) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl border"
        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-base)' }}
      >
        <FileSpreadsheet size={20} className="text-emerald-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-1)] truncate">{file.name}</p>
          <p className="text-xs text-[var(--text-3)]">{(file.size / 1024).toFixed(1)} KB</p>
        </div>
        <button
          onClick={onClear}
          className="p-1.5 rounded-md text-[var(--text-3)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <X size={15} />
        </button>
      </div>
    )
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-10 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
        dragging
          ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
          : 'border-[var(--border-color)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]',
      )}
    >
      <FileSpreadsheet size={32} className="text-[var(--text-3)]" />
      <div className="text-center">
        <p className="text-sm font-medium text-[var(--text-1)]">Arrastra el archivo aquí</p>
        <p className="text-xs text-[var(--text-3)] mt-0.5">o haz clic para seleccionar · Excel (.xlsx)</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={XLSX_ACCEPT}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
      />
    </div>
  )
}

// Columns that are skipped for employees (mapped to '' in EMPLOYEE_COLUMN_MAP)
const EMPLOYEE_SKIP_COLS = new Set(['n°', 'no.'])

// ─── XLSX Preview ─────────────────────────────────────────────────────────────
function XlsxPreview({ file, tabKey, onParsingChange }: {
  file: File
  tabKey: TemplateName
  onParsingChange: (parsing: boolean) => void
}) {
  const [preview, setPreview] = useState<{ headers: string[]; rows: (string | number | boolean)[][]; skippedRows: number } | null>(null)
  const [loaded, setLoaded]   = useState(false)

  useEffect(() => {
    setLoaded(false)
    setPreview(null)
    onParsingChange(true)
    const sheetKeyword = tabKey === 'employees' ? 'trabajadores' : tabKey === 'maestro' ? 'TRABAJ' : undefined
    readXlsxPreview(file, 8, sheetKeyword).then((data) => {
      setPreview(data)
      setLoaded(true)
      onParsingChange(false)
    }).catch(() => { setLoaded(true); onParsingChange(false) })
  }, [file])

  if (!loaded) {
    return (
      <div className="flex items-center gap-3 py-6 px-4 rounded-lg border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
        <Loader2 size={16} className="animate-spin text-[var(--accent)] shrink-0" />
        <span className="text-sm text-[var(--text-3)]">Procesando archivo, por favor espere...</span>
      </div>
    )
  }

  if (!preview || !preview.headers.length) return null

  // Build list of visible column indices (filter skipped cols for employees)
  const visibleCols = preview.headers
    .map((h, i) => ({ h: String(h), i }))
    .filter(({ h }) =>
      tabKey !== 'employees' || !EMPLOYEE_SKIP_COLS.has(h.toLowerCase().trim()),
    )

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <SectionTitle>Vista previa — {file.name} ({Math.min(preview.rows.length, 8)} filas)</SectionTitle>
        {preview.skippedRows > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {preview.skippedRows} {preview.skippedRows === 1 ? 'fila de título omitida' : 'filas de título omitidas'}
          </span>
        )}
      </div>
      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
        <table className="text-xs w-full">
          <thead>
            <tr
              className="border-b"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-hover)' }}
            >
              {visibleCols.map(({ h, i }) => (
                <th key={i} className="text-left px-2 py-1.5 text-[var(--text-3)] font-medium whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.slice(0, 8).map((row, ri) => (
              <tr key={ri} className="border-b last:border-0" style={{ borderColor: 'var(--border-color)' }}>
                {visibleCols.map(({ i: ci }) => (
                  <td key={ci} className="px-2 py-1.5 text-[var(--text-2)] whitespace-nowrap">
                    {row[ci] !== '' && row[ci] != null
                      ? String(row[ci])
                      : <span className="text-[var(--text-3)]">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Upload tab ───────────────────────────────────────────────────────────────
function UploadTab({ tabKey }: { tabKey: TemplateName }) {
  const tmpl = TEMPLATES[tabKey]
  const qc = useQueryClient()

  const [file, setFile]         = useState<File | null>(null)
  const [status, setStatus]     = useState<'active' | 'inactive'>('active')
  const [loading, setLoading]   = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [result, setResult]     = useState<BulkUploadResult | null>(null)
  const [error, setError]       = useState('')

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const extra: Record<string, string> = tabKey === 'employees' ? { status } : {}
      const res = await bulkUploadService.upload(tabKey, file, extra)
      setResult(res)
      if (res.createdCount > 0 || res.updatedCount > 0) {
        qc.invalidateQueries({ queryKey: ['empleados'] })
        qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Error al procesar el archivo')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setFile(null)
    setResult(null)
    setError('')
  }

  return (
    <div className="space-y-5">
      {/* Info cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <SectionTitle>Columnas esperadas</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {(tmpl.columns as readonly string[]).map((col) => (
              <span
                key={col}
                className="text-xs px-2 py-0.5 rounded-md font-mono"
                style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-2)' }}
              >
                {col}
              </span>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <SectionTitle>Instrucciones</SectionTitle>
          <ul className="space-y-1.5">
            {(tmpl.notes as readonly string[]).map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-2)]">
                <ChevronRight size={12} className="text-[var(--accent)] flex-shrink-0 mt-0.5" />
                {note}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Upload card */}
      <Card className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <SectionTitle>Subir archivo Excel</SectionTitle>
          <button
            onClick={() => generateXlsxTemplate(tabKey)}
            className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:opacity-80 transition-opacity"
          >
            <Download size={13} />
            Descargar plantilla .xlsx
          </button>
        </div>

        {/* Status selector — employees only */}
        {tabKey === 'employees' && (
          <div className="flex items-center gap-4">
            <span className="text-xs text-[var(--text-2)]">Estado de los empleados:</span>
            {(['active', 'inactive'] as const).map((s) => (
              <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  value={s}
                  checked={status === s}
                  onChange={() => setStatus(s)}
                  className="accent-[var(--accent)]"
                />
                <span className="text-xs text-[var(--text-1)]">
                  {s === 'active' ? 'Activo' : 'Inactivo'}
                </span>
              </label>
            ))}
          </div>
        )}

        <Dropzone file={file} onFile={setFile} onClear={handleClear} />

        {/* Preview */}
        {file && <XlsxPreview file={file} tabKey={tabKey} onParsingChange={setIsParsing} />}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
            <XCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleUpload}
            disabled={!file || loading || isParsing}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> Procesando...</>
              : <><Upload size={15} /> Cargar {tmpl.label}</>}
          </button>
        </div>
      </Card>

      {/* Result */}
      {result && <ResultPanel result={result} onClose={() => setResult(null)} />}
    </div>
  )
}

// ─── Employees tab with Artículo 42 / Maestro General sub-tabs ───────────────
type EmployeesSubTab = 'art42' | 'maestro'

function EmployeesUploadTab() {
  const [subTab, setSubTab] = useState<EmployeesSubTab>('art42')

  const subTabCls = (active: boolean) => cn(
    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
    active
      ? 'bg-[var(--accent)] text-white shadow-sm'
      : 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-hover)]',
  )

  return (
    <div>
      <div
        className="flex gap-1 p-1 rounded-xl mb-5 w-fit"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <button className={subTabCls(subTab === 'art42')}   onClick={() => setSubTab('art42')}>Artículo 42</button>
        <button className={subTabCls(subTab === 'maestro')} onClick={() => setSubTab('maestro')}>Maestro General</button>
      </div>

      {subTab === 'art42'   && <UploadTab key="employees-art42"   tabKey="employees" />}


      {subTab === 'maestro' && <UploadTab key="employees-maestro" tabKey="maestro" />}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function CargaMasivaPage() {
  const [activeTab, setActiveTab] = useState<TemplateName>('employees')

  return (
    <div>
      {/* Main tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl mb-6 w-fit"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.key
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-hover)]',
            )}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'employees' && <EmployeesUploadTab />}
      {activeTab !== 'employees' && <UploadTab key={activeTab} tabKey={activeTab} />}
    </div>
  )
}
