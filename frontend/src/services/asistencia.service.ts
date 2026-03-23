import { api } from './api'
import type { Marcacion, ResumenAsistencia } from '@/types/asistencia.types'

export const asistenciaService = {
  getMarcaciones: (params?: { fecha?: string; empleadoId?: string }) =>
    api.get<Marcacion[]>('/asistencia', { params }).then((r) => r.data),

  getResumen: (fecha: string) =>
    api.get<ResumenAsistencia>('/asistencia/resumen', { params: { fecha } }).then((r) => r.data),

  registrarEntrada: (empleadoId: string) =>
    api.post<Marcacion>('/asistencia/entrada', { empleadoId }).then((r) => r.data),

  registrarSalida: (marcacionId: string) =>
    api.patch<Marcacion>(`/asistencia/${marcacionId}/salida`).then((r) => r.data),
}
