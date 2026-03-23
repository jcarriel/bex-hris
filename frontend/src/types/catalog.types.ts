export interface CatalogItem {
  id: string
  type: string
  value: string
  description?: string
  createdAt?: string
  updatedAt?: string
}

export type CatalogType =
  | 'estado_civil'
  | 'banco'
  | 'tipo_contrato'
  | 'contrato_actual'
  | 'afiliacion'
