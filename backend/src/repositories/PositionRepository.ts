import { getDatabase } from '@config/database';
import type { Position } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class PositionRepository {
  async create(name: string, departmentId: string, description?: string, salaryMin?: number, salaryMax?: number): Promise<Position> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO positions (id, name, description, departmentId, salaryMin, salaryMax, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, description || null, departmentId, salaryMin || 0, salaryMax || 0, now, now]
    );

    return this.findById(id) as Promise<Position>;
  }

  async findById(id: string): Promise<Position | null> {
    const db = getDatabase();
    const row = await db.get('SELECT * FROM positions WHERE id = ?', [id]);
    if (!row) return null;
    return {
      ...row,
      salaryRange: { min: row.salaryMin, max: row.salaryMax }
    };
  }

  async findByDepartment(departmentId: string): Promise<Position[]> {
    const db = getDatabase();
    const rows = await db.all('SELECT * FROM positions WHERE departmentId = ? ORDER BY name', [departmentId]);
    return rows.map(row => ({
      ...row,
      salaryRange: { min: row.salaryMin, max: row.salaryMax }
    }));
  }

  async findAll(): Promise<Position[]> {
    const db = getDatabase();
    const rows = await db.all('SELECT * FROM positions ORDER BY name');
    return rows.map(row => ({
      ...row,
      salaryRange: { min: row.salaryMin, max: row.salaryMax }
    }));
  }

  async update(id: string, data: Partial<Position>): Promise<Position | null> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: unknown[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt' && key !== 'salaryRange') {
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
      `UPDATE positions SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.run('DELETE FROM positions WHERE id = ?', [id]);
    return (result.changes || 0) > 0;
  }
}

export default new PositionRepository();
