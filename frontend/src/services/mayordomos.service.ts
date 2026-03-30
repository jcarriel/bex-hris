import { api } from './api'

export interface AssignedEmployee {
  id: string
  firstName: string
  lastName: string
  positionName?: string
  mayordomoId: string
}

export interface Mayordomo {
  id: string
  employeeId: string
  employeeName?: string
  employeePosition?: string
  notes?: string | null
  assignedEmployees: AssignedEmployee[]
  createdAt: string
  updatedAt: string
}

const unwrap = <T>(p: Promise<{ data: { success: boolean; data: T } }>) => p.then((r) => r.data.data)

export const mayordomosService = {
  getAll: (): Promise<Mayordomo[]> =>
    unwrap(api.get('/mayordomos')),

  create: (payload: { employeeId: string; notes?: string }): Promise<Mayordomo> =>
    unwrap(api.post('/mayordomos', payload)),

  update: (id: string, payload: { notes?: string | null }): Promise<Mayordomo> =>
    unwrap(api.put(`/mayordomos/${id}`, payload)),

  delete: (id: string): Promise<void> =>
    api.delete(`/mayordomos/${id}`).then(() => undefined),

  assignEmployee: (mayordomoId: string, employeeId: string): Promise<Mayordomo> =>
    unwrap(api.post(`/mayordomos/${mayordomoId}/employees`, { employeeId })),

  removeEmployee: (employeeId: string): Promise<void> =>
    api.delete(`/mayordomos/employees/${employeeId}`).then(() => undefined),
}
