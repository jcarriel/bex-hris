export interface Role {
  id: string
  name: string
  description?: string
  permissions: string[]   // module IDs or ['*']
  isSystem: number
  createdAt?: string
  updatedAt?: string
}

export interface SystemModule {
  id: string
  label: string
}

export const SYSTEM_MODULES: SystemModule[] = [
  { id: 'dashboard',     label: 'Dashboard' },
  { id: 'empleados',     label: 'Empleados' },
  { id: 'nomina',        label: 'Nómina / Payroll' },
  { id: 'asistencia',    label: 'Asistencia y Horarios' },
  { id: 'eventos',       label: 'Eventos y Calendario' },
  { id: 'tareas',        label: 'Tareas' },
  { id: 'reclutamiento', label: 'Reclutamiento' },
  { id: 'fuerza-laboral', label: 'Fuerza Laboral' },
  { id: 'bienestar',     label: 'Bienestar' },
  { id: 'carga-masiva',  label: 'Carga Masiva' },
  { id: 'tablas',        label: 'Maestros' },
  { id: 'configuracion', label: 'Configuración' },
  { id: 'usuarios',      label: 'Usuarios' },
]
