import { getDatabase } from '@config/database';
import { v4 as uuidv4 } from 'uuid';

export interface Event {
  id: string;
  type: 'birthday' | 'contract_expiry' | 'training' | 'audit' | 'meeting' | 'other';
  title: string;
  description?: string;
  eventDate: string; // YYYY-MM-DD
  employeeId?: string;
  employeeName?: string;
  daysNotice: number; // days before event to notify
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export class EventRepository {
  async create(data: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO events (id, type, title, description, eventDate, employeeId, daysNotice, createdBy, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.type, data.title, data.description ?? null, data.eventDate, data.employeeId ?? null, data.daysNotice ?? 7, data.createdBy ?? null, now, now]
    );
    return this.findById(id) as Promise<Event>;
  }

  async findById(id: string): Promise<Event | null> {
    const db = getDatabase();
    const row = await db.get(
      `SELECT e.*, emp.firstName || ' ' || emp.lastName AS employeeName
       FROM events e
       LEFT JOIN employees emp ON e.employeeId = emp.id
       WHERE e.id = ?`,
      [id]
    );
    return row ?? null;
  }

  async getAll(filters?: { type?: string; startDate?: string; endDate?: string }): Promise<Event[]> {
    const db = getDatabase();
    let query = `SELECT e.*, emp.firstName || ' ' || emp.lastName AS employeeName
                 FROM events e
                 LEFT JOIN employees emp ON e.employeeId = emp.id
                 WHERE 1=1`;
    const params: unknown[] = [];
    if (filters?.type) { query += ' AND e.type = ?'; params.push(filters.type); }
    if (filters?.startDate) { query += ' AND e.eventDate >= ?'; params.push(filters.startDate); }
    if (filters?.endDate) { query += ' AND e.eventDate <= ?'; params.push(filters.endDate); }
    query += ' ORDER BY e.eventDate ASC';
    return db.all(query, params);
  }

  // Returns manual events where eventDate is within today + daysAhead
  async getUpcomingManual(daysAhead: number): Promise<Event[]> {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + daysAhead * 86400000).toISOString().split('T')[0];
    return db.all(
      `SELECT e.*, emp.firstName || ' ' || emp.lastName AS employeeName
       FROM events e
       LEFT JOIN employees emp ON e.employeeId = emp.id
       WHERE e.eventDate BETWEEN ? AND ?
       ORDER BY e.eventDate ASC`,
      [today, future]
    );
  }

  async update(id: string, data: Partial<Omit<Event, 'id' | 'createdAt'>>): Promise<Event | null> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: unknown[] = [];
    const allowed = ['type', 'title', 'description', 'eventDate', 'employeeId', 'daysNotice'];
    for (const [k, v] of Object.entries(data)) {
      if (allowed.includes(k)) { updates.push(`${k} = ?`); values.push(v); }
    }
    if (updates.length === 0) return this.findById(id);
    updates.push('updatedAt = ?'); values.push(now); values.push(id);
    await db.run(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.run('DELETE FROM events WHERE id = ?', [id]);
    return (result.changes ?? 0) > 0;
  }
}

export default new EventRepository();
