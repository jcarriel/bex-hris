import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2, Briefcase, Wrench, Users, CreditCard,
  FileText, FileCheck, Shield, Plus, Pencil, Trash2,
  Search, Check, X, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { departmentsService } from '@/services/departments.service'
import { positionsService } from '@/services/positions.service'
import { laborsService } from '@/services/labors.service'
import { catalogService } from '@/services/catalog.service'
import type { Department } from '@/types/department.types'
import type { Position } from '@/types/position.types'
import type { Labor } from '@/services/labors.service'
import type { CatalogItem } from '@/types/catalog.types'

// ─── Table definitions ────────────────────────────────────────────────────────
const GROUPS = [
  {
    label: 'Organigrama',
    items: [
      { id: 'centros_costo', label: 'Centro de Costo', icon: Building2, color: 'text-blue-400' },
      { id: 'cargos',        label: 'Cargo',           icon: Briefcase,  color: 'text-violet-400' },
      { id: 'labores',       label: 'Labor',           icon: Wrench,     color: 'text-amber-400' },
    ],
  },
  {
    label: 'Catálogos',
    items: [
      { id: 'estado_civil',    label: 'Estado Civil',      icon: Users,      color: 'text-emerald-400' },
      { id: 'banco',           label: 'Bancos',            icon: CreditCard, color: 'text-cyan-400' },
      { id: 'tipo_contrato',   label: 'Tipo de Contrato',  icon: FileText,   color: 'text-orange-400' },
      { id: 'contrato_actual', label: 'Contrato Actual',   icon: FileCheck,  color: 'text-pink-400' },
      { id: 'afiliacion',      label: 'Afiliación',        icon: Shield,     color: 'text-teal-400' },
    ],
  },
]

const ALL_TABLES = GROUPS.flatMap((g) => g.items)
const CATALOG_TYPES = ['estado_civil', 'banco', 'tipo_contrato', 'contrato_actual', 'afiliacion']

// ─── Inline input ─────────────────────────────────────────────────────────────
function InlineInput({
  value, onChange, onSave, onCancel, placeholder, saving,
  extra,
}: {
  value: string
  onChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
  placeholder?: string
  saving?: boolean
  extra?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg border border-[var(--accent)]/40 bg-[var(--bg-hover)]">
      <div className="flex-1 flex flex-col gap-2">
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel() }}
          placeholder={placeholder ?? 'Nombre...'}
          className="w-full px-3 py-1.5 text-sm rounded-md border outline-none bg-[var(--bg-base)] border-[var(--border-color)] text-[var(--text-1)] focus:border-[var(--accent)] placeholder:text-[var(--text-3)]"
        />
        {extra}
      </div>
      <button
        onClick={onSave}
        disabled={saving}
        className="p-1.5 rounded-md bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-60"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
      </button>
      <button onClick={onCancel} className="p-1.5 rounded-md text-[var(--text-3)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-1)]">
        <X size={14} />
      </button>
    </div>
  )
}

