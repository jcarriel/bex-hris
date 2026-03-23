import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, Plus, Pencil, Trash2, X, Save, Loader2, AlarmClock } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/shared/PageHeader'
import { marcacionService, type ScheduleConfig } from '@/services/marcacion.service'
import { departmentsService } from '@/services/departments.service'
import { positionsService } from '@/services/positions.service'
import type { Department } from '@/types/department.types'
import type { Position } from '@/types/position.types'

/* ─── types ──────────────────────────────────────────────────────── */

type FormData = {
  departmentId:  string
  positionId:    string
  workHours:     string
  entryTimeMin:  string
  entryTimeMax:  string
  exitTimeMin:   string
  exitTimeMax:   string
  totalTimeMin:  string
  totalTimeMax:  string
}

const EMPTY: FormData = {
  departmentId: '',
  positionId:   '',
  workHours:    '9',
  entryTimeMin: '06:30',
  entryTimeMax: '07:30',
  exitTimeMin:  '15:30',
  exitTimeMax:  '16:30',
  totalTimeMin: '15',
  totalTimeMax: '15',
}

/* ─── helpers ────────────────────────────────────────────────────── */

const inputCls = [
  'w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors',
  'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-1)]',
  'focus:border-[var(--accent)] placeholder:text-[var(--text-3)]',
].join(' ')

const labelCls = 'block text-xs font-semibold text-[var(--text-2)] mb-1.5 uppercase tracking-wide'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  )
}

/* ─── main component ─────────────────────────────────────────────── */

