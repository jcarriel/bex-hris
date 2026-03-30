import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  workforceService,
  WorkforceReport,
  WorkforceData,
  LaborEntry,
} from '@/services/workforce.service'
import { departmentsService } from '@/services/departments.service'
import { laborsService, Labor } from '@/services/labors.service'
import { marcacionService, Marcacion } from '@/services/marcacion.service'
import { empleadosService } from '@/services/empleados.service'
import { Empleado } from '@/types/empleado.types'
import {
  Plus, Save, Trash2, Edit2, Download, ChevronLeft, X,
  Loader2, RefreshCw, Briefcase, AlertCircle, Users, BarChart2, Search,
} from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/empleados/ConfirmDialog'
import { useAuthStore, hasAction } from '@/store/authStore'

// ─── Default data ─────────────────────────────────────────────────────────────

function makeDefaultData(): WorkforceData {
  return {
    sectors: [{ name: '', hectareas: 0 }],
    labors: [],
  }
}

// ─── ISO week helpers ─────────────────────────────────────────────────────────

function getISOWeekDates(week: number, year: number) {
  const jan4 = new Date(year, 0, 4)
  const monday1 = new Date(jan4)
  monday1.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1)
  const start = new Date(monday1)
  start.setDate(monday1.getDate() + (week - 1) * 7)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { start: fmt(start), end: fmt(end) }
}

function currentWeek() {
  const d = new Date()
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const mon1 = new Date(jan4)
  mon1.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1)
  return Math.floor((d.getTime() - mon1.getTime()) / 604_800_000) + 1
}

// ─── Fuzzy labor name match ───────────────────────────────────────────────────

function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/s$/, '').trim()
}

function laborMatch(gridName: string, empLaborName: string): boolean {
  const a = norm(gridName)
  const b = norm(empLaborName)
  return a === b || a.includes(b) || b.includes(a) || a.slice(0, 5) === b.slice(0, 5)
}

// ─── Attendance maps ──────────────────────────────────────────────────────────

interface AttendanceMaps {
  byDept: Map<string, Set<string>>
  byDeptSabado: Map<string, Set<string>>
  byLabor: Map<string, Set<string>>
  totalByDept: Map<string, number>
}

function buildMaps(marcaciones: Marcacion[], employees: Empleado[]): AttendanceMaps {
  const attending = new Set(marcaciones.map((m) => m.cedula))

  const byDept = new Map<string, Set<string>>()
  const byDeptSabado = new Map<string, Set<string>>()
  for (const m of marcaciones) {
    const k = (m.department || '').trim().toLowerCase()
    if (!k) continue
    if (!byDept.has(k)) byDept.set(k, new Set())
    byDept.get(k)!.add(m.cedula)
    if (new Date(m.date + 'T00:00:00').getDay() === 6) {
      if (!byDeptSabado.has(k)) byDeptSabado.set(k, new Set())
      byDeptSabado.get(k)!.add(m.cedula)
    }
  }

  const byLabor = new Map<string, Set<string>>()
  for (const emp of employees) {
    if (!attending.has(emp.cedula)) continue
    const labor = (emp.laborName || '').trim().toLowerCase()
    if (!labor) continue
    if (!byLabor.has(labor)) byLabor.set(labor, new Set())
    byLabor.get(labor)!.add(emp.cedula)
  }

  const totalByDept = new Map<string, number>()
  for (const emp of employees) {
    if (emp.status !== 'active') continue
    const k = (emp.departmentName || '').trim().toLowerCase()
    if (!k) continue
    totalByDept.set(k, (totalByDept.get(k) || 0) + 1)
  }

  return { byDept, byDeptSabado, byLabor, totalByDept }
}

