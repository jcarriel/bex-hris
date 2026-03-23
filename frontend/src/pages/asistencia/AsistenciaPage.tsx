import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import {
  Clock, Search, X, AlertTriangle, ChevronLeft, ChevronRight,
  Download, Trash2, CheckCircle, AlertCircle, FileSpreadsheet, Loader2,
  ChevronDown, ChevronRight as ChevronRightIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { marcacionService, type Marcacion, type ScheduleConfig } from '@/services/marcacion.service'
import { nominaService, type PayrollRecord } from '@/services/nomina.service'

/* ─── types ──────────────────────────────────────────────────────── */

type InconsistencyType = 'no_checkout' | 'no_entry' | 'excessive_hours' | 'missing_hours'

interface Inconsistency {
  record:   Marcacion
  types:    InconsistencyType[]
  details:  string
}

interface OvertimeRow {
  payroll:                  PayrollRecord
  marcacionTotalFormatted:  string
  excessFormatted:          string
  hoursDifferenceFormatted: string
  validInvalidDays:         string
}

type Tab = 'marcaciones' | 'inconsistencias' | 'horas_extras' | 'generar'

/* ─── pure helpers ───────────────────────────────────────────────── */

const timeToMinutes = (t: string): number => {
  const [h, m] = (t || '00:00').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
const minutesToTime = (m: number): string => {
  const h = Math.floor(m / 60); const mn = m % 60
  return `${String(h).padStart(2, '0')}:${String(mn).padStart(2, '0')}`
}
const getRandomTime = (minH: number, minM: number, maxH: number, maxM: number): string => {
  const lo = minH * 60 + minM; const hi = maxH * 60 + maxM
  return minutesToTime(Math.floor(Math.random() * (hi - lo + 1)) + lo)
}
const weekNumber = (dateStr: string): number => {
  const d = new Date(dateStr)
  const jan1 = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
}

function getScheduleConfig(
  scheduleMap: Map<string, ScheduleConfig[]>,
  departmentId?: string,
  positionId?: string,
): ScheduleConfig | null {
  if (!departmentId) return null
  const configs = scheduleMap.get(departmentId)
  if (!configs?.length) return null
  if (positionId) {
    const specific = configs.find((c) => c.positionId === positionId)
    if (specific) return specific
  }
  return configs[0]
}

function correctMarcacion(
  firstCheckIn:   string | null | undefined,
  lastCheckOut:   string | null | undefined,
  originalTotal:  string,
  cfg:            ScheduleConfig | null,
): { correctedFirst: string; correctedLast: string; detail: string } {
  const entryTimeMin = cfg?.entryTimeMin || '06:30'
  const entryTimeMax = cfg?.entryTimeMax || '07:30'
  const exitTimeMin  = cfg?.exitTimeMin  || '15:30'
  const exitTimeMax  = cfg?.exitTimeMax  || '16:30'
  const workHours    = Number(cfg?.workHours) || 9
  const workMinutes  = workHours * 60
  const tolMin       = Number(cfg?.totalTimeMin) || 10
  const tolMax       = Number(cfg?.totalTimeMax) || 10
  const TARGET_MIN   = workMinutes - tolMin
  const TARGET_MAX   = workMinutes + tolMax

  const [eMinH, eMinM] = entryTimeMin.split(':').map(Number)
  const [eMaxH, eMaxM] = entryTimeMax.split(':').map(Number)
  const [xMinH, xMinM] = exitTimeMin.split(':').map(Number)
  const [xMaxH, xMaxM] = exitTimeMax.split(':').map(Number)
  const ENTRY_MIN = eMinH * 60 + eMinM
  const ENTRY_MAX = eMaxH * 60 + eMaxM
  const EXIT_MIN  = xMinH * 60 + xMinM
  const EXIT_MAX  = xMaxH * 60 + xMaxM

  // Both 00:00 or missing
  if (!originalTotal || originalTotal === '00:00') {
    const entry  = getRandomTime(eMinH, eMinM, eMaxH, eMaxM)
    let exitMins = timeToMinutes(entry) +
      Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1)) + TARGET_MIN
    if (exitMins < EXIT_MIN) exitMins = EXIT_MIN + Math.floor(Math.random() * (EXIT_MAX - EXIT_MIN + 1))
    else if (exitMins > EXIT_MAX) exitMins = EXIT_MAX - Math.floor(Math.random() * (EXIT_MAX - EXIT_MIN + 1))
    const exitT = minutesToTime(exitMins)
    return { correctedFirst: entry, correctedLast: exitT, detail: `Sin marcación: entrada ${entry}, salida ${exitT}` }
  }

  // Missing entry
  if (!firstCheckIn || firstCheckIn === '00:00') {
    const entry       = getRandomTime(eMinH, eMinM, eMaxH, eMaxM)
    const entryMins   = timeToMinutes(entry)
    const exitMins    = timeToMinutes(lastCheckOut || '00:00')
    const totalMins   = exitMins - entryMins
    if (totalMins >= TARGET_MIN && totalMins <= TARGET_MAX)
      return { correctedFirst: entry, correctedLast: lastCheckOut!, detail: `Entrada faltante → ${entry}` }
    const newExit = minutesToTime(entryMins + Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1)) + TARGET_MIN)
    return { correctedFirst: entry, correctedLast: newExit, detail: `Entrada faltante → ${entry}, salida ajustada → ${newExit}` }
  }

  // Missing exit
  if (!lastCheckOut || lastCheckOut === '00:00') {
    const exitT     = getRandomTime(xMinH, xMinM, xMaxH, xMaxM)
    const exitMins  = timeToMinutes(exitT)
    const entryMins = timeToMinutes(firstCheckIn)
    const totalMins = exitMins - entryMins
    if (totalMins >= TARGET_MIN && totalMins <= TARGET_MAX)
      return { correctedFirst: firstCheckIn, correctedLast: exitT, detail: `Salida faltante → ${exitT}` }
    const newEntry = minutesToTime(exitMins - Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1)) - TARGET_MIN)
    return { correctedFirst: newEntry, correctedLast: exitT, detail: `Salida faltante → ${exitT}, entrada ajustada → ${newEntry}` }
  }

  // Both present
  const entryMins = timeToMinutes(firstCheckIn)
  const exitMins  = timeToMinutes(lastCheckOut)
  const totalMins = exitMins - entryMins

  if (totalMins >= TARGET_MIN && totalMins <= TARGET_MAX &&
      entryMins >= ENTRY_MIN && entryMins <= ENTRY_MAX &&
      exitMins  >= EXIT_MIN  && exitMins  <= EXIT_MAX) {
    return { correctedFirst: firstCheckIn, correctedLast: lastCheckOut, detail: 'Correcto' }
  }

  let cFirst = firstCheckIn, cLast = lastCheckOut, detail = ''
  if (entryMins < ENTRY_MIN || entryMins > ENTRY_MAX) {
    cFirst = getRandomTime(eMinH, eMinM, eMaxH, eMaxM)
    detail += `Entrada ${firstCheckIn}→${cFirst}. `
  }
  if (exitMins < EXIT_MIN || exitMins > EXIT_MAX) {
    cLast = getRandomTime(xMinH, xMinM, xMaxH, xMaxM)
    detail += `Salida ${lastCheckOut}→${cLast}. `
  }
  const ct = timeToMinutes(cLast) - timeToMinutes(cFirst)
  if (ct < TARGET_MIN || ct > TARGET_MAX) {
    const target  = Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1)) + TARGET_MIN
    const newExit = minutesToTime(timeToMinutes(cFirst) + target)
    if (timeToMinutes(newExit) >= EXIT_MIN && timeToMinutes(newExit) <= EXIT_MAX) {
      cLast  = newExit
      detail += `Salida ajustada → ${cLast}.`
    }
  }
  return { correctedFirst: cFirst, correctedLast: cLast, detail: detail.trim() || 'Sin cambios' }
}