export function ConfiguracionPage() {
  const qc = useQueryClient()

  const [form, setForm]         = useState<FormData>(EMPTY)
  const [editingId, setEditing] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeleting] = useState<string | null>(null)

  const { data: schedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ['schedules'],
    queryFn:  marcacionService.getSchedules,
  })

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn:  departmentsService.getAll,
  })

  const { data: allPositions = [] } = useQuery<Position[]>({
    queryKey: ['positions'],
    queryFn:  () => positionsService.getAll(),
  })

  // Positions filtered by selected department
  const filteredPositions = useMemo(
    () => allPositions.filter((p) => p.departmentId === form.departmentId),
    [allPositions, form.departmentId],
  )

  // Reset positionId when department changes
  useEffect(() => {
    setForm((prev) => ({ ...prev, positionId: '' }))
  }, [form.departmentId])

  // Dept/position name lookups
  const deptMap = useMemo(
    () => new Map(departments.map((d) => [d.id, d.name])),
    [departments],
  )
  const posMap = useMemo(
    () => new Map(allPositions.map((p) => [p.id, p.name])),
    [allPositions],
  )

  const set = (key: keyof FormData, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }))

  const openCreate = () => {
    setForm(EMPTY)
    setEditing(null)
    setShowForm(true)
  }

  const openEdit = (s: ScheduleConfig) => {
    setForm({
      departmentId: s.departmentId,
      positionId:   s.positionId ?? '',
      workHours:    String(s.workHours),
      entryTimeMin: s.entryTimeMin,
      entryTimeMax: s.entryTimeMax,
      exitTimeMin:  s.exitTimeMin,
      exitTimeMax:  s.exitTimeMax,
      totalTimeMin: String(s.totalTimeMin),
      totalTimeMax: String(s.totalTimeMax),
    })
    setEditing(s.id)
    setShowForm(true)
  }

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY) }

  /* mutations */
  const createMut = useMutation({
    mutationFn: (data: Omit<ScheduleConfig, 'id' | 'departmentName'>) =>
      marcacionService.createSchedule(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedules'] })
      toast.success('Horario creado')
      closeForm()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al crear'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<ScheduleConfig, 'id' | 'departmentName'>> }) =>
      marcacionService.updateSchedule(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedules'] })
      toast.success('Horario actualizado')
      closeForm()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al actualizar'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => marcacionService.deleteSchedule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedules'] })
      toast.success('Horario eliminado')
      setDeleting(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al eliminar'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.departmentId) { toast.error('Selecciona un Centro de Costo'); return }

    const payload = {
      departmentId: form.departmentId,
      positionId:   form.positionId || undefined,
      workHours:    Number(form.workHours),
      entryTimeMin: form.entryTimeMin,
      entryTimeMax: form.entryTimeMax,
      exitTimeMin:  form.exitTimeMin,
      exitTimeMax:  form.exitTimeMax,
      totalTimeMin: Number(form.totalTimeMin),
      totalTimeMax: Number(form.totalTimeMax),
    }

    if (editingId) {
      updateMut.mutate({ id: editingId, data: payload })
    } else {
      createMut.mutate(payload as Omit<ScheduleConfig, 'id' | 'departmentName'>)
    }
  }

  const saving = createMut.isPending || updateMut.isPending

  return (
    <div>
      <PageHeader
        title="Configuración de Horarios"
        description="Define las ventanas de entrada/salida y tolerancias por centro de costo y cargo"
        breadcrumb={[{ label: 'Sistema' }, { label: 'Configuración' }, { label: 'Horarios' }]}
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[var(--text-3)]">
          {schedules.length} configuración{schedules.length !== 1 ? 'es' : ''} registrada{schedules.length !== 1 ? 's' : ''}
        </p>
        {!showForm && (
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: 'var(--accent)' }}>
            <Plus size={15} /> Nueva configuración
          </button>
        )}
        {showForm && (
          <button onClick={closeForm}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors hover:bg-[var(--bg-hover)] text-[var(--text-2)]"
            style={{ borderColor: 'var(--border)' }}>
            <X size={15} /> Cancelar
          </button>
        )}
      </div>

      {/* Form panel */}
      {showForm && (
        <div className="rounded-2xl border mb-6 overflow-hidden"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

          {/* form header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-soft)' }}>
              <AlarmClock size={16} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-1)]">
                {editingId ? 'Editar configuración de horario' : 'Nueva configuración de horario'}
              </p>
              <p className="text-xs text-[var(--text-3)]">
                {editingId
                  ? `${deptMap.get(form.departmentId) || ''} ${form.positionId ? `· ${posMap.get(form.positionId) || ''}` : ''}`
                  : 'Completa los campos para crear una nueva regla de horario'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">

            {/* Row 1: dept + position */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Centro de Costo *">
                <select value={form.departmentId} onChange={(e) => set('departmentId', e.target.value)}
                  required className={inputCls}>
                  <option value="">Seleccionar...</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Cargo (opcional — aplica a todos si no se elige)">
                <select value={form.positionId} onChange={(e) => set('positionId', e.target.value)}
                  disabled={!form.departmentId} className={cn(inputCls, !form.departmentId && 'opacity-50 cursor-not-allowed')}>
                  <option value="">Todos los cargos</option>
                  {filteredPositions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            </div>

            {/* Divider label */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)]">Horas de trabajo</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
            </div>

            {/* Row 2: work hours */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Horas de trabajo (jornada)">
                <input type="number" min="1" max="24" step="0.5"
                  value={form.workHours} onChange={(e) => set('workHours', e.target.value)}
                  required className={inputCls} placeholder="9" />
              </Field>
              <Field label="Tolerancia mínima (min)">
                <input type="number" min="0" max="120"
                  value={form.totalTimeMin} onChange={(e) => set('totalTimeMin', e.target.value)}
                  required className={inputCls} placeholder="15" />
              </Field>
              <Field label="Tolerancia máxima (min)">
                <input type="number" min="0" max="120"
                  value={form.totalTimeMax} onChange={(e) => set('totalTimeMax', e.target.value)}
                  required className={inputCls} placeholder="15" />
              </Field>
            </div>

            {/* Divider label */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)]">Ventana de entrada</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
            </div>

            {/* Row 3: entry window */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Hora entrada mínima">
                <input type="time" value={form.entryTimeMin} onChange={(e) => set('entryTimeMin', e.target.value)}
                  required className={inputCls} />
              </Field>
              <Field label="Hora entrada máxima">
                <input type="time" value={form.entryTimeMax} onChange={(e) => set('entryTimeMax', e.target.value)}
                  required className={inputCls} />
              </Field>
            </div>

            {/* Divider label */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)]">Ventana de salida</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
            </div>

            {/* Row 4: exit window */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Hora salida mínima">
                <input type="time" value={form.exitTimeMin} onChange={(e) => set('exitTimeMin', e.target.value)}
                  required className={inputCls} />
              </Field>
              <Field label="Hora salida máxima">
                <input type="time" value={form.exitTimeMax} onChange={(e) => set('exitTimeMax', e.target.value)}
                  required className={inputCls} />
              </Field>
            </div>

            {/* Preview strip */}
            <div className="rounded-xl p-4 text-xs space-y-1.5"
              style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <p className="font-semibold">Vista previa de la regla</p>
              <p>
                Jornada de <strong>{form.workHours}h</strong> · Entrada entre{' '}
                <strong>{form.entryTimeMin} – {form.entryTimeMax}</strong> · Salida entre{' '}
                <strong>{form.exitTimeMin} – {form.exitTimeMax}</strong> · Tolerancia{' '}
                <strong>±{form.totalTimeMin}/{form.totalTimeMax} min</strong>
              </p>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
                style={{ backgroundColor: 'var(--accent)' }}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {editingId ? 'Guardar cambios' : 'Crear configuración'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

        {/* table header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
          <Clock size={16} style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-semibold text-[var(--text-1)]">Horarios configurados</span>
        </div>

        {loadingSchedules ? (
          <div className="flex items-center justify-center py-16 gap-2 text-[var(--text-3)]">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Cargando...</span>
          </div>
        ) : schedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl mb-4 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
              <Clock size={28} className="text-[var(--text-3)]" />
            </div>
            <p className="text-sm font-medium text-[var(--text-2)]">Sin configuraciones</p>
            <p className="text-xs text-[var(--text-3)] mt-1">Crea la primera regla de horario haciendo clic en "Nueva configuración"</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface)' }}>
                  {['Centro de Costo', 'Cargo', 'Jornada', 'Ventana Entrada', 'Ventana Salida', 'Tolerancia', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => {
                  const isDeleting = deletingId === s.id

                  if (isDeleting) {
                    return (
                      <tr key={s.id} className="border-t bg-red-500/5" style={{ borderColor: 'var(--border)' }}>
                        <td colSpan={6} className="px-4 py-3 text-sm text-red-500 font-medium">
                          ¿Eliminar la configuración de <strong>{deptMap.get(s.departmentId) ?? s.departmentId}</strong>
                          {s.positionId ? ` · ${posMap.get(s.positionId) ?? s.positionId}` : ''}?
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            <button onClick={() => deleteMut.mutate(s.id)} disabled={deleteMut.isPending}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-60">
                              {deleteMut.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Confirmar'}
                            </button>
                            <button onClick={() => setDeleting(null)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold border text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-colors"
                              style={{ borderColor: 'var(--border)' }}>
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <tr key={s.id} className="border-t hover:bg-[var(--bg-hover)] transition-colors"
                      style={{ borderColor: 'var(--border)' }}>
                      <td className="px-4 py-3 font-semibold text-[var(--text-1)]">
                        {deptMap.get(s.departmentId) ?? s.departmentId}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-2)]">
                        {s.positionId
                          ? posMap.get(s.positionId) ?? s.positionId
                          : <span className="text-[var(--text-3)] italic">Todos los cargos</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}>
                          {s.workHours}h
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[var(--text-2)]">
                        {s.entryTimeMin} – {s.entryTimeMax}
                      </td>
                      <td className="px-4 py-3 font-mono text-[var(--text-2)]">
                        {s.exitTimeMin} – {s.exitTimeMax}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-3)]">
                        -{s.totalTimeMin} / +{s.totalTimeMax} min
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEdit(s)}
                            className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-2)] hover:text-[var(--accent)] transition-colors"
                            title="Editar">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setDeleting(s.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-2)] hover:text-red-500 transition-colors"
                            title="Eliminar">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
