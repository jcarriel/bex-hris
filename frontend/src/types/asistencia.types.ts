export interface Marcacion {
  id: string
  empleadoId: string
  fecha: string
  entrada?: string // "08:00"
  salida?: string
  estado: 'presente' | 'ausente' | 'tardanza' | 'justificado'
}

export interface ResumenAsistencia {
  fecha: string
  totalEmpleados: number
  presentes: number
  ausentes: number
  tardanzas: number
  justificados: number
}