function attendeesForSector(maps: AttendanceMaps, name: string) {
  return maps.byDept.get(name.trim().toLowerCase())?.size ?? 0
}
function sabadosForSector(maps: AttendanceMaps, name: string) {
  return maps.byDeptSabado.get(name.trim().toLowerCase())?.size ?? 0
}
function totalEmpForSector(maps: AttendanceMaps, name: string) {
  return maps.totalByDept.get(name.trim().toLowerCase()) ?? 0
}
function attendeesForLabor(maps: AttendanceMaps, laborName: string): number {
  const direct = maps.byLabor.get(norm(laborName))
  if (direct) return direct.size
  for (const [key, set] of maps.byLabor) {
    if (laborMatch(laborName, key)) return set.size
  }
  return 0
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function pct(num: number, den: number) {
  return den ? `${Math.round((num / den) * 100)}%` : '—'
}
function pctNum(num: number, den: number): number | null {
  return den ? Math.round((num / den) * 100) : null
}
function pctColor(p: number | null) {
  if (p == null) return ''
  if (p >= 90) return 'text-emerald-600 dark:text-emerald-400'
  if (p >= 70) return 'text-amber-500'
  return 'text-red-500'
}
function reqColor(r: number) {
  if (r === 0) return 'text-[var(--text-3)]'
  return r > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
}
function flFmt(n: number | null) {
  if (n == null) return '—'
  return n.toFixed(10).replace(/0+$/, '').replace(/\.$/, '')
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CY = new Date().getFullYear()
const YEARS = Array.from({ length: 6 }, (_, i) => CY - 3 + i)
const WEEKS = Array.from({ length: 53 }, (_, i) => i + 1)

// ─── Editor state ─────────────────────────────────────────────────────────────

interface EditorState {
  id?: string
  week: number
  year: number
  department: string
  cajas_realizadas: string
  dias_proceso: string
  data: WorkforceData
}

function emptyEditor(): EditorState {
  return { week: currentWeek(), year: CY, department: '', cajas_realizadas: '', dias_proceso: '', data: makeDefaultData() }
}

function fromReport(r: WorkforceReport): EditorState {
  return {
    id: r.id,
    week: r.week, year: r.year,
    department: r.department || '',
    cajas_realizadas: r.cajas_realizadas != null ? String(r.cajas_realizadas) : '',
    dias_proceso: r.dias_proceso != null ? String(r.dias_proceso) : '',
    data: r.data ?? makeDefaultData(),
  }
}

// ─── Labor Picker Modal ───────────────────────────────────────────────────────

function LaborPickerModal({
  labors,
  alreadyAdded,
  onConfirm,
  onClose,
}: {
  labors: Labor[]
  alreadyAdded: string[]
  onConfirm: (names: string[]) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const filtered = labors.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) && !alreadyAdded.includes(p.name),
  )

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  function confirm() {
    if (selected.size === 0) return
    onConfirm([...selected])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] shadow-2xl w-full max-w-sm mx-4 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <span className="text-sm font-semibold text-[var(--text-1)]">Seleccionar Labores</span>
          <button onClick={onClose} className="text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"><X size={16} /></button>
        </div>

        <div className="px-3 py-2 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-base)]">
            <Search size={13} className="text-[var(--text-3)]" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar labor..."
              className="flex-1 text-sm bg-transparent outline-none text-[var(--text-1)] placeholder:text-[var(--text-3)]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="text-center text-xs text-[var(--text-3)] py-8">Sin resultados</div>
          ) : (
            filtered.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected.has(p.name)}
                  onChange={() => toggle(p.name)}
                  className="accent-[var(--accent)] w-4 h-4 rounded"
                />
                <span className="text-sm text-[var(--text-1)]">{p.name}</span>
              </label>
            ))
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
          <span className="text-xs text-[var(--text-3)]">
            {selected.size > 0 ? `${selected.size} seleccionada${selected.size > 1 ? 's' : ''}` : 'Ninguna seleccionada'}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-colors">Cancelar</button>
            <button
              onClick={confirm}
              disabled={selected.size === 0}
              className="px-4 py-1.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              Agregar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