function detectInconsistencies(
  records:     Marcacion[],
  scheduleMap: Map<string, ScheduleConfig[]>,
): Inconsistency[] {
  const result: Inconsistency[] = []

  records.forEach((r) => {
    const cfg = getScheduleConfig(scheduleMap, r.departmentId, r.positionId)
    const workHours  = Number(cfg?.workHours) || 9
    const workMins   = workHours * 60
    const tolMin     = Number(cfg?.totalTimeMin) || 10
    const types:    InconsistencyType[] = []
    const details:  string[] = []

    // 1. Entry == exit (no checkout or no entry)
    if (r.firstCheckIn && r.lastCheckOut && r.firstCheckIn === r.lastCheckOut) {
      const h = parseInt(r.firstCheckIn.split(':')[0])
      if (h >= 12) {
        types.push('no_entry')
        details.push(`Sin entrada — marcación a las ${r.firstCheckIn}`)
      } else {
        types.push('no_checkout')
        details.push(`Sin salida — entrada ${r.firstCheckIn}, salida igual`)
      }
    }

    // 2 & 3. Excessive or missing hours
    if (r.firstCheckIn && r.lastCheckOut && r.firstCheckIn !== r.lastCheckOut) {
      try {
        let diff = timeToMinutes(r.lastCheckOut) - timeToMinutes(r.firstCheckIn)
        if (diff < 0) diff += 1440
        const excess  = diff - workMins
        const missing = workMins - diff
        if (excess > tolMin && !types.includes('excessive_hours')) {
          types.push('excessive_hours')
          details.push(`Exceso: ${minutesToTime(Math.abs(excess))}h (configurado ${workHours}h)`)
        }
        if (missing > tolMin && !types.includes('missing_hours')) {
          types.push('missing_hours')
          details.push(`Faltan: ${minutesToTime(missing)}h (configurado ${workHours}h)`)
        }
      } catch (_) { /* skip */ }
    }

    // Also check totalTime field
    if (r.totalTime && r.totalTime !== '00:00' && !types.includes('excessive_hours')) {
      const [h, m]  = r.totalTime.split(':').map(Number)
      const total   = (h || 0) * 60 + (m || 0)
      const excess  = total - workMins
      if (excess > tolMin) {
        types.push('excessive_hours')
        details.push(`Total marcación: ${r.totalTime} (exceso ${minutesToTime(excess)})`)
      }
    }

    if (types.length > 0) result.push({ record: r, types, details: details.join(' | ') })
  })
  return result
}

/* ─── Excel generators ───────────────────────────────────────────── */

