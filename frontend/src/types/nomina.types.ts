export interface PeriodoNomina {
  id: string
  periodo: string // "2026-03"
  estado: 'borrador' | 'procesado' | 'pagado'
  totalBruto: number
  totalDescuentos: number
  totalNeto: number
  empleadosIncluidos: number
  fechaProcesamiento?: string
}

export interface DetalleNomina {
  empleadoId: string
  nombreEmpleado: string
  cargo: string
  salarioBase: number
  bonificaciones: number
  descuentos: number
  neto: number
}
