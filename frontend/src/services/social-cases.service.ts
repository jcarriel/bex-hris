import { api } from './api'

export type SocialCaseType =
  | 'asistencia_medica'
  | 'asistencia_economica'
  | 'visita_domiciliaria'
  | 'consejeria'
  | 'permiso_especial'
  | 'otro'

export type SocialCaseStatus = 'open' | 'in_progress' | 'closed'

export interface SocialCase {
  id: string
  employeeId: string
  type: SocialCaseType
  title: string
  description?: string
  date: string
  status: SocialCaseStatus
  resolution?: string
  resolvedDate?: string
  resolvedBy?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export const socialCasesService = {
  getAll: (): Promise<SocialCase[]> =>
    api.get<{ success: boolean; data: SocialCase[] }>('/social-cases').then((r) => r.data.data),

  getByEmployee: (employeeId: string): Promise<SocialCase[]> =>
    api.get<{ success: boolean; data: SocialCase[] }>(`/social-cases/employee/${employeeId}`).then((r) => r.data.data),

  create: (payload: Pick<SocialCase, 'employeeId' | 'type' | 'title' | 'description' | 'date'>): Promise<SocialCase> =>
    api.post<{ success: boolean; data: SocialCase }>('/social-cases', payload).then((r) => r.data.data),

  update: (id: string, payload: Partial<SocialCase>): Promise<SocialCase> =>
    api.put<{ success: boolean; data: SocialCase }>(`/social-cases/${id}`, payload).then((r) => r.data.data),

  delete: (id: string): Promise<void> =>
    api.delete(`/social-cases/${id}`).then(() => undefined),
}