function generateMarcacionesXlsx(
  marcaciones: Marcacion[],
  scheduleMap: Map<string, ScheduleConfig[]>,
  periodLabel: string,
) {
  const rows = [...marcaciones]
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName))
    .map((m) => {
      const cfg = getScheduleConfig(scheduleMap, m.departmentId, m.positionId)
      const cor = correctMarcacion(m.firstCheckIn, m.lastCheckOut, m.totalTime || '00:00', cfg)
      const correctedMins = timeToMinutes(cor.correctedLast) - timeToMinutes(cor.correctedFirst)
      return {
        'Cédula':                           m.cedula,
        'Nombres':                          m.employeeName,
        'Departamento':                     m.department,
        'Mes':                              m.month,
        'Fecha':                            new Date(m.date).toLocaleDateString('es-ES'),
        'Asistencia Diaria':                m.dailyAttendance,
        'Primera Marcación (Original)':     m.firstCheckIn  || '-',
        'Última Marcación (Original)':      m.lastCheckOut  || '-',
        'Tiempo Total (Original)':          m.totalTime     || '00:00',
        'Primera Marcación (Corregida)':    cor.correctedFirst,
        'Última Marcación (Corregida)':     cor.correctedLast,
        'Tiempo Total (Corregido)':         minutesToTime(Math.max(0, correctedMins)),
      }
    })

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Marcaciones')
  XLSX.writeFile(wb, `Marcaciones_Corregidas_${periodLabel}.xlsx`)
}

function generateHorasExtrasXlsx(
  marcaciones: Marcacion[],
  payrollList:  PayrollRecord[],
  scheduleMap:  Map<string, ScheduleConfig[]>,
  periodLabel:  string,
) {
  // Build overtime distribution map (min 45-min blocks)
  const overtimeMap = new Map<string, Map<string, number>>() // employeeName.lower → id → minutes

  payrollList
    .filter((p) => (p.overtimeHours50 ?? 0) > 0)
    .forEach((p) => {
      const key      = p.employeeName.toLowerCase()
      const records  = marcaciones.filter((m) => m.employeeName.toLowerCase() === key)
      const totalOT  = Math.round((p.overtimeHours50 ?? 0) * 60)
      const MIN_BLOCK = 45
      const numBlocks = Math.floor(totalOT / MIN_BLOCK)
      const remainder = totalOT % MIN_BLOCK
      const dist      = new Map<string, number>()

      records.forEach((m, i) => {
        if (i < numBlocks) {
          dist.set(m.id, i === numBlocks - 1 ? MIN_BLOCK + remainder : MIN_BLOCK)
        } else {
          dist.set(m.id, 0)
        }
      })
      overtimeMap.set(key, dist)
    })

  const rows = [...marcaciones]
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName))
    .map((m) => {
      const cfg = getScheduleConfig(scheduleMap, m.departmentId, m.positionId)
      const cor = correctMarcacion(m.firstCheckIn, m.lastCheckOut, m.totalTime || '00:00', cfg)

      let exitMins   = timeToMinutes(cor.correctedLast)
      const entryMins = timeToMinutes(cor.correctedFirst)
      let addedMins   = 0

      const empKey = m.employeeName.toLowerCase()
      if (overtimeMap.has(empKey)) {
        addedMins = overtimeMap.get(empKey)!.get(m.id) ?? 0
        if (addedMins > 0) exitMins += addedMins
      }

      const totalMins      = exitMins - entryMins
      const finalExit      = exitMins >= 1440 ? minutesToTime(exitMins - 1440) : minutesToTime(exitMins)
      const baseMins       = timeToMinutes(cor.correctedLast) - entryMins

      return {
        'Cédula':                           m.cedula,
        'Nombres':                          m.employeeName,
        'Departamento':                     m.department,
        'Semana':                           weekNumber(m.date),
        'Fecha':                            new Date(m.date).toLocaleDateString('es-ES'),
        'Asistencia Diaria':                m.dailyAttendance,
        'Primera Marcación (Original)':     m.firstCheckIn  || '-',
        'Última Marcación (Original)':      m.lastCheckOut  || '-',
        'Tiempo Total (Original)':          m.totalTime     || '00:00',
        'Primera Marcación (Corregida)':    cor.correctedFirst,
        'Última Marcación (Corregida)':     finalExit,
        'Tiempo Total (Corregido)':         minutesToTime(Math.max(0, totalMins)),
        'Horas Extras Agregadas':           addedMins > 0 ? minutesToTime(addedMins) : '-',
        'Tiempo Sin Extras':                minutesToTime(Math.max(0, baseMins)),
      }
    })

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Horas Extras')
  XLSX.writeFile(wb, `Marcaciones_HorasExtras_${periodLabel}.xlsx`)
}

/* ─── shared sub-components ─────────────────────────────────────── */

const selectCls = 'px-2.5 py-1.5 text-xs rounded-lg border outline-none transition-colors bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-1)] focus:border-[var(--accent)]'

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 text-xs font-semibold rounded-lg transition-colors',
        active
          ? 'bg-[var(--accent)] text-white'
          : 'text-[var(--text-2)] hover:bg-[var(--bg-hover)]',
      )}
    >
      {children}
    </button>
  )
}

const INCON_META: Record<InconsistencyType, { label: string; color: string }> = {
  no_checkout:    { label: 'Sin salida',        color: 'bg-orange-500/15 text-orange-500' },
  no_entry:       { label: 'Sin entrada',       color: 'bg-red-500/15 text-red-500'      },
  excessive_hours:{ label: 'Horas excesivas',   color: 'bg-yellow-500/15 text-yellow-600'},
  missing_hours:  { label: 'Horas faltantes',   color: 'bg-blue-500/15 text-blue-500'   },
}

const PAGE = 20

