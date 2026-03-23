import { api } from './api'

export interface Labor {
  id: string
  name: string
  description?: string
  positionId: string
  createdAt?: string
  updatedAt?: string
}

export const laborsService = {
  getAll: (positionId?: string) =>
    api
      .get<{ success: boolean; data: Labor[] }>('/labors', {
        params: positionId ? { positionId } : undefined,
      })
      .then((r) => r.data.data),

  create: (data: { name: string; positionId: string; description?: string }) =>
    api
      .post<{ success: boolean; data: Labor }>('/labors', data)
      .then((r) => r.data.data),

  update: (id: string, data: Partial<Labor>) =>
    api
      .put<{ success: boolean; data: Labor }>(`/labors/${id}`, data)
      .then((r) => r.data.data),

  delete: (id: string) => api.delete(`/labors/${id}`).then((r) => r.data),
}
