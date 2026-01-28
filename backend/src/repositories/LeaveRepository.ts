import { getDatabase } from '@config/database';
import type { Leave } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class LeaveRepository {
  async create(leave: Omit<Leave, 'id' | 'createdAt' | 'updatedAt'>): Promise<Leave> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO leaves (id, employeeId, type, startDate, endDate, days, status, reason, approvedBy, approvedDate, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, leave.employeeId, leave.type, leave.startDate, leave.endDate, leave.days, leave.status, leave.reason || null, leave.approvedBy || null, leave.approvedDate || null, now, now]
    );

    return this.findById(id) as Promise<Leave>;
  }

  async findById(id: string): Promise<Leave | null> {
    const db = getDatabase();
    return db.get('SELECT * FROM leaves WHERE id = ?', [id]) || null;
  }

  async findByEmployee(employeeId: string): Promise<Leave[]> {
    const db = getDatabase();
    return db.all('SELECT * FROM leaves WHERE employeeId = ? ORDER BY startDate DESC', [employeeId]);
  }

  async findByEmployeeAndStatus(employeeId: string, status: string): Promise<Leave[]> {
    const db = getDatabase();
    return db.all('SELECT * FROM leaves WHERE employeeId = ? AND status = ? ORDER BY startDate DESC', [employeeId, status]);
  }

  async findByDateRange(startDate: string, endDate: string): Promise<Leave[]> {
    const db = getDatabase();
    return db.all(
      'SELECT * FROM leaves WHERE startDate <= ? AND endDate >= ? ORDER BY startDate',
      [endDate, startDate]
    );
  }

  async findPending(): Promise<Leave[]> {
    const db = getDatabase();
    return db.all("SELECT * FROM leaves WHERE status = 'pending' ORDER BY startDate");
  }

  async getAll(): Promise<Leave[]> {
    const db = getDatabase();
    return db.all("SELECT * FROM leaves ORDER BY startDate DESC") || [];
  }

  async update(id: string, data: Partial<Leave>): Promise<Leave | null> {
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
      `UPDATE leaves SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.run('DELETE FROM leaves WHERE id = ?', [id]);
    return (result.changes || 0) > 0;
  }
}

export default new LeaveRepository();