function usePagination<T>(items: T[], reset?: unknown) {
  const [page, setPage] = useState(1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => setPage(1), [reset])
  const total = Math.max(1, Math.ceil(items.length / PAGE))
  const safe  = Math.min(page, total)
  const rows  = items.slice((safe - 1) * PAGE, safe * PAGE)
  return { rows, page: safe, total, setPage }
}

function Pagination({ page, total, setPage }: { page: number; total: number; setPage: (p: number) => void }) {
  if (total <= 1) return null
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t" style={{ borderColor: 'var(--border)' }}>
      <span className="text-xs text-[var(--text-3)]">Página {page} de {total}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
          className="p-1.5 rounded-md text-[var(--text-2)] hover:bg-[var(--bg-hover)] disabled:opacity-30 transition-colors">
          <ChevronLeft size={14} />
        </button>
        <button onClick={() => setPage(Math.min(total, page + 1))} disabled={page === total}
          className="p-1.5 rounded-md text-[var(--text-2)] hover:bg-[var(--bg-hover)] disabled:opacity-30 transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

/* ─── MarcacionesTab ─────────────────────────────────────────────── */

interface EmployeeGroup {
  cedula:       string
  employeeName: string
  department:   string
  records:      Marcacion[]
}

function MarcacionesTab({
  marcaciones, departments,
}: {
  marcaciones: Marcacion[]
  departments: string[]
}) {
  const [search, setSearch]     = useState('')
  const [dept, setDept]         = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggleExpand = useCallback((cedula: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(cedula) ? next.delete(cedula) : next.add(cedula)
      return next
    })
  }, [])

  const groups = useMemo<EmployeeGroup[]>(() => {
    const map = new Map<string, EmployeeGroup>()
    marcaciones.forEach((m) => {
      if (!map.has(m.cedula)) {
        map.set(m.cedula, { cedula: m.cedula, employeeName: m.employeeName, department: m.department, records: [] })
      }
      map.get(m.cedula)!.records.push(m)
    })
    return Array.from(map.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName))
  }, [marcaciones])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return groups.filter((g) => {
      if (dept && g.department !== dept) return false
      if (q && !g.employeeName.toLowerCase().includes(q) && !g.cedula.includes(q)) return false
      return true
    })
  }, [groups, search, dept])

  const { rows, page, total, setPage } = usePagination(filtered, search + dept)

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b flex-wrap" style={{ borderColor: 'var(--border)' }}>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre o cédula..." className={cn(selectCls, 'pl-7 w-44')} />
        </div>
        <select value={dept} onChange={(e) => setDept(e.target.value)} className={selectCls}>
          <option value="">Todos los departamentos</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        {(search || dept) && (
          <button onClick={() => { setSearch(''); setDept('') }}
            className="text-xs flex items-center gap-1 text-[var(--text-3)] hover:text-red-500 transition-colors">
            <X size={12} /> Limpiar
          </button>
        )}
        <span className="ml-auto text-xs text-[var(--text-3)]">{filtered.length} empleados</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-surface)' }}>
              <th className="w-8" />
              {['Cédula', 'Nombre', 'Departamento', 'Registros'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--text-3)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0
              ? <tr><td colSpan={5} className="text-center py-10 text-[var(--text-3)]">Sin registros</td></tr>
              : rows.map((g) => {
                  const isOpen = expanded.has(g.cedula)
                  return [
                    <tr key={g.cedula}
                      onClick={() => toggleExpand(g.cedula)}
                      className="border-t cursor-pointer select-none transition-colors hover:bg-[var(--bg-hover)]"
                      style={{ borderColor: 'var(--border)', backgroundColor: isOpen ? 'var(--bg-surface)' : undefined }}>
                      <td className="pl-3 pr-1 py-2.5 text-[var(--text-3)]">
                        {isOpen ? <ChevronDown size={14} className="text-[var(--accent)]" /> : <ChevronRightIcon size={14} />}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[var(--text-3)]">{g.cedula}</td>
                      <td className="px-3 py-2.5 font-semibold text-[var(--text-1)]">{g.employeeName}</td>
                      <td className="px-3 py-2.5 text-[var(--text-2)]">{g.department}</td>
                      <td className="px-3 py-2.5 text-[var(--text-3)]">{g.records.length} días</td>
                    </tr>,

                    isOpen && g.records
                      .slice().sort((a, b) => a.date.localeCompare(b.date))
                      .map((m) => (
                        <tr key={m.id}
                          className="border-t bg-[var(--bg-surface)]/60 hover:bg-[var(--bg-hover)] transition-colors"
                          style={{ borderColor: 'var(--border)' }}>
                          <td className="pl-4 pr-1 py-2">
                            <div className="w-px h-3.5 bg-[var(--border)] mx-auto" />
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px] text-[var(--text-3)]">{m.cedula}</td>
                          <td className="px-3 py-2 text-[11px] text-[var(--text-2)]">
                            {new Date(m.date).toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })}
                          </td>
                          <td className="px-3 py-2 text-[11px] text-[var(--text-2)]">{m.dailyAttendance}</td>
                          <td className="px-3 py-2 font-mono text-[11px] text-[var(--text-2)]">
                            {m.firstCheckIn || '—'} → {m.lastCheckOut || '—'}&nbsp;&nbsp;
                            <span className="text-[var(--text-3)]">{m.totalTime || '00:00'}</span>
                          </td>
                        </tr>
                      )),
                  ]
                })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} setPage={setPage} />
    </div>
  )
}

