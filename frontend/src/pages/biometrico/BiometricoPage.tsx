import { useState, useCallback, useMemo, useEffect } from 'react'
import * as XLSX from 'xlsx'
import {
  Fingerprint, Wifi, WifiOff, RefreshCw, Server, ChevronDown, ChevronUp,
  Clock, Monitor, AlertCircle, CheckCircle2, Loader2, Search, X, FlaskConical,
  Download, ArrowUpDown, ArrowUp, ArrowDown, Users, UserCheck, UserX,
  ChevronLeft, ChevronRight, Pencil, Trash2, UserPlus, Save,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getBiometricoConfig, saveBiometricoConfig, biometricoLogin,
  getTerminals, getBioEmployees, getBioDepartments, getBioPositions,
  createBioEmployee, updateBioEmployee, deleteBioEmployee,
  getReport,
  type BiometricoConfig, type UTTerminal, type UTEmployee,
  type UTDepartment, type UTPosition, type UTEmployeeFormData,
} from '@/services/biometrico.service'
import { empleadosService } from '@/services/empleados.service'
import { novedadesService, type NovedadType } from '@/services/novedades.service'
import { leavesService } from '@/services/leaves.service'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ColDef {
  key: string
  label: string
  sortable?: boolean
  render?: (val: any, row: any) => React.ReactNode
  csvValue?: (val: any) => string
  className?: string
}

interface SortState { key: string; dir: 'asc' | 'desc' }

interface ReportConfig {
  id: string
  label: string
  description: string
  path: string
  columns?: ColDef[]
}

// ─── Column Definitions ───────────────────────────────────────────────────────

const PUNCH_GREEN = (v: any) =>
  v ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
      <Clock size={11} />{v}
    </span>
  ) : <span className="text-xs text-[var(--text-3)] italic">—</span>

const PUNCH_RED = (v: any) =>
  v ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
      <Clock size={11} />{v}
    </span>
  ) : <span className="text-xs text-[var(--text-3)] italic">—</span>

const FIRST_LAST_COLS: ColDef[] = [
  { key: 'emp_code',   label: 'Cód.',          sortable: true, className: 'font-mono text-xs' },
  { key: 'first_name', label: 'Nombre',         sortable: true, className: 'font-medium' },
  { key: 'dept_name',  label: 'Departamento',   sortable: true, className: 'text-xs' },
  { key: 'att_date',   label: 'Fecha',          sortable: true, className: 'text-xs whitespace-nowrap' },
  { key: 'weekday',    label: 'Día',            sortable: true, className: 'text-xs' },
  { key: 'first_punch', label: 'Entrada',       sortable: true, render: PUNCH_GREEN },
  { key: 'last_punch',  label: 'Salida',        sortable: true, render: PUNCH_RED },
  { key: 'total_time',  label: 'Total',         sortable: true, className: 'font-mono text-xs' },
]

// ─── Report Configs ───────────────────────────────────────────────────────────

const REPORT_CONFIGS: ReportConfig[] = [
  {
    id: 'firstLast',
    label: 'Primera / Última',
    description: 'Primera y última marcación del día por empleado',
    path: '/att/api/firstLastReport/',
    columns: FIRST_LAST_COLS,
  },
  {
    id: 'late',
    label: 'Tardanzas',
    description: 'Empleados que llegaron tarde al trabajo',
    path: '/att/api/lateReport/',
  },
  {
    id: 'absent',
    label: 'Ausencias',
    description: 'Empleados ausentes en el período seleccionado',
    path: '/att/api/absentReport/',
  },
  {
    id: 'overtime',
    label: 'Horas Extra',
    description: 'Horas extra trabajadas por empleado',
    path: '/att/api/overtimeReport/',
  },
  {
    id: 'monthly',
    label: 'Mensual Detallado',
    description: 'Detalle completo de asistencia mensual',
    path: '/att/api/monthlyAttDetailsReport/',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10) }

function firstOfMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const FIELD_LABELS: Record<string, string> = {
  emp_code: 'Cód.', first_name: 'Nombre', last_name: 'Apellido',
  dept_name: 'Departamento', dept_code: 'Cód. Depto.',
  position_name: 'Cargo', position_code: 'Cód. Cargo',
  att_date: 'Fecha', weekday: 'Día',
  first_punch: 'Entrada', last_punch: 'Salida', total_time: 'Total',
  punch_time: 'Hora marcación', punch_state: 'Estado',
  late_time: 'Tardanza', overtime: 'H. Extra', overtime_time: 'Tiempo extra',
  absent_days: 'Días ausente', work_time: 'Tiempo trabajado',
}

const HIDDEN_KEYS = new Set([
  'in_temp', 'out_temp', 'in_temp_color', 'out_temp_color',
  'displayed_mask', 'nick_name', 'gender', 'last_name',
  'dept_code', 'position_code',
])

function autoColumns(row: any): ColDef[] {
  return Object.keys(row)
    .filter((k) => !HIDDEN_KEYS.has(k))
    .map((k) => ({
      key: k,
      label: FIELD_LABELS[k] ?? k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      sortable: true,
    }))
}

function compareValues(a: any, b: any, dir: 'asc' | 'desc'): number {
  const cmp = String(a ?? '').localeCompare(String(b ?? ''), 'es', { numeric: true })
  return dir === 'asc' ? cmp : -cmp
}

function avgTime(records: any[]): string {
  const valid = records.filter((r) => r.total_time && r.total_time !== '00:00')
  if (!valid.length) return '—'
  const totalMins = valid.reduce((sum, r) => {
    const [h, m] = (r.total_time ?? '0:0').split(':').map(Number)
    return sum + (h || 0) * 60 + (m || 0)
  }, 0)
  const avg = Math.round(totalMins / valid.length)
  return `${String(Math.floor(avg / 60)).padStart(2, '0')}:${String(avg % 60).padStart(2, '0')}`
}

