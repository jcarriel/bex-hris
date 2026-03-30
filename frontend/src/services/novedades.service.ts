import { api } from './api'

export type NovedadType = 'revision_nomina' | 'reclamo' | 'solicitud' | 'otro'
export type NovedadStatus = 'pending' | 'in_progress' | 'resolved'

export interface Novedad {
  id: string
  employeeId: string
  type: NovedadType
  description: string
  date: string
  status: NovedadStatus
  response?: string
  respondedBy?: string
  respondedDate?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

const BASE = '/novedades'

export const novedadesService = {
  getAll: (): Promise<Novedad[]> =>
    api.get<{ success: boolean; data: Novedad[] }>(BASE).then((r) => r.data.data),

  getByEmployee: (employeeId: string): Promise<Novedad[]> =>
    api.get<{ success: boolean; data: Novedad[] }>(`${BASE}/employee/${employeeId}`).then((r) => r.data.data),

  create: (data: { employeeId: string; type: NovedadType; description: string; date?: string }): Promise<Novedad> =>
    api.post<{ success: boolean; data: Novedad }>(BASE, data).then((r) => r.data.data),

  update: (id: string, data: { status?: NovedadStatus; response?: string }): Promise<Novedad> =>
    api.put<{ success: boolean; data: Novedad }>(`${BASE}/${id}`, data).then((r) => r.data.data),

  delete: (id: string): Promise<void> =>
    api.delete(`${BASE}/${id}`).then(() => undefined),
}
