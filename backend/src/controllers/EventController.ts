import { Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import EventService from '@services/EventService';
import EventTypeConfigService from '@services/EventTypeConfigService';
import EventDigestScheduler from '@services/EventDigestScheduler';
import logger from '@utils/logger';

export class EventController {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { type, startDate, endDate } = req.query as Record<string, string>;
      const events = await EventService.getAll({ type, startDate, endDate });
      res.json({ success: true, data: events });
    } catch (error) {
      logger.error('Get events error', error);
      res.status(500).json({ success: false, message: 'Error al obtener eventos' });
    }
  }

  async getUpcoming(req: AuthRequest, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const events = await EventService.getUpcoming(days);
      res.json({ success: true, data: events });
    } catch (error) {
      logger.error('Get upcoming events error', error);
      res.status(500).json({ success: false, message: 'Error al obtener eventos próximos' });
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { type, title, description, eventDate, employeeId, daysNotice } = req.body;
      if (!type || !title || !eventDate) {
        res.status(400).json({ success: false, message: 'type, title y eventDate son requeridos' });
        return;
      }
      const event = await EventService.create({
        type,
        title,
        description,
        eventDate,
        employeeId,
        daysNotice: daysNotice ?? 7,
        createdBy: (req as any).user?.id,
      });
      res.status(201).json({ success: true, data: event });
    } catch (error) {
      logger.error('Create event error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error al crear evento' });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const event = await EventService.update(id, req.body);
      if (!event) { res.status(404).json({ success: false, message: 'Evento no encontrado' }); return; }
      res.json({ success: true, data: event });
    } catch (error) {
      logger.error('Update event error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error al actualizar evento' });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const ok = await EventService.delete(id);
      if (!ok) { res.status(404).json({ success: false, message: 'Evento no encontrado' }); return; }
      res.json({ success: true, message: 'Evento eliminado' });
    } catch (error) {
      logger.error('Delete event error', error);
      res.status(500).json({ success: false, message: 'Error al eliminar evento' });
    }
  }

  async triggerDigest(req: AuthRequest, res: Response): Promise<void> {
    try {
      const count = await EventDigestScheduler.sendDigest();
      res.json({ success: true, message: `Digest enviado a ${count} usuario(s)` });
    } catch (error) {
      logger.error('Trigger digest error', error);
      res.status(500).json({ success: false, message: 'Error al enviar digest' });
    }
  }

  async getConfigs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const configs = await EventTypeConfigService.getAll();
      res.json({ success: true, data: configs });
    } catch (error) {
      logger.error('Get event configs error', error);
      res.status(500).json({ success: false, message: 'Error al obtener configuraciones' });
    }
  }

  async updateConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const { daysNotice, enabled } = req.body;
      if (daysNotice === undefined || enabled === undefined) {
        res.status(400).json({ success: false, message: 'daysNotice y enabled son requeridos' });
        return;
      }
      const cfg = await EventTypeConfigService.update(type, Number(daysNotice), Boolean(enabled));
      res.json({ success: true, data: cfg });
    } catch (error) {
      logger.error('Update event config error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error al actualizar' });
    }
  }
}

export default new EventController();
