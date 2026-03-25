import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUiStore } from '@/store/uiStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  UserPlus, Search, Eye, Pencil, Trash2,
  ChevronLeft, ChevronRight, Users, Loader2, FileDown,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { toast } from 'sonner'
import { empleadosService } from '@/services/empleados.service'
import { departmentsService } from '@/services/departments.service'
import { positionsService } from '@/services/positions.service'
import { EmpleadoForm } from '@/components/empleados/EmpleadoForm'
import { EmpleadoSheet } from '@/components/empleados/EmpleadoSheet'
import { ConfirmDialog } from '@/components/empleados/ConfirmDialog'
import { Avatar } from '@/components/shared/Avatar'
import { Badge } from '@/components/shared/Badge'
import type { Empleado, EmpleadoFormData } from '@/types/empleado.types'
import { cn, formatCurrency } from '@/lib/utils'

// ─── Sort icon ────────────────────────────────────────────────────────────────
function SortIcon({ col, sortBy, sortDir }: { col: string; sortBy: string; sortDir: string }) {
  if (col !== sortBy) return <span className="ml-1 text-[var(--text-3)] opacity-30">↕</span>
  return <span className="ml-1 text-[var(--accent)]">{sortDir === 'asc' ? '↑' : '↓'}</span>
}

// ─── Status helpers ───────────────────────────────────────────────────────────
const statusMap: Record<Empleado['status'], { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  active:     { label: 'Activo',      variant: 'success' },
  inactive:   { label: 'Inactivo',    variant: 'neutral' },
  on_leave:   { label: 'En licencia', variant: 'warning' },
  terminated: { label: 'Terminado',   variant: 'danger'  },
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export function EmpleadosPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

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

  // ── Data fetching ───────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['empleados', { page, limit, departmentId: deptFilter, positionId: positionFilter, status: statusFilter, search: debouncedSearch }],
    queryFn: () =>
      empleadosService.getAll({
        page,
        limit,
        departmentId: deptFilter || undefined,
        positionId: positionFilter || undefined,
        status: (statusFilter as Empleado['status']) || undefined,
        search: debouncedSearch || undefined,
      }),
  })

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentsService.getAll,
  })

  const { data: positions = [] } = useQuery({
    queryKey: ['positions', deptFilter],
    queryFn: () => positionsService.getAll(deptFilter || undefined),
  })

  const empleados = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const total = data?.total ?? 0

  const sorted = [...(empleados ?? [])].sort((a, b) => {
    const aVal = (a as any)[sortBy] ?? ''
    const bVal = (b as any)[sortBy] ?? ''
    const cmp = String(aVal).localeCompare(String(bVal))
    return sortDir === 'asc' ? cmp : -cmp
  })

  // ── Mutations ───────────────────────────────────────────────────────────────
  const { mutateAsync: createEmpleado, isPending: creating } = useMutation({
    mutationFn: empleadosService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados'] })
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
      setDeleteTarget(null)
      toast.success('Empleado eliminado')
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e?.response?.data?.message ?? 'Error al eliminar empleado')
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
      const result = await empleadosService.getAll({
        departmentId: deptFilter || undefined,
        positionId:   positionFilter || undefined,
        status:       (statusFilter as Empleado['status']) || undefined,
        search:       debouncedSearch || undefined,
        limit:        9999,
        page:         1,
      })
      const empList = result.data
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
        id: 'salario',
        header: 'Salario base',
        cell: ({ row: { original: e } }) => (
          <span className="text-[var(--text-1)] font-medium">
            {formatCurrency(e.baseSalary)}
          </span>
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
              title="Ver detalle"
              className="p-1.5 rounded-md text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <Eye size={15} />
            </button>
            <button
              onClick={() => openEdit(e)}
              title="Editar"
              className="p-1.5 rounded-md text-[var(--text-3)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => setDeleteTarget(e)}
              title="Eliminar"
              className="p-1.5 rounded-md text-[var(--text-3)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ),
      },
    ],
    [departments, navigate], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const table = useReactTable({
    data: sorted,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  })

  const selectClass = cn(
    'text-sm px-3 py-1.5 rounded-lg border outline-none transition-colors cursor-pointer',
    'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-2)]',
    'focus:border-[var(--accent)]',
  )

  return (
    <div>
      <ExportModal
        open={exportModal}
        onClose={() => setExportModal(false)}
        onExport={handleExport}
        loading={exporting}
      />

      {/* Header */}
      <div className="flex justify-end gap-2 mb-4">
        <button
          onClick={() => setExportModal(true)}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-2)', backgroundColor: 'var(--bg-card)' }}
        >
          <FileDown size={15} />
          Exportar
        </button>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <UserPlus size={15} />
          Nuevo empleado
        </button>
      </div>

      {/* Filters */}
      <div
        className="rounded-xl border p-4 mb-4 flex flex-wrap gap-3 items-center"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email o cédula..."
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border outline-none transition-colors bg-[var(--bg-base)] border-[var(--border-color)] text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)]"
          />
        </div>

        {/* Department filter */}
        <select
          value={deptFilter}
          onChange={(e) => { setDeptFilter(e.target.value); setPositionFilter(''); setPage(1) }}
          className={selectClass}
        >
          <option value="">Todos los centros de costo</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        {/* Position filter */}
        <select
          value={positionFilter}
          onChange={(e) => { setPositionFilter(e.target.value); setPage(1) }}
          className={selectClass}
        >
          <option value="">Todos los cargos</option>
          {positions.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className={selectClass}
        >
          <option value="">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
          <option value="on_leave">En licencia</option>
          <option value="terminated">Terminado</option>
        </select>

        <span className="text-xs text-[var(--text-3)] ml-auto">
          {total} empleado{total !== 1 ? 's' : ''}
        </span>
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
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  {hg.headers.map((h) => {
                    const sortColMap: Record<string, string> = {
                      empleado: 'firstName',
                      departamento: 'departmentName',
                      cargo: 'positionName',
                      estado: 'status',
                    }
                    const sortCol = sortColMap[h.id]
                    const isSortable = !!sortCol
                    return (
                      <th
                        key={h.id}
                        onClick={isSortable ? () => handleSort(sortCol) : undefined}
                        className={cn(
                          'text-left px-4 py-3 text-xs font-medium text-[var(--text-2)] uppercase tracking-wide',
                          isSortable && 'cursor-pointer select-none hover:text-[var(--text-1)]',
                        )}
                      >
                        <span className="inline-flex items-center">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {isSortable && <SortIcon col={sortCol} sortBy={sortBy} sortDir={sortDir} />}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              ))}
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
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3 text-[var(--text-3)]">
                      <Users size={36} className="opacity-40" />
                      <div>
                        <p className="text-sm font-medium text-[var(--text-2)]">Sin empleados</p>
                        <p className="text-xs mt-0.5">
                          {search || deptFilter || statusFilter
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
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-md border border-[var(--border-color)] text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-md border border-[var(--border-color)] text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

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
    </div>
  )
}
