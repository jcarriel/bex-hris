export interface Vacante {
  id: string
  titulo: string
  departamento: string
  modalidad: 'presencial' | 'remoto' | 'hibrido'
  estado: 'abierta' | 'en_proceso' | 'cerrada'
  candidatos: number
  fechaPublicacion: string
}

export interface Candidato {
  id: string
  vacanteId: string
  nombre: string
  email: string
  telefono?: string
  etapa: 'aplicacion' | 'screening' | 'entrevista' | 'oferta' | 'contratado' | 'rechazado'
  fechaAplicacion: string
}
