import { api } from './api'

export interface Leave {
  id: string
  employeeId: string
  type: 'vacation' | 'medical' | 'maternity' | 'personal' | 'unpaid'
  startDate: string
  endDate: string
  days: number
  status: 'pending' | 'approved' | 'rejected'
  reason?: string
  approvedBy?: string
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

  create: (payload: Omit<Leave, 'id' | 'status' | 'approvedBy' | 'approvedDate' | 'createdAt' | 'updatedAt'>): Promise<Leave> =>
    api.post<{ success: boolean; data: Leave }>('/leaves', payload).then((r) => r.data.data),

  approve: (id: string): Promise<Leave> =>
    api.post<{ success: boolean; data: Leave }>(`/leaves/${id}/approve`, {}).then((r) => r.data.data),

  reject: (id: string): Promise<Leave> =>
    api.post<{ success: boolean; data: Leave }>(`/leaves/${id}/reject`, {}).then((r) => r.data.data),

  update: (id: string, payload: Partial<Leave>): Promise<Leave> =>
    api.put<{ success: boolean; data: Leave }>(`/leaves/${id}`, payload).then((r) => r.data.data),

  delete: (id: string): Promise<void> =>
    api.delete(`/leaves/${id}`).then(() => undefined),
}
