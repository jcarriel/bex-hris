import { api } from './api'
import type { Position } from '@/types/position.types'

export const positionsService = {
  getAll: (departmentId?: string) =>
    api
      .get<{ success: boolean; data: Position[] }>('/positions', {
        params: departmentId ? { departmentId } : undefined,
      })
      .then((r) => r.data.data),

  create: (data: Omit<Position, 'id' | 'createdAt'>) =>
    api
      .post<{ success: boolean; data: Position }>('/positions', data)
      .then((r) => r.data.data),

  update: (id: string, data: Partial<Position>) =>
    api
      .put<{ success: boolean; data: Position }>(`/positions/${id}`, data)
      .then((r) => r.data.data),

  delete: (id: string) => api.delete(`/positions/${id}`).then((r) => r.data),
}