function GridEditor({
  state, onChange, departments, labors, maps, readOnly,
}: {
  state: EditorState
  onChange: (s: EditorState) => void
  departments: { id: string; name: string }[]
  labors: Labor[]
  maps?: AttendanceMaps
  readOnly?: boolean
}) {
  const [showPicker, setShowPicker] = useState(false)
  const { data } = state
  const n = data.sectors.length

  function setData(fn: (d: WorkforceData) => WorkforceData) {
    onChange({ ...state, data: fn(state.data) })
  }

  function setSector(si: number, field: 'name' | 'hectareas', val: string | number) {
    setData((d) => ({ ...d, sectors: d.sectors.map((s, i) => i === si ? { ...s, [field]: val } : s) }))
  }

  function setCount(li: number, si: number, val: number) {
    setData((d) => ({
      ...d,
      labors: d.labors.map((l, i) =>
        i !== li ? l : { ...l, counts: l.counts.map((c, j) => j === si ? val : c) },
      ),
    }))
  }

  function addSector() {
    setData((d) => ({
      ...d,
      sectors: [...d.sectors, { name: '', hectareas: 0 }],
      labors: d.labors.map((l) => ({ ...l, counts: [...l.counts, 0] })),
    }))
  }

  function removeSector(si: number) {
    if (n <= 1) return toast.error('Debe haber al menos un sector')
    setData((d) => ({
      ...d,
      sectors: d.sectors.filter((_, i) => i !== si),
      labors: d.labors.map((l) => ({ ...l, counts: l.counts.filter((_, i) => i !== si) })),
    }))
  }

  function addLabors(names: string[]) {
    setData((d) => ({
      ...d,
      labors: [
        ...d.labors,
        ...names.map((name) => ({ name, counts: Array(d.sectors.length).fill(0) })),
      ],
    }))
  }

  function removeLabor(li: number) {
    setData((d) => ({ ...d, labors: d.labors.filter((_, i) => i !== li) }))
  }

  // Totals
  const sectorTotals = Array.from({ length: n }, (_, si) =>
    data.labors.reduce((s, l) => s + (l.counts[si] || 0), 0),
  )
  const grandTotal = sectorTotals.reduce((a, b) => a + b, 0)
  const totalHa = data.sectors.reduce((s, sec) => s + (sec.hectareas || 0), 0)

  // Attendance from maps
  const asistSemana  = data.sectors.map((sec) => maps ? attendeesForSector(maps, sec.name) : 0)
  const asistSabados = data.sectors.map((sec) => maps ? sabadosForSector(maps, sec.name) : 0)
  const totAsistSemana  = asistSemana.reduce((a, b) => a + b, 0)
  const totAsistSabados = asistSabados.reduce((a, b) => a + b, 0)
  const hasAtt = !!maps

  // FL rows
  const flLabor = totalHa > 0 && grandTotal > 0 ? grandTotal / totalHa : null
  const flAsistPerSector = asistSemana.map((a, si) => a > 0 ? sectorTotals[si] / a : null)
  const flAsistTotal = totAsistSemana > 0 ? grandTotal / totAsistSemana : null

  // CSS helpers
  const thBase = 'border border-[var(--border)] px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)] text-center bg-[var(--bg-hover)]'
  const tdLabel = 'border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-2)] bg-[var(--bg-surface)]'
  const tdCell  = 'border border-[var(--border)] p-0 text-center'
  const tdTotal = 'border border-[var(--border)] px-2 py-1 text-sm font-bold text-center text-[var(--accent)] bg-[var(--bg-hover)]'
  const tdAtt   = 'border border-[var(--border)] text-center text-sm font-bold text-amber-700 dark:text-amber-400 bg-amber-500/5 py-1'
  const tdFl    = 'border border-[var(--border)] text-center text-xs font-bold text-violet-700 dark:text-violet-400 bg-violet-500/5 py-1'

  return (
    <>
    {showPicker && (
      <LaborPickerModal
        labors={labors}
        alreadyAdded={data.labors.map((l) => l.name)}
        onConfirm={(names) => { addLabors(names); setShowPicker(false) }}
        onClose={() => setShowPicker(false)}
      />
    )}
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 200 }} />
          {data.sectors.map((_, i) => <col key={i} style={{ width: 90 }} />)}
          <col style={{ width: 90 }} />
          {!readOnly && <col style={{ width: 32 }} />}
        </colgroup>

        <thead>
          {/* Sector header */}
          <tr>
            <th className={cn(thBase, 'text-left px-3')}>LABOR</th>
            {data.sectors.map((sec, si) => (
              <th key={si} className={cn(thBase, 'p-0')}>
                {readOnly ? (
                  <div className="py-1.5 px-1">
                    <div className="font-bold">{sec.name || '—'}</div>
                    <div className="text-[9px] font-normal text-[var(--text-3)]">{sec.hectareas?.toFixed(2)} ha</div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5 py-1 px-1">
                    <select
                      value={sec.name}
                      onChange={(e) => setSector(si, 'name', e.target.value)}
                      className="w-full text-center text-[10px] font-semibold bg-transparent border-b border-[var(--border)] outline-none focus:border-[var(--accent)] pb-0.5"
                    >
                      <option value="">Seleccionar…</option>
                      {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                    <div className="flex items-center gap-0.5">
                      <input
                        type="number" min={0} step={0.01}
                        value={sec.hectareas || ''}
                        placeholder="ha"
                        onChange={(e) => setSector(si, 'hectareas', parseFloat(e.target.value) || 0)}
                        className="w-full text-center text-[10px] bg-transparent border-0 outline-none text-[var(--text-3)]"
                      />
                      <button onClick={() => removeSector(si)} className="text-[var(--text-3)] hover:text-red-500 flex-shrink-0">
                        <X size={9} />
                      </button>
                    </div>
                  </div>
                )}
              </th>
            ))}
            <th className={thBase}>TOTAL</th>
            {!readOnly && (
              <th className={cn(thBase, 'p-0')}>
                <button onClick={addSector} className="w-full h-full flex items-center justify-center text-[var(--accent)] hover:bg-[var(--accent-soft)] p-1" title="Agregar sector">
                  <Plus size={13} />
                </button>
              </th>
            )}
          </tr>

          {/* Hectáreas row */}
          <tr>
            <td className={cn(tdLabel, 'italic text-[var(--text-3)] text-[10px]')}>Hectáreas en producción</td>
            {data.sectors.map((sec, si) => (
              <td key={si} className={cn(tdTotal, 'font-medium text-[var(--text-3)] text-xs')}>
                {sec.hectareas ? `${sec.hectareas.toFixed(2)} ha` : '—'}
              </td>
            ))}
            <td className={cn(tdTotal, 'text-xs')}>{totalHa.toFixed(2)} ha</td>
            {!readOnly && <td className="border border-[var(--border)]" />}
          </tr>
        </thead>

        <tbody>
          {/* Labor rows */}
          {data.labors.map((labor, li) => (
            <tr key={li} className="group hover:bg-[var(--bg-hover)/30] transition-colors">
              <td className={cn(tdLabel, 'flex items-center justify-between')}>
                <span className="truncate">{labor.name}</span>
                {!readOnly && (
                  <button onClick={() => removeLabor(li)} className="opacity-0 group-hover:opacity-100 text-[var(--text-3)] hover:text-red-500 ml-1 flex-shrink-0">
                    <X size={10} />
                  </button>
                )}
              </td>
              {labor.counts.map((count, si) => (
                <td key={si} className={tdCell}>
                  {readOnly ? (
                    <div className="w-full text-center text-sm py-1.5 text-[var(--text-2)]">{count || ''}</div>
                  ) : (
                    <input
                      type="number" min={0}
                      value={count || ''}
                      placeholder="0"
                      onChange={(e) => setCount(li, si, parseInt(e.target.value) || 0)}
                      className="w-full text-center text-sm py-1.5 px-1 bg-transparent border-0 outline-none focus:bg-[var(--accent-soft)] rounded transition-colors"
                    />
                  )}
                </td>
              ))}
              <td className={tdTotal}>{labor.counts.reduce((a, b) => a + (b || 0), 0) || '—'}</td>
              {!readOnly && (
                <td className="border border-[var(--border)] p-0">
                  <button onClick={() => removeLabor(li)} className="w-full h-full flex items-center justify-center text-[var(--text-3)] hover:text-red-500 p-1 opacity-0 group-hover:opacity-100">
                    <X size={10} />
                  </button>
                </td>
              )}
            </tr>
          ))}

          {/* Add labor button */}
          {!readOnly && (
            <tr>
              <td colSpan={n + 2} className="border border-[var(--border)] py-0.5">
                <button onClick={() => setShowPicker(true)} className="w-full flex items-center justify-center gap-1 text-[10px] text-[var(--text-3)] hover:text-[var(--accent)] py-1 transition-colors">
                  <Plus size={10} /> Agregar labor
                </button>
              </td>
            </tr>
          )}

          {/* TOTAL CAMPO */}
          <tr className="bg-[var(--bg-hover)]">
            <td className="border border-[var(--border)] px-2 py-1.5 text-xs font-extrabold text-[var(--text-1)]">TOTAL CAMPO</td>
            {sectorTotals.map((t, si) => (
              <td key={si} className={cn(tdTotal, 'text-base')}>{t || '—'}</td>
            ))}
            <td className={cn(tdTotal, 'text-base')}>{grandTotal || '—'}</td>
            {!readOnly && <td className="border border-[var(--border)] bg-[var(--bg-hover)]" />}
          </tr>

          {/* TOTAL ASISTENCIA SEMANA */}
          <tr>
            <td className="border border-[var(--border)] px-2 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/8">
              TOTAL DE ASISTENCIA (SEMANA)
            </td>
            {asistSemana.map((v, si) => (
              <td key={si} className={tdAtt}>{hasAtt ? v : '—'}</td>
            ))}
            <td className={tdAtt}>{hasAtt ? totAsistSemana : '—'}</td>
            {!readOnly && <td className="border border-[var(--border)] bg-amber-500/5" />}
          </tr>

          {/* TOTAL ASISTENCIA SÁBADOS */}
          <tr>
            <td className="border border-[var(--border)] px-2 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/8">
              TOTAL DE ASISTENCIA (SÁBADOS)
            </td>
            {asistSabados.map((v, si) => (
              <td key={si} className={tdAtt}>{hasAtt ? v : '—'}</td>
            ))}
            <td className={tdAtt}>{hasAtt ? totAsistSabados : '—'}</td>
            {!readOnly && <td className="border border-[var(--border)] bg-amber-500/5" />}
          </tr>

          {/* FL CAMPO/LABOR — total column only */}
          <tr>
            <td className="border border-[var(--border)] px-2 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-400 bg-violet-500/8">
              FUERZA LABORAL — CAMPO / LABOR
            </td>
            {Array.from({ length: n }, (_, si) => (
              <td key={si} className={tdFl}>—</td>
            ))}
            <td className={cn(tdFl, 'font-extrabold text-sm')}>{flLabor != null ? flLabor.toFixed(3) : '—'}</td>
            {!readOnly && <td className="border border-[var(--border)] bg-violet-500/5" />}
          </tr>

          {/* FL CAMPO/ASISTENCIA — per sector + total */}
          <tr>
            <td className="border border-[var(--border)] px-2 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-400 bg-violet-500/8">
              FUERZA LABORAL — CAMPO / ASISTENCIA
            </td>
            {flAsistPerSector.map((fl, si) => (
              <td key={si} className={tdFl}>{hasAtt ? flFmt(fl) : '—'}</td>
            ))}
            <td className={cn(tdFl, 'font-extrabold text-sm')}>{hasAtt ? flFmt(flAsistTotal) : '—'}</td>
            {!readOnly && <td className="border border-[var(--border)] bg-violet-500/5" />}
          </tr>
        </tbody>
      </table>
    </div>
    </>
  )
}

