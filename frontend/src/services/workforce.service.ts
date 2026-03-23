import { api } from './api'

export interface Sector {
  name: string
  hectareas: number
}

export interface LaborEntry {
  name: string
  counts: number[] // one value per sector index
}

export interface WorkforceData {
  sectors: Sector[]
  labors: LaborEntry[]
}

export interface WorkforceReport {
  id: string
  week: number
  year: number
  department: string
  cajas_realizadas: number | null
  dias_proceso: number | null
  data?: WorkforceData
  created_by: string
  created_at: string
  updated_at: string
}

export const workforceService = {
  getAll: (year?: number): Promise<WorkforceReport[]> =>
    api
      .get<{ success: boolean; data: WorkforceReport[] }>('/workforce', {
        params: year ? { year } : {},
      })
      .then((r) => r.data.data),

  getById: (id: string): Promise<WorkforceReport> =>
    api
      .get<{ success: boolean; data: WorkforceReport }>(`/workforce/${id}`)
      .then((r) => r.data.data),

  create: (payload: {
    week: number
    year: number
    department?: string
    cajas_realizadas?: number | null
    dias_proceso?: number | null
    data: WorkforceData
  }): Promise<WorkforceReport> =>
    api
      .post<{ success: boolean; data: WorkforceReport }>('/workforce', payload)
      .then((r) => r.data.data),

  update: (
    id: string,
    payload: Partial<{
      week: number
      year: number
      department: string
      cajas_realizadas: number | null
      dias_proceso: number | null
      data: WorkforceData
    }>,
  ): Promise<WorkforceReport> =>
    api
      .put<{ success: boolean; data: WorkforceReport }>(`/workforce/${id}`, payload)
      .then((r) => r.data.data),

  delete: (id: string): Promise<void> =>
    api.delete(`/workforce/${id}`).then(() => undefined),
}
