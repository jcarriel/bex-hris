import { getDatabase } from '@config/database';
import type { Marcacion } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class MarcacionRepository {
  async create(marcacion: Omit<Marcacion, 'id' | 'createdAt' | 'updatedAt'>): Promise<Marcacion> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    const fields = [
      'id', 'cedula', 'employeeName', 'department', 'month', 'date',
      'dailyAttendance', 'firstCheckIn', 'lastCheckOut', 'totalTime', 'createdAt', 'updatedAt'
    ];

    const values = [
      id, marcacion.cedula, marcacion.employeeName, marcacion.department,
      marcacion.month, marcacion.date, marcacion.dailyAttendance, marcacion.firstCheckIn || null,
      marcacion.lastCheckOut || null, marcacion.totalTime || null, now, now
    ];

    const placeholders = fields.map(() => '?').join(', ');

    await db.run(
      `INSERT INTO marcacion (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );

    return this.findById(id) as Promise<Marcacion>;
  }

  async findById(id: string): Promise<Marcacion | null> {
    const db = getDatabase();
    return (await db.get('SELECT * FROM marcacion WHERE id = ?', [id])) || null;
  }

  async findByCedulaAndDate(cedula: string, date: string): Promise<Marcacion | null> {
    const db = getDatabase();
    return (await db.get('SELECT * FROM marcacion WHERE cedula = ? AND date = ?', [cedula, date])) || null;
  }

  async findByCedula(cedula: string): Promise<Marcacion[]> {
    const db = getDatabase();
    return await db.all('SELECT * FROM marcacion WHERE cedula = ? ORDER BY date DESC', [cedula]);
  }

  async findByMonth(month: number): Promise<Marcacion[]> {
    const db = getDatabase();
    return await db.all('SELECT * FROM marcacion WHERE month = ? ORDER BY employeeName, date', [month]);
  }

  async findByCedulaAndMonth(cedula: string, month: number): Promise<Marcacion[]> {
    const db = getDatabase();
    return await db.all('SELECT * FROM marcacion WHERE cedula = ? AND month = ? ORDER BY date', [cedula, month]);
  }

  async findAll(): Promise<Marcacion[]> {
    const db = getDatabase();
    return await db.all(`
      SELECT 
        m.*,
        e.positionId,
        e.departmentId
      FROM marcacion m
      LEFT JOIN employees e ON 
        LOWER(TRIM(m.employeeName)) = LOWER(TRIM(e.lastName  || ' ' || e.firstName ))
        AND e.status = 'active'
      ORDER BY m.date DESC, m.employeeName
    `);
  }

  async update(id: string, data: Partial<Marcacion>): Promise<Marcacion | null> {
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
      `UPDATE marcacion SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.run('DELETE FROM marcacion WHERE id = ?', [id]);
    return (result.changes || 0) > 0;
  }

  async deleteByCedulaAndDate(cedula: string, date: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.run('DELETE FROM marcacion WHERE cedula = ? AND date = ?', [cedula, date]);
    return (result.changes || 0) > 0;
  }

  async deleteByMonth(month: number): Promise<boolean> {
    const db = getDatabase();
    const result = await db.run('DELETE FROM marcacion WHERE month = ?', [month]);
    return (result.changes || 0) > 0;
  }
}

export default new MarcacionRepository();
