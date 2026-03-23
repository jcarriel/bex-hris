import { api } from './api'

export type TaskStatus = 'pending' | 'in_progress' | 'paused' | 'completed' | 'rejected'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  title: string
  description?: string
  completionNotes?: string
  dueDate: string
  status: TaskStatus
  priority: TaskPriority
  assignedTo?: string
  assigneeName?: string
  createdBy?: string
  creatorName?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export interface TaskComment {
  id: string
  taskId: string
  userId: string
  userName: string
  comment: string
  action?: string
  createdAt: string
}

export interface CreateTaskDto {
  title: string
  description?: string
  dueDate: string
  priority?: TaskPriority
  assignedTo?: string
}

export const tasksService = {
  getAll: (params?: { status?: string; assignedTo?: string; createdBy?: string }) =>
    api.get<{ success: boolean; data: Task[] }>('/tasks', { params }).then((r) => r.data.data),

  getMyTasks: () =>
    api.get<{ success: boolean; data: Task[] }>('/tasks/my').then((r) => r.data.data),

  getStats: () =>
    api.get<{ success: boolean; data: Record<string, number> }>('/tasks/stats').then((r) => r.data.data),

  getById: (id: string) =>
    api.get<{ success: boolean; data: Task }>(`/tasks/${id}`).then((r) => r.data.data),

  create: (data: CreateTaskDto) =>
    api.post<{ success: boolean; data: Task }>('/tasks', data).then((r) => r.data.data),

  update: (id: string, data: Partial<CreateTaskDto>) =>
    api.put<{ success: boolean; data: Task }>(`/tasks/${id}`, data).then((r) => r.data.data),

  changeStatus: (id: string, status: TaskStatus, comment?: string) =>
    api.put<{ success: boolean; data: Task }>(`/tasks/${id}/status`, { status, comment }).then((r) => r.data.data),

  reassign: (id: string, assignedTo: string) =>
    api.put<{ success: boolean; data: Task }>(`/tasks/${id}/reassign`, { assignedTo }).then((r) => r.data.data),

  delete: (id: string) =>
    api.delete(`/tasks/${id}`).then((r) => r.data),

  getComments: (id: string) =>
    api.get<{ success: boolean; data: TaskComment[] }>(`/tasks/${id}/comments`).then((r) => r.data.data),

  addComment: (id: string, comment: string) =>
    api.post<{ success: boolean; data: TaskComment }>(`/tasks/${id}/comments`, { comment }).then((r) => r.data.data),
}
