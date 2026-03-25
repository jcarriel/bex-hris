import { api } from './api'

export interface DashboardStats {
  totalEmployees: number
  newThisMonth: number
  pendingLeaves: number
  payrollSum: number
  expiringContracts: number
  byDepartment: { name: string; value: number }[]
  recentEmployees: {
    id: string
    firstName: string
    lastName: string
    status: string
    positionName: string
    departmentName: string
  }[]
  recentActivity: {
    action: string
    entityType: string
    createdAt: string
    userName: string
  }[]
}

export const dashboardService = {
  getStats: () =>
    api.get<{ success: boolean; data: DashboardStats }>('/dashboard/stats').then((r) => r.data.data),
}
