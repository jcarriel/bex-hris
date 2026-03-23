import { Request, Response } from 'express';
import { getDatabase } from '@config/database';
import { v4 as uuidv4 } from 'uuid';

class WorkforceController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const { year } = req.query;
      let query = `SELECT id, week, year, department, cajas_realizadas, dias_proceso, created_by, created_at, updated_at FROM workforce_reports`;
      const params: any[] = [];
      if (year) { query += ` WHERE year = ?`; params.push(year); }
      query += ` ORDER BY year DESC, week DESC`;
      const rows = await db.all(query, params);
      res.json({ success: true, data: rows });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error fetching reports' });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const row = await db.get(`SELECT * FROM workforce_reports WHERE id = ?`, [req.params.id]);
      if (!row) { res.status(404).json({ success: false, message: 'Report not found' }); return; }
      res.json({ success: true, data: { ...row, data: JSON.parse(row.data || '{}') } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error fetching report' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const userId = (req as any).user?.id;
      const { week, year, department, cajas_realizadas, dias_proceso, data } = req.body;
      if (!week || !year) { res.status(400).json({ success: false, message: 'Semana y año requeridos' }); return; }
      const id = uuidv4();
      const now = new Date().toISOString();
      await db.run(
        `INSERT INTO workforce_reports (id, week, year, department, cajas_realizadas, dias_proceso, data, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, week, year, department || 'BIOEXPORTVAL', cajas_realizadas ?? null, dias_proceso ?? null,
         JSON.stringify(data || {}), userId, now, now],
      );
      const row = await db.get(`SELECT * FROM workforce_reports WHERE id = ?`, [id]);
      res.status(201).json({ success: true, data: { ...row, data: JSON.parse(row.data || '{}') } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error creating report' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const existing = await db.get(`SELECT id FROM workforce_reports WHERE id = ?`, [req.params.id]);
      if (!existing) { res.status(404).json({ success: false, message: 'Report not found' }); return; }
      const { week, year, department, cajas_realizadas, dias_proceso, data } = req.body;
      const now = new Date().toISOString();
      await db.run(
        `UPDATE workforce_reports SET week=?, year=?, department=?, cajas_realizadas=?, dias_proceso=?, data=?, updated_at=? WHERE id=?`,
        [week, year, department, cajas_realizadas ?? null, dias_proceso ?? null,
         JSON.stringify(data || {}), now, req.params.id],
      );
      const row = await db.get(`SELECT * FROM workforce_reports WHERE id = ?`, [req.params.id]);
      res.json({ success: true, data: { ...row, data: JSON.parse(row.data || '{}') } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error updating report' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const result = await db.run(`DELETE FROM workforce_reports WHERE id = ?`, [req.params.id]);
      if (!result.changes) { res.status(404).json({ success: false, message: 'Report not found' }); return; }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error deleting report' });
    }
  }
}

export default new WorkforceController();
