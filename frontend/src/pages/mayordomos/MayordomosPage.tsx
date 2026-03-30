import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mayordomosService, Mayordomo } from '@/services/mayordomos.service'
import { empleadosService } from '@/services/empleados.service'
import { Plus, X, Trash2, Loader2, Users, UserPlus, ChevronDown, ChevronRight, Shield, Search } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { EmployeeSearchSelect } from '@/components/shared/EmployeeSearchSelect'
import { getInitials } from '@/lib/utils'
import { ConfirmDialog } from '@/components/empleados/ConfirmDialog'
import { useAuthStore, hasAction } from '@/store/authStore'

// ─── Employee chip ─────────────────────────────────────────────────────────────
function EmployeeChip({ name, position, onRemove }: { name: string; position?: string; onRemove?: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-hover)] border border-[var(--border)] group">
      <div className="w-7 h-7 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
        {getInitials(name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-[var(--text-1)] truncate">{name}</div>
        {position && <div className="text-[10px] text-[var(--text-3)] truncate">{position}</div>}
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[var(--text-3)] hover:text-red-500 hover:bg-red-500/10 transition-all flex-shrink-0"
          title="Quitar"
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}

// ─── Mayordomo card ────────────────────────────────────────────────────────────
function MayordomoCard({
  mayordomo,
  assignedEmployeeIds,
  allEmployees,
  onDelete,
  onAssign,
  onRemove,
}: {
  mayordomo: Mayordomo
  assignedEmployeeIds: Set<string>
  allEmployees: any[]
  onDelete?: () => void
  onAssign: (empId: string) => void
  onRemove: (empId: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [showAssign, setShowAssign] = useState(false)
  const [search, setSearch] = useState('')

  const available = useMemo(() =>
    allEmployees.filter((e) =>
      e.status === 'active' &&
      e.id !== mayordomo.employeeId &&
      !assignedEmployeeIds.has(e.id) &&
      (search === '' || `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase()))
    ),
    [allEmployees, assignedEmployeeIds, mayordomo.employeeId, search]
  )

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-hover)] border-b border-[var(--border)]">
        <button onClick={() => setExpanded(!expanded)} className="text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors">
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
        <div className="w-9 h-9 rounded-full bg-[var(--accent)] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
          {getInitials(mayordomo.employeeName || '?')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[var(--text-1)]">{mayordomo.employeeName || mayordomo.employeeId}</span>
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-[10px] font-semibold">
              <Shield size={9} /> Mayordomo
            </span>
          </div>
          {mayordomo.employeePosition && (
            <div className="text-xs text-[var(--text-3)]">{mayordomo.employeePosition}</div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-[var(--text-3)]">
            <Users size={12} />{mayordomo.assignedEmployees.length} a cargo
          </span>
          {onDelete && (
            <button onClick={onDelete} title="Eliminar mayordomo" className="p-1.5 rounded-lg text-[var(--text-3)] hover:bg-red-500/10 hover:text-red-500 transition-colors">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-3">
          {/* Grid of assigned employees */}
          {mayordomo.assignedEmployees.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {mayordomo.assignedEmployees.map((ae) => (
                <EmployeeChip
                  key={ae.id}
                  name={`${ae.firstName} ${ae.lastName}`}
                  position={ae.positionName}
                  onRemove={() => onRemove(ae.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-xs text-[var(--text-3)] text-center py-3 italic">Sin empleados asignados</div>
          )}

          {/* Inline assign panel */}
          {showAssign ? (
            <div className="border border-[var(--border)] rounded-lg p-3 space-y-2 bg-[var(--bg-hover)]/40">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                  <input
                    autoFocus
                    placeholder="Buscar empleado..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 text-xs border border-[var(--border)] rounded-lg bg-[var(--bg-base)] text-[var(--text-1)] outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <button onClick={() => { setShowAssign(false); setSearch('') }} className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--text-1)]">
                  <X size={13} />
                </button>
              </div>
              {available.length === 0 ? (
                <div className="text-xs text-[var(--text-3)] text-center py-2">No hay empleados disponibles</div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {available.slice(0, 25).map((e) => (
                    <button
                      key={e.id}
                      onClick={() => { onAssign(e.id); setSearch('') }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-surface)] transition-colors text-left"
                    >
                      <div className="w-6 h-6 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                        {getInitials(`${e.firstName} ${e.lastName}`)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-[var(--text-1)] truncate">{e.firstName} {e.lastName}</div>
                        {e.positionName && <div className="text-[10px] text-[var(--text-3)] truncate">{e.positionName}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setShowAssign(true)} className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline">
              <UserPlus size={13} /> Asignar empleado
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export function MayordomosPage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canCreate = hasAction(user?.permissions, 'mayordomos:crear', user?.rol)
  const canDelete = hasAction(user?.permissions, 'mayordomos:eliminar', user?.rol)
  const [showModal, setShowModal] = useState(false)
  const [newEmpId, setNewEmpId] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)

  const { data: mayordomos = [], isLoading } = useQuery({
    queryKey: ['mayordomos'],
    queryFn: mayordomosService.getAll,
    staleTime: 30_000,
  })

  const { data: empResult } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => empleadosService.getAll({ limit: 9999 }),
    staleTime: 60_000,
  })
  const employees: any[] = (empResult as any)?.data ?? []

  // All IDs already in use (as mayordomo or assigned under one)
  const assignedEmployeeIds = useMemo(() => {
    const s = new Set<string>()
    mayordomos.forEach((m) => {
      s.add(m.employeeId)
      m.assignedEmployees.forEach((ae) => s.add(ae.id))
    })
    return s
  }, [mayordomos])

  const mayordomoEmployeeIds = useMemo(
    () => new Set(mayordomos.map((m) => m.employeeId)),
    [mayordomos]
  )

  const createM = useMutation({
    mutationFn: (employeeId: string) => mayordomosService.create({ employeeId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mayordomos'] }); toast.success('Mayordomo agregado'); setShowModal(false); setNewEmpId('') },
    onError: () => toast.error('Error al crear mayordomo'),
  })

  const deleteM = useMutation({
    mutationFn: (id: string) => mayordomosService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mayordomos'] }); toast.success('Eliminado') },
    onError: () => toast.error('Error al eliminar'),
  })

  const assignM = useMutation({
    mutationFn: ({ mayordomoId, employeeId }: { mayordomoId: string; employeeId: string }) =>
      mayordomosService.assignEmployee(mayordomoId, employeeId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mayordomos'] }); toast.success('Empleado asignado') },
    onError: () => toast.error('Error al asignar'),
  })

  const removeM = useMutation({
    mutationFn: (employeeId: string) => mayordomosService.removeEmployee(employeeId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mayordomos'] }); toast.success('Empleado removido') },
    onError: () => toast.error('Error al remover'),
  })

  const availableForMayordomo = employees.filter(
    (e) => e.status === 'active' && !mayordomoEmployeeIds.has(e.id)
  )

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[var(--text-3)]" size={24} /></div>
  }

  return (
    <div className="space-y-5">
      {/* Header stats */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2.5 flex items-center gap-3">
            <Shield size={16} className="text-[var(--accent)]" />
            <div>
              <div className="text-[10px] uppercase tracking-wide font-semibold text-[var(--text-3)]">Mayordomos</div>
              <div className="text-xl font-bold text-[var(--text-1)] leading-none">{mayordomos.length}</div>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2.5 flex items-center gap-3">
            <Users size={16} className="text-emerald-500" />
            <div>
              <div className="text-[10px] uppercase tracking-wide font-semibold text-[var(--text-3)]">Empleados a cargo</div>
              <div className="text-xl font-bold text-[var(--text-1)] leading-none">
                {mayordomos.reduce((s, m) => s + m.assignedEmployees.length, 0)}
              </div>
            </div>
          </div>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90"
          >
            <Plus size={14} /> Nuevo Mayordomo
          </button>
        )}
      </div>

      {/* Cards */}
      {mayordomos.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-[var(--text-3)]">
          <Shield size={40} className="mb-3 opacity-20" />
          <div className="text-sm font-medium">No hay mayordomos registrados</div>
          <div className="text-xs mt-1 opacity-70">Agrega un mayordomo para empezar a asignar empleados</div>
        </div>
      ) : (
        <div className="space-y-4">
          {mayordomos.map((m) => (
            <MayordomoCard
              key={m.id}
              mayordomo={m}
              assignedEmployeeIds={assignedEmployeeIds}
              allEmployees={employees}
              onDelete={canDelete ? () => setConfirmDelete({ id: m.id, name: m.employeeName || m.employeeId }) : undefined}
              onAssign={(empId) => assignM.mutate({ mayordomoId: m.id, employeeId: empId })}
              onRemove={(empId) => removeM.mutate(empId)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] shadow-2xl w-full max-w-md mx-4 p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-[var(--text-1)]">Nuevo Mayordomo</h2>
                <p className="text-xs text-[var(--text-3)] mt-0.5">El empleado seleccionado pasará a ser mayordomo</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-[var(--text-3)] hover:text-[var(--text-1)]"><X size={16} /></button>
            </div>
            <div>
              <label className="text-xs text-[var(--text-3)] font-medium block mb-1">Empleado</label>
              <EmployeeSearchSelect
                value={newEmpId}
                onChange={(id) => setNewEmpId(id)}
                employees={availableForMayordomo}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-2)] hover:bg-[var(--bg-hover)]">Cancelar</button>
              <button
                onClick={() => createM.mutate(newEmpId)}
                disabled={!newEmpId || createM.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {createM.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar mayordomo"
        description={`¿Estás seguro de que deseas eliminar a ${confirmDelete?.name} como mayordomo? Los empleados a cargo quedarán sin asignar.`}
        confirmLabel="Eliminar"
        loading={deleteM.isPending}
        onConfirm={() => { deleteM.mutate(confirmDelete!.id); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
