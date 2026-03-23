import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { departmentsService } from '@/services/departments.service'
import { positionsService } from '@/services/positions.service'
import { catalogService } from '@/services/catalog.service'
import type { Empleado, EmpleadoFormData } from '@/types/empleado.types'
import { cn } from '@/lib/utils'

const schema = z.object({
  firstName:      z.string().min(2, 'Mínimo 2 caracteres'),
  lastName:       z.string().min(2, 'Mínimo 2 caracteres'),
  email:          z.string().email('Email inválido').optional().or(z.literal('')),
  cedula:         z.string().min(5, 'Cédula inválida'),
  departmentId:   z.string().min(1, 'Selecciona un departamento'),
  positionId:     z.string().min(1, 'Selecciona un cargo'),
  baseSalary:     z.coerce.number().min(0, 'Ingresa el salario'),
  phone:          z.string().optional(),
  genero:         z.enum(['M', 'F', 'O']).optional(),
  hireDate:       z.string().optional(),
  contratoTipo:   z.string().optional(),
  contratoTipoId: z.string().optional(),
  contratoActual: z.string().optional(),
  contratoActualId: z.string().optional(),
  status:         z.enum(['active', 'inactive', 'on_leave', 'terminated']).optional(),
  dateOfBirth:    z.string().optional(),
  estadoCivil:    z.string().optional(),
  estadoCivilId:  z.string().optional(),
  procedencia:    z.string().optional(),
  direccion:      z.string().optional(),
  bankName:       z.string().optional(),
  bankAccount:    z.string().optional(),
  accountType:    z.string().optional(),
  hijos:          z.coerce.number().optional(),
  nivelAcademico: z.string().optional(),
  especialidad:   z.string().optional(),
  afiliacion:     z.string().optional(),
  afiliacionId:   z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface EmpleadoFormProps {
  defaultValues?: Partial<Empleado>
  onSubmit: (data: EmpleadoFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

// ─── Styled field components ──────────────────────────────────────────────────
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--text-2)] mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}

function inputClass(hasError?: boolean) {
  return cn(
    'w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors',
    'bg-[var(--bg-base)] text-[var(--text-1)] placeholder:text-[var(--text-3)]',
    hasError
      ? 'border-red-500 focus:border-red-500'
      : 'border-[var(--border-color)] focus:border-[var(--accent)]',
  )
}

function selectClass() {
  return cn(
    'w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors cursor-pointer',
    'bg-[var(--bg-base)] text-[var(--text-1)]',
    'border-[var(--border-color)] focus:border-[var(--accent)]',
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
function Section({ title }: { title: string }) {
  return (
    <div className="col-span-2 pt-2 pb-1">
      <h4 className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider border-b border-[var(--border-color)] pb-1">
        {title}
      </h4>
    </div>
  )
}

export function EmpleadoForm({ defaultValues, onSubmit, onCancel, isLoading }: EmpleadoFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName:      defaultValues?.firstName      ?? '',
      lastName:       defaultValues?.lastName       ?? '',
      email:          defaultValues?.email          ?? '',
      cedula:         defaultValues?.cedula         ?? '',
      departmentId:   defaultValues?.departmentId   ?? '',
      positionId:     defaultValues?.positionId     ?? '',
      baseSalary:     defaultValues?.baseSalary     ?? 0,
      phone:          defaultValues?.phone          ?? '',
      genero:         defaultValues?.genero,
      hireDate:       defaultValues?.hireDate       ?? '',
      contratoTipo:     defaultValues?.contratoTipo     ?? '',
      contratoTipoId:   defaultValues?.contratoTipoId   ?? '',
      contratoActual:   defaultValues?.contratoActual   ?? '',
      contratoActualId: defaultValues?.contratoActualId ?? '',
      status:         defaultValues?.status         ?? 'active',
      dateOfBirth:    defaultValues?.dateOfBirth    ?? '',
      estadoCivil:    defaultValues?.estadoCivil    ?? '',
      estadoCivilId:  defaultValues?.estadoCivilId  ?? '',
      procedencia:    defaultValues?.procedencia    ?? '',
      direccion:      defaultValues?.direccion      ?? '',
      bankName:       defaultValues?.bankName       ?? '',
      bankAccount:    defaultValues?.bankAccount    ?? '',
      accountType:    defaultValues?.accountType    ?? '',
      hijos:          defaultValues?.hijos,
      nivelAcademico: defaultValues?.nivelAcademico ?? '',
      especialidad:   defaultValues?.especialidad   ?? '',
      afiliacion:     defaultValues?.afiliacion     ?? '',
      afiliacionId:   defaultValues?.afiliacionId   ?? '',
    },
  })

  const selectedDeptId = watch('departmentId')

  const { data: departments = [], isLoading: loadingDepts } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentsService.getAll,
  })

  const { data: positions = [], isLoading: loadingPos } = useQuery({
    queryKey: ['positions', selectedDeptId],
    queryFn: () => positionsService.getAll(selectedDeptId || undefined),
    enabled: true,
  })

  const { data: estadoCiviles = [] } = useQuery({
    queryKey: ['catalog', 'estado_civil'],
    queryFn: () => catalogService.getByType('estado_civil'),
  })
  const { data: tiposContrato = [] } = useQuery({
    queryKey: ['catalog', 'tipo_contrato'],
    queryFn: () => catalogService.getByType('tipo_contrato'),
  })
  const { data: contratosActuales = [] } = useQuery({
    queryKey: ['catalog', 'contrato_actual'],
    queryFn: () => catalogService.getByType('contrato_actual'),
  })
  const { data: afiliaciones = [] } = useQuery({
    queryKey: ['catalog', 'afiliacion'],
    queryFn: () => catalogService.getByType('afiliacion'),
  })

  // Reset positionId when department changes (only when user actively changes it)
  useEffect(() => {
    if (!defaultValues?.positionId) {
      setValue('positionId', '')
    }
  }, [selectedDeptId]) // eslint-disable-line

  // Re-apply positionId after positions finish loading (they may arrive after mount)
  useEffect(() => {
    if (positions.length > 0 && defaultValues?.positionId) {
      const exists = positions.some((p) => p.id === defaultValues.positionId)
      if (exists) setValue('positionId', defaultValues.positionId)
    }
  }, [positions]) // eslint-disable-line

  const handleFormSubmit = async (values: FormValues) => {
    const data: EmpleadoFormData = {
      ...values,
      email: values.email || undefined,
    }
    await onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-4">

          {/* ── Datos básicos ── */}
          <Section title="Datos básicos" />

          <Field label="Nombres *" error={errors.firstName?.message}>
            <input {...register('firstName')} placeholder="Ej. Juan" className={inputClass(!!errors.firstName)} />
          </Field>

          <Field label="Apellidos *" error={errors.lastName?.message}>
            <input {...register('lastName')} placeholder="Ej. Pérez" className={inputClass(!!errors.lastName)} />
          </Field>

          <Field label="Cédula *" error={errors.cedula?.message}>
            <input {...register('cedula')} placeholder="001-0000000-0" className={inputClass(!!errors.cedula)} />
          </Field>

          <Field label="Email" error={errors.email?.message}>
            <input {...register('email')} type="email" placeholder="juan@empresa.com" className={inputClass(!!errors.email)} />
          </Field>

          {/* ── Cargo y departamento ── */}
          <Section title="Cargo y departamento" />

          <Field label="Centro de Costo *" error={errors.departmentId?.message}>
            <select {...register('departmentId')} className={selectClass()} disabled={loadingDepts}>
              <option value="">{loadingDepts ? 'Cargando...' : 'Seleccionar...'}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Cargo *" error={errors.positionId?.message}>
            <select {...register('positionId')} className={selectClass()} disabled={loadingPos || !selectedDeptId}>
              <option value="">{!selectedDeptId ? 'Selecciona dept. primero' : loadingPos ? 'Cargando...' : 'Seleccionar...'}</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>

          {/* ── Información laboral ── */}
          <Section title="Información laboral" />

          <Field label="Salario base *" error={errors.baseSalary?.message}>
            <input {...register('baseSalary')} type="number" step="0.01" placeholder="0.00" className={inputClass(!!errors.baseSalary)} />
          </Field>

          <Field label="Fecha de ingreso">
            <input {...register('hireDate')} type="date" className={inputClass()} />
          </Field>

          <Field label="Tipo de contrato">
            <select {...register('contratoTipoId')} className={selectClass()}>
              <option value="">Seleccionar...</option>
              {tiposContrato.map((c) => <option key={c.id} value={c.id}>{c.value}</option>)}
            </select>
          </Field>

          <Field label="Contrato actual">
            <select {...register('contratoActualId')} className={selectClass()}>
              <option value="">Seleccionar...</option>
              {contratosActuales.map((c) => <option key={c.id} value={c.id}>{c.value}</option>)}
            </select>
          </Field>

          <Field label="Estado">
            <select {...register('status')} className={selectClass()}>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="on_leave">En licencia</option>
              <option value="terminated">Terminado</option>
            </select>
          </Field>

          <Field label="Afiliación">
            <select {...register('afiliacionId')} className={selectClass()}>
              <option value="">Seleccionar...</option>
              {afiliaciones.map((c) => <option key={c.id} value={c.id}>{c.value}</option>)}
            </select>
          </Field>

          {/* ── Datos personales ── */}
          <Section title="Datos personales" />

          <Field label="Teléfono">
            <input {...register('phone')} placeholder="+1 (809) 000-0000" className={inputClass()} />
          </Field>

          <Field label="Género">
            <select {...register('genero')} className={selectClass()}>
              <option value="">No especificado</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="O">Otro</option>
            </select>
          </Field>

          <Field label="Fecha de nacimiento">
            <input {...register('dateOfBirth')} type="date" className={inputClass()} />
          </Field>

          <Field label="Estado civil">
            <select {...register('estadoCivilId')} className={selectClass()}>
              <option value="">Seleccionar...</option>
              {estadoCiviles.map((c) => <option key={c.id} value={c.id}>{c.value}</option>)}
            </select>
          </Field>

          <Field label="Procedencia">
            <input {...register('procedencia')} placeholder="Ej. SANTO DOMINGO" className={inputClass()} />
          </Field>

          <Field label="Dirección domicilio">
            <input {...register('direccion')} placeholder="Calle, Ciudad" className={inputClass()} />
          </Field>

          <Field label="Hijos">
            <input {...register('hijos')} type="number" min={0} placeholder="0" className={inputClass()} />
          </Field>

          <Field label="Nivel académico">
            <input {...register('nivelAcademico')} placeholder="Ej. UNIVERSITARIO" className={inputClass()} />
          </Field>

          <Field label="Especialidad" error={errors.especialidad?.message}>
            <input {...register('especialidad')} placeholder="Ej. INGENIERÍA EN SISTEMAS" className={inputClass()} />
          </Field>

          {/* ── Datos bancarios ── */}
          <Section title="Datos bancarios" />

          <Field label="Banco">
            <input {...register('bankName')} placeholder="Nombre del banco" className={inputClass()} />
          </Field>

          <Field label="Número de cuenta">
            <input {...register('bankAccount')} placeholder="0000000000" className={inputClass()} />
          </Field>

          <Field label="Tipo de cuenta">
            <input {...register('accountType')} placeholder="Ej. Ahorros" className={inputClass()} />
          </Field>

        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-end gap-3 p-4 border-t"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2 text-sm rounded-lg bg-[var(--accent)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {isLoading && <Loader2 size={14} className="animate-spin" />}
          {defaultValues?.id ? 'Guardar cambios' : 'Crear empleado'}
        </button>
      </div>
    </form>
  )
}