/* ─── InconsistenciasTab ─────────────────────────────────────────── */

interface InconsistencyGroup {
  cedula:       string
  employeeName: string
  department:   string
  items:        Inconsistency[]
}

function InconsistenciasTab({
  marcaciones, departments, scheduleMap,
}: {
  marcaciones: Marcacion[]
  departments: string[]
  scheduleMap: Map<string, ScheduleConfig[]>
}) {
  const [search, setSearch]     = useState('')
  const [dept, setDept]         = useState('')
  const [typeFilter, setType]   = useState<InconsistencyType | ''>('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggleExpand = useCallback((cedula: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(cedula) ? next.delete(cedula) : next.add(cedula)
      return next
    })
  }, [])

  const inconsistencies = useMemo(
    () => detectInconsistencies(marcaciones, scheduleMap),
    [marcaciones, scheduleMap],
  )

  // Global type counts (for chips)
  const typeCounts = useMemo(() => {
    const c: Record<InconsistencyType, number> = { no_checkout: 0, no_entry: 0, excessive_hours: 0, missing_hours: 0 }
    inconsistencies.forEach((i) => i.types.forEach((t) => c[t]++))
    return c
  }, [inconsistencies])

  // Group by cedula
  const groups = useMemo<InconsistencyGroup[]>(() => {
    const map = new Map<string, InconsistencyGroup>()
    inconsistencies.forEach((i) => {
      const { cedula, employeeName, department } = i.record
      if (!map.has(cedula)) map.set(cedula, { cedula, employeeName, department, items: [] })
      map.get(cedula)!.items.push(i)
    })
    return Array.from(map.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName))
  }, [inconsistencies])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return groups.filter((g) => {
      if (dept && g.department !== dept) return false
      if (typeFilter && !g.items.some((i) => i.types.includes(typeFilter))) return false
      if (q && !g.employeeName.toLowerCase().includes(q) && !g.cedula.includes(q)) return false
      return true
    })
  }, [groups, search, dept, typeFilter])

  const { rows, page, total, setPage } = usePagination(filtered, search + dept + typeFilter)

  return (
    <div>
      {/* Summary chips */}
      <div className="flex gap-2 px-4 py-3 border-b flex-wrap" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
        {(Object.entries(INCON_META) as [InconsistencyType, typeof INCON_META[InconsistencyType]][]).map(([type, meta]) => (
          <button key={type}
            onClick={() => setType(typeFilter === type ? '' : type)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors border',
              typeFilter === type
                ? cn(meta.color, 'border-current')
                : 'text-[var(--text-3)] border-[var(--border)] hover:border-[var(--accent)]',
            )}>
            <span>{typeCounts[type]}</span>
            {meta.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b flex-wrap" style={{ borderColor: 'var(--border)' }}>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre o cédula..." className={cn(selectCls, 'pl-7 w-44')} />
        </div>
        <select value={dept} onChange={(e) => setDept(e.target.value)} className={selectCls}>
          <option value="">Todos los departamentos</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        {(search || dept) && (
          <button onClick={() => { setSearch(''); setDept('') }}
            className="text-xs flex items-center gap-1 text-[var(--text-3)] hover:text-red-500 transition-colors">
            <X size={12} /> Limpiar
          </button>
        )}
        <span className="ml-auto text-xs text-[var(--text-3)]">{filtered.length} empleados</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-surface)' }}>
              <th className="w-8" />
              {['Cédula', 'Nombre', 'Departamento', 'Inconsistencias'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--text-3)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0
              ? <tr><td colSpan={5} className="text-center py-10 text-[var(--text-3)]">Sin inconsistencias</td></tr>
              : rows.map((g) => {
                  const isOpen = expanded.has(g.cedula)
                  // aggregate type counts for this employee
                  const empTypeCounts: Partial<Record<InconsistencyType, number>> = {}
                  g.items.forEach((i) => i.types.forEach((t) => { empTypeCounts[t] = (empTypeCounts[t] ?? 0) + 1 }))

                  return [
                    /* ── Parent row ── */
                    <tr key={g.cedula}
                      onClick={() => toggleExpand(g.cedula)}
                      className="border-t cursor-pointer select-none transition-colors hover:bg-[var(--bg-hover)]"
                      style={{ borderColor: 'var(--border)', backgroundColor: isOpen ? 'var(--bg-surface)' : undefined }}>
                      <td className="pl-3 pr-1 py-2.5 text-[var(--text-3)]">
                        {isOpen ? <ChevronDown size={14} className="text-[var(--accent)]" /> : <ChevronRightIcon size={14} />}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[var(--text-3)]">{g.cedula}</td>
                      <td className="px-3 py-2.5 font-semibold text-[var(--text-1)]">
                        <AlertTriangle size={11} className="inline mr-1 text-orange-500" />
                        {g.employeeName}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--text-2)]">{g.department}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {(Object.entries(empTypeCounts) as [InconsistencyType, number][]).map(([t, count]) => (
                            <span key={t} className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-semibold', INCON_META[t].color)}>
                              {count} {INCON_META[t].label}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>,

                    /* ── Child rows ── */
                    isOpen && g.items
                      .slice().sort((a, b) => a.record.date.localeCompare(b.record.date))
                      .map(({ record: m, types, details }) => (
                        <tr key={m.id}
                          className="border-t bg-orange-500/5 hover:bg-orange-500/10 transition-colors"
                          style={{ borderColor: 'var(--border)' }}>
                          <td className="pl-4 pr-1 py-2">
                            <div className="w-px h-3.5 bg-[var(--border)] mx-auto" />
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px] text-[var(--text-3)]">{m.cedula}</td>
                          <td className="px-3 py-2 text-[11px] text-[var(--text-2)]">
                            {new Date(m.date).toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })}
                          </td>
                          <td className="px-3 py-2 text-[11px] text-[var(--text-2)]">
                            <span className="font-mono">{m.firstCheckIn || '—'} → {m.lastCheckOut || '—'}</span>
                            <span className="ml-2 text-[var(--text-3)]">{m.totalTime || '00:00'}</span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {types.map((t) => (
                                <span key={t} className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-semibold', INCON_META[t].color)}>
                                  {INCON_META[t].label}
                                </span>
                              ))}
                              {details && (
                                <span className="text-[10px] text-[var(--text-3)] ml-1 self-center" title={details}>
                                  — {details.length > 60 ? details.slice(0, 60) + '…' : details}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )),
                  ]
                })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} setPage={setPage} />
    </div>
  )
}

