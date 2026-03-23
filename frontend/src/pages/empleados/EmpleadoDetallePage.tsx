import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Pencil, UserX, Mail, Phone, MapPin,
  Calendar, Briefcase, DollarSign, Hash, Loader2, User,
} from 'lucide-react'
import { toast } from 'sonner'
import { empleadosService } from '@/services/empleados.service'
import { Avatar } from '@/components/shared/Avatar'
import { Badge } from '@/components/shared/Badge'
import { EmpleadoForm } from '@/components/empleados/EmpleadoForm'
import { EmpleadoSheet } from '@/components/empleados/EmpleadoSheet'
import { ConfirmDialog } from '@/components/empleados/ConfirmDialog'
import type { Empleado, EmpleadoFormData } from '@/types/empleado.types'
import { formatCurrency, formatDate } from '@/lib/utils'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const statusMap: Record<Empleado['status'], { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  active:     { label: 'Activo',      variant: 'success' },
  inactive:   { label: 'Inactivo',    variant: 'neutral' },
  on_leave:   { label: 'En licencia', variant: 'warning' },
  terminated: { label: 'Terminado',   variant: 'danger'  },
}

const genderLabels: Record<string, string> = { M: 'Masculino', F: 'Femenino', O: 'Otro' }

// ─── Info row component ───────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | number | null }) {
  if (value == null || value === '') return null
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-[var(--bg-hover)]">
        <Icon size={14} className="text-[var(--text-3)]" />
      </div>
      <div>
        <p className="text-xs text-[var(--text-3)]">{label}</p>
        <p className="text-sm text-[var(--text-1)] font-medium">{value}</p>
      </div>
    </div>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
    >
      <h3 className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-3 pb-2 border-b"
        style={{ borderColor: 'var(--border-color)' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function EmpleadoDetallePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [editOpen, setEditOpen]             = useState(false)
  const [terminateOpen, setTerminateOpen]   = useState(false)
  const [terminateReason, setTerminateReason] = useState('')

  // ── Fetch employee ────────────────────────────────────────────────────────
  const { data: empleado, isLoading, isError } = useQuery({
    queryKey: ['empleado', id],
    queryFn: () => empleadosService.getById(id!),
    enabled: !!id,
  })

  // ── Update ────────────────────────────────────────────────────────────────
  const { mutateAsync: updateEmpleado, isPending: updating } = useMutation({
    mutationFn: (data: Partial<EmpleadoFormData>) => empleadosService.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleado', id] })
      queryClient.invalidateQueries({ queryKey: ['empleados'] })
      setEditOpen(false)
      toast.success('Empleado actualizado')
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e?.response?.data?.message ?? 'Error al actualizar')
    },
  })

  // ── Terminate ─────────────────────────────────────────────────────────────
  const { mutateAsync: terminate, isPending: terminating } = useMutation({
    mutationFn: () =>
      empleadosService.terminate(id!, {
        terminationDate: new Date().toISOString().split('T')[0],
        reason: terminateReason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleado', id] })
      queryClient.invalidateQueries({ queryKey: ['empleados'] })
      setTerminateOpen(false)
      toast.success('Empleado terminado')
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e?.response?.data?.message ?? 'Error al terminar empleado')
    },
  })

  // ── States ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-[var(--text-3)]" />
      </div>
    )
  }

  if (isError || !empleado) {
    return (
      <div className="text-center py-24">
        <p className="text-[var(--text-2)]">No se encontró el empleado.</p>
        <button onClick={() => navigate('/empleados')} className="mt-4 text-sm text-[var(--accent)] hover:opacity-80">
          ← Volver a empleados
        </button>
      </div>
    )
  }

  const status = statusMap[empleado.status]
  const fullName = `${empleado.firstName} ${empleado.lastName}`

  return (
    <div>
      {/* Back */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/empleados')}
          className="p-2 rounded-lg border border-[var(--border-color)] text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="text-xs text-[var(--text-3)]">Módulos / Empleados / {fullName}</div>
      </div>

      {/* Profile header card */}
      <div
        className="rounded-xl border p-6 mb-5 flex flex-wrap items-start gap-6"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        <Avatar name={fullName} src={empleado.profilePhoto} size="lg" />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-[var(--text-1)]">{fullName}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="text-sm text-[var(--text-2)]">
            {empleado.positionName ?? '—'} · {empleado.departmentName ?? '—'}
          </p>
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-[var(--text-3)]">
            {empleado.email && <span>{empleado.email}</span>}
            {empleado.cedula && <span>CI: {empleado.cedula}</span>}
            {empleado.laborName && <span>Labor: {empleado.laborName}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-1)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <Pencil size={14} />
            Editar
          </button>
          {empleado.status !== 'terminated' && (
            <button
              onClick={() => setTerminateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
            >
              <UserX size={14} />
              Terminar
            </button>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Contact */}
        <Section title="Información de contacto">
          <InfoRow icon={Mail}  label="Email"      value={empleado.email} />
          <InfoRow icon={Phone} label="Teléfono"   value={empleado.phone} />
          <InfoRow icon={MapPin}label="Dirección"  value={empleado.direccion} />
          <InfoRow icon={MapPin}label="Procedencia" value={empleado.procedencia} />
        </Section>

        {/* Employment */}
        <Section title="Información laboral">
          <InfoRow icon={Briefcase} label="Centro de Costo"   value={empleado.departmentName} />
          <InfoRow icon={Briefcase} label="Cargo"             value={empleado.positionName} />
          <InfoRow icon={Briefcase} label="Labor"             value={empleado.laborName} />
          <InfoRow icon={Calendar}  label="Fecha de ingreso"  value={empleado.hireDate ? formatDate(empleado.hireDate) : undefined} />
          <InfoRow icon={Hash}      label="Tipo de Contrato"  value={empleado.contratoTipo} />
          <InfoRow icon={Hash}      label="Contrato Actual"   value={empleado.contratoActual} />
          {empleado.contractEndDate && (
            <InfoRow icon={Calendar} label="Vencimiento contrato" value={formatDate(empleado.contractEndDate)} />
          )}
          <InfoRow icon={Hash} label="Afiliación" value={empleado.afiliacion} />
        </Section>

        {/* Personal */}
        <Section title="Datos personales">
          <InfoRow icon={Hash}     label="Cédula"              value={empleado.cedula} />
          <InfoRow icon={Calendar} label="Fecha de nacimiento" value={empleado.dateOfBirth ? formatDate(empleado.dateOfBirth) : undefined} />
          <InfoRow icon={User}     label="Género"              value={empleado.genero ? genderLabels[empleado.genero] : undefined} />
          <InfoRow icon={Hash}     label="Estado Civil"        value={empleado.estadoCivil} />
          <InfoRow icon={Hash}     label="Hijos"               value={empleado.hijos != null ? empleado.hijos : undefined} />
          <InfoRow icon={Hash}     label="Nivel Académico"     value={empleado.nivelAcademico} />
          <InfoRow icon={Hash}     label="Especialidad"        value={empleado.especialidad} />
          <InfoRow icon={Hash}     label="Pasaporte"           value={empleado.passport} />
        </Section>

        {/* Salary */}
        <Section title="Compensación">
          <InfoRow icon={DollarSign} label="Salario base"     value={formatCurrency(empleado.baseSalary)} />
          <InfoRow icon={Hash}       label="Banco"            value={empleado.bankName} />
          <InfoRow icon={Hash}       label="Número de cuenta" value={empleado.bankAccount} />
          <InfoRow icon={Hash}       label="Tipo de cuenta"   value={empleado.accountType} />
        </Section>

        {/* Termination info */}
        {empleado.status === 'terminated' && (
          <Section title="Baja / Terminación">
            <InfoRow icon={Calendar} label="Fecha de terminación" value={empleado.terminationDate ? formatDate(empleado.terminationDate) : undefined} />
            <InfoRow icon={Hash}     label="Motivo"               value={empleado.terminationReason} />
          </Section>
        )}
      </div>

      {/* Edit sheet */}
      <EmpleadoSheet
        open={editOpen}
        title={`Editar: ${fullName}`}
        onClose={() => setEditOpen(false)}
      >
        <EmpleadoForm
          key={empleado.id}
          defaultValues={empleado}
          onSubmit={async (data) => { await updateEmpleado(data) }}
          onCancel={() => setEditOpen(false)}
          isLoading={updating}
        />
      </EmpleadoSheet>

      {/* Terminate confirm */}
      <ConfirmDialog
        open={terminateOpen}
        title={`¿Terminar a ${fullName}?`}
        description="El empleado será marcado como Terminado. Esta acción puede afectar nómina y otros módulos."
        confirmLabel="Sí, terminar"
        variant="danger"
        loading={terminating}
        onConfirm={() => terminate()}
        onCancel={() => setTerminateOpen(false)}
      />
    </div>
  )
}
