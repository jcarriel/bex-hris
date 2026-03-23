import { api } from './api'

export interface Marcacion {
  id: string
  cedula: string
  employeeName: string
  department: string
  departmentId?: string
  positionId?: string
  month: number
  date: string
  dailyAttendance: string
  firstCheckIn?: string
  lastCheckOut?: string
  totalTime?: string
  createdAt: string
  updatedAt: string
}

export interface PeriodOption {
  label: string
  startDate: string
  endDate: string
  month: number
}

export interface ScheduleConfig {
  id: string
  departmentId: string
  departmentName?: string
  positionId?: string
  workHours: number
  entryTimeMin: string
  entryTimeMax: string
  exitTimeMin: string
  exitTimeMax: string
  totalTimeMin: number
  totalTimeMax: number
}

export const marcacionService = {
  getPeriods: () =>
    api.get<{ success: boolean; data: PeriodOption[] }>('/marcacion/periods')
      .then((r) => r.data.data),

  getByPeriod: (startDate: string, endDate: string) =>
    api.get<{ success: boolean; data: Marcacion[] }>('/marcacion/period/data', {
      params: { startDate, endDate },
    }).then((r) => r.data.data),

  deleteByPeriod: (startDate: string, endDate: string) =>
    api.delete('/marcacion/period', { params: { startDate, endDate } }).then((r) => r.data),

  getSchedules: () =>
    api.get<{ success: boolean; data: ScheduleConfig[] }>('/department-schedules')
      .then((r) => r.data.data),

  createSchedule: (data: Omit<ScheduleConfig, 'id' | 'departmentName'>) =>
    api.post<{ success: boolean; data: ScheduleConfig }>('/department-schedules', data)
      .then((r) => r.data.data),

  updateSchedule: (id: string, data: Partial<Omit<ScheduleConfig, 'id' | 'departmentName'>>) =>
    api.put<{ success: boolean; data: ScheduleConfig }>(`/department-schedules/${id}`, data)
      .then((r) => r.data.data),

  deleteSchedule: (id: string) =>
    api.delete(`/department-schedules/${id}`).then((r) => r.data),
}
