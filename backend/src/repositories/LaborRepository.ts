import { getDatabase } from '@config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '@utils/logger';

export interface Labor {
  id: string;
  name: string;
  description?: string;
  positionId: string;
  createdAt: string;
  updatedAt: string;
}

class LaborRepository {
  async create(name: string, description: string, positionId: string): Promise<Labor> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO labores (id, name, description, positionId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, description || null, positionId, now, now]
    );

    logger.info(`Labor created: ${id}`);
    return this.getById(id) as Promise<Labor>;
  }

  async getAll(): Promise<Labor[]> {
    const db = getDatabase();
    return db.all('SELECT * FROM labores ORDER BY name');
  }

  async getById(id: string): Promise<Labor | null> {
    const db = getDatabase();
    return db.get('SELECT * FROM labores WHERE id = ?', [id]) || null;
  }

  async getByPositionId(positionId: string): Promise<Labor[]> {
    const db = getDatabase();
    return db.all('SELECT * FROM labores WHERE positionId = ? ORDER BY name', [positionId]);
  }

  async update(id: string, name: string, description: string, positionId: string): Promise<Labor | null> {
    const db = getDatabase();
    const now = new Date().toISOString();

    await db.run(
      `UPDATE labores SET name = ?, description = ?, positionId = ?, updatedAt = ? WHERE id = ?`,
      [name, description || null, positionId, now, id]
    );

    logger.info(`Labor updated: ${id}`);
    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.run('DELETE FROM labores WHERE id = ?', [id]);
    logger.info(`Labor deleted: ${id}`);
    return (result.changes ?? 0) > 0;
  }
}

export default new LaborRepository();
