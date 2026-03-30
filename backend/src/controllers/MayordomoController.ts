import { Response } from 'express'
import { AuthRequest } from '@middleware/auth'
import { MayordomoRepository } from '@repositories/MayordomoRepository'
import logger from '@utils/logger'

export const MayordomoController = {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = await MayordomoRepository.getAll()
      res.json({ success: true, data })
    } catch (error) {
      logger.error('Get all mayordomos error', error)
      res.status(500).json({ success: false, message: 'Error' })
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { employeeId, notes } = req.body
      if (!employeeId) {
        res.status(400).json({ success: false, message: 'employeeId is required' })
        return
      }
      const data = await MayordomoRepository.create(employeeId, notes)
      res.status(201).json({ success: true, data })
    } catch (error) {
      logger.error('Create mayordomo error', error)
      res.status(500).json({ success: false, message: 'Error' })
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const data = await MayordomoRepository.update(id, { notes: req.body.notes })
      if (!data) { res.status(404).json({ success: false, message: 'Not found' }); return }
      res.json({ success: true, data })
    } catch (error) {
      logger.error('Update mayordomo error', error)
      res.status(500).json({ success: false, message: 'Error' })
    }
  },

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      await MayordomoRepository.delete(req.params.id)
      res.json({ success: true })
    } catch (error) {
      logger.error('Delete mayordomo error', error)
      res.status(500).json({ success: false, message: 'Error' })
    }
  },

  async assignEmployee(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const { employeeId } = req.body
      if (!employeeId) {
        res.status(400).json({ success: false, message: 'employeeId is required' })
        return
      }
      await MayordomoRepository.assignEmployee(id, employeeId)
      const data = await MayordomoRepository.getById(id)
      res.json({ success: true, data })
    } catch (error) {
      logger.error('Assign employee to mayordomo error', error)
      res.status(500).json({ success: false, message: 'Error' })
    }
  },

  async removeEmployee(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { employeeId } = req.params
      await MayordomoRepository.removeEmployee(employeeId)
      res.json({ success: true })
    } catch (error) {
      logger.error('Remove employee from mayordomo error', error)
      res.status(500).json({ success: false, message: 'Error' })
    }
  },
}
