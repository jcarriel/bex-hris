import { api } from './api'

export type LockerStatus = 'available' | 'occupied' | 'maintenance'

export interface Locker {
  id: string
  number: string
  section: string
  status: LockerStatus
  employeeId?: string | null
  employeeName?: string | null
  employeePosition?: string | null
  assignedDate?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface LockerStats {
  total: number
  available: number
  occupied: number
  maintenance: number
}

export const lockersService = {
  getAll: (): Promise<Locker[]> =>
    api.get<{ success: boolean; data: Locker[] }>('/lockers').then((r) => r.data.data),

  getStats: (): Promise<LockerStats> =>
    api.get<{ success: boolean; data: LockerStats }>('/lockers/stats').then((r) => r.data.data),

  getSections: (): Promise<string[]> =>
    api.get<{ success: boolean; data: string[] }>('/lockers/sections').then((r) => r.data.data),

  create: (data: {
    number: string
    section: string
    status?: LockerStatus
    employeeId?: string | null
    notes?: string | null
  }): Promise<Locker> =>
    api.post<{ success: boolean; data: Locker }>('/lockers', data).then((r) => r.data.data),

  update: (id: string, data: Partial<Locker>): Promise<Locker> =>
    api.put<{ success: boolean; data: Locker }>(`/lockers/${id}`, data).then((r) => r.data.data),

  delete: (id: string): Promise<void> =>
    api.delete(`/lockers/${id}`).then(() => undefined),
}
