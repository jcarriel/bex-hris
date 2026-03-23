import { api } from './api'

export type EventType = 'birthday' | 'contract_expiry' | 'training' | 'audit' | 'meeting' | 'other'

export interface CalendarEvent {
  id: string
  type: EventType
  title: string
  description?: string
  eventDate: string        // YYYY-MM-DD
  employeeId?: string
  employeeName?: string
  daysNotice: number
  isAuto?: boolean
  daysAway?: number
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateEventDto {
  type: EventType
  title: string
  description?: string
  eventDate: string
  employeeId?: string
  daysNotice?: number
}

export const eventsService = {
  getAll: (params?: { type?: string; startDate?: string; endDate?: string }) =>
    api.get<{ success: boolean; data: CalendarEvent[] }>('/events', { params })
      .then((r) => r.data.data),

  getUpcoming: (days = 30) =>
    api.get<{ success: boolean; data: CalendarEvent[] }>('/events/upcoming', { params: { days } })
      .then((r) => r.data.data),

  create: (data: CreateEventDto) =>
    api.post<{ success: boolean; data: CalendarEvent }>('/events', data)
      .then((r) => r.data.data),

  update: (id: string, data: Partial<CreateEventDto>) =>
    api.put<{ success: boolean; data: CalendarEvent }>(`/events/${id}`, data)
      .then((r) => r.data.data),

  delete: (id: string) =>
    api.delete(`/events/${id}`).then((r) => r.data),

  sendDigest: () =>
    api.post<{ success: boolean; message: string }>('/events/send-digest')
      .then((r) => r.data),

  getConfigs: () =>
    api.get<{ success: boolean; data: EventTypeConfig[] }>('/event-configs')
      .then((r) => r.data.data),

  updateConfig: (type: string, daysNotice: number, enabled: boolean) =>
    api.put<{ success: boolean; data: EventTypeConfig }>(`/event-configs/${type}`, { daysNotice, enabled })
      .then((r) => r.data.data),
}

export interface EventTypeConfig {
  type: string
  daysNotice: number
  enabled: boolean
  updatedAt: string
}
