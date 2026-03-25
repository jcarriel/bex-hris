import { Request, Response } from 'express';
import NotificationRepository from '@repositories/NotificationRepository';

class NotificationController {
  async getMyNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;
      const notifications = await NotificationRepository.getByUser(userId, limit);
      res.json({ success: true, data: notifications });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error fetching notifications' });
    }
  }

  async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) { res.json({ success: true, data: { count: 0 } }); return; }
      const count = await NotificationRepository.getUnreadCount(userId);
      res.json({ success: true, data: { count } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error fetching count' });
    }
  }

  async markRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      await NotificationRepository.markRead(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error marking read' });
    }
  }

  async markAllRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      await NotificationRepository.markAllRead(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error marking all read' });
    }
  }

  async deleteOne(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      await NotificationRepository.deleteOne(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error deleting notification' });
    }
  }

  async deleteAll(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      await NotificationRepository.deleteAll(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error clearing notifications' });
    }
  }
}

export default new NotificationController();
