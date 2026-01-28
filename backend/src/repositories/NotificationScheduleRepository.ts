import { getDatabase } from '@config/database';
import { v4 as uuidv4 } from 'uuid';

export interface NotificationSchedule {
  id: string;
  type: string;
  dayOfWeek?: string;
  dayOfMonth?: number;
  hour: number;
  minute: number;
  enabled: number;
  channels: string;
  recipientEmail?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export class NotificationScheduleRepository {
  async create(schedule: Omit<NotificationSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationSchedule> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO notification_schedules (id, type, dayOfWeek, dayOfMonth, hour, minute, enabled, channels, recipientEmail, description, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, schedule.type, schedule.dayOfWeek || null, schedule.dayOfMonth || null, schedule.hour, schedule.minute, schedule.enabled, schedule.channels, schedule.recipientEmail || null, schedule.description || null, now, now]
    );

    return this.findById(id) as Promise<NotificationSchedule>;
  }

  async findById(id: string): Promise<NotificationSchedule | null> {
    const db = getDatabase();
    const row = await db.get('SELECT * FROM notification_schedules WHERE id = ?', [id]);
    if (row && typeof row.channels === 'string') {
      row.channels = JSON.parse(row.channels);
    }
    return row || null;
  }

  async getAll(): Promise<NotificationSchedule[]> {
    const db = getDatabase();
    const rows = await db.all('SELECT * FROM notification_schedules ORDER BY hour, minute');
    return rows.map((row: any) => ({
      ...row,
      channels: typeof row.channels === 'string' ? JSON.parse(row.channels) : row.channels
    }));
  }

  async getEnabled(): Promise<NotificationSchedule[]> {
    const db = getDatabase();
    const rows = await db.all('SELECT * FROM notification_schedules WHERE enabled = 1 ORDER BY hour, minute');
    return rows.map((row: any) => ({
      ...row,
      channels: typeof row.channels === 'string' ? JSON.parse(row.channels) : row.channels
    }));
  }

  async getByType(type: string): Promise<NotificationSchedule[]> {
    const db = getDatabase();
    const rows = await db.all('SELECT * FROM notification_schedules WHERE type = ? ORDER BY hour, minute', [type]);
    return rows.map((row: any) => ({
      ...row,
      channels: typeof row.channels === 'string' ? JSON.parse(row.channels) : row.channels
    }));
  }

  async update(id: string, data: Partial<NotificationSchedule>): Promise<NotificationSchedule | null> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: unknown[] = [];

    // List of valid columns in the table
    const validColumns = ['type', 'dayOfWeek', 'dayOfMonth', 'hour', 'minute', 'enabled', 'channels', 'recipientEmail', 'description'];

    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt' && validColumns.includes(key)) {
        updates.push(`${key} = ?`);
        if (key === 'channels') {
          // If channels is already a string (JSON), keep it; if it's an object, stringify it
          if (typeof value === 'string') {
            values.push(value);
          } else if (typeof value === 'object') {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
        } else {
          values.push(value);
        }
      }
    });

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push('updatedAt = ?');
    values.push(now);
    values.push(id);

    try {
      await db.run(
        `UPDATE notification_schedules SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    } catch (error) {
      // If recipientEmail column doesn't exist, try without it
      if (error instanceof Error && error.message.includes('no such column')) {
        const filteredUpdates = updates.filter(u => !u.includes('recipientEmail'));
        const filteredValues = values.slice(0, -2); // Remove the last two values (now and id)
        
        // Rebuild values array without recipientEmail
        const newValues: unknown[] = [];
        let dataIndex = 0;
        Object.entries(data).forEach(([key, value]) => {
          if (key !== 'id' && key !== 'createdAt' && validColumns.includes(key) && key !== 'recipientEmail') {
            if (key === 'channels' && typeof value === 'string') {
              newValues.push(value);
            } else if (key === 'channels' && typeof value === 'object') {
              newValues.push(JSON.stringify(value));
            } else {
              newValues.push(value);
            }
          }
        });
        newValues.push(now);
        newValues.push(id);

        await db.run(
          `UPDATE notification_schedules SET ${filteredUpdates.join(', ')}, updatedAt = ? WHERE id = ?`,
          newValues
        );
      } else {
        throw error;
      }
    }

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.run('DELETE FROM notification_schedules WHERE id = ?', [id]);
    return (result.changes || 0) > 0;
  }
}

export default new NotificationScheduleRepository();
