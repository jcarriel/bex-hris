import { getDatabase } from '@config/database';
import { v4 as uuidv4 } from 'uuid';

export interface SocialCase {
  id: string;
  employeeId: string;
  type: string;
  title: string;
  description?: string;
  date: string;
  status: 'open' | 'in_progress' | 'closed';
  resolution?: string;
  resolvedDate?: string;
  resolvedBy?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

class SocialCaseRepository {
  async create(data: Omit<SocialCase, 'id' | 'createdAt' | 'updatedAt'>): Promise<SocialCase> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO social_cases (id,employeeId,type,title,description,date,status,resolution,resolvedDate,resolvedBy,createdBy,createdAt,updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, data.employeeId, data.type, data.title, data.description||null, data.date, data.status||'open',
       data.resolution||null, data.resolvedDate||null, data.resolvedBy||null, data.createdBy, now, now]
    );
    return this.findById(id) as Promise<SocialCase>;
  }

  async findById(id: string): Promise<SocialCase | null> {
    const db = getDatabase();
    return db.get('SELECT * FROM social_cases WHERE id = ?', [id]) || null;
  }

  async findByEmployee(employeeId: string): Promise<SocialCase[]> {
    const db = getDatabase();
    return db.all('SELECT * FROM social_cases WHERE employeeId = ? ORDER BY date DESC', [employeeId]);
  }

  async getAll(): Promise<SocialCase[]> {
    const db = getDatabase();
    return db.all('SELECT * FROM social_cases ORDER BY date DESC');
  }

  async update(id: string, data: Partial<SocialCase>): Promise<SocialCase | null> {
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
    if (updates.length === 0) return this.findById(id);
    updates.push('updatedAt = ?');
    values.push(now, id);
    await db.run(`UPDATE social_cases SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.run('DELETE FROM social_cases WHERE id = ?', [id]);
    return (result.changes || 0) > 0;
  }
}

export default new SocialCaseRepository();