function exportXLSX(data: any[], columns: ColDef[], filename: string) {
  const header = columns.map((c) => c.label)
  const rows = data.map((row) =>
    columns.map((c) => c.csvValue ? c.csvValue(row[c.key]) : (row[c.key] ?? ''))
  )
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows])

  // Auto column widths
  const colWidths = columns.map((c, ci) => {
    const maxLen = Math.max(
      c.label.length,
      ...rows.map((r) => String(r[ci] ?? '').length),
    )
    return { wch: Math.min(maxLen + 2, 40) }
  })
  ws['!cols'] = colWidths

  // Header style (bold)
  columns.forEach((_, ci) => {
    const cell = XLSX.utils.encode_cell({ r: 0, c: ci })
    if (ws[cell]) ws[cell].s = { font: { bold: true } }
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte')
  XLSX.writeFile(wb, filename)
}

function pageRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

// ─── Pagination Bar ───────────────────────────────────────────────────────────

function PaginationBar({ page, totalPages, onChange }: {
  page: number; totalPages: number; onChange: (p: number) => void
}) {
  const pages = pageRange(page, totalPages)
  const btn = (active: boolean, disabled?: boolean) => cn(
    'min-w-[28px] h-7 px-1.5 text-xs rounded border transition-colors',
    disabled
      ? 'opacity-40 cursor-not-allowed border-transparent text-[var(--text-3)]'
      : active
        ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
        : 'border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg-hover)]',
  )
  return (
    <div className="flex items-center gap-1">
      <button className={btn(false, page <= 1)} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft size={11} className="mx-auto" />
      </button>
      {pages.map((p, i) =>
        p === '...'
          ? <span key={`e${i}`} className="min-w-[28px] text-center text-xs text-[var(--text-3)]">…</span>
          : <button key={p} className={btn(p === page)} onClick={() => onChange(p as number)}>{p}</button>
      )}
      <button className={btn(false, page >= totalPages)} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        <ChevronRight size={11} className="mx-auto" />
      </button>
    </div>
  )
}

// ─── Config Panel ─────────────────────────────────────────────────────────────

function ConfigPanel({ cfg, onChange, onConnect, connecting, error }: {
  cfg: BiometricoConfig
  onChange: (c: BiometricoConfig) => void
  onConnect: () => void
  connecting: boolean
  error: string
}) {
  const [open, setOpen] = useState(true)
  const input = 'w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-1)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]'
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <button onClick={() => setOpen((p) => !p)} className="w-full flex items-center justify-between px-5 py-3.5 text-left">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-1)]">
          <Server size={15} className="text-[var(--accent)]" />
          Configuración de conexión
        </div>
        {open ? <ChevronUp size={15} className="text-[var(--text-3)]" /> : <ChevronDown size={15} className="text-[var(--text-3)]" />}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-[var(--border)]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <div>
              <label className="block text-xs text-[var(--text-3)] mb-1">URL del servidor</label>
              <input value={cfg.baseUrl} onChange={(e) => onChange({ ...cfg, baseUrl: e.target.value })} placeholder="http://192.168.20.3:8081" className={input} />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-3)] mb-1">Usuario</label>
              <input value={cfg.username} onChange={(e) => onChange({ ...cfg, username: e.target.value })} placeholder="admin" className={input} />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-3)] mb-1">Contraseña</label>
              <input type="password" value={cfg.password} onChange={(e) => onChange({ ...cfg, password: e.target.value })} placeholder="••••••••" className={input} />
            </div>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle size={14} className="flex-shrink-0" />{error}
            </div>
          )}
          <button onClick={onConnect} disabled={connecting} className="mt-4 flex items-center gap-2 px-5 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
            {connecting ? <Loader2 size={14} className="animate-spin" /> : <Wifi size={14} />}
            {connecting ? 'Conectando...' : 'Conectar'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Terminals Tab ────────────────────────────────────────────────────────────

function TerminalsTab({ terminals, loading }: { terminals: UTTerminal[]; loading: boolean }) {
  if (loading) return <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-[var(--text-3)]" /></div>
  if (!terminals.length) return (
    <div className="flex flex-col items-center py-20 text-[var(--text-3)]">
      <Monitor size={36} className="mb-2 opacity-30" />
      <p className="text-sm">No se encontraron dispositivos</p>
    </div>
  )
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {terminals.map((t) => (
        <div key={t.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fingerprint size={16} className="text-[var(--accent)]" />
              <span className="font-semibold text-sm text-[var(--text-1)]">{t.alias || t.sn}</span>
            </div>
            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
              t.is_connect ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-gray-500/15 text-gray-500')}>
              {t.is_connect ? <Wifi size={10} /> : <WifiOff size={10} />}
              {t.is_connect ? 'En línea' : 'Desconectado'}
            </span>
          </div>
          <div className="space-y-1.5 text-xs text-[var(--text-2)]">
            {[['Serie', t.sn], ['IP', t.ip_address || '—'], ['Modelo', t.device_name || t.platform || '—'], ['Firmware', t.firmware_version || '—']].map(([l, v]) => (
              <div key={l} className="flex justify-between">
                <span className="text-[var(--text-3)]">{l}</span>
                <span className="font-mono">{v}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[var(--border)]">
            {[['Usuarios', t.user_count], ['Huellas', t.fp_count], ['Rostros', t.face_count]].map(([l, v]) => (
              <div key={l} className="text-center">
                <p className="text-[10px] text-[var(--text-3)]">{l}</p>
                <p className="text-sm font-bold text-[var(--text-1)]">{v ?? '—'}</p>
              </div>
            ))}
          </div>
          {t.last_activity && (
            <p className="text-[10px] text-[var(--text-3)] text-right">
              Última actividad: {new Date(t.last_activity).toLocaleString('es-EC')}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Reportes Tab ─────────────────────────────────────────────────────────────

function ReportesTab({ token, baseUrl }: { token: string; baseUrl: string }) {
  const today        = todayStr()
  const firstOfMonth = firstOfMonthStr()

  const [reportId,    setReportId]    = useState('firstLast')
  const [dateFrom,    setDateFrom]    = useState(firstOfMonth)
  const [dateTo,      setDateTo]      = useState(today)
  const [empCode,     setEmpCode]     = useState('')
  const [deptFilter,  setDeptFilter]  = useState('')
  const [textSearch,  setTextSearch]  = useState('')
  const [pageSize,    setPageSize]    = useState(100)

  const [allData,       setAllData]       = useState<any[]>([])
  const [columns,       setColumns]       = useState<ColDef[]>([])
  const [serverTotal,   setServerTotal]   = useState(0)
  const [loading,       setLoading]       = useState(false)
  const [loadingMsg,    setLoadingMsg]    = useState('')
  const [error,         setError]         = useState('')
  const [searched,      setSearched]      = useState(false)

  const [sort,        setSort]        = useState<SortState>({ key: '', dir: 'asc' })
  const [clientPage,  setClientPage]  = useState(1)

  const reportCfg = REPORT_CONFIGS.find((r) => r.id === reportId)!

  const handleReportChange = (id: string) => {
    setReportId(id); setAllData([]); setColumns([]); setServerTotal(0)
    setSearched(false); setError(''); setSort({ key: '', dir: 'asc' })
    setClientPage(1); setDeptFilter(''); setTextSearch('')
  }

  const doFetch = useCallback(async () => {
    const cfg = REPORT_CONFIGS.find((r) => r.id === reportId)!
    setLoading(true); setError(''); setClientPage(1); setLoadingMsg('')
    const PAGE_SIZE = 200
    const accumulated: any[] = []
    try {
      let page = 1
      while (true) {
        setLoadingMsg(accumulated.length > 0 ? `Cargando... ${accumulated.length} registros` : 'Consultando...')
        const res = await getReport(token, baseUrl, cfg.path, {
          start_date: dateFrom,
          end_date:   dateTo,
          page,
          page_size:  PAGE_SIZE,
          ...(empCode ? { emp_code: empCode } : {}),
        })
        accumulated.push(...res.results)
        if (res.count > 0) setLoadingMsg(`Cargando... ${accumulated.length} de ${res.count}`)
        if (res.results.length < PAGE_SIZE || accumulated.length >= res.count) break
        page++
      }
      setAllData(accumulated)
      setServerTotal(accumulated.length)
      setColumns(cfg.columns ?? (accumulated.length > 0 ? autoColumns(accumulated[0]) : []))
      setSearched(true)
      setSort({ key: '', dir: 'asc' })
      setDeptFilter('')
      setTextSearch('')
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.message ?? 'Error al consultar')
    } finally {
      setLoading(false); setLoadingMsg('')
    }
  }, [token, baseUrl, reportId, dateFrom, dateTo, empCode])

  // Department list derived from loaded data
  const departments = useMemo(() => {
    const s = new Set<string>()
    allData.forEach((r) => { if (r.dept_name) s.add(r.dept_name) })
    return Array.from(s).sort()
  }, [allData])

  // Client-side filtered
  const filtered = useMemo(() => {
    let d = allData
    if (deptFilter) d = d.filter((r) => r.dept_name === deptFilter)
    if (textSearch) {
      const q = textSearch.toLowerCase()
      d = d.filter((r) =>
        String(r.first_name ?? '').toLowerCase().includes(q) ||
        String(r.emp_code ?? '').includes(q) ||
        String(r.dept_name ?? '').toLowerCase().includes(q),
      )
    }
    return d
  }, [allData, deptFilter, textSearch])

  // Client-side sorted
  const sorted = useMemo(() => {
    if (!sort.key) return filtered
    return [...filtered].sort((a, b) => compareValues(a[sort.key], b[sort.key], sort.dir))
  }, [filtered, sort])

  // Client-side paginated
  const totalClientPages = Math.ceil(sorted.length / pageSize)
  const paginated = useMemo(() => {
    const start = (clientPage - 1) * pageSize
    return sorted.slice(start, start + pageSize)
  }, [sorted, clientPage, pageSize])

  // Stats (firstLast only)
  const stats = useMemo(() => {
    if (reportId !== 'firstLast' || !searched) return null
    return {
      total:      filtered.length,
      withEntry:  filtered.filter((r) => r.first_punch).length,
      noEntry:    filtered.filter((r) => !r.first_punch).length,
      avgTime:    avgTime(filtered),
    }
  }, [reportId, filtered, searched])

  const handleSort = (key: string) => {
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))
    setClientPage(1)
  }

  const handleExport = () => {
    if (!sorted.length || !columns.length) return
    exportXLSX(sorted, columns, `biometrico_${reportId}_${dateFrom}_${dateTo}.xlsx`)
  }

  const inputCls = 'h-8 px-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-1)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]'

  const from = sorted.length === 0 ? 0 : (clientPage - 1) * pageSize + 1
  const to   = Math.min(clientPage * pageSize, sorted.length)

  return (
    <div className="space-y-4 p-4">

      {/* Report type selector */}
      <div className="flex flex-wrap gap-2">
        {REPORT_CONFIGS.map((rc) => (
          <button
            key={rc.id}
            onClick={() => handleReportChange(rc.id)}
            title={rc.description}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
              reportId === rc.id
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg-hover)]',
            )}
          >
            {rc.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        <div>
          <label className="block text-[10px] text-[var(--text-3)] mb-1 uppercase tracking-wide">Desde</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-[10px] text-[var(--text-3)] mb-1 uppercase tracking-wide">Hasta</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-[10px] text-[var(--text-3)] mb-1 uppercase tracking-wide">Cód. empleado</label>
          <input
            value={empCode}
            onChange={(e) => setEmpCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doFetch()}
            placeholder="Opcional"
            className={cn(inputCls, 'w-28')}
          />
        </div>
        <div>
          <label className="block text-[10px] text-[var(--text-3)] mb-1 uppercase tracking-wide">Por página</label>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setClientPage(1) }}
            className={inputCls}
          >
            {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button
          onClick={doFetch}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 min-w-28"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
          {loading ? (loadingMsg || 'Consultando...') : 'Consultar'}
        </button>
        {searched && sorted.length > 0 && (
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-2)] text-xs font-medium hover:bg-[var(--bg-hover)] transition-colors"
          >
            <Download size={12} />
            Exportar Excel ({sorted.length})
          </button>
        )}
      </div>

      {/* Search + dept filter (after first load) */}
      {searched && allData.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
            <input
              value={textSearch}
              onChange={(e) => { setTextSearch(e.target.value); setClientPage(1) }}
              placeholder="Buscar por nombre, cédula o departamento..."
              className="w-full h-8 pl-7 pr-7 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-1)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
            {textSearch && (
              <button onClick={() => { setTextSearch(''); setClientPage(1) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-1)]">
                <X size={12} />
              </button>
            )}
          </div>
          {departments.length > 1 && (
            <select
              value={deptFilter}
              onChange={(e) => { setDeptFilter(e.target.value); setClientPage(1) }}
              className="h-8 px-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-1)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] max-w-56"
            >
              <option value="">Todos los departamentos</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
          {(deptFilter || textSearch) && (
            <button
              onClick={() => { setDeptFilter(''); setTextSearch(''); setClientPage(1) }}
              className="flex items-center gap-1 text-xs text-[var(--text-3)] hover:text-[var(--text-2)]"
            >
              <X size={11} /> Limpiar filtros
            </button>
          )}
          <span className="text-xs text-[var(--text-3)] whitespace-nowrap ml-auto">
            {filtered.length !== allData.length
              ? <><span className="font-medium text-[var(--text-2)]">{filtered.length}</span> de {allData.length} registros</>
              : <><span className="font-medium text-[var(--text-2)]">{allData.length}</span> registros</>
            }
            {serverTotal > allData.length && (
              <span className="ml-1 text-amber-600 dark:text-amber-400">
                · {serverTotal} en servidor
              </span>
            )}
          </span>
        </div>
      )}

      {/* Stats (firstLast only) */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Users,      label: 'Total registros',  value: stats.total,     color: 'text-[var(--accent)]' },
            { icon: UserCheck,  label: 'Con entrada',      value: stats.withEntry, color: 'text-emerald-600 dark:text-emerald-400' },
            { icon: UserX,      label: 'Sin marcación',    value: stats.noEntry,   color: 'text-red-500' },
            { icon: Clock,      label: 'Promedio horas',   value: stats.avgTime,   color: 'text-[var(--text-1)]' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 flex items-center gap-3">
              <Icon size={16} className={cn('flex-shrink-0', color)} />
              <div>
                <p className="text-[10px] text-[var(--text-3)] uppercase tracking-wide">{label}</p>
                <p className={cn('text-lg font-bold leading-tight', color)}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle size={14} className="flex-shrink-0" />{error}
        </div>
      )}

      {/* Content */}
      {searched && !error && (
        <>
          {/* Pagination top */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-xs text-[var(--text-3)]">
              Mostrando <span className="font-medium text-[var(--text-2)]">{from}–{to}</span> de{' '}
              <span className="font-medium text-[var(--text-2)]">{sorted.length}</span>
            </p>
            {totalClientPages > 1 && (
              <PaginationBar page={clientPage} totalPages={totalClientPages} onChange={(p) => setClientPage(p)} />
            )}
          </div>

          {/* Table */}
          <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--bg-surface)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-hover)]">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        onClick={() => col.sortable && handleSort(col.key)}
                        className={cn(
                          'px-4 py-2.5 text-left text-xs uppercase tracking-wider whitespace-nowrap',
                          col.sortable && 'cursor-pointer select-none hover:text-[var(--text-1)] transition-colors',
                          sort.key === col.key ? 'text-[var(--accent)]' : 'text-[var(--text-3)]',
                        )}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {col.sortable && (
                            sort.key === col.key
                              ? sort.dir === 'asc'
                                ? <ArrowUp size={10} className="text-[var(--accent)]" />
                                : <ArrowDown size={10} className="text-[var(--accent)]" />
                              : <ArrowUpDown size={10} className="opacity-25" />
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="text-center py-14 text-[var(--text-3)] text-sm">
                        Sin registros para los filtros aplicados
                      </td>
                    </tr>
                  ) : paginated.map((row, i) => (
                    <tr key={i} className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors">
                      {columns.map((col) => (
                        <td key={col.key} className={cn('px-4 py-3 text-[var(--text-2)]', col.className)}>
                          {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination bottom */}
          {totalClientPages > 1 && (
            <div className="flex justify-end">
              <PaginationBar page={clientPage} totalPages={totalClientPages} onChange={(p) => setClientPage(p)} />
            </div>
          )}
        </>
      )}

      {!searched && !error && (
        <div className="flex flex-col items-center py-16 text-[var(--text-3)]">
          <Clock size={36} className="mb-2 opacity-30" />
          <p className="text-sm">Selecciona un rango de fechas y presiona Consultar</p>
          <p className="text-xs mt-1 opacity-60">{reportCfg.description}</p>
        </div>
      )}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

// ─── EmpModal ─────────────────────────────────────────────────────────────────

function EmpModal({ token, baseUrl, employee, departments, positions, onClose, onSaved }: {
  token: string; baseUrl: string; employee: UTEmployee | null
  departments: UTDepartment[]; positions: UTPosition[]
  onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!employee
  const [form, setForm] = useState<UTEmployeeFormData>({
    emp_code:   employee?.emp_code   ?? '',
    first_name: employee?.first_name ?? '',
    last_name:  employee?.last_name  ?? '',
    hire_date:  employee?.hire_date  ?? '',
    department: employee?.department ?? '',
    position:   employee?.position   ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  const set = (k: keyof UTEmployeeFormData, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    setSaving(true); setErr('')
    try {
      if (isEdit) await updateBioEmployee(token, baseUrl, employee!.id, form)
      else         await createBioEmployee(token, baseUrl, form)
      onSaved()
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? e?.message ?? 'Error al guardar')
    } finally { setSaving(false) }
  }

  const inp = 'w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-1)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--text-1)]">{isEdit ? 'Editar empleado' : 'Nuevo empleado'}</h3>
          <button onClick={onClose} className="text-[var(--text-3)] hover:text-[var(--text-1)]"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-[var(--text-3)] mb-1 uppercase tracking-wide">Código *</label>
              <input value={form.emp_code} onChange={(e) => set('emp_code', e.target.value)} className={inp} placeholder="001" />
            </div>
            <div>
              <label className="block text-[10px] text-[var(--text-3)] mb-1 uppercase tracking-wide">Fecha ingreso</label>
              <input type="date" value={form.hire_date} onChange={(e) => set('hire_date', e.target.value)} className={inp} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-[var(--text-3)] mb-1 uppercase tracking-wide">Nombre *</label>
              <input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} className={inp} placeholder="Juan" />
            </div>
            <div>
              <label className="block text-[10px] text-[var(--text-3)] mb-1 uppercase tracking-wide">Apellido *</label>
              <input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} className={inp} placeholder="Pérez" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-[var(--text-3)] mb-1 uppercase tracking-wide">Departamento</label>
            <select value={form.department} onChange={(e) => set('department', e.target.value ? Number(e.target.value) : '')} className={inp}>
              <option value="">— seleccionar —</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.dept_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-[var(--text-3)] mb-1 uppercase tracking-wide">Cargo</label>
            <select value={form.position} onChange={(e) => set('position', e.target.value ? Number(e.target.value) : '')} className={inp}>
              <option value="">— seleccionar —</option>
              {positions.map((p) => <option key={p.id} value={p.id}>{p.position_name}</option>)}
            </select>
          </div>
          {err && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
              <AlertCircle size={12} />{err}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--border)]">
          <button onClick={onClose} className="px-4 py-2 text-xs rounded-lg border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-xs rounded-lg bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {isEdit ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Empleados Biométrico Tab ─────────────────────────────────────────────────

function EmpleadosTab({ token, baseUrl }: { token: string; baseUrl: string }) {
  const PAGE_SIZE = 50
  const [page,        setPage]        = useState(1)
  const [total,       setTotal]       = useState(0)
  const [employees,   setEmployees]   = useState<UTEmployee[]>([])
  const [departments, setDepartments] = useState<UTDepartment[]>([])
  const [positions,   setPositions]   = useState<UTPosition[]>([])
  const [loading,     setLoading]     = useState(false)
  const [search,      setSearch]      = useState('')
  const [deptFilter,  setDeptFilter]  = useState('')
  const [modal,       setModal]       = useState<{ open: boolean; emp: UTEmployee | null }>({ open: false, emp: null })
  const [delId,       setDelId]       = useState<string | null>(null)
  const [deleting,    setDeleting]    = useState(false)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const loadEmployees = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await getBioEmployees(token, baseUrl, p)
      setEmployees(res.results)
      setTotal(res.count)
    } catch { /* silencioso */ } finally { setLoading(false) }
  }, [token, baseUrl])

  useEffect(() => {
    loadEmployees(1)
    Promise.all([getBioDepartments(token, baseUrl), getBioPositions(token, baseUrl)])
      .then(([deps, pos]) => { setDepartments(deps); setPositions(pos) })
      .catch(() => {})
  }, [token, baseUrl])

  const handlePageChange = (p: number) => { setPage(p); loadEmployees(p) }

  const filtered = useMemo(() => {
    let d = employees
    if (deptFilter) d = d.filter((e) => String(e.department) === deptFilter)
    if (search) {
      const q = search.toLowerCase()
      d = d.filter((e) =>
        `${e.first_name} ${e.last_name ?? ''}`.toLowerCase().includes(q) ||
        e.emp_code.toLowerCase().includes(q)
      )
    }
    return d
  }, [employees, deptFilter, search])

  const handleDelete = async () => {
    if (!delId) return
    setDeleting(true)
    try {
      await deleteBioEmployee(token, baseUrl, delId)
      setDelId(null)
      loadEmployees(page)
    } catch { /* silencioso */ } finally { setDeleting(false) }
  }

  const inputCls = 'h-8 px-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-1)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]'

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-40">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o código..."
            className="w-full h-8 pl-7 pr-7 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-1)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-1)]">
              <X size={12} />
            </button>
          )}
        </div>
        {departments.length > 0 && (
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className={cn(inputCls, 'max-w-48')}>
            <option value="">Todos los departamentos</option>
            {departments.map((d) => <option key={d.id} value={String(d.id)}>{d.dept_name}</option>)}
          </select>
        )}
        <span className="text-xs text-[var(--text-3)] whitespace-nowrap">
          <span className="font-medium text-[var(--text-2)]">{total}</span> empleados
        </span>
        <button
          onClick={() => setModal({ open: true, emp: null })}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
        >
          <UserPlus size={13} /> Nuevo
        </button>
      </div>

      <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--bg-surface)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-hover)]">
              <tr>
                {['Cód.', 'Nombre', 'Apellido', 'Departamento', 'Cargo', 'Ingreso', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs uppercase tracking-wider text-[var(--text-3)] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-14"><Loader2 size={18} className="animate-spin text-[var(--text-3)] mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-14 text-[var(--text-3)] text-sm">Sin empleados</td></tr>
              ) : filtered.map((emp) => (
                <tr key={emp.id} className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-[var(--text-2)]">{emp.emp_code}</td>
                  <td className="px-4 py-3 font-medium text-xs text-[var(--text-1)]">{emp.first_name}</td>
                  <td className="px-4 py-3 text-xs text-[var(--text-2)]">{emp.last_name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-[var(--text-2)]">{emp.dept_name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-[var(--text-2)]">{emp.position_name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-[var(--text-2)] font-mono">{emp.hire_date ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setModal({ open: true, emp })} className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors" title="Editar">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDelId(emp.id)} className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Eliminar">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-[var(--text-3)]">
            Página <span className="font-medium text-[var(--text-2)]">{page}</span> de {totalPages}
          </p>
          <PaginationBar page={page} totalPages={totalPages} onChange={handlePageChange} />
        </div>
      )}

      {modal.open && (
        <EmpModal
          token={token} baseUrl={baseUrl} employee={modal.emp}
          departments={departments} positions={positions}
          onClose={() => setModal({ open: false, emp: null })}
          onSaved={() => { setModal({ open: false, emp: null }); loadEmployees(page) }}
        />
      )}

      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-xl p-6 w-80 mx-4 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text-1)]">¿Eliminar empleado?</h3>
            <p className="text-xs text-[var(--text-2)]">Esta acción no se puede deshacer.</p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setDelId(null)} className="px-4 py-2 text-xs rounded-lg border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg-hover)]">Cancelar</button>
              <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 px-4 py-2 text-xs rounded-lg bg-red-500 text-white hover:opacity-90 disabled:opacity-50">
                {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── isoWeekToRange ───────────────────────────────────────────────────────────

function isoWeekToRange(year: number, week: number): { start: string; end: string } {
  const jan4     = new Date(Date.UTC(year, 0, 4))
  const dow      = jan4.getUTCDay() || 7
  const week1Mon = new Date(Date.UTC(year, 0, jan4.getUTCDate() - (dow - 1)))
  const mon      = new Date(Date.UTC(year, 0, week1Mon.getUTCDate() + (week - 1) * 7))
  const sun      = new Date(Date.UTC(mon.getUTCFullYear(), mon.getUTCMonth(), mon.getUTCDate() + 6))
  const fmt      = (d: Date) => d.toISOString().slice(0, 10)
  return { start: fmt(mon), end: fmt(sun) }
}

function currentISOWeek(): number {
  const d    = new Date()
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day  = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

// ─── Register Ausencia Modal ──────────────────────────────────────────────────

type LeaveType = 'vacation' | 'medical' | 'maternity' | 'personal' | 'ausentismo' | 'permiso' | 'paternidad'

function RegisterAusenciaModal({ type, hrisId, hrisName, date, onClose, onSaved }: {
  type: 'falta' | 'permiso'; hrisId: string; hrisName: string; date: string
  onClose: () => void; onSaved: () => void
}) {
  const [novedadType, setNovedadType] = useState<NovedadType>('otro')
  const [description, setDescription] = useState('Falta injustificada')
  const [novedadDate, setNovedadDate] = useState(date)
  const [leaveType,   setLeaveType]   = useState<LeaveType>('permiso')
  const [reason,      setReason]      = useState('')
  const [startDate,   setStartDate]   = useState(date)
  const [endDate,     setEndDate]     = useState(date)
  const [saving,      setSaving]      = useState(false)
  const [err,         setErr]         = useState('')

  const days = useMemo(() => {
    if (!startDate || !endDate) return 1
    const s = new Date(startDate + 'T00:00:00')
    const e = new Date(endDate   + 'T00:00:00')
    return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1)
  }, [startDate, endDate])

  const handleSubmit = async () => {
    setSaving(true); setErr('')
    try {
      if (type === 'falta') {
        await novedadesService.create({ employeeId: hrisId, type: novedadType, description, date: novedadDate })
      } else {
        await leavesService.create({ employeeId: hrisId, type: leaveType, startDate, endDate, days, reason })
      }
      onSaved()
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e?.response?.data?.error ?? e?.message ?? 'Error al registrar')
    } finally { setSaving(false) }
  }

  const inp = 'w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-1)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]'

  const NOVEDAD_OPTS: { value: NovedadType; label: string }[] = [
    { value: 'otro',            label: 'Otro' },
    { value: 'revision_nomina', label: 'Revisión de nómina' },
    { value: 'reclamo',         label: 'Reclamo' },
    { value: 'solicitud',       label: 'Solicitud' },
  ]
  const LEAVE_OPTS: { value: LeaveType; label: string }[] = [
    { value: 'permiso',    label: 'Permiso' },
    { value: 'personal',   label: 'Personal' },
    { value: 'medical',    label: 'Médico' },
    { value: 'ausentismo', label: 'Ausentismo' },
    { value: 'vacation',   label: 'Vacaciones' },
    { value: 'maternity',  label: 'Maternidad' },
    { value: 'paternidad', label: 'Paternidad' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-1)]">
              {type === 'falta' ? 'Registrar falta' : 'Registrar permiso'}
            </h3>
            <p className="text-xs text-[var(--text-3)] mt-0.5">{hrisName}</p>
          </div>
          <button onClick={onClose} className="text-[var(--text-3)] hover:text-[var(--text-1)]"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          {type === 'falta' ? (
            <>
              <div>
                <label className="block text-[10px] text-[var(--text-3)] mb-1 uppercase tracking-wide">Tipo</label>
                <select value={novedadType} onChange={(e) => setNovedadType(e.target.value as NovedadType)} className={inp}>
                  {NOVEDAD_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-[var(--text-3)] mb-1 uppercase tracking-wide">Fecha</label>
                <input type="date" value={novedadDate} onChange={(e) => setNovedadDate(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--text-3)] mb-1 uppercase tracking-wide">Descripción</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${inp} resize-none`} />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-[10px] text-[var(--text-3)] mb-1 uppercase tracking-wide">Tipo</label>
                <select value={leaveType} onChange={(e) => setLeaveType(e.target.value as LeaveType)} className={inp}>
                  {LEAVE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[var(--text-3)] mb-1 uppercase tracking-wide">Desde</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inp} />
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--text-3)] mb-1 uppercase tracking-wide">Hasta</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inp} />
                </div>
              </div>
              <p className="text-xs text-[var(--text-3)]">
                <span className="font-medium text-[var(--text-2)]">{days}</span> día{days !== 1 ? 's' : ''}
              </p>
              <div>
                <label className="block text-[10px] text-[var(--text-3)] mb-1 uppercase tracking-wide">Motivo</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Opcional" className={`${inp} resize-none`} />
              </div>
            </>
          )}
          {err && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
              <AlertCircle size={12} />{err}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--border)]">
          <button onClick={onClose} className="px-4 py-2 text-xs rounded-lg border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg-hover)]">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-xs rounded-lg bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Registrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Ausencias Tab ────────────────────────────────────────────────────────────

interface HrisEmp { id: string; fullName: string }

interface AusenteRow {
  emp_code:   string
  first_name: string
  last_name:  string | null
  dept_name:  string
  att_date:   string
  bioName:    string
  hrisId?:    string
  hrisName?:  string
}

function AusenciasTab({ token, baseUrl }: { token: string; baseUrl: string }) {
  const [year,     setYear]     = useState(new Date().getFullYear())
  const [week,     setWeek]     = useState(currentISOWeek)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [records,  setRecords]  = useState<AusenteRow[]>([])
  const [searched, setSearched] = useState(false)
  const [hrisEmps, setHrisEmps] = useState<HrisEmp[]>([])
  const [registerModal, setRegisterModal] = useState<{
    type: 'falta' | 'permiso'; hrisId: string; hrisName: string; date: string
  } | null>(null)

  const range = isoWeekToRange(year, week)

  const doFetch = async () => {
    setLoading(true); setError(''); setSearched(false)
    try {
      const [absent, hrisRaw] = await Promise.all([
        getReport(token, baseUrl, '/att/api/absentReport/', {
          start_date: range.start,
          end_date:   range.end,
          page_size:  500,
        }),
        hrisEmps.length ? Promise.resolve(null) : empleadosService.getAll({ limit: 9999 }),
      ])

      let emps = hrisEmps
      if (hrisRaw) {
        emps = (hrisRaw.data as any[]).map((e: any) => ({
          id:       e.id,
          fullName: `${e.firstName} ${e.lastName ?? ''}`.trim().toUpperCase(),
        }))
        setHrisEmps(emps)
      }

      const seen = new Set<string>()
      const rows: AusenteRow[] = []
      for (const row of absent.results) {
        if (seen.has(row.emp_code)) continue
        seen.add(row.emp_code)
        const bioName = `${row.first_name ?? ''}${row.last_name ? ' ' + row.last_name : ''}`.trim().toUpperCase()
        const match   = emps.find((e) => e.fullName === bioName)
        rows.push({
          emp_code:   row.emp_code   ?? '',
          first_name: row.first_name ?? '',
          last_name:  row.last_name  ?? null,
          dept_name:  row.dept_name  ?? '',
          att_date:   row.att_date   ?? range.start,
          bioName,
          hrisId:   match?.id,
          hrisName: match?.fullName,
        })
      }

      setRecords(rows)
      setSearched(true)
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.message ?? 'Error al consultar')
    } finally { setLoading(false) }
  }

  const matched   = records.filter((r) => r.hrisId)
  const unmatched = records.filter((r) => !r.hrisId)

  const inputCls = 'h-8 px-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-1)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]'

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-end gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        <div>
          <label className="block text-[10px] text-[var(--text-3)] mb-1 uppercase tracking-wide">Año</label>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className={cn(inputCls, 'w-20')} />
        </div>
        <div>
          <label className="block text-[10px] text-[var(--text-3)] mb-1 uppercase tracking-wide">Semana</label>
          <input type="number" min={1} max={53} value={week} onChange={(e) => setWeek(Number(e.target.value))} className={cn(inputCls, 'w-16')} />
        </div>
        <div>
          <label className="block text-[10px] text-[var(--text-3)] mb-1 uppercase tracking-wide">Período</label>
          <span className="text-xs text-[var(--text-2)] font-mono">{range.start} › {range.end}</span>
        </div>
        <button onClick={doFetch} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 min-w-28">
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
          {loading ? 'Consultando...' : 'Consultar'}
        </button>
      </div>

      {searched && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
            <UserX size={14} className="text-red-500" />
            <span className="text-xs text-[var(--text-2)]"><span className="font-bold text-[var(--text-1)]">{records.length}</span> ausentes</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
            <UserCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs text-[var(--text-2)]"><span className="font-bold text-[var(--text-1)]">{matched.length}</span> con match HRIS</span>
          </div>
          {unmatched.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-500/20 bg-amber-500/10">
              <AlertCircle size={14} className="text-amber-600 dark:text-amber-400" />
              <span className="text-xs text-amber-700 dark:text-amber-400"><span className="font-bold">{unmatched.length}</span> sin coincidencia</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle size={14} className="flex-shrink-0" />{error}
        </div>
      )}

      {searched && records.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--bg-surface)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-hover)]">
                <tr>
                  {['Cód.', 'Nombre biométrico', 'Departamento', 'Match HRIS', 'Acciones'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs uppercase tracking-wider text-[var(--text-3)] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr key={rec.emp_code} className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-2)]">{rec.emp_code}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-xs text-[var(--text-1)]">{rec.first_name}{rec.last_name ? ` ${rec.last_name}` : ''}</p>
                      {rec.dept_name && <p className="text-[10px] text-[var(--text-3)]">{rec.dept_name}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-2)]">{rec.dept_name || '—'}</td>
                    <td className="px-4 py-3">
                      {rec.hrisId
                        ? <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400"><UserCheck size={11} />{rec.hrisName}</span>
                        : <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"><AlertCircle size={11} />Sin coincidencia</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {rec.hrisId ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setRegisterModal({ type: 'falta', hrisId: rec.hrisId!, hrisName: rec.hrisName!, date: rec.att_date })}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                          >
                            <X size={10} /> Falta
                          </button>
                          <button
                            onClick={() => setRegisterModal({ type: 'permiso', hrisId: rec.hrisId!, hrisName: rec.hrisName!, date: rec.att_date })}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors"
                          >
                            <Clock size={10} /> Permiso
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--text-3)] italic">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {searched && records.length === 0 && (
        <div className="flex flex-col items-center py-16 text-[var(--text-3)]">
          <UserCheck size={36} className="mb-2 opacity-30 text-emerald-500" />
          <p className="text-sm">Sin ausencias en la semana {week} de {year}</p>
        </div>
      )}

      {!searched && !error && (
        <div className="flex flex-col items-center py-16 text-[var(--text-3)]">
          <UserX size={36} className="mb-2 opacity-30" />
          <p className="text-sm">Selecciona el año y semana y presiona Consultar</p>
        </div>
      )}

      {registerModal && (
        <RegisterAusenciaModal
          {...registerModal}
          onClose={() => setRegisterModal(null)}
          onSaved={() => setRegisterModal(null)}
        />
      )}
    </div>
  )
}

