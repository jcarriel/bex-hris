export interface Role {
  id: string
  name: string
  description?: string
  permissions: string[]   // module IDs and/or action strings like 'module:action'
  isSystem: number
  createdAt?: string
  updatedAt?: string
}

export interface SystemModuleAction {
  id: string    // e.g. 'empleados:crear'
  label: string
}

export interface SystemModule {
  id: string
  label: string
  actions?: SystemModuleAction[]
}

export const SYSTEM_MODULES: SystemModule[] = [
  { id: 'dashboard', label: 'Dashboard' },
  {
    id: 'empleados', label: 'Empleados',
    actions: [
      { id: 'empleados:ver',       label: 'Ver detalle' },
      { id: 'empleados:crear',     label: 'Crear' },
      { id: 'empleados:editar',    label: 'Editar' },
      { id: 'empleados:eliminar',  label: 'Eliminar' },
      { id: 'empleados:ver_todos', label: 'Ver todos' },
    ],
  },
  {
    id: 'nomina', label: 'Nómina / Payroll',
    actions: [
      { id: 'nomina:eliminar',  label: 'Eliminar' },
      { id: 'nomina:ver_todos', label: 'Ver todos' },
    ],
  },
  {
    id: 'asistencia', label: 'Asistencia y Horarios',
    actions: [
      { id: 'asistencia:eliminar',  label: 'Eliminar' },
      { id: 'asistencia:ver_todos', label: 'Ver todos' },
    ],
  },
  {
    id: 'eventos', label: 'Eventos y Calendario',
    actions: [
      { id: 'eventos:ver_todos', label: 'Ver todos' },
    ],
  },
  {
    id: 'tareas', label: 'Tareas',
    actions: [
      { id: 'tareas:crear',     label: 'Crear' },
      { id: 'tareas:eliminar',  label: 'Eliminar' },
      { id: 'tareas:ver_todos', label: 'Ver todos' },
    ],
  },
  { id: 'reclutamiento', label: 'Reclutamiento' },
  {
    id: 'fuerza-laboral', label: 'Fuerza Laboral',
    actions: [
      { id: 'fuerza-laboral:crear',    label: 'Crear' },
      { id: 'fuerza-laboral:editar',   label: 'Editar' },
      { id: 'fuerza-laboral:eliminar', label: 'Eliminar' },
    ],
  },
  {
    id: 'bienestar', label: 'Bienestar',
    actions: [
      { id: 'bienestar:crear',     label: 'Crear' },
      { id: 'bienestar:editar',    label: 'Editar' },
      { id: 'bienestar:eliminar',  label: 'Eliminar' },
      { id: 'bienestar:aprobar',   label: 'Aprobar solicitudes' },
      { id: 'bienestar:ver_todos', label: 'Ver todos' },
    ],
  },
  {
    id: 'casilleros', label: 'Casilleros',
    actions: [
      { id: 'casilleros:crear',     label: 'Crear' },
      { id: 'casilleros:editar',    label: 'Editar' },
      { id: 'casilleros:eliminar',  label: 'Eliminar' },
      { id: 'casilleros:ver_todos', label: 'Ver todos' },
    ],
  },
  {
    id: 'mayordomos', label: 'Mayordomos',
    actions: [
      { id: 'mayordomos:crear',    label: 'Crear' },
      { id: 'mayordomos:eliminar', label: 'Eliminar' },
    ],
  },
  {
    id: 'carga-masiva', label: 'Carga Masiva',
    actions: [
      { id: 'carga-masiva:crear', label: 'Ejecutar importación' },
    ],
  },
  {
    id: 'tablas', label: 'Maestros',
    actions: [
      { id: 'tablas:crear',    label: 'Crear' },
      { id: 'tablas:editar',   label: 'Editar' },
      { id: 'tablas:eliminar', label: 'Eliminar' },
    ],
  },
  { id: 'configuracion', label: 'Configuración' },
]
