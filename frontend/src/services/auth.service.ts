import { api } from './api'

interface LoginPayload {
  username: string
  password: string
}

interface LoginResponse {
  success: boolean
  data: {
    token: string
    user: {
      id: string
      username: string
      nombre: string
      email: string
      role: string
      roleId?: string
      permissions: string[]
    }
  }
}

export const authService = {
  login: (payload: LoginPayload) =>
    api.post<LoginResponse>('/auth/login', payload).then((r) => r.data.data),

  register: (payload: {
    username: string
    email: string
    password: string
    confirmPassword: string
  }) => api.post('/auth/register', payload).then((r) => r.data),

  changePassword: (payload: {
    oldPassword: string
    newPassword: string
    confirmPassword: string
  }) => api.post('/auth/change-password', payload).then((r) => r.data),
}