// ─── Select component ─────────────────────────────────────────────────────────
function SelectField({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void
  options: { id: string; label: string }[]; placeholder: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-1.5 text-sm rounded-md border outline-none cursor-pointer bg-[var(--bg-base)] border-[var(--border-color)] text-[var(--text-1)] focus:border-[var(--accent)]"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  )
}

// ─── Generic row ──────────────────────────────────────────────────────────────
function TableRow({
  name, sub, onEdit, onDelete, deleting, confirming, onDeleteRequest, onDeleteCancel,
}: {
  name: string; sub?: string
  onEdit: () => void
  onDelete: () => void
  deleting?: boolean
  confirming?: boolean
  onDeleteRequest: () => void
  onDeleteCancel: () => void
}) {
  if (confirming) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-red-500/20 bg-red-500/5">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--text-2)]">
            ¿Eliminar <span className="font-medium text-[var(--text-1)]">{name}</span>?
          </p>
        </div>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 transition-colors"
        >
          {deleting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Eliminar
        </button>
        <button
          onClick={onDeleteCancel}
          className="p-1.5 rounded-md text-[var(--text-3)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <X size={13} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[var(--bg-hover)] group transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-1)] truncate">{name}</p>
        {sub && <p className="text-xs text-[var(--text-3)] truncate mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-md text-[var(--text-3)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={onDeleteRequest}
          className="p-1.5 rounded-md text-[var(--text-3)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── Centro de Costo panel ───────────────────────────────────────────────────
function CentroCostoPanel() {
  const qc = useQueryClient()
  const [search, setSearch]           = useState('')
  const [adding, setAdding]           = useState(false)
  const [addName, setAddName]         = useState('')
  const [editId, setEditId]           = useState<string | null>(null)
  const [editName, setEditName]       = useState('')
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentsService.getAll,
  })

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter((i) => i.name.toLowerCase().includes(q))
  }, [items, search])

  const { mutateAsync: create, isPending: creating } = useMutation({
    mutationFn: (name: string) => departmentsService.create({ name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); setAdding(false); setAddName(''); toast.success('Centro de Costo creado') },
    onError: () => toast.error('Error al crear'),
  })

  const { mutateAsync: update, isPending: updating } = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => departmentsService.update(id, { name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); setEditId(null); toast.success('Actualizado') },
    onError: () => toast.error('Error al actualizar'),
  })

  const deleteMut = useMutation({
    mutationFn: departmentsService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); toast.success('Eliminado') },
    onError: () => toast.error('Error al eliminar'),
  })

  return (
    <PanelShell label="Centro de Costo" count={items.length} search={search} onSearch={setSearch}
      onAdd={() => { setAdding(true); setAddName('') }} isLoading={isLoading}>
      {adding && (
        <InlineInput value={addName} onChange={setAddName}
          onSave={() => addName.trim() && create(addName.trim())}
          onCancel={() => setAdding(false)} saving={creating} placeholder="Nombre del centro de costo..." />
      )}
      {filtered.map((item) => editId === item.id ? (
        <InlineInput key={item.id} value={editName} onChange={setEditName}
          onSave={() => editName.trim() && update({ id: item.id, name: editName.trim() })}
          onCancel={() => setEditId(null)} saving={updating} />
      ) : (
        <TableRow key={item.id} name={item.name}
          onEdit={() => { setEditId(item.id); setEditName(item.name) }}
          confirming={confirmDeleteId === item.id}
          onDeleteRequest={() => setConfirmDeleteId(item.id)}
          onDeleteCancel={() => setConfirmDeleteId(null)}
          onDelete={() => { setDeletingId(item.id); deleteMut.mutate(item.id, { onSettled: () => { setDeletingId(null); setConfirmDeleteId(null) } }) }}
          deleting={deletingId === item.id} />
      ))}
      {!isLoading && filtered.length === 0 && <EmptyState />}
    </PanelShell>
  )
}

// ─── Cargo panel ─────────────────────────────────────────────────────────────
function CargoPanel() {
  const qc = useQueryClient()
  const [search, setSearch]               = useState('')
  const [adding, setAdding]               = useState(false)
  const [addName, setAddName]             = useState('')
  const [addDeptId, setAddDeptId]         = useState('')
  const [editId, setEditId]               = useState<string | null>(null)
  const [editName, setEditName]           = useState('')
  const [deletingId, setDeletingId]       = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const { data: depts = [] } = useQuery({ queryKey: ['departments'], queryFn: departmentsService.getAll })
  const { data: items = [], isLoading } = useQuery({ queryKey: ['positions'], queryFn: () => positionsService.getAll() })

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter((i) => i.name.toLowerCase().includes(q))
  }, [items, search])

  const { mutateAsync: create, isPending: creating } = useMutation({
    mutationFn: ({ name, departmentId }: { name: string; departmentId: string }) =>
      positionsService.create({ name, departmentId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['positions'] }); setAdding(false); setAddName(''); setAddDeptId(''); toast.success('Cargo creado') },
    onError: () => toast.error('Error al crear'),
  })

  const { mutateAsync: update, isPending: updating } = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => positionsService.update(id, { name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['positions'] }); setEditId(null); toast.success('Actualizado') },
    onError: () => toast.error('Error al actualizar'),
  })

  const deleteMut = useMutation({
    mutationFn: positionsService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['positions'] }); toast.success('Eliminado') },
    onError: () => toast.error('Error al eliminar'),
  })

  const deptName = (id: string) => depts.find((d) => d.id === id)?.name

  return (
    <PanelShell label="Cargo" count={items.length} search={search} onSearch={setSearch}
      onAdd={() => { setAdding(true); setAddName(''); setAddDeptId('') }} isLoading={isLoading}>
      {adding && (
        <InlineInput value={addName} onChange={setAddName}
          onSave={() => addName.trim() && addDeptId && create({ name: addName.trim(), departmentId: addDeptId })}
          onCancel={() => setAdding(false)} saving={creating} placeholder="Nombre del cargo..."
          extra={<SelectField value={addDeptId} onChange={setAddDeptId}
            options={depts.map((d) => ({ id: d.id, label: d.name }))} placeholder="Seleccionar Centro de Costo..." />} />
      )}
      {filtered.map((item) => editId === item.id ? (
        <InlineInput key={item.id} value={editName} onChange={setEditName}
          onSave={() => editName.trim() && update({ id: item.id, name: editName.trim() })}
          onCancel={() => setEditId(null)} saving={updating} />
      ) : (
        <TableRow key={item.id} name={item.name} sub={deptName(item.departmentId)}
          onEdit={() => { setEditId(item.id); setEditName(item.name) }}
          confirming={confirmDeleteId === item.id}
          onDeleteRequest={() => setConfirmDeleteId(item.id)}
          onDeleteCancel={() => setConfirmDeleteId(null)}
          onDelete={() => { setDeletingId(item.id); deleteMut.mutate(item.id, { onSettled: () => { setDeletingId(null); setConfirmDeleteId(null) } }) }}
          deleting={deletingId === item.id} />
      ))}
      {!isLoading && filtered.length === 0 && <EmptyState />}
    </PanelShell>
  )
}

