import { INotificationProvider, NotificationPayload } from '../interfaces/INotificationProvider';
import logger from '@utils/logger';
import { getDatabase } from '@config/database';
import { v4 as uuidv4 } from 'uuid';

export class AppNotificationProvider implements INotificationProvider {
  isConfigured(): boolean {
    return process.env.ENABLE_APP_NOTIFICATIONS === 'true';
  }

  async send(payload: NotificationPayload): Promise<boolean> {
    if (!this.isConfigured()) {
      logger.warn('App notifications are disabled');
      return false;
    }

    try {
      const db = getDatabase();
      const notificationId = uuidv4();
      const now = new Date().toISOString();

      // Insert notification into database
      await db.run(
        `INSERT INTO notifications (id, userId, type, title, message, read, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          notificationId,
          payload.data?.userId || null,
          payload.data?.type || 'system',
          payload.title,
          payload.message,
          0,
          now,
          now,
        ]
      );

      // Insert app channel
      await db.run(
        `INSERT INTO notification_channels (id, notificationId, type, sent, sentAt)
         VALUES (?, ?, ?, ?, ?)`,
        [uuidv4(), notificationId, 'app', 1, now]
      );

      logger.info(`App notification created: ${notificationId}`);
      return true;
    } catch (error) {
      logger.error('Failed to create app notification', error);
      return false;
    }
  }
}