// ─── Report 1: Por Zona ───────────────────────────────────────────────────────

function ReportePorZona({ data, maps, hasMarcacion }: { data: WorkforceData; maps: AttendanceMaps; hasMarcacion: boolean }) {
  const n = data.sectors.length
  const rows = data.sectors.map((sec, si) => {
    const needed = data.labors.reduce((s, l) => s + (l.counts[si] || 0), 0)
    const have   = attendeesForSector(maps, sec.name)
    const total  = totalEmpForSector(maps, sec.name)
    return { name: sec.name || '(sin nombre)', needed, have, total, cov: pctNum(have, needed), asist: total > 0 ? pctNum(have, total) : null }
  })
  const totNeeded = rows.reduce((s, r) => s + r.needed, 0)
  const totHave   = rows.reduce((s, r) => s + r.have, 0)
  const totTotal  = rows.reduce((s, r) => s + r.total, 0)

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[var(--bg-hover)]">
            {['Centro de Costo', 'Lo que Necesito', 'Lo que Tengo', '% Cobertura', 'Los que me Asisten'].map((h) => (
              <th key={h} className="border border-[var(--border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)] text-center first:text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="hover:bg-[var(--bg-hover)/40] transition-colors">
              <td className="border border-[var(--border)] px-3 py-2 font-medium text-[var(--text-1)]">{r.name}</td>
              <td className="border border-[var(--border)] px-3 py-2 text-center">{r.needed || '—'}</td>
              <td className="border border-[var(--border)] px-3 py-2 text-center">{hasMarcacion ? (r.have || '0') : '—'}</td>
              <td className={cn('border border-[var(--border)] px-3 py-2 text-center font-bold', pctColor(r.cov))}>
                {hasMarcacion ? pct(r.have, r.needed) : '—'}
              </td>
              <td className={cn('border border-[var(--border)] px-3 py-2 text-center font-bold', pctColor(r.asist))}>
                {hasMarcacion && r.total > 0 ? `${r.asist ?? '—'}% (${r.have}/${r.total})` : '—'}
              </td>
            </tr>
          ))}
          <tr className="bg-[var(--bg-hover)] font-bold">
            <td className="border border-[var(--border)] px-3 py-2 text-xs uppercase tracking-wide text-[var(--text-2)]">TOTAL</td>
            <td className="border border-[var(--border)] px-3 py-2 text-center">{totNeeded}</td>
            <td className="border border-[var(--border)] px-3 py-2 text-center">{hasMarcacion ? totHave : '—'}</td>
            <td className={cn('border border-[var(--border)] px-3 py-2 text-center', pctColor(pctNum(totHave, totNeeded)))}>
              {hasMarcacion ? pct(totHave, totNeeded) : '—'}
            </td>
            <td className={cn('border border-[var(--border)] px-3 py-2 text-center', pctColor(pctNum(totHave, totTotal)))}>
              {hasMarcacion && totTotal > 0 ? pct(totHave, totTotal) : '—'}
            </td>
          </tr>
        </tbody>
      </table>
      {!hasMarcacion && (
        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 px-4 py-3 bg-amber-500/5 border-t border-[var(--border)]">
          <AlertCircle size={13} /> Sin registros de marcación para esta semana.
        </div>
      )}
    </div>
  )
}