// ─── Labor panel ─────────────────────────────────────────────────────────────
function LaborPanel() {
  const qc = useQueryClient()
  const [search, setSearch]               = useState('')
  const [adding, setAdding]               = useState(false)
  const [addName, setAddName]             = useState('')
  const [addPosId, setAddPosId]           = useState('')
  const [editId, setEditId]               = useState<string | null>(null)
  const [editName, setEditName]           = useState('')
  const [deletingId, setDeletingId]       = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const { data: positions = [] } = useQuery({ queryKey: ['positions'], queryFn: () => positionsService.getAll() })
  const { data: items = [], isLoading } = useQuery({ queryKey: ['labors'], queryFn: () => laborsService.getAll() })

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter((i) => i.name.toLowerCase().includes(q))
  }, [items, search])

  const { mutateAsync: create, isPending: creating } = useMutation({
    mutationFn: ({ name, positionId }: { name: string; positionId: string }) =>
      laborsService.create({ name, positionId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['labors'] }); setAdding(false); setAddName(''); setAddPosId(''); toast.success('Labor creada') },
    onError: () => toast.error('Error al crear'),
  })

  const { mutateAsync: update, isPending: updating } = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => laborsService.update(id, { name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['labors'] }); setEditId(null); toast.success('Actualizado') },
    onError: () => toast.error('Error al actualizar'),
  })

  const deleteMut = useMutation({
    mutationFn: laborsService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['labors'] }); toast.success('Eliminado') },
    onError: () => toast.error('Error al eliminar'),
  })

  const posName = (id: string) => positions.find((p) => p.id === id)?.name

  return (
    <PanelShell label="Labor" count={items.length} search={search} onSearch={setSearch}
      onAdd={() => { setAdding(true); setAddName(''); setAddPosId('') }} isLoading={isLoading}>
      {adding && (
        <InlineInput value={addName} onChange={setAddName}
          onSave={() => addName.trim() && addPosId && create({ name: addName.trim(), positionId: addPosId })}
          onCancel={() => setAdding(false)} saving={creating} placeholder="Nombre de la labor..."
          extra={<SelectField value={addPosId} onChange={setAddPosId}
            options={positions.map((p) => ({ id: p.id, label: p.name }))} placeholder="Seleccionar Cargo..." />} />
      )}
      {filtered.map((item) => editId === item.id ? (
        <InlineInput key={item.id} value={editName} onChange={setEditName}
          onSave={() => editName.trim() && update({ id: item.id, name: editName.trim() })}
          onCancel={() => setEditId(null)} saving={updating} />
      ) : (
        <TableRow key={item.id} name={item.name} sub={posName(item.positionId)}
          onEdit={() => { setEditId(item.id); setEditName(item.name) }}
          confirming={confirmDeleteId === item.id}
          onDeleteRequest={() => setConfirmDeleteId(item.id)}
          onDeleteCancel={() => setConfirmDeleteId(null)}
          onDelete={() => { setDeletingId(item.id); deleteMut.mutate(item.id, { onSettled: () => { setDeletingId(null); setConfirmDeleteId(null) } }) }}
          deleting={deletingId === item.id} />
      ))}
      {!isLoading && filtered.length === 0 && <EmptyState />}
    </PanelShell>
  )
}

