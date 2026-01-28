import { getDatabase } from '@config/database';
import { v4 as uuidv4 } from 'uuid';

export class DocumentCategoryRepository {
  async create(name: string, description?: string): Promise<any> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO document_categories (id, name, description, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?)`,
      [id, name, description || null, now, now]
    );

    return this.findById(id);
  }

  async findById(id: string): Promise<any> {
    const db = getDatabase();
    const result = await db.get('SELECT * FROM document_categories WHERE id = ?', [id]);
    return (result as any) || null;
  }

  async findByName(name: string): Promise<any> {
    const db = getDatabase();
    const result = await db.get('SELECT * FROM document_categories WHERE name = ?', [name]);
    return (result as any) || null;
  }

  async findAll(): Promise<any[]> {
    const db = getDatabase();
    return db.all('SELECT * FROM document_categories ORDER BY name');
  }

  async update(id: string, data: Partial<any>): Promise<any> {
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
      `UPDATE document_categories SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.run('DELETE FROM document_categories WHERE id = ?', [id]);
    return (result.changes ?? 0) > 0;
  }
}

export default new DocumentCategoryRepository();