// ─── Report 2: Por Labor ──────────────────────────────────────────────────────

function ReportePorLabor({ data, cajas, maps, hasMarcacion }: { data: WorkforceData; cajas: number | null; maps: AttendanceMaps; hasMarcacion: boolean }) {
  const totalHa = data.sectors.reduce((s, sec) => s + (sec.hectareas || 0), 0)

  const rows = data.labors.map((labor) => {
    const rend = labor.counts.reduce((a, b) => a + (b || 0), 0)
    const real = hasMarcacion ? attendeesForLabor(maps, labor.name) : null
    return { name: labor.name, rend, real, req: real != null ? real - rend : null }
  })

  const totRend = rows.reduce((s, r) => s + r.rend, 0)
  const totReal = hasMarcacion ? rows.reduce((s, r) => s + (r.real ?? 0), 0) : null

  const thCls = 'border border-[var(--border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)] text-center bg-[var(--bg-hover)]'

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={cn(thCls, 'text-left')}>Labor</th>
            <th className={thCls}># Rendimiento (Plan)</th>
            {hasMarcacion && <th className={thCls}># Real (Asistencia)</th>}
            {hasMarcacion && <th className={thCls}>Requerimiento</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="hover:bg-[var(--bg-hover)/40] transition-colors">
              <td className="border border-[var(--border)] px-3 py-1.5 text-[var(--text-2)]">{r.name}</td>
              <td className="border border-[var(--border)] px-3 py-1.5 text-center">{r.rend || '—'}</td>
              {hasMarcacion && <td className="border border-[var(--border)] px-3 py-1.5 text-center">{r.real ?? '—'}</td>}
              {hasMarcacion && (
                <td className={cn('border border-[var(--border)] px-3 py-1.5 text-center font-bold', reqColor(r.req ?? 0))}>
                  {r.req != null ? (r.req > 0 ? `+${r.req}` : r.req) : '—'}
                </td>
              )}
            </tr>
          ))}

          {/* Grand total */}
          <tr className="bg-[var(--bg-hover)] font-extrabold text-sm">
            <td className="border border-[var(--border)] px-3 py-2 text-[var(--text-1)]">Total Finca</td>
            <td className="border border-[var(--border)] px-3 py-2 text-center text-[var(--accent)]">{totRend}</td>
            {hasMarcacion && <td className="border border-[var(--border)] px-3 py-2 text-center text-[var(--accent)]">{totReal}</td>}
            {hasMarcacion && (
              <td className={cn('border border-[var(--border)] px-3 py-2 text-center', reqColor((totReal ?? 0) - totRend))}>
                {totReal != null ? ((totReal - totRend) > 0 ? `+${totReal - totRend}` : totReal - totRend) : '—'}
              </td>
            )}
          </tr>

          {/* KPI rows */}
          {[
            { label: 'Fuerza Laboral (T/Ha)', rend: totalHa > 0 && totRend > 0 ? (totRend / totalHa).toFixed(3) : '—', real: hasMarcacion && totalHa > 0 && (totReal ?? 0) > 0 ? ((totReal as number) / totalHa).toFixed(3) : '—' },
            { label: 'Ha / Persona', rend: totRend > 0 ? (totalHa / totRend).toFixed(2) : '—', real: hasMarcacion && (totReal ?? 0) > 0 ? (totalHa / (totReal as number)).toFixed(2) : '—' },
            ...(cajas != null ? [{ label: 'Cajas / Trabajador', rend: totRend > 0 ? (cajas / totRend).toFixed(2) : '—', real: hasMarcacion && (totReal ?? 0) > 0 ? (cajas / (totReal as number)).toFixed(2) : '—' }] : []),
          ].map((kpi) => (
            <tr key={kpi.label} className="bg-violet-500/5">
              <td className="border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-400 italic">{kpi.label}</td>
              <td className="border border-[var(--border)] px-3 py-1.5 text-center text-xs font-bold text-violet-700 dark:text-violet-400">{kpi.rend}</td>
              {hasMarcacion && <td className="border border-[var(--border)] px-3 py-1.5 text-center text-xs font-bold text-violet-700 dark:text-violet-400">{kpi.real}</td>}
              {hasMarcacion && <td className="border border-[var(--border)]" />}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Report card ──────────────────────────────────────────────────────────────

function ReportCard({ report, onView, onDelete }: { report: WorkforceReport; onView: () => void; onDelete?: () => void }) {
  const totalPlan = report.data?.labors.reduce((s, l) => s + l.counts.reduce((a, b) => a + b, 0), 0) ?? 0
  const sectors   = report.data?.sectors.length ?? 0

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 hover:border-[var(--accent)] transition-colors cursor-pointer group" onClick={onView}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs text-[var(--text-3)] uppercase tracking-wide font-medium">
            Semana {String(report.week).padStart(2, '0')} · {report.year}
          </div>
          <div className="text-sm font-semibold text-[var(--text-1)] mt-0.5">{report.department || 'Sin dpto.'}</div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <button onClick={onView} className="p-1.5 rounded-lg hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] transition-colors"><Edit2 size={13} /></button>
          {onDelete && <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-[var(--bg-hover)] rounded-lg p-2"><div className="text-[var(--text-3)]">Sectores</div><div className="font-bold">{sectors}</div></div>
        <div className="bg-[var(--bg-hover)] rounded-lg p-2"><div className="text-[var(--text-3)]">Total planificado</div><div className="font-bold">{totalPlan}</div></div>
        {report.cajas_realizadas != null && <div className="bg-[var(--bg-hover)] rounded-lg p-2"><div className="text-[var(--text-3)]">Cajas</div><div className="font-bold">{report.cajas_realizadas.toLocaleString()}</div></div>}
        {report.dias_proceso != null && <div className="bg-[var(--bg-hover)] rounded-lg p-2"><div className="text-[var(--text-3)]">Días proceso</div><div className="font-bold">{report.dias_proceso}</div></div>}
      </div>
    </div>
  )
}

// ─── Excel export ─────────────────────────────────────────────────────────────

function doExport(report: WorkforceReport, maps: AttendanceMaps, hasMarcacion: boolean) {
  const d = report.data!
  const totalHa = d.sectors.reduce((s, sec) => s + (sec.hectareas || 0), 0)
  const wb = XLSX.utils.book_new()

  // Sheet 1: Grilla
  const g: (string | number)[][] = []
  g.push([`FUERZA LABORAL — SEM ${report.week} / ${report.year}`])
  g.push([`Centro de Costo: ${report.department}`, '', `Cajas: ${report.cajas_realizadas ?? '—'}`, '', `Días: ${report.dias_proceso ?? '—'}`])
  g.push([])
  g.push(['LABOR', ...d.sectors.map((s) => s.name), 'TOTAL'])
  g.push(['Ha en producción', ...d.sectors.map((s) => s.hectareas), totalHa])
  for (const l of d.labors) g.push([l.name, ...l.counts, l.counts.reduce((a, b) => a + b, 0)])
  const secTots = Array.from({ length: d.sectors.length }, (_, si) => d.labors.reduce((s, l) => s + (l.counts[si] || 0), 0))
  const grand = secTots.reduce((a, b) => a + b, 0)
  g.push(['TOTAL CAMPO', ...secTots, grand])
  const asistS = d.sectors.map((sec) => hasMarcacion ? attendeesForSector(maps, sec.name) : '—')
  const asistSab = d.sectors.map((sec) => hasMarcacion ? sabadosForSector(maps, sec.name) : '—')
  g.push(['TOTAL ASISTENCIA (SEMANA)', ...asistS, hasMarcacion ? asistS.reduce((a: number, b) => a + (b as number), 0) : '—'])
  g.push(['TOTAL ASISTENCIA (SÁBADOS)', ...asistSab, hasMarcacion ? asistSab.reduce((a: number, b) => a + (b as number), 0) : '—'])
  const totS = typeof asistS[0] === 'number' ? (asistS as number[]).reduce((a, b) => a + b, 0) : 0
  g.push(['FL CAMPO/LABOR', ...Array(d.sectors.length).fill(''), totalHa > 0 && grand > 0 ? (grand / totalHa).toFixed(3) : '—'])
  g.push(['FL CAMPO/ASISTENCIA', ...d.sectors.map((_, si) => {
    const a = typeof asistS[si] === 'number' ? asistS[si] as number : 0
    return a > 0 ? (secTots[si] / a).toFixed(10) : '—'
  }), totS > 0 ? (grand / totS).toFixed(10) : '—'])
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(g), 'Grilla')

  // Sheet 2: Por Zona
  const z: (string | number)[][] = [['REPORTE POR ZONA — SEM ' + report.week + '/' + report.year], [], ['ZONA', 'NECESITO', 'TENGO', '% COBERTURA', '% ASISTENCIA', 'TOTAL EMPLEADOS']]
  for (const sec of d.sectors) {
    const needed = d.labors.reduce((s, l) => s + (l.counts[d.sectors.indexOf(sec)] || 0), 0)
    const have = hasMarcacion ? attendeesForSector(maps, sec.name) : '—'
    const total = totalEmpForSector(maps, sec.name)
    z.push([sec.name, needed, have, typeof have === 'number' ? pct(have, needed) : '—', typeof have === 'number' && total > 0 ? pct(have, total) : '—', total || '—'])
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(z), 'Por Zona')

  // Sheet 3: Por Labor
  const l: (string | number)[][] = [['REPORTE POR LABOR — SEM ' + report.week + '/' + report.year], [], ['LABOR', '# RENDIMIENTO', '# REAL', 'REQUERIMIENTO']]
  for (const labor of d.labors) {
    const rend = labor.counts.reduce((a, b) => a + b, 0)
    const real = hasMarcacion ? attendeesForLabor(maps, labor.name) : '—'
    l.push([labor.name, rend, real, typeof real === 'number' ? real - rend : '—'])
  }
  l.push(['Total Finca', grand, hasMarcacion ? d.labors.reduce((s, lab) => s + attendeesForLabor(maps, lab.name), 0) : '—', ''])
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(l), 'Por Labor')

  XLSX.writeFile(wb, `FL_SEM${String(report.week).padStart(2, '0')}_${report.year}.xlsx`)
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type View = 'list' | 'editor' | 'report'

export function FuerzaLaboralPage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canCreate  = hasAction(user?.permissions, 'fuerza-laboral:crear', user?.rol)
  const canDelete  = hasAction(user?.permissions, 'fuerza-laboral:eliminar', user?.rol)
  const [view, setView]             = useState<View>('list')
  const [filterYear, setFilterYear] = useState<number | ''>('')
  const [editor, setEditor]         = useState<EditorState>(emptyEditor)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [fullReport, setFullReport] = useState<WorkforceReport | null>(null)
  const [activeTab, setActiveTab]   = useState<'grid' | 'zona' | 'labor'>('grid')

  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: departmentsService.getAll, staleTime: 60_000 })
  const { data: labors = [] } = useQuery({ queryKey: ['labors'], queryFn: () => laborsService.getAll(), staleTime: 60_000 })
  const { data: reports = [], isLoading, refetch } = useQuery({ queryKey: ['workforce', filterYear], queryFn: () => workforceService.getAll(filterYear || undefined), staleTime: 30_000 })

  const weekDates = useMemo(() => getISOWeekDates(
    view === 'report' ? (fullReport?.week ?? editor.week) : editor.week,
    view === 'report' ? (fullReport?.year ?? editor.year) : editor.year,
  ), [fullReport, editor.week, editor.year, view])

  const { data: marcaciones = [], isFetching: loadingMarcacion } = useQuery({
    queryKey: ['marcacion-week', weekDates.start, weekDates.end],
    queryFn: () => marcacionService.getByPeriod(weekDates.start, weekDates.end),
    enabled: view === 'report' || view === 'editor',
    staleTime: 60_000,
  })
  const { data: empResult, isFetching: loadingEmp } = useQuery({
    queryKey: ['employees-all-fl'],
    queryFn: () => empleadosService.getAll({ status: 'active', limit: 9999 }),
    enabled: view === 'report' || view === 'editor',
    staleTime: 5 * 60_000,
  })
  const employees: Empleado[] = (empResult as any)?.data ?? []
  const maps = useMemo(() => buildMaps(marcaciones, employees), [marcaciones, employees])
  const hasMarcacion = marcaciones.length > 0

  const createM = useMutation({
    mutationFn: (s: EditorState) => workforceService.create({ week: s.week, year: s.year, department: s.department, cajas_realizadas: parseFloat(s.cajas_realizadas) || null, dias_proceso: parseFloat(s.dias_proceso) || null, data: s.data }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['workforce'] }); toast.success('Reporte guardado'); setFullReport(r); setView('report'); setActiveTab('grid') },
    onError: () => toast.error('Error guardando reporte'),
  })
  const updateM = useMutation({
    mutationFn: (s: EditorState) => workforceService.update(s.id!, { week: s.week, year: s.year, department: s.department, cajas_realizadas: parseFloat(s.cajas_realizadas) || null, dias_proceso: parseFloat(s.dias_proceso) || null, data: s.data }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['workforce'] }); toast.success('Reporte actualizado'); setFullReport(r); setView('report'); setActiveTab('grid') },
    onError: () => toast.error('Error actualizando reporte'),
  })
  const deleteM = useMutation({
    mutationFn: workforceService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workforce'] }); toast.success('Reporte eliminado') },
    onError: () => toast.error('Error eliminando reporte'),
  })
  const isSaving = createM.isPending || updateM.isPending

  async function handleView(r: WorkforceReport) {
    try { const full = await workforceService.getById(r.id); setFullReport(full) } catch { toast.error('Error cargando reporte'); return }
    setActiveTab('grid'); setView('report')
  }

  function handleSave() {
    if (!editor.data.sectors.some((s) => s.name)) return toast.error('Define al menos un sector con nombre')
    if (editor.data.labors.length === 0) return toast.error('Agrega al menos una labor')
    editor.id ? updateM.mutate(editor) : createM.mutate(editor)
  }

  function headerFields(s: EditorState, set: (s: EditorState) => void) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
        {[
          { label: 'Semana', el: <select value={s.week} onChange={(e) => set({ ...s, week: parseInt(e.target.value) })} className="w-full text-sm border border-[var(--border)] rounded-lg px-2 py-1.5 bg-[var(--bg-base)] text-[var(--text-1)] outline-none focus:border-[var(--accent)]">{WEEKS.map((w) => <option key={w} value={w}>Semana {w}</option>)}</select> },
          { label: 'Año', el: <select value={s.year} onChange={(e) => set({ ...s, year: parseInt(e.target.value) })} className="w-full text-sm border border-[var(--border)] rounded-lg px-2 py-1.5 bg-[var(--bg-base)] text-[var(--text-1)] outline-none focus:border-[var(--accent)]">{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select> },
          { label: 'Finca', el: <input type="text" value={s.department} onChange={(e) => set({ ...s, department: e.target.value })} placeholder="Nombre de la finca..." className="w-full text-sm border border-[var(--border)] rounded-lg px-2 py-1.5 bg-[var(--bg-base)] text-[var(--text-1)] outline-none focus:border-[var(--accent)]" /> },
          { label: 'Cajas Realizadas', el: <input type="number" min={0} value={s.cajas_realizadas} onChange={(e) => set({ ...s, cajas_realizadas: e.target.value })} placeholder="0" className="w-full text-sm border border-[var(--border)] rounded-lg px-2 py-1.5 bg-[var(--bg-base)] text-[var(--text-1)] outline-none focus:border-[var(--accent)]" /> },
          { label: 'Días de Proceso', el: <input type="number" min={1} max={7} value={s.dias_proceso} onChange={(e) => set({ ...s, dias_proceso: e.target.value })} placeholder="0" className="w-full text-sm border border-[var(--border)] rounded-lg px-2 py-1.5 bg-[var(--bg-base)] text-[var(--text-1)] outline-none focus:border-[var(--accent)]" /> },
        ].map(({ label, el }) => (
          <div key={label}><label className="text-xs text-[var(--text-3)] font-medium block mb-1">{label}</label>{el}</div>
        ))}
      </div>
    )
  }

  // ── List view ────────────────────────────────────────────────────────────

  if (view === 'list') {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-1)] flex items-center gap-2"><Briefcase size={20} className="text-[var(--accent)]" />Fuerza Laboral</h1>
            <p className="text-sm text-[var(--text-3)] mt-0.5">Planificación semanal de personal por sector</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value ? parseInt(e.target.value) : '')} className="text-sm border border-[var(--border)] rounded-lg px-3 py-1.5 bg-[var(--bg-surface)] text-[var(--text-1)] outline-none">
              <option value="">Todos los años</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={() => refetch()} className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors"><RefreshCw size={14} /></button>
            {canCreate && (
              <button onClick={() => { setEditor(emptyEditor()); setView('editor') }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 text-sm font-medium">
                <Plus size={15} /> Nuevo Reporte
              </button>
            )}
          </div>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-[var(--text-3)]"><Loader2 className="animate-spin mr-2" size={18} />Cargando...</div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-[var(--text-3)]">
            <Briefcase size={40} className="mb-3 opacity-30" /><div className="font-medium">No hay reportes aún</div>
            {canCreate && (
              <button onClick={() => { setEditor(emptyEditor()); setView('editor') }} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90"><Plus size={14} />Nuevo Reporte</button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {reports.map((r) => <ReportCard key={r.id} report={r} onView={() => handleView(r)} onDelete={canDelete ? () => setConfirmDelete(r.id) : undefined} />)}
          </div>
        )}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar reporte"
        description="¿Estás seguro de que deseas eliminar este reporte? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        loading={deleteM.isPending}
        onConfirm={() => { deleteM.mutate(confirmDelete!); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
      />
      </div>
    )
  }

  // ── Editor view ──────────────────────────────────────────────────────────

  if (view === 'editor') {
    return (
      <div className="p-6 max-w-full space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => setView(fullReport ? 'report' : 'list')} className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-2)]"><ChevronLeft size={16} /></button>
            <h1 className="text-lg font-bold text-[var(--text-1)]">{editor.id ? 'Editar Reporte' : 'Nuevo Reporte'} · SEM {String(editor.week).padStart(2, '0')} / {editor.year}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setView(fullReport ? 'report' : 'list')} className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--bg-hover)] transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-60">
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}{isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
        {headerFields(editor, setEditor)}
        {(loadingMarcacion || loadingEmp) && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-3)]"><Loader2 size={12} className="animate-spin" />Cargando asistencia de la semana...</div>
        )}
        <GridEditor state={editor} onChange={setEditor} departments={departments} labors={labors} maps={maps} />
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-60">
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}{isSaving ? 'Guardando...' : 'Guardar Reporte'}
          </button>
        </div>
      </div>
    )
  }

  // ── Report view ──────────────────────────────────────────────────────────

  if (!fullReport?.data) {
    return <div className="p-6 flex items-center gap-2 text-[var(--text-3)]"><Loader2 className="animate-spin" size={18} />Cargando reporte...</div>
  }

  const rData = fullReport.data

  return (
    <div className="p-6 max-w-full space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('list')} className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-2)]"><ChevronLeft size={16} /></button>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-1)]">
              SEM {String(fullReport.week).padStart(2, '0')} / {fullReport.year}
              {fullReport.department && <span className="text-[var(--text-3)] font-normal ml-2">· {fullReport.department}</span>}
            </h1>
            <p className="text-xs text-[var(--text-3)]">
              {weekDates.start} → {weekDates.end}
              {fullReport.cajas_realizadas != null && ` · Cajas: ${fullReport.cajas_realizadas.toLocaleString()}`}
              {fullReport.dias_proceso != null && ` · ${fullReport.dias_proceso} días`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => doExport(fullReport, maps, hasMarcacion)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-2)]">
            <Download size={14} /> Exportar Excel
          </button>
          <button onClick={() => { setEditor(fromReport(fullReport)); setView('editor') }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-2)]">
            <Edit2 size={14} /> Editar
          </button>
        </div>
      </div>

      {loadingMarcacion || loadingEmp ? (
        <div className="flex items-center gap-2 text-xs text-[var(--text-3)]"><Loader2 size={12} className="animate-spin" />Cargando asistencia...</div>
      ) : !hasMarcacion ? (
        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
          <AlertCircle size={13} /> Sin registros de marcación para {weekDates.start} – {weekDates.end}.
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-lg px-3 py-2">
          <Users size={13} /> {marcaciones.length} registros de marcación · {employees.length} empleados activos
        </div>
      )}

      <div className="flex gap-1 border-b border-[var(--border)]">
        {([
          { key: 'grid',  label: 'Planificación', icon: Briefcase },
          { key: 'zona',  label: 'Por Centro de Costo', icon: Users },
          { key: 'labor', label: 'Por Labor', icon: BarChart2 },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={cn('flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === key ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-3)] hover:text-[var(--text-1)]')}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {activeTab === 'grid'  && <GridEditor state={fromReport(fullReport)} onChange={() => {}} departments={departments} labors={labors} maps={maps} readOnly />}
      {activeTab === 'zona'  && <ReportePorZona data={rData} maps={maps} hasMarcacion={hasMarcacion} />}
      {activeTab === 'labor' && <ReportePorLabor data={rData} cajas={fullReport.cajas_realizadas} maps={maps} hasMarcacion={hasMarcacion} />}
    </div>
  )
}
