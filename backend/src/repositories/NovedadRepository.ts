import { getDatabase } from '@config/database';
import { v4 as uuidv4 } from 'uuid';

export interface Novedad {
  id: string;
  employeeId: string;
  type: 'revision_nomina' | 'reclamo' | 'solicitud' | 'otro';
  description: string;
  date: string;
  status: 'pending' | 'in_progress' | 'resolved';
  response?: string;
  respondedBy?: string;
  respondedDate?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

class NovedadRepository {
  async create(data: Omit<Novedad, 'id' | 'createdAt' | 'updatedAt'>): Promise<Novedad> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO novedades (id,employeeId,type,description,date,status,response,respondedBy,respondedDate,createdBy,createdAt,updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, data.employeeId, data.type, data.description, data.date, data.status || 'pending',
       data.response || null, data.respondedBy || null, data.respondedDate || null,
       data.createdBy, now, now]
    );
    return this.findById(id) as Promise<Novedad>;
  }

  async findById(id: string): Promise<Novedad | null> {
    const db = getDatabase();
    return db.get<Novedad>('SELECT * FROM novedades WHERE id = ?', [id]) || null;
  }

  async getAll(): Promise<Novedad[]> {
    const db = getDatabase();
    return db.all<Novedad[]>('SELECT * FROM novedades ORDER BY date DESC, createdAt DESC');
  }

  async findByEmployee(employeeId: string): Promise<Novedad[]> {
    const db = getDatabase();
    return db.all<Novedad[]>(
      'SELECT * FROM novedades WHERE employeeId = ? ORDER BY date DESC',
      [employeeId]
    );
  }

  async update(id: string, data: Partial<Novedad>): Promise<Novedad | null> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: unknown[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (key !== 'id' && key !== 'createdAt') {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (updates.length === 0) return this.findById(id);
    updates.push('updatedAt = ?');
    values.push(now, id);
    await db.run(`UPDATE novedades SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.run('DELETE FROM novedades WHERE id = ?', [id]);
    return (result.changes || 0) > 0;
  }
}

export default new NovedadRepository();
