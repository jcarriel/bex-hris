import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Pencil, Trash2, KeyRound, X, Check, ShieldCheck, ShieldOff,
  Users, Shield, Eye, EyeOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usersService, type AdminUser, type CreateUserData, type UpdateUserData } from '@/services/users.service'
import { rolesService } from '@/services/roles.service'
import { empleadosService } from '@/services/empleados.service'
import { SYSTEM_MODULES, type Role } from '@/types/role.types'
import { EmployeeSearchSelect } from '@/components/shared/EmployeeSearchSelect'

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                      */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: string }) {
  const active = status === 'active'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full',
        active
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-red-500/10 text-red-600 dark:text-red-400',
      )}
    >
      {active ? <ShieldCheck size={11} /> : <ShieldOff size={11} />}
      {active ? 'Activo' : 'Inactivo'}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Overlay / Sheet                                                     */
/* ------------------------------------------------------------------ */

function Sheet({
  open,
  title,
  onClose,
  loading,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  loading?: boolean
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={loading ? undefined : onClose} />
      <div
        className="w-full max-w-md h-full overflow-y-auto flex flex-col"
        style={{ backgroundColor: 'var(--bg-card)', borderLeft: '1px solid var(--border)' }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <h3 className="text-sm font-semibold text-[var(--text-1)]">{title}</h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-md text-[var(--text-3)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 p-5">{children}</div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Password reveal card                                               */
/* ------------------------------------------------------------------ */

function PasswordCard({
  password,
  emailSent,
  onClose,
}: {
  password: string
  emailSent: boolean
  onClose: () => void
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-4"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-1)]">Contraseña generada</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[var(--text-3)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-[var(--text-2)]">
          Se generó una nueva contraseña para el usuario. Cópiala ahora — no se volverá a mostrar.
        </p>

        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2.5"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <code className="flex-1 text-sm font-mono text-[var(--accent)] tracking-wider">
            {visible ? password : '••••••••••'}
          </code>
          <button
            onClick={() => setVisible((v) => !v)}
            className="text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
          >
            {visible ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        <div
          className={cn(
            'text-xs px-3 py-2 rounded-lg flex items-center gap-2',
            emailSent
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
          )}
        >
          {emailSent ? <Check size={12} /> : <X size={12} />}
          {emailSent
            ? 'Se envió un correo al usuario con sus credenciales.'
            : 'No se pudo enviar el correo. Comparte la contraseña manualmente.'}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Username generator                                                  */
/* ------------------------------------------------------------------ */

function toUsername(nombre: string): string {
  const parts = nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  return `${parts[0]}.${parts[parts.length - 1]}`
}

/* ------------------------------------------------------------------ */
/*  User form schema                                                    */
/* ------------------------------------------------------------------ */

const createSchema = z.object({
  nombre:     z.string().min(2, 'Ingresa el nombre completo'),
  username:   z.string().min(3, 'Mínimo 3 caracteres').regex(/^\S+$/, 'Sin espacios'),
  email:      z.string().email('Email inválido'),
  roleId:     z.string().min(1, 'Debes seleccionar un rol'),
  employeeId: z.string().optional(),
})

const editSchema = z.object({
  nombre:  z.string().min(2, 'Ingresa el nombre completo'),
  email:   z.string().email('Email inválido'),
  roleId:  z.string().optional(),
  status:  z.enum(['active', 'inactive']),
})

type CreateForm = z.infer<typeof createSchema>
type EditForm   = z.infer<typeof editSchema>

/* ------------------------------------------------------------------ */
/*  Tab: Usuarios                                                       */
/* ------------------------------------------------------------------ */

function UsuariosTab() {
  const qc = useQueryClient()
  const [creating, setCreating]         = useState(false)
  const [editing, setEditing]           = useState<AdminUser | null>(null)
  const [confirmDeleteId, setConfirm]   = useState<string | null>(null)
  const [pwResult, setPwResult]         = useState<{ password: string; emailSent: boolean } | null>(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn:  usersService.getAll,
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn:  rolesService.getAll,
  })

  const { data: empResult } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => empleadosService.getAll({ limit: 9999 }),
    staleTime: 60_000,
  })
  const employees: any[] = (empResult as any)?.data ?? []
  const activeEmployees = employees.filter((e) => e.status === 'active')

  const createMutation = useMutation({
    mutationFn: (d: CreateUserData) => usersService.create(d),
    onSuccess:  (res) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setCreating(false)
      setPwResult({ password: res.data.plainPassword, emailSent: res.data.emailSent })
    },
  })

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserData }) => usersService.update(id, data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setEditing(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersService.delete(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setConfirm(null) },
  })

  const resetMutation = useMutation({
    mutationFn: (id: string) => usersService.resetPassword(id),
    onSuccess:  (res) => {
      setPwResult({ password: res.data.plainPassword, emailSent: res.data.emailSent })
    },
  })

  /* Create form */
  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema) })
  const editForm   = useForm<EditForm>({ resolver: zodResolver(editSchema) })

  /* Auto-populate from selected employee */
  const watchedEmployeeId = createForm.watch('employeeId')
  useEffect(() => {
    if (!watchedEmployeeId) return
    const emp = activeEmployees.find((e) => e.id === watchedEmployeeId)
    if (!emp) return
    const fullName = `${emp.firstName} ${emp.lastName}`
    createForm.setValue('nombre', fullName, { shouldValidate: false })
    createForm.setValue('username', toUsername(fullName), { shouldValidate: false })
    if (emp.email) createForm.setValue('email', emp.email, { shouldValidate: false })
  }, [watchedEmployeeId]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Auto-generate username from nombre (when no employee selected) */
  const watchedNombre = createForm.watch('nombre')
  useEffect(() => {
    if (watchedEmployeeId) return // employee drives the name
    if (watchedNombre) {
      createForm.setValue('username', toUsername(watchedNombre), { shouldValidate: false })
    }
  }, [watchedNombre]) // eslint-disable-line react-hooks/exhaustive-deps

  const openEdit = (u: AdminUser) => {
    editForm.reset({
      nombre:  u.nombre ?? '',
      email:   u.email,
      roleId:  u.roleId ?? '',
      status:  (u.status as 'active' | 'inactive') ?? 'active',
    })
    setEditing(u)
  }

  return (
    <>
      {pwResult && (
        <PasswordCard
          password={pwResult.password}
          emailSent={pwResult.emailSent}
          onClose={() => setPwResult(null)}
        />
      )}

      {/* Create sheet */}
      <Sheet open={creating} title="Nuevo usuario" loading={createMutation.isPending} onClose={() => setCreating(false)}>
        <form
          onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))}
          className="space-y-4"
        >
          <Field label="Empleado activo (opcional)">
            <EmployeeSearchSelect
              value={createForm.watch('employeeId') ?? ''}
              onChange={(id) => {
                createForm.setValue('employeeId', id || undefined)
                if (!id) {
                  createForm.setValue('nombre', '')
                  createForm.setValue('username', '')
                  createForm.setValue('email', '')
                }
              }}
              employees={activeEmployees}
              placeholder="Vincular a un empleado..."
            />
          </Field>
          <Field label="Nombre completo" error={createForm.formState.errors.nombre?.message}>
            <input {...createForm.register('nombre')} placeholder="Ana García" className={inputCls(!!createForm.formState.errors.nombre)} />
          </Field>
          <Field label="Nombre de usuario" error={createForm.formState.errors.username?.message}>
            <input {...createForm.register('username')} placeholder="ana.garcia" className={inputCls(!!createForm.formState.errors.username)} />
          </Field>
          <Field label="Correo electrónico" error={createForm.formState.errors.email?.message}>
            <input {...createForm.register('email')} type="email" placeholder="ana@empresa.com" className={inputCls(!!createForm.formState.errors.email)} />
          </Field>
          <Field label="Rol *" error={createForm.formState.errors.roleId?.message}>
            <select {...createForm.register('roleId')} className={inputCls(!!createForm.formState.errors.roleId)}>
              <option value="">Selecciona un rol...</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          {createMutation.isError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {(createMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al crear usuario'}
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setCreating(false)} disabled={createMutation.isPending} className={cn(secondaryBtn, 'disabled:opacity-40 disabled:cursor-not-allowed')}>Cancelar</button>
            <button type="submit" disabled={createMutation.isPending} className={primaryBtn}>
              {createMutation.isPending ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </Sheet>

      {/* Edit sheet */}
      <Sheet open={!!editing} title="Editar usuario" onClose={() => setEditing(null)}>
        <form
          onSubmit={editForm.handleSubmit((d) =>
            editMutation.mutate({ id: editing!.id, data: d }),
          )}
          className="space-y-4"
        >
          <Field label="Nombre completo" error={editForm.formState.errors.nombre?.message}>
            <input {...editForm.register('nombre')} className={inputCls(!!editForm.formState.errors.nombre)} />
          </Field>
          <Field label="Correo electrónico" error={editForm.formState.errors.email?.message}>
            <input {...editForm.register('email')} type="email" className={inputCls(!!editForm.formState.errors.email)} />
          </Field>
          <Field label="Rol">
            <select {...editForm.register('roleId')} className={inputCls(false)}>
              <option value="">Sin rol asignado</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <Field label="Estado">
            <select {...editForm.register('status')} className={inputCls(false)}>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </Field>
          {editMutation.isError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {(editMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al actualizar'}
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setEditing(null)} className={secondaryBtn}>Cancelar</button>
            <button type="submit" disabled={editMutation.isPending} className={primaryBtn}>
              {editMutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Sheet>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-1)]">Usuarios del sistema</h3>
          <p className="text-xs text-[var(--text-3)] mt-0.5">{users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { createForm.reset(); setCreating(true) }} className={primaryBtn}>
          <Plus size={14} />
          Nuevo usuario
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-surface)' }}>
              {['Nombre', 'Empleado', 'Usuario', 'Email', 'Rol', 'Estado', 'Último acceso', 'Acciones'].map((h) => (
                <th
                  key={h}
                  className="text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)] px-4 py-3"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-xs text-[var(--text-3)]">
                  Cargando...
                </td>
              </tr>
            )}
            {!isLoading && users.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-xs text-[var(--text-3)]">
                  No hay usuarios registrados
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-t transition-colors hover:bg-[var(--bg-hover)]"
                style={{ borderColor: 'var(--border)' }}
              >
                {confirmDeleteId === u.id ? (
                  <td colSpan={8} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[var(--text-2)]">
                        ¿Eliminar <strong>{u.nombre ?? u.username}</strong>?
                      </span>
                      <button
                        onClick={() => deleteMutation.mutate(u.id)}
                        disabled={deleteMutation.isPending}
                        className="text-xs px-3 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                      >
                        Eliminar
                      </button>
                      <button
                        onClick={() => setConfirm(null)}
                        className="p-1 rounded-md text-[var(--text-3)] hover:bg-[var(--bg-hover)] transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </td>
                ) : (
                  <>
                    <td className="px-4 py-3 text-[var(--text-1)] font-medium">{u.nombre ?? '—'}</td>
                    <td className="px-4 py-3 text-[var(--text-2)] text-xs">{u.employeeName ?? <span className="text-[var(--text-3)]">—</span>}</td>
                    <td className="px-4 py-3 text-[var(--text-2)] font-mono text-xs">{u.username}</td>
                    <td className="px-4 py-3 text-[var(--text-2)]">{u.email}</td>
                    <td className="px-4 py-3 text-[var(--text-2)]">{u.roleName ?? u.role ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                    <td className="px-4 py-3 text-xs text-[var(--text-3)]">
                      {(u as any).lastLoginAt
                        ? new Date((u as any).lastLoginAt).toLocaleString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                        : <span className="italic">Nunca</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <ActionBtn
                          icon={<Pencil size={13} />}
                          title="Editar"
                          onClick={() => openEdit(u)}
                        />
                        <ActionBtn
                          icon={<KeyRound size={13} />}
                          title="Resetear contraseña"
                          onClick={() => resetMutation.mutate(u.id)}
                          loading={resetMutation.isPending && resetMutation.variables === u.id}
                        />
                        <ActionBtn
                          icon={<Trash2 size={13} />}
                          title="Eliminar"
                          danger
                          onClick={() => setConfirm(u.id)}
                        />
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Roles                                                          */
/* ------------------------------------------------------------------ */

const roleSchema = z.object({
  name:        z.string().min(2, 'Ingresa el nombre del rol'),
  description: z.string().optional(),
})
type RoleForm = z.infer<typeof roleSchema>

function RolesTab() {
  const qc = useQueryClient()
  const [selected, setSelected]       = useState<Role | null>(null)
  const [creating, setCreating]       = useState(false)
  const [permissions, setPermissions] = useState<string[]>([])
  const [confirmDeleteId, setConfirm] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [dirty, setDirty]             = useState(false)

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn:  rolesService.getAll,
  })

  const createMutation = useMutation({
    mutationFn: (d: { name: string; description?: string; permissions: string[] }) =>
      rolesService.create(d),
    onSuccess: (role) => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      setCreating(false)
      setSelected(role)
      setPermissions(role.permissions)
      setDirty(false)
      createForm.reset()
      setCreatePermissions([])
      setCreatePermsError(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string; permissions?: string[] } }) =>
      rolesService.update(id, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      setSelected(updated)
      setDirty(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rolesService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      setSelected(null)
      setPermissions([])
      setConfirm(null)
      setDeleteError(null)
    },
    onError: (err: any) => {
      setDeleteError(err?.response?.data?.message ?? 'No se pudo eliminar el rol')
    },
  })

  const [createPermissions, setCreatePermissions] = useState<string[]>([])
  const [createPermsError, setCreatePermsError]   = useState(false)

  const createForm = useForm<RoleForm>({ resolver: zodResolver(roleSchema) })

  const selectRole = (r: Role) => {
    setSelected(r)
    setPermissions(r.permissions)
    setDirty(false)
    setCreating(false)
  }

  const togglePermission = (moduleId: string) => {
    if (selected?.isSystem) return
    setPermissions((prev) =>
      prev.includes(moduleId) ? prev.filter((p) => p !== moduleId) : [...prev, moduleId],
    )
    setDirty(true)
  }

  const savePermissions = () => {
    if (!selected) return
    updateMutation.mutate({ id: selected.id, data: { permissions } })
  }

  const isAdmin = selected?.permissions.includes('*')

  return (
    <div className="grid grid-cols-[220px_1fr] gap-4 min-h-[400px]">
      {/* Left: role list */}
      <div
        className="rounded-xl border flex flex-col"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}
      >
        <div className="flex items-center justify-between px-3 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wide">Roles</span>
          <button
            onClick={() => { setCreating(true); setSelected(null) }}
            className="p-1 rounded-md text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors"
            title="Nuevo rol"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {isLoading && <p className="text-xs text-[var(--text-3)] text-center py-6">Cargando...</p>}
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => selectRole(r)}
              className={cn(
                'w-full text-left px-3 py-2.5 transition-colors flex items-center gap-2 text-sm',
                selected?.id === r.id
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-1)]',
              )}
            >
              <Shield size={13} className="flex-shrink-0" />
              <span className="flex-1 truncate">{r.name}</span>
              {r.isSystem === 1 && (
                <span className="text-[9px] font-bold uppercase bg-[var(--accent-soft)] text-[var(--accent)] px-1 rounded">
                  sys
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Right: editor */}
      <div
        className="rounded-xl border flex flex-col"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}
      >
        {/* Create form */}
        {creating && (
          <div className="p-5 space-y-4 overflow-y-auto">
            <h4 className="text-sm font-semibold text-[var(--text-1)]">Nuevo rol</h4>
            <form
              onSubmit={createForm.handleSubmit((d) => {
                if (createPermissions.length === 0) { setCreatePermsError(true); return }
                setCreatePermsError(false)
                createMutation.mutate({ ...d, permissions: createPermissions })
              })}
              className="space-y-4"
            >
              <Field label="Nombre del rol" error={createForm.formState.errors.name?.message}>
                <input {...createForm.register('name')} placeholder="Ej: Contador" className={inputCls(!!createForm.formState.errors.name)} />
              </Field>
              <Field label="Descripción (opcional)">
                <input {...createForm.register('description')} placeholder="Descripción breve" className={inputCls(false)} />
              </Field>

              {/* Permission selector */}
              <div>
                <p className={cn('text-xs font-semibold uppercase tracking-wide mb-2', createPermsError ? 'text-red-400' : 'text-[var(--text-3)]')}>
                  Módulos con acceso *{createPermsError && <span className="ml-2 normal-case font-normal">Selecciona al menos un módulo</span>}
                </p>
                <div
                  className={cn('rounded-lg border p-3 space-y-0.5 max-h-52 overflow-y-auto', createPermsError ? 'border-red-400' : 'border-[var(--border)]')}
                  style={{ backgroundColor: 'var(--bg-surface)' }}
                >
                  {SYSTEM_MODULES.map((mod) => {
                    const checked = createPermissions.includes(mod.id)
                    return (
                      <label key={mod.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer hover:bg-[var(--bg-hover)] transition-colors">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setCreatePermissions((prev) =>
                              checked ? prev.filter((p) => p !== mod.id) : [...prev, mod.id],
                            )
                            setCreatePermsError(false)
                          }}
                          className="w-4 h-4 rounded accent-[var(--accent)]"
                        />
                        <span className="text-sm text-[var(--text-1)]">{mod.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {createMutation.isError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {(createMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al crear rol'}
                </p>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setCreating(false); setCreatePermissions([]); setCreatePermsError(false) }} className={secondaryBtn}>Cancelar</button>
                <button type="submit" disabled={createMutation.isPending} className={primaryBtn}>
                  {createMutation.isPending ? 'Creando...' : 'Crear rol'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Role editor */}
        {!creating && selected && (
          <div className="flex flex-col h-full">
            <div
              className="px-5 py-4 border-b flex items-start justify-between"
              style={{ borderColor: 'var(--border)' }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-[var(--text-1)]">{selected.name}</h4>
                  {selected.isSystem === 1 && (
                    <span className="text-[10px] font-bold uppercase bg-[var(--accent-soft)] text-[var(--accent)] px-1.5 py-0.5 rounded">
                      Sistema
                    </span>
                  )}
                </div>
                {selected.description && (
                  <p className="text-xs text-[var(--text-3)] mt-0.5">{selected.description}</p>
                )}
              </div>
              {selected.isSystem !== 1 && (
                confirmDeleteId === selected.id ? (
                  <div className="flex flex-col gap-1.5 items-end">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-2)]">¿Eliminar rol?</span>
                      <button
                        onClick={() => deleteMutation.mutate(selected.id)}
                        disabled={deleteMutation.isPending}
                        className="text-xs px-2.5 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                      >
                        {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
                      </button>
                      <button
                        onClick={() => { setConfirm(null); setDeleteError(null) }}
                        className="p-1 rounded-md text-[var(--text-3)] hover:bg-[var(--bg-hover)] transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {deleteError && (
                      <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">
                        {deleteError}
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => { setConfirm(selected.id); setDeleteError(null) }}
                    className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Eliminar rol"
                  >
                    <Trash2 size={14} />
                  </button>
                )
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {isAdmin ? (
                <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                  <ShieldCheck size={16} className="text-[var(--accent)]" />
                  Este rol tiene acceso total a todos los módulos.
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wide mb-3">
                    Módulos y acciones
                  </p>
                  <div className="space-y-0.5">
                    {SYSTEM_MODULES.map((mod) => {
                      const modChecked = permissions.includes(mod.id)
                      const locked     = selected.isSystem === 1
                      const hasActions = mod.actions && mod.actions.length > 0
                      return (
                        <div key={mod.id}>
                          {/* Module row */}
                          <label
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                              locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-[var(--bg-hover)]',
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={modChecked}
                              disabled={locked}
                              onChange={() => {
                                if (modChecked) {
                                  // Remove module + all its actions
                                  const actionIds = mod.actions?.map((a) => a.id) ?? []
                                  setPermissions((prev) => prev.filter((p) => p !== mod.id && !actionIds.includes(p)))
                                } else {
                                  setPermissions((prev) => [...prev, mod.id])
                                }
                                setDirty(true)
                              }}
                              className="w-4 h-4 rounded accent-[var(--accent)]"
                            />
                            <span className="text-sm font-medium text-[var(--text-1)]">{mod.label}</span>
                          </label>
                          {/* Action rows — shown only when module is enabled */}
                          {hasActions && modChecked && (
                            <div className="ml-7 mb-1 space-y-0.5">
                              {mod.actions!.map((action) => {
                                const actionChecked = permissions.includes(action.id)
                                return (
                                  <label
                                    key={action.id}
                                    className={cn(
                                      'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-xs',
                                      locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-[var(--bg-hover)]',
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={actionChecked}
                                      disabled={locked}
                                      onChange={() => togglePermission(action.id)}
                                      className="w-3.5 h-3.5 rounded accent-[var(--accent)]"
                                    />
                                    <span className="text-[var(--text-2)]">{action.label}</span>
                                    {actionChecked && !locked && (
                                      <Check size={10} className="ml-auto text-[var(--accent)]" />
                                    )}
                                  </label>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            {!isAdmin && selected.isSystem !== 1 && (
              <div
                className="px-5 py-3 border-t flex items-center justify-between gap-3"
                style={{ borderColor: 'var(--border)' }}
              >
                {updateMutation.isError && (
                  <p className="text-xs text-red-400">Error al guardar</p>
                )}
                {permissions.length === 0 && dirty && (
                  <p className="text-xs text-amber-500">El rol debe tener al menos un módulo asignado</p>
                )}
                {!updateMutation.isError && permissions.length > 0 && <span />}
                <button
                  onClick={savePermissions}
                  disabled={!dirty || updateMutation.isPending || permissions.length === 0}
                  className={cn(primaryBtn, 'disabled:opacity-40 disabled:cursor-not-allowed')}
                >
                  {updateMutation.isPending ? 'Guardando...' : 'Guardar permisos'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!creating && !selected && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-8">
            <Shield size={32} className="text-[var(--text-3)]" />
            <p className="text-sm text-[var(--text-2)]">Selecciona un rol para editar sus permisos</p>
            <p className="text-xs text-[var(--text-3)]">o crea uno nuevo con el botón +</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Shared micro-components                                             */
/* ------------------------------------------------------------------ */

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="text-xs font-medium text-[var(--text-2)] block mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}

function ActionBtn({
  icon,
  title,
  onClick,
  danger,
  loading,
}: {
  icon: React.ReactNode
  title: string
  onClick: () => void
  danger?: boolean
  loading?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title={title}
      className={cn(
        'p-1.5 rounded-md transition-colors disabled:opacity-40',
        danger
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-1)]',
      )}
    >
      {icon}
    </button>
  )
}

const inputCls = (hasError: boolean) =>
  cn(
    'w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors',
    'bg-[var(--bg-surface)] text-[var(--text-1)] placeholder:text-[var(--text-3)]',
    hasError
      ? 'border-red-500 focus:border-red-500'
      : 'border-[var(--border)] focus:border-[var(--accent)]',
  )

const primaryBtn =
  'flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity'

const secondaryBtn =
  'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-colors'

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

type Tab = 'usuarios' | 'roles'

export function UsuariosPage() {
  const [tab, setTab] = useState<Tab>('usuarios')

  return (
    <div className="p-6 space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        {([
          { id: 'usuarios', label: 'Usuarios', icon: <Users size={14} /> },
          { id: 'roles',    label: 'Roles',    icon: <Shield size={14} /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === id
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-1)]',
            )}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'usuarios' ? <UsuariosTab /> : <RolesTab />}
    </div>
  )
}