type Tab = 'dispositivos' | 'empleados' | 'ausencias' | 'reportes'

export function BiometricoPage() {
  const [cfg,         setCfg]         = useState<BiometricoConfig>(getBiometricoConfig)
  const [token,       setToken]       = useState('')
  const [connecting,  setConnecting]  = useState(false)
  const [connError,   setConnError]   = useState('')
  const [connected,   setConnected]   = useState(false)
  const [tab,         setTab]         = useState<Tab>('reportes')
  const [terminals,   setTerminals]   = useState<UTTerminal[]>([])
  const [loadingTerm, setLoadingTerm] = useState(false)

  const handleConnect = async () => {
    setConnecting(true); setConnError('')
    try {
      saveBiometricoConfig(cfg)
      const tk = await biometricoLogin(cfg)
      setToken(tk)
      setConnected(true)
      setLoadingTerm(true)
      try { setTerminals(await getTerminals(tk, cfg.baseUrl)) } catch { /* silencioso */ } finally { setLoadingTerm(false) }
    } catch (e: any) {
      setConnError(
        e?.response?.data?.non_field_errors?.[0] ?? e?.response?.data?.detail ?? e?.message ?? 'No se pudo conectar',
      )
      setConnected(false)
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = () => { setToken(''); setConnected(false); setTerminals([]); setConnError('') }

  const tabCls = (active: boolean) => cn(
    'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
    active ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-2)] hover:bg-[var(--bg-hover)]',
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Fingerprint size={18} className="text-[var(--accent)]" />
          <h2 className="text-base font-semibold text-[var(--text-1)]">Biométrico</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
          <FlaskConical size={11} />En pruebas
        </span>
        {connected && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 size={11} />Conectado · {cfg.baseUrl}
          </span>
        )}
        {connected && (
          <button onClick={handleDisconnect} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-colors">
            <WifiOff size={12} /> Desconectar
          </button>
        )}
      </div>

      {/* Config */}
      {!connected && (
        <ConfigPanel cfg={cfg} onChange={setCfg} onConnect={handleConnect} connecting={connecting} error={connError} />
      )}

      {/* Content */}
      {connected && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-surface)]">
            <button className={tabCls(tab === 'dispositivos')} onClick={() => setTab('dispositivos')}>
              <span className="flex items-center gap-1.5">
                <Monitor size={13} />Dispositivos
                {terminals.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--accent)]/20 text-[var(--accent)] font-bold">{terminals.length}</span>
                )}
              </span>
            </button>
            <button className={tabCls(tab === 'empleados')} onClick={() => setTab('empleados')}>
              <span className="flex items-center gap-1.5"><Users size={13} />Empleados</span>
            </button>
            <button className={tabCls(tab === 'ausencias')} onClick={() => setTab('ausencias')}>
              <span className="flex items-center gap-1.5"><UserX size={13} />Ausencias</span>
            </button>
            <button className={tabCls(tab === 'reportes')} onClick={() => setTab('reportes')}>
              <span className="flex items-center gap-1.5"><Clock size={13} />Reportes</span>
            </button>
            <button
              onClick={async () => {
                setLoadingTerm(true)
                try { setTerminals(await getTerminals(token, cfg.baseUrl)) } finally { setLoadingTerm(false) }
              }}
              disabled={loadingTerm}
              className="ml-auto p-1.5 rounded-lg text-[var(--text-3)] hover:bg-[var(--bg-hover)] transition-colors"
              title="Actualizar dispositivos"
            >
              <RefreshCw size={13} className={loadingTerm ? 'animate-spin' : ''} />
            </button>
          </div>

          {tab === 'dispositivos'  && <TerminalsTab terminals={terminals} loading={loadingTerm} />}
          {tab === 'empleados'     && <EmpleadosTab token={token} baseUrl={cfg.baseUrl} />}
          {tab === 'ausencias'     && <AusenciasTab token={token} baseUrl={cfg.baseUrl} />}
          {tab === 'reportes'      && <ReportesTab token={token} baseUrl={cfg.baseUrl} />}
        </div>
      )}
    </div>
  )
}
