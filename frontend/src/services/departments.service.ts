import { api } from './api'
import type { Department } from '@/types/department.types'

export const departmentsService = {
  getAll: () =>
    api
      .get<{ success: boolean; data: Department[] }>('/departments')
      .then((r) => r.data.data),

  create: (data: Omit<Department, 'id' | 'createdAt'>) =>
    api
      .post<{ success: boolean; data: Department }>('/departments', data)
      .then((r) => r.data.data),

  update: (id: string, data: Partial<Department>) =>
    api
      .put<{ success: boolean; data: Department }>(`/departments/${id}`, data)
      .then((r) => r.data.data),

  delete: (id: string) => api.delete(`/departments/${id}`).then((r) => r.data),
}
