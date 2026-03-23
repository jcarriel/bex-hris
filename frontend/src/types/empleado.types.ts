export interface Empleado {
  id: string
  firstName: string
  lastName: string
  email?: string
  cedula: string
  departmentId: string
  positionId: string
  laborId?: string
  managerId?: string
  // Joined names (returned by getById)
  departmentName?: string
  positionName?: string
  laborName?: string
  // Personal
  phone?: string
  dateOfBirth?: string
  genero?: 'M' | 'F' | 'O'
  estadoCivil?: string
  estadoCivilId?: string
  procedencia?: string
  direccion?: string
  passport?: string
  profilePhoto?: string
  // Employment
  hireDate?: string
  contratoTipo?: string
  contratoTipoId?: string
  contratoActual?: string
  contratoActualId?: string
  contractEndDate?: string
  status: 'active' | 'inactive' | 'on_leave' | 'terminated'
  baseSalary: number
  bankAccount?: string
  bankName?: string
  accountType?: string
  hijos?: number
  nivelAcademico?: string
  especialidad?: string
  afiliacion?: string
  afiliacionId?: string
  terminationDate?: string
  terminationReason?: string
  createdAt?: string
  updatedAt?: string
}

export interface EmpleadoFiltros {
  page?: number
  limit?: number
  departmentId?: string
  positionId?: string
  laborId?: string
  status?: Empleado['status']
  search?: string
}

export interface EmpleadosApiResponse {
  success: boolean
  data: {
    data: Empleado[]
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface EmpleadoFormData {
  firstName: string
  lastName: string
  email?: string
  cedula: string
  departmentId: string
  positionId: string
  baseSalary: number
  phone?: string
  genero?: 'M' | 'F' | 'O'
  hireDate?: string
  contratoTipo?: string
  contratoTipoId?: string
  contratoActual?: string
  contratoActualId?: string
  status?: 'active' | 'inactive' | 'on_leave' | 'terminated'
  direccion?: string
  dateOfBirth?: string
  estadoCivil?: string
  estadoCivilId?: string
  procedencia?: string
  bankAccount?: string
  bankName?: string
  accountType?: string
  hijos?: number
  nivelAcademico?: string
  especialidad?: string
  afiliacion?: string
  afiliacionId?: string
}
