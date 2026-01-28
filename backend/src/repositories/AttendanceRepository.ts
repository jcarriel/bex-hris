import { getDatabase } from '@config/database';
import type { Attendance } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class AttendanceRepository {
  async create(attendance: Omit<Attendance, 'id' | 'createdAt' | 'updatedAt'>): Promise<Attendance> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO attendance (id, employeeId, date, checkIn, checkOut, status, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, attendance.employeeId, attendance.date, attendance.checkIn || null, attendance.checkOut || null, attendance.status, attendance.notes || null, now, now]
    );

    return this.findById(id) as Promise<Attendance>;
  }

  async findById(id: string): Promise<Attendance | null> {
    const db = getDatabase();
    return db.get('SELECT * FROM attendance WHERE id = ?', [id]) || null;
  }

  async findByEmployeeAndDate(employeeId: string, date: string): Promise<Attendance | null> {
    const db = getDatabase();
    return db.get('SELECT * FROM attendance WHERE employeeId = ? AND date = ?', [employeeId, date]) || null;
  }

  async findByEmployee(employeeId: string, startDate?: string, endDate?: string): Promise<Attendance[]> {
    const db = getDatabase();
    let query = 'SELECT * FROM attendance WHERE employeeId = ?';
    const params: any[] = [employeeId];

    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY date DESC';
    return db.all(query, params);
  }

  async findByDate(date: string): Promise<Attendance[]> {
    const db = getDatabase();
    return db.all('SELECT * FROM attendance WHERE date = ? ORDER BY employeeId', [date]);
  }

  async update(id: string, data: Partial<Attendance>): Promise<Attendance | null> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: unknown[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt') {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push('updatedAt = ?');
    values.push(now);
    values.push(id);

    await db.run(
      `UPDATE attendance SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.run('DELETE FROM attendance WHERE id = ?', [id]);
    return (result.changes || 0) > 0;
  }
}

export default new AttendanceRepository();
