import { api } from './api'

export interface MaestroGeneral {
  id: string
  tipoTrabajadorId: string | null
  tipoTrabajador: string  // valor del catálogo, desde JOIN
  fechaIngreso: string | null
  semanaIngreso: number | null
  apellidos: string
  nombres: string
  cedula: string
  centroDeCostoId: string | null
  centroDeCosto: string   // nombre, desde JOIN con departments
  laborId: string | null
  labor: string           // nombre, desde JOIN con labors
  fechaNacimiento: string | null
  tituloBachiller: string
  semanaSalida: number | null
  fechaSalida: string | null
  estado: string
  observacion: string | null
  createdAt: string
  updatedAt: string
}

interface GetMaestroParams {
  search?: string
  estado?: string
  centroDeCosto?: string
  labor?: string
  tipoTrabajador?: string
}

// El form envía nombres (centroDeCosto, labor); el backend resuelve los IDs
export interface MaestroGeneralFormData {
  tipoTrabajador: string  // value del catálogo tipo_trabajador → backend resuelve a tipoTrabajadorId
  fechaIngreso: string | null
  semanaIngreso: number | null
  apellidos: string
  nombres: string | null
  cedula: string
  centroDeCosto: string  // nombre → backend resuelve a centroDeCostoId
  labor: string          // nombre → backend resuelve a laborId
  fechaNacimiento: string | null
  tituloBachiller: string
  semanaSalida: number | null
  fechaSalida: string | null
  estado: string
  observacion?: string | null
}

export const maestroGeneralService = {
  getAll: (params?: GetMaestroParams): Promise<MaestroGeneral[]> =>
    api.get<{ success: boolean; data: MaestroGeneral[] }>('/maestro-general', { params })
      .then((r) => r.data.data),

  create: (data: MaestroGeneralFormData): Promise<MaestroGeneral> =>
    api.post<{ success: boolean; data: MaestroGeneral }>('/maestro-general', data)
      .then((r) => r.data.data),

  update: (id: string, data: MaestroGeneralFormData): Promise<MaestroGeneral> =>
    api.put<{ success: boolean; data: MaestroGeneral }>(`/maestro-general/${id}`, data)
      .then((r) => r.data.data),

  delete: (id: string): Promise<void> =>
    api.delete(`/maestro-general/${id}`).then(() => undefined),
}