/* ─── HorasExtrasTab ─────────────────────────────────────────────── */

function HorasExtrasTab({
  marcaciones, scheduleMap, endDate,
}: {
  marcaciones: Marcacion[]
  scheduleMap: Map<string, ScheduleConfig[]>
  endDate:    string
}) {
  const [search, setSearch] = useState('')

  const [endYear, endMonth] = endDate.split('-').map(Number)

  const { data: payroll = [], isLoading } = useQuery({
    queryKey: ['payroll-period', endYear, endMonth],
    queryFn:  () => nominaService.getByPeriod(endYear, endMonth),
    enabled:  !!endDate,
  })

  const overtimeRows: OvertimeRow[] = useMemo(() => {
    const withOT = payroll.filter((p) => (p.overtimeHours50 ?? 0) > 0)
    return withOT.map((p) => {
      const empRecords = marcaciones.filter(
        (m) => m.employeeName.toLowerCase() === p.employeeName.toLowerCase(),
      )
      let totalH = 0, totalM = 0
      empRecords.forEach((r) => {
        if (r.totalTime && r.totalTime !== '00:00') {
          const [h, m] = r.totalTime.split(':').map(Number)
          totalH += h || 0; totalM += m || 0
        }
      })
      totalH += Math.floor(totalM / 60); totalM = totalM % 60

      let validDays = 0, invalidDays = 0
      empRecords.forEach((r) => {
        if (r.firstCheckIn && r.lastCheckOut) {
          r.firstCheckIn === r.lastCheckOut ? invalidDays++ : validDays++
        }
      })

      const cfg = empRecords[0]
        ? getScheduleConfig(scheduleMap, empRecords[0].departmentId, empRecords[0].positionId)
        : null
      const workH     = Number(cfg?.workHours) || 9
      const daysWorked = empRecords.filter((r) => r.totalTime && r.totalTime !== '00:00').length
      const expected  = daysWorked * workH
      const excessH   = totalH - expected
      const daysNoMark = empRecords.filter((r) => r.totalTime === '00:00').length
      const missingH  = daysNoMark * workH

      let adjustable = (excessH > 0 ? -excessH : Math.abs(excessH)) + missingH
      let diffH = Math.abs(adjustable) - (p.overtimeHours50 ?? 0)
      if (adjustable < 0) diffH = -diffH

      const sign  = diffH >= 0 ? '+' : '-'
      const aH    = Math.abs(Math.floor(diffH))
      const aM    = Math.abs(totalM)

      return {
        payroll:                  p,
        marcacionTotalFormatted:  `${String(totalH).padStart(2,'0')}:${String(totalM).padStart(2,'0')}`,
        excessFormatted:          `${String(Math.max(0,excessH)).padStart(2,'0')}:${String(totalM).padStart(2,'0')}`,
        hoursDifferenceFormatted: `${sign}${String(aH).padStart(2,'0')}:${String(aM).padStart(2,'0')}`,
        validInvalidDays:         `${validDays}/${invalidDays}`,
      }
    })
  }, [payroll, marcaciones, scheduleMap])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? overtimeRows.filter((r) =>
      r.payroll.employeeName.toLowerCase().includes(q) || r.payroll.cedula?.includes(q),
    ) : overtimeRows
  }, [overtimeRows, search])

  const { rows, page, total, setPage } = usePagination(filtered, search)

  if (isLoading) return (
    <div className="flex items-center justify-center py-16 gap-2 text-[var(--text-3)]">
      <Loader2 size={18} className="animate-spin" /> Cargando nómina...
    </div>
  )

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b flex-wrap" style={{ borderColor: 'var(--border)' }}>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre o cédula..." className={cn(selectCls, 'pl-7 w-44')} />
        </div>
        <span className="ml-auto text-xs text-[var(--text-3)]">{filtered.length} empleados con horas extras en nómina</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-surface)' }}>
              {['Nombre','Días V/I','Total marcación','H.E. nómina','Excedente','Diferencia'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--text-3)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0
              ? <tr><td colSpan={6} className="text-center py-10 text-[var(--text-3)]">Sin datos de horas extras</td></tr>
              : rows.map(({ payroll: p, marcacionTotalFormatted, excessFormatted, hoursDifferenceFormatted, validInvalidDays }) => {
                const diff = parseFloat(hoursDifferenceFormatted)
                return (
                  <tr key={p.id} className="border-t hover:bg-[var(--bg-hover)] transition-colors"
                    style={{ borderColor: 'var(--border)' }}>
                    <td className="px-3 py-2 font-medium text-[var(--text-1)]">{p.employeeName}</td>
                    <td className="px-3 py-2 font-mono text-[var(--text-2)]">{validInvalidDays}</td>
                    <td className="px-3 py-2 font-mono text-[var(--text-2)]">{marcacionTotalFormatted}</td>
                    <td className="px-3 py-2 font-mono font-semibold text-[var(--accent)]">
                      {String(p.overtimeHours50 ?? 0).padStart(2,'0')}:00
                    </td>
                    <td className="px-3 py-2 font-mono text-yellow-600">{excessFormatted}</td>
                    <td className={cn('px-3 py-2 font-mono font-bold',
                      hoursDifferenceFormatted.startsWith('+') ? 'text-[var(--accent)]' : 'text-red-500')}>
                      {hoursDifferenceFormatted}
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} setPage={setPage} />
    </div>
  )
}

/* ─── GenerarTab ─────────────────────────────────────────────────── */

function GenerarTab({
  marcaciones, scheduleMap, endDate, periodLabel,
}: {
  marcaciones: Marcacion[]
  scheduleMap: Map<string, ScheduleConfig[]>
  endDate:    string
  periodLabel: string
}) {
  const [mode, setMode]       = useState<'marcaciones' | 'horas_extras'>('marcaciones')
  const [generating, setGen]  = useState(false)

  const [endYear, endMonth] = endDate.split('-').map(Number)
  const { data: payroll = [], isLoading: loadingPayroll } = useQuery({
    queryKey: ['payroll-period', endYear, endMonth],
    queryFn:  () => nominaService.getByPeriod(endYear, endMonth),
    enabled:  mode === 'horas_extras' && !!endDate,
  })

  const handle = () => {
    setGen(true)
    try {
      if (mode === 'marcaciones') {
        generateMarcacionesXlsx(marcaciones, scheduleMap, periodLabel)
      } else {
        generateHorasExtrasXlsx(marcaciones, payroll, scheduleMap, periodLabel)
      }
    } finally {
      setTimeout(() => setGen(false), 500)
    }
  }

  return (
    <div className="p-6 max-w-lg">
      <h3 className="text-sm font-semibold text-[var(--text-1)] mb-4">Generar archivo Excel</h3>

      <div className="space-y-3 mb-6">
        {([
          { key: 'marcaciones',   label: 'Marcaciones corregidas',           desc: 'Tiempos de entrada/salida corregidos según horario del departamento.' },
          { key: 'horas_extras',  label: 'Marcaciones con horas extras',     desc: 'Igual que el anterior pero distribuyendo las horas extras de nómina en bloques ≥ 45 min.' },
        ] as const).map(({ key, label, desc }) => (
          <label key={key} className={cn(
            'flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors',
            mode === key
              ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
              : 'border-[var(--border)] hover:border-[var(--accent)] bg-[var(--bg-card)]',
          )}>
            <input type="radio" name="mode" value={key} checked={mode === key}
              onChange={() => setMode(key)} className="accent-[var(--accent)] mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[var(--text-1)]">{label}</p>
              <p className="text-xs text-[var(--text-3)] mt-0.5">{desc}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3 p-3 rounded-lg border mb-6" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
        <FileSpreadsheet size={16} className="text-[var(--accent)] shrink-0" />
        <div className="text-xs text-[var(--text-2)]">
          <span className="font-semibold">{marcaciones.length}</span> registros del período
          {mode === 'horas_extras' && (
            <> · <span className="font-semibold">{payroll.filter(p => (p.overtimeHours50 ?? 0) > 0).length}</span> empleados con horas extras en nómina</>
          )}
        </div>
      </div>

      <button
        onClick={handle}
        disabled={generating || marcaciones.length === 0 || (mode === 'horas_extras' && loadingPayroll)}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity">
        {generating ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        Descargar Excel
      </button>
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────────────────── */

export function AsistenciaPage() {
  const qc = useQueryClient()
  const [tab,            setTab]            = useState<Tab>('marcaciones')
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [confirmDelete,  setConfirmDelete]  = useState(false)

  /* Periods */
  const { data: periods = [], isLoading: loadingPeriods } = useQuery({
    queryKey: ['marcacion-periods'],
    queryFn:  marcacionService.getPeriods,
  })

  /* Schedules */
  const { data: schedules = [] } = useQuery({
    queryKey: ['department-schedules'],
    queryFn:  marcacionService.getSchedules,
  })

  /* Build scheduleMap: departmentId → ScheduleConfig[] */
  const scheduleMap = useMemo(() => {
    const map = new Map<string, ScheduleConfig[]>()
    schedules.forEach((cfg) => {
      const key = cfg.departmentId
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(cfg)
    })
    return map
  }, [schedules])

  /* Selected period object */
  const period = useMemo(
    () => periods.find((p) => p.startDate === selectedPeriod) ?? null,
    [periods, selectedPeriod],
  )

  /* Marcaciones for selected period */
  const { data: marcaciones = [], isLoading: loadingMarc } = useQuery({
    queryKey: ['marcaciones', selectedPeriod],
    queryFn:  () => marcacionService.getByPeriod(period!.startDate, period!.endDate),
    enabled:  !!period,
  })

  /* Derived */
  const departments = useMemo(
    () => [...new Set(marcaciones.map((m) => m.department).filter(Boolean))].sort(),
    [marcaciones],
  )

  const inconsistencyCount = useMemo(
    () => detectInconsistencies(marcaciones, scheduleMap).length,
    [marcaciones, scheduleMap],
  )

  /* Stats */
  const stats = useMemo(() => {
    const employees = new Set(marcaciones.map((m) => m.cedula)).size
    const validDays   = marcaciones.filter((m) => m.firstCheckIn && m.lastCheckOut && m.firstCheckIn !== m.lastCheckOut).length
    const invalidDays = marcaciones.filter((m) => m.firstCheckIn && m.lastCheckOut && m.firstCheckIn === m.lastCheckOut).length
    return { employees, validDays, invalidDays, total: marcaciones.length }
  }, [marcaciones])

  /* Delete period */
  const deleteMutation = useMutation({
    mutationFn: () => marcacionService.deleteByPeriod(period!.startDate, period!.endDate),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['marcaciones'] })
      qc.invalidateQueries({ queryKey: ['marcacion-periods'] })
      setConfirmDelete(false)
      setSelectedPeriod('')
      toast.success('Período eliminado correctamente')
    },
    onError: () => toast.error('Error al eliminar el período'),
  })

  const isLoading = loadingPeriods || loadingMarc

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-1)] flex items-center gap-2">
            <Clock size={16} className="text-[var(--accent)]" />
            Asistencia y Marcación
          </h2>
          <p className="text-xs text-[var(--text-3)] mt-0.5">
            {period ? `${period.label} · ${period.startDate} → ${period.endDate}` : 'Selecciona un período'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => { setSelectedPeriod(e.target.value); setTab('marcaciones') }}
            className="px-3 py-2 text-sm rounded-lg border outline-none bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-1)] focus:border-[var(--accent)] transition-colors"
          >
            <option value="">Seleccionar período</option>
            {periods.map((p) => (
              <option key={p.startDate} value={p.startDate}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stat cards */}
      {period && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Empleados',          value: stats.employees,    color: 'text-blue-500',              bg: 'bg-blue-500/10'             },
            { label: 'Total registros',    value: stats.total,        color: 'text-[var(--accent)]',       bg: 'bg-[var(--accent-soft)]'    },
            { label: 'Días válidos',       value: stats.validDays,    color: 'text-emerald-500',           bg: 'bg-emerald-500/10'          },
            { label: 'Inconsistencias',    value: inconsistencyCount, color: 'text-orange-500',            bg: 'bg-orange-500/10'           },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="rounded-xl border p-4 flex items-center gap-3"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', bg)}>
                {label === 'Inconsistencias'
                  ? <AlertCircle size={16} className={color} />
                  : <CheckCircle  size={16} className={color} />}
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-3)] uppercase tracking-wide font-semibold leading-none mb-1">{label}</p>
                <p className="text-sm font-bold text-[var(--text-1)]">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main card */}
      {!period
        ? (
          <div className="rounded-xl border flex flex-col items-center justify-center py-20 gap-3"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <Clock size={36} className="text-[var(--text-3)] opacity-40" />
            <p className="text-sm text-[var(--text-2)]">
              {loadingPeriods ? 'Cargando períodos...' : 'Selecciona un período para ver los registros'}
            </p>
          </div>
        )
        : (
          <div className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

            {/* Tab bar */}
            <div className="flex items-center gap-1 px-4 py-3 border-b flex-wrap"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
              <TabBtn active={tab === 'marcaciones'}    onClick={() => setTab('marcaciones')}>Marcaciones</TabBtn>
              <TabBtn active={tab === 'inconsistencias'} onClick={() => setTab('inconsistencias')}>
                Inconsistencias
                {inconsistencyCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-orange-500 text-white font-bold">
                    {inconsistencyCount}
                  </span>
                )}
              </TabBtn>
              <TabBtn active={tab === 'horas_extras'}  onClick={() => setTab('horas_extras')}>Horas Extras</TabBtn>
              <TabBtn active={tab === 'generar'}       onClick={() => setTab('generar')}>Generar</TabBtn>

              <div className="ml-auto flex items-center gap-2">
                {loadingMarc && <Loader2 size={14} className="animate-spin text-[var(--text-3)]" />}
                {/* Delete period */}
                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-2)]">¿Eliminar período?</span>
                    <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}
                      className="text-xs px-2.5 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">
                      Eliminar
                    </button>
                    <button onClick={() => setConfirmDelete(false)} className="text-[var(--text-3)] hover:text-[var(--text-1)]">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 size={12} /> Eliminar período
                  </button>
                )}
              </div>
            </div>

            {/* Tab content */}
            {tab === 'marcaciones' && (
              <MarcacionesTab marcaciones={marcaciones} departments={departments} />
            )}
            {tab === 'inconsistencias' && (
              <InconsistenciasTab marcaciones={marcaciones} departments={departments} scheduleMap={scheduleMap} />
            )}
            {tab === 'horas_extras' && (
              <HorasExtrasTab marcaciones={marcaciones} scheduleMap={scheduleMap} endDate={period.endDate} />
            )}
            {tab === 'generar' && (
              <GenerarTab
                marcaciones={marcaciones}
                scheduleMap={scheduleMap}
                endDate={period.endDate}
                periodLabel={period.label.replace(/\s/g, '_')}
              />
            )}
          </div>
        )}
    </div>
  )
}
