import { Request, Response } from 'express';
import NovedadRepository from '@repositories/NovedadRepository';
import logger from '@utils/logger';
import type { AuthRequest } from '@middleware/auth';
import { logAudit } from '@utils/audit';

class NovedadController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const novedades = await NovedadRepository.getAll();
      res.json({ success: true, data: novedades });
    } catch (error) {
      logger.error('Error getting novedades', error);
      res.status(500).json({ success: false, message: 'Error al obtener novedades' });
    }
  }

  async getByEmployee(req: Request, res: Response): Promise<void> {
    try {
      const novedades = await NovedadRepository.findByEmployee(req.params.employeeId);
      res.json({ success: true, data: novedades });
    } catch (error) {
      logger.error('Error getting novedades by employee', error);
      res.status(500).json({ success: false, message: 'Error al obtener novedades' });
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { employeeId, type, description, date } = req.body;
      if (!employeeId || !type || !description) {
        res.status(400).json({ success: false, message: 'Faltan campos requeridos: empleado, tipo, descripción' });
        return;
      }
      const novedad = await NovedadRepository.create({
        employeeId,
        type,
        description,
        date: date || new Date().toISOString().slice(0, 10),
        status: 'pending',
        createdBy: req.userId || 'system',
      });
      logAudit(req.userId, 'CREATE', 'novedad', novedad.id);
      res.status(201).json({ success: true, data: novedad });
    } catch (error) {
      logger.error('Error creating novedad', error);
      res.status(500).json({ success: false, message: 'Error al crear novedad' });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, response } = req.body;
      const updates: Record<string, unknown> = {};
      if (status) updates.status = status;
      if (response !== undefined) updates.response = response;
      if (status === 'resolved' || (response && status !== 'pending')) {
        updates.respondedBy = req.userId || 'system';
        updates.respondedDate = new Date().toISOString().slice(0, 10);
      }
      const novedad = await NovedadRepository.update(id, updates);
      if (!novedad) {
        res.status(404).json({ success: false, message: 'Novedad no encontrada' });
        return;
      }
      logAudit(req.userId, updates.status === 'resolved' ? 'RESOLVE' : 'UPDATE', 'novedad', id);
      res.json({ success: true, data: novedad });
    } catch (error) {
      logger.error('Error updating novedad', error);
      res.status(500).json({ success: false, message: 'Error al actualizar novedad' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await NovedadRepository.delete(req.params.id);
      if (!deleted) {
        res.status(404).json({ success: false, message: 'Novedad no encontrada' });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      logger.error('Error deleting novedad', error);
      res.status(500).json({ success: false, message: 'Error al eliminar novedad' });
    }
  }
}

export default new NovedadController();
