import { Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import { getDatabase } from '@config/database';
import { v4 as uuidv4 } from 'uuid';

export class CatalogController {
  async getByType(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const db = getDatabase();
      const items = await db.all(
        'SELECT * FROM catalogs WHERE type = ? ORDER BY value',
        [type]
      );
      res.status(200).json({ success: true, data: items });
    } catch (error) {
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { type, value, description } = req.body;
      if (!type || !value) {
        res.status(400).json({ success: false, message: 'type and value are required' });
        return;
      }
      const db = getDatabase();
      const id = uuidv4();
      const now = new Date().toISOString();
      await db.run(
        'INSERT INTO catalogs (id, type, value, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        [id, type, value.trim().toUpperCase(), description || null, now, now]
      );
      const item = await db.get('SELECT * FROM catalogs WHERE id = ?', [id]);
      res.status(201).json({ success: true, data: item });
    } catch (error: any) {
      if (error.message?.includes('UNIQUE')) {
        res.status(400).json({ success: false, message: 'El valor ya existe en este catálogo' });
      } else {
        res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
      }
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { value, description } = req.body;
      if (!value) {
        res.status(400).json({ success: false, message: 'value is required' });
        return;
      }
      const db = getDatabase();
      const now = new Date().toISOString();
      await db.run(
        'UPDATE catalogs SET value = ?, description = ?, updatedAt = ? WHERE id = ?',
        [value.trim().toUpperCase(), description || null, now, id]
      );
      const item = await db.get('SELECT * FROM catalogs WHERE id = ?', [id]);
      if (!item) {
        res.status(404).json({ success: false, message: 'Not found' });
        return;
      }
      res.status(200).json({ success: true, data: item });
    } catch (error) {
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const db = getDatabase();
      const result = await db.run('DELETE FROM catalogs WHERE id = ?', [id]);
      if (result.changes === 0) {
        res.status(404).json({ success: false, message: 'Not found' });
        return;
      }
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }
}

export default new CatalogController();
