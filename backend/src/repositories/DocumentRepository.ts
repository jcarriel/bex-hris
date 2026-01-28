import { getDatabase } from '@config/database';
import { v4 as uuidv4 } from 'uuid';

export class DocumentRepository {
  async create(employeeId: string, name: string, type: string, filePath: string, fileSize: number, mimeType: string, uploadedBy?: string): Promise<any> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();
    const userId = uploadedBy || 'system-upload'; // Usar un ID de sistema

    await db.run(
      `INSERT INTO documents (id, employeeId, documentType, fileName, filePath, fileSize, uploadedBy, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, employeeId, type, name, filePath, fileSize, userId, now, now]
    );

    return this.findById(id);
  }

  async findById(id: string): Promise<any> {
    const db = getDatabase();
    return db.get('SELECT * FROM documents WHERE id = ?', [id]) || null;
  }

  async findByEmployee(employeeId: string): Promise<any[]> {
    const db = getDatabase();
    const result = await db.all('SELECT * FROM documents WHERE employeeId = ? ORDER BY createdAt DESC', [employeeId]);
    return result || [];
  }

  async findByType(type: string): Promise<any[]> {
    const db = getDatabase();
    const result = await db.all('SELECT * FROM documents WHERE documentType = ? ORDER BY createdAt DESC', [type]);
    return result || [];
  }

  async findAll(): Promise<any[]> {
    const db = getDatabase();
    const result = await db.all('SELECT * FROM documents ORDER BY createdAt DESC');
    return result || [];
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
      `UPDATE documents SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.run('DELETE FROM documents WHERE id = ?', [id]);
    return (result.changes || 0) > 0;
  }

  async deleteByEmployee(employeeId: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.run('DELETE FROM documents WHERE employeeId = ?', [employeeId]);
    return (result.changes || 0) > 0;
  }
}

export default new DocumentRepository();
