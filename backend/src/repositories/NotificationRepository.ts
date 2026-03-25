import { getDatabase } from '@config/database';
import { v4 as uuidv4 } from 'uuid';

class NotificationRepository {
  async create(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    relatedId?: string;
  }): Promise<void> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO notifications (id, userId, type, title, message, read, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, data.userId, data.type, data.title, data.message, now, now],
    );
  }

  async getByUser(userId: string, limit = 30): Promise<any[]> {
    const db = getDatabase();
    return db.all(
      `SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT ?`,
      [userId, limit],
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    const db = getDatabase();
    const row = await db.get(
      `SELECT COUNT(*) as cnt FROM notifications WHERE userId = ? AND read = 0`,
      [userId],
    );
    return row?.cnt ?? 0;
  }

  async markRead(id: string, userId: string): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();
    await db.run(
      `UPDATE notifications SET read = 1, updatedAt = ? WHERE id = ? AND userId = ?`,
      [now, id, userId],
    );
  }

  async markAllRead(userId: string): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();
    await db.run(
      `UPDATE notifications SET read = 1, updatedAt = ? WHERE userId = ? AND read = 0`,
      [now, userId],
    );
  }

  async deleteOne(id: string, userId: string): Promise<void> {
    const db = getDatabase();
    await db.run(`DELETE FROM notifications WHERE id = ? AND userId = ?`, [id, userId]);
  }

  async deleteAll(userId: string): Promise<void> {
    const db = getDatabase();
    await db.run(`DELETE FROM notifications WHERE userId = ?`, [userId]);
  }
}

export default new NotificationRepository();
