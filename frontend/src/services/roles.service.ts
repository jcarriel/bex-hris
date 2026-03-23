import { api } from './api'
import type { Role } from '@/types/role.types'

export const rolesService = {
  getAll: () =>
    api.get<{ success: boolean; data: Role[] }>('/roles').then((r) => r.data.data),

  create: (data: { name: string; description?: string; permissions: string[] }) =>
    api.post<{ success: boolean; data: Role }>('/roles', data).then((r) => r.data.data),

  update: (id: string, data: { name?: string; description?: string; permissions?: string[] }) =>
    api.put<{ success: boolean; data: Role }>(`/roles/${id}`, data).then((r) => r.data.data),

  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/roles/${id}`).then((r) => r.data),
}
