import { getDatabase } from '@config/database';
import type { User } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class UserRepository {
  async create(username: string, password: string, email: string): Promise<User> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO users (id, username, password, email, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, username, password, email, now, now]
    );

    return this.findById(id) as Promise<User>;
  }

  async createAdmin(data: {
    nombre: string; username: string; email: string; password: string;
    roleId: string | null; role: string; status: string; employeeId?: string | null;
  }): Promise<User> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO users (id, username, password, email, nombre, role, roleId, status, employeeId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.username, data.password, data.email, data.nombre, data.role, data.roleId, data.status, data.employeeId ?? null, now, now]
    );

    return this.findById(id) as Promise<User>;
  }

  async getAllWithRoles(): Promise<any[]> {
    const db = getDatabase();
    return db.all(`
      SELECT u.id, u.username, u.email, u.nombre, u.role, u.roleId, u.status, u.employeeId, u.createdAt, u.updatedAt,
             r.name AS roleName, r.permissions AS rolePermissions,
             (e.firstName || ' ' || e.lastName) AS employeeName
      FROM users u
      LEFT JOIN roles r ON u.roleId = r.id
      LEFT JOIN employees e ON u.employeeId = e.id
      ORDER BY u.createdAt DESC
    `);
  }

  async findById(id: string): Promise<User | null> {
    const db = getDatabase();
    const row = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    return row ?? null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const db = getDatabase();
    const row = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    return row ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const db = getDatabase();
    const row = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    return row ?? null;
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
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
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.run('DELETE FROM users WHERE id = ?', [id]);
    return result.changes > 0;
  }

  async getAll(): Promise<User[]> {
    const db = getDatabase();
    return db.all('SELECT * FROM users ORDER BY createdAt DESC');
  }
}

export default new UserRepository();
