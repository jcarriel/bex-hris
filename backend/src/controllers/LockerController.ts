import { Request, Response } from 'express'
import { LockerRepository } from '@repositories/LockerRepository'

export const LockerController = {
  async getAll(req: Request, res: Response) {
    try {
      const lockers = await LockerRepository.getAll()
      res.json({ success: true, data: lockers })
    } catch {
      res.status(500).json({ success: false, message: 'Error al obtener casilleros' })
    }
  },

  async getStats(req: Request, res: Response) {
    try {
      const stats = await LockerRepository.getStats()
      res.json({ success: true, data: stats })
    } catch {
      res.status(500).json({ success: false, message: 'Error al obtener estadísticas' })
    }
  },

  async getSections(req: Request, res: Response) {
    try {
      const sections = await LockerRepository.getSections()
      res.json({ success: true, data: sections })
    } catch {
      res.status(500).json({ success: false, message: 'Error al obtener secciones' })
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const locker = await LockerRepository.getById(req.params.id)
      if (!locker) return res.status(404).json({ success: false, message: 'Casillero no encontrado' })
      res.json({ success: true, data: locker })
    } catch {
      res.status(500).json({ success: false, message: 'Error' })
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { number, section, status, employeeId, notes } = req.body
      if (!number || !section) {
        return res.status(400).json({ success: false, message: 'Número y sección son requeridos' })
      }
      if (employeeId) {
        const existing = await LockerRepository.findByEmployee(employeeId)
        if (existing) {
          return res.status(400).json({
            success: false,
            message: `El empleado ya tiene asignado el casillero ${existing.section}-${existing.number}`,
          })
        }
      }
      const locker = await LockerRepository.create({ number, section, status, employeeId, notes })
      res.status(201).json({ success: true, data: locker })
    } catch {
      res.status(500).json({ success: false, message: 'Error al crear casillero' })
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const data = req.body
      if (data.employeeId) {
        const existing = await LockerRepository.findByEmployee(data.employeeId)
        if (existing && existing.id !== id) {
          return res.status(400).json({
            success: false,
            message: `El empleado ya tiene asignado el casillero ${existing.section}-${existing.number}`,
          })
        }
      }
      const locker = await LockerRepository.update(id, data)
      res.json({ success: true, data: locker })
    } catch {
      res.status(500).json({ success: false, message: 'Error al actualizar casillero' })
    }
  },

  async delete(req: Request, res: Response) {
    try {
      await LockerRepository.delete(req.params.id)
      res.json({ success: true, message: 'Casillero eliminado' })
    } catch {
      res.status(500).json({ success: false, message: 'Error al eliminar casillero' })
    }
  },
}
