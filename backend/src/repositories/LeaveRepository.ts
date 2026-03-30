import { getDatabase } from '@config/database';
import type { Leave } from '../types';
import { v4 as uuidv4 } from 'uuid';

const WITH_USERS = `
  SELECT
    l.*,
    sb.nombre AS submittedByName,
    ab.nombre AS approvedByName
  FROM leaves l
  LEFT JOIN users sb ON l.submittedBy = sb.id
  LEFT JOIN users ab ON l.approvedBy  = ab.id
`

export class LeaveRepository {
  async create(leave: Omit<Leave, 'id' | 'createdAt' | 'updatedAt'>): Promise<Leave> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO leaves (id, employeeId, type, startDate, endDate, days, status, reason, submittedBy, approvedBy, approvedDate, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, leave.employeeId, leave.type, leave.startDate, leave.endDate, leave.days, leave.status,
       leave.reason || null, (leave as any).submittedBy || null,
       leave.approvedBy || null, leave.approvedDate || null, now, now]
    );

    return this.findById(id) as Promise<Leave>;
  }

  async findById(id: string): Promise<Leave | null> {
    const db = getDatabase();
    return db.get(`${WITH_USERS} WHERE l.id = ?`, [id]) || null;
  }

  async findByEmployee(employeeId: string): Promise<Leave[]> {
    const db = getDatabase();
    return db.all(`${WITH_USERS} WHERE l.employeeId = ? ORDER BY l.startDate DESC`, [employeeId]);
  }

  async findByEmployeeAndStatus(employeeId: string, status: string): Promise<Leave[]> {
    const db = getDatabase();
    return db.all(`${WITH_USERS} WHERE l.employeeId = ? AND l.status = ? ORDER BY l.startDate DESC`, [employeeId, status]);
  }

  async findByDateRange(startDate: string, endDate: string): Promise<Leave[]> {
    const db = getDatabase();
    return db.all(
      `${WITH_USERS} WHERE l.startDate <= ? AND l.endDate >= ? ORDER BY l.startDate`,
      [endDate, startDate]
    );
  }

  async findPending(): Promise<Leave[]> {
    const db = getDatabase();
    return db.all(`${WITH_USERS} WHERE l.status = 'pending' ORDER BY l.startDate`);
  }

  async getAll(): Promise<Leave[]> {
    const db = getDatabase();
    return db.all(`${WITH_USERS} ORDER BY l.startDate DESC`) || [];
  }

  async update(id: string, data: Partial<Leave>): Promise<Leave | null> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: unknown[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt' && key !== 'submittedByName' && key !== 'approvedByName') {
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
