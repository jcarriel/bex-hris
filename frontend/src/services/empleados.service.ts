import { api } from './api'
import type { Empleado, EmpleadoFiltros, EmpleadosApiResponse, EmpleadoFormData } from '@/types/empleado.types'

export const empleadosService = {
  getAll: (filtros?: EmpleadoFiltros) =>
    api
      .get<EmpleadosApiResponse>('/employees', { params: filtros })
      .then((r) => r.data.data),

  getById: (id: string) =>
    api.get<{ success: boolean; data: Empleado }>(`/employees/${id}`).then((r) => r.data.data),

  getCount: () =>
    api.get<{ success: boolean; data: number }>('/employees/count').then((r) => r.data.data),

  create: (data: EmpleadoFormData) =>
    api
      .post<{ success: boolean; data: Empleado }>('/employees', data)
      .then((r) => r.data.data),

  update: (id: string, data: Partial<EmpleadoFormData>) =>
    api
      .put<{ success: boolean; data: Empleado }>(`/employees/${id}`, data)
      .then((r) => r.data.data),

  delete: (id: string) =>
    api.delete(`/employees/${id}`).then((r) => r.data),

  terminate: (id: string, payload: { terminationDate: string; reason: string }) =>
    api
      .post<{ success: boolean; data: Empleado }>(`/employees/${id}/terminate`, payload)
      .then((r) => r.data.data),

  getExpiringContracts: (days = 30) =>
    api
      .get<{ success: boolean; data: Empleado[] }>('/employees/contracts/expiring', {
        params: { days },
      })
      .then((r) => r.data.data),
}