// ─── Generic catalog panel ───────────────────────────────────────────────────
function CatalogPanel({ type, label }: { type: string; label: string }) {
  const qc = useQueryClient()
  const [search, setSearch]               = useState('')
  const [adding, setAdding]               = useState(false)
  const [addValue, setAddValue]           = useState('')
  const [editId, setEditId]               = useState<string | null>(null)
  const [editValue, setEditValue]         = useState('')
  const [deletingId, setDeletingId]       = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const qKey = ['catalog', type]
  const { data: items = [], isLoading } = useQuery({
    queryKey: qKey,
    queryFn: () => catalogService.getByType(type),
  })

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter((i) => i.value.toLowerCase().includes(q))
  }, [items, search])

  const { mutateAsync: create, isPending: creating } = useMutation({
    mutationFn: (value: string) => catalogService.create({ type, value }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qKey }); setAdding(false); setAddValue(''); toast.success(`${label} agregado`) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al agregar'),
  })

  const { mutateAsync: update, isPending: updating } = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) => catalogService.update(id, { value }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qKey }); setEditId(null); toast.success('Actualizado') },
    onError: () => toast.error('Error al actualizar'),
  })

  const deleteMut = useMutation({
    mutationFn: catalogService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: qKey }); toast.success('Eliminado') },
    onError: () => toast.error('Error al eliminar'),
  })

  return (
    <PanelShell label={label} count={items.length} search={search} onSearch={setSearch}
      onAdd={() => { setAdding(true); setAddValue('') }} isLoading={isLoading}>
      {adding && (
        <InlineInput value={addValue} onChange={setAddValue}
          onSave={() => addValue.trim() && create(addValue.trim())}
          onCancel={() => setAdding(false)} saving={creating} placeholder={`Valor de ${label}...`} />
      )}
      {filtered.map((item) => editId === item.id ? (
        <InlineInput key={item.id} value={editValue} onChange={setEditValue}
          onSave={() => editValue.trim() && update({ id: item.id, value: editValue.trim() })}
          onCancel={() => setEditId(null)} saving={updating} />
      ) : (
        <TableRow key={item.id} name={item.value}
          onEdit={() => { setEditId(item.id); setEditValue(item.value) }}
          confirming={confirmDeleteId === item.id}
          onDeleteRequest={() => setConfirmDeleteId(item.id)}
          onDeleteCancel={() => setConfirmDeleteId(null)}
          onDelete={() => { setDeletingId(item.id); deleteMut.mutate(item.id, { onSettled: () => { setDeletingId(null); setConfirmDeleteId(null) } }) }}
          deleting={deletingId === item.id} />
      ))}
      {!isLoading && filtered.length === 0 && <EmptyState />}
    </PanelShell>
  )
}

// ─── Panel shell ──────────────────────────────────────────────────────────────
function PanelShell({ label, count, search, onSearch, onAdd, isLoading, children }: {
  label: string; count: number; search: string; onSearch: (v: string) => void
  onAdd: () => void; isLoading: boolean; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-1)]">{label}</h2>
          <p className="text-xs text-[var(--text-3)] mt-0.5">{count} {count === 1 ? 'registro' : 'registros'}</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={14} />
          Agregar
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar..."
          className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border outline-none bg-[var(--bg-base)] border-[var(--border-color)] text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)]"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-[var(--text-3)]">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : children}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-12 text-[var(--text-3)]">
      <p className="text-sm">Sin registros</p>
      <p className="text-xs mt-1">Usa el botón Agregar para crear el primero</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function TablasPage() {
  const [activeTable, setActiveTable] = useState('centros_costo')

  const activeInfo = ALL_TABLES.find((t) => t.id === activeTable)!

  return (
    <div className="flex gap-5 h-[calc(100vh-130px)] min-h-[500px]">
      {/* Left nav */}
      <aside
        className="w-52 flex-shrink-0 rounded-xl border overflow-y-auto p-2 flex flex-col gap-1"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        {GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)] px-3 pt-3 pb-1">
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon
              const isActive = activeTable === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTable(item.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-sm relative',
                    isActive
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-medium'
                      : 'text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-1)]',
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--accent)]" />
                  )}
                  <Icon size={15} className={isActive ? 'text-[var(--accent)]' : item.color} />
                  {item.label}
                </button>
              )
            })}
          </div>
        ))}
      </aside>

      {/* Right panel */}
      <div
        className="flex-1 rounded-xl border p-5 overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        {/* Accent bar */}
        <div className="flex items-center gap-2 mb-5 pb-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className={cn('p-1.5 rounded-lg bg-[var(--bg-hover)]')}>
            <activeInfo.icon size={16} className={activeInfo.color} />
          </div>
          <span className="text-sm font-semibold text-[var(--text-1)]">{activeInfo.label}</span>
        </div>

        {activeTable === 'centros_costo' && <CentroCostoPanel />}
        {activeTable === 'cargos'        && <CargoPanel />}
        {activeTable === 'labores'       && <LaborPanel />}
        {CATALOG_TYPES.includes(activeTable) && (
          <CatalogPanel key={activeTable} type={activeTable} label={activeInfo.label} />
        )}
      </div>
    </div>
  )
}
