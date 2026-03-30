import { api } from './api'

export interface Leave {
  id: string
  employeeId: string
  type: 'vacation' | 'medical' | 'maternity' | 'personal' | 'ausentismo' | 'permiso' | 'paternidad'
  startDate: string
  endDate: string
  days: number
  status: 'pending' | 'approved' | 'rejected'
  reason?: string
  submittedBy?: string
  submittedByName?: string
  approvedBy?: string
  approvedByName?: string
  approvedDate?: string
  createdAt: string
  updatedAt: string
}

export const leavesService = {
  getAll: (): Promise<Leave[]> =>
    api.get<{ success: boolean; data: Leave[] }>('/leaves').then((r) => r.data.data),

  getByEmployee: (employeeId: string): Promise<Leave[]> =>
    api.get<{ success: boolean; data: Leave[] }>(`/leaves/${employeeId}`).then((r) => r.data.data),

  getPending: (): Promise<Leave[]> =>
    api.get<{ success: boolean; data: Leave[] }>('/leaves/pending').then((r) => r.data.data),

  create: (payload: Omit<Leave, 'id' | 'status' | 'submittedBy' | 'submittedByName' | 'approvedBy' | 'approvedByName' | 'approvedDate' | 'createdAt' | 'updatedAt'>): Promise<Leave> =>
    api.post<{ success: boolean; data: Leave }>('/leaves', payload).then((r) => r.data.data),

  approve: (id: string): Promise<Leave> =>
    api.post<{ success: boolean; data: Leave }>(`/leaves/${id}/approve`, {}).then((r) => r.data.data),

  reject: (id: string): Promise<Leave> =>
    api.post<{ success: boolean; data: Leave }>(`/leaves/${id}/reject`, {}).then((r) => r.data.data),

  update: (id: string, payload: Partial<Leave>): Promise<Leave> =>
    api.put<{ success: boolean; data: Leave }>(`/leaves/${id}`, payload).then((r) => r.data.data),

  delete: (id: string): Promise<void> =>
    api.delete(`/leaves/${id}`).then(() => undefined),

  getBalance: (employeeId: string): Promise<{ accrued: number; used: number; available: number }> =>
    api.get<{ success: boolean; data: { accrued: number; used: number; available: number } }>(`/leaves/balance/${employeeId}`).then((r) => r.data.data),
}
