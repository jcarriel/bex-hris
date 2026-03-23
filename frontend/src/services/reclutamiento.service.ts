import { api } from './api'
import type { Vacante, Candidato } from '@/types/reclutamiento.types'

export const reclutamientoService = {
  getVacantes: () =>
    api.get<Vacante[]>('/reclutamiento/vacantes').then((r) => r.data),

  getVacante: (id: string) =>
    api.get<Vacante>(`/reclutamiento/vacantes/${id}`).then((r) => r.data),

  getCandidatos: (vacanteId: string) =>
    api.get<Candidato[]>(`/reclutamiento/vacantes/${vacanteId}/candidatos`).then((r) => r.data),

  crearVacante: (data: Omit<Vacante, 'id'>) =>
    api.post<Vacante>('/reclutamiento/vacantes', data).then((r) => r.data),

  actualizarEtapa: (candidatoId: string, etapa: Candidato['etapa']) =>
    api.patch<Candidato>(`/reclutamiento/candidatos/${candidatoId}`, { etapa }).then((r) => r.data),
}
