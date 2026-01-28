import { getDatabase } from '@config/database';
import type { Department } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class DepartmentRepository {
  async create(name: string, description?: string): Promise<Department> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO departments (id, name, description, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?)`,
      [id, name, description || null, now, now]
    );

    return this.findById(id) as Promise<Department>;
  }

  async findById(id: string): Promise<Department | null> {
    const db = getDatabase();
    const result = await db.get('SELECT * FROM departments WHERE id = ?', [id]);
    return (result as Department) || null;
  }

  async findAll(): Promise<Department[]> {
    const db = getDatabase();
    return db.all('SELECT * FROM departments ORDER BY name');
  }

  async update(id: string, data: Partial<Department>): Promise<Department | null> {
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
      `UPDATE departments SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.run('DELETE FROM departments WHERE id = ?', [id]);
    return (result.changes ?? 0) > 0;
  }
}

export default new DepartmentRepository();
