import { api } from './api'

export interface AdminUser {
  id: string
  username: string
  nombre?: string
  email: string
  role: string
  roleId?: string
  roleName?: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface CreateUserData {
  nombre: string
  username: string
  email: string
  roleId?: string
}

export interface UpdateUserData {
  nombre?: string
  email?: string
  roleId?: string
  status?: string
}

export const usersService = {
  getAll: () =>
    api.get<{ success: boolean; data: AdminUser[] }>('/admin/users').then((r) => r.data.data),

  create: (data: CreateUserData) =>
    api
      .post<{ success: boolean; data: AdminUser & { plainPassword: string; emailSent: boolean }; message: string }>(
        '/admin/users', data
      )
      .then((r) => r.data),

  update: (id: string, data: UpdateUserData) =>
    api.put<{ success: boolean; data: AdminUser }>(`/admin/users/${id}`, data).then((r) => r.data.data),

  delete: (id: string) =>
    api.delete(`/admin/users/${id}`).then((r) => r.data),

  resetPassword: (id: string) =>
    api
      .post<{ success: boolean; data: { plainPassword: string; emailSent: boolean }; message: string }>(
        `/admin/users/${id}/reset-password`
      )
      .then((r) => r.data),
}
