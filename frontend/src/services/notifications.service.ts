import { api } from './api'

export interface AppNotification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  read: number
  createdAt: string
  updatedAt: string
}

export const notificationsService = {
  getAll: (limit = 30) =>
    api.get<{ success: boolean; data: AppNotification[] }>('/notifications', { params: { limit } })
      .then((r) => r.data.data),

  getUnreadCount: () =>
    api.get<{ success: boolean; data: { count: number } }>('/notifications/unread-count')
      .then((r) => r.data.data.count),

  markRead: (id: string) =>
    api.put(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () =>
    api.put('/notifications/read-all').then((r) => r.data),
}
