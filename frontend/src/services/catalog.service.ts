import { api } from './api'
import type { CatalogItem } from '@/types/catalog.types'

export const catalogService = {
  getByType: (type: string) =>
    api
      .get<{ success: boolean; data: CatalogItem[] }>(`/catalogs/${type}`)
      .then((r) => r.data.data),

  create: (data: { type: string; value: string; description?: string }) =>
    api
      .post<{ success: boolean; data: CatalogItem }>('/catalogs', data)
      .then((r) => r.data.data),

  update: (id: string, data: { value: string; description?: string }) =>
    api
      .put<{ success: boolean; data: CatalogItem }>(`/catalogs/${id}`, data)
      .then((r) => r.data.data),

  delete: (id: string) =>
    api.delete(`/catalogs/${id}`).then((r) => r.data),
}
