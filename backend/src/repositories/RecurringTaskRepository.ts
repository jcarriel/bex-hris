import { Database } from 'sqlite';
import { v4 as uuidv4 } from 'uuid';

export class RecurringTaskRepository {
  constructor(private db: Database) {}

  async create(taskData: any): Promise<any> {
    const id = uuidv4();
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO recurring_tasks (id, title, description, priority, dayOfWeek, isActive, createdBy, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        taskData.title,
        taskData.description || null,
        taskData.priority || 'medium',
        taskData.dayOfWeek,
        taskData.isActive !== false ? 1 : 0,
        taskData.createdBy,
        now,
        now,
      ]
    );

    return this.getById(id);
  }

  async getAll(): Promise<any[]> {
    const tasks = await this.db.all(
      `SELECT * FROM recurring_tasks ORDER BY dayOfWeek ASC`
    );
    return tasks || [];
  }

  async getActive(): Promise<any[]> {
    const tasks = await this.db.all(
      `SELECT * FROM recurring_tasks WHERE isActive = 1 ORDER BY dayOfWeek ASC`
    );
    return tasks || [];
  }

  async getById(id: string): Promise<any> {
    const task = await this.db.get(
      `SELECT * FROM recurring_tasks WHERE id = ?`,
      [id]
    );
    return task || null;
  }

  async getByDayOfWeek(dayOfWeek: number): Promise<any[]> {
    const tasks = await this.db.all(
      `SELECT * FROM recurring_tasks WHERE dayOfWeek = ? AND isActive = 1`,
      [dayOfWeek]
    );
    return tasks || [];
  }

  async update(id: string, taskData: any): Promise<any> {
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];

    if (taskData.title !== undefined) {
      updates.push('title = ?');
      values.push(taskData.title);
    }
    if (taskData.description !== undefined) {
      updates.push('description = ?');
      values.push(taskData.description);
    }
    if (taskData.priority !== undefined) {
      updates.push('priority = ?');
      values.push(taskData.priority);
    }
    if (taskData.dayOfWeek !== undefined) {
      updates.push('dayOfWeek = ?');
      values.push(taskData.dayOfWeek);
    }
    if (taskData.isActive !== undefined) {
      updates.push('isActive = ?');
      values.push(taskData.isActive ? 1 : 0);
    }

    updates.push('updatedAt = ?');
    values.push(now);
    values.push(id);

    if (updates.length > 1) {
      await this.db.run(
        `UPDATE recurring_tasks SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }

    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.run(
      `DELETE FROM recurring_tasks WHERE id = ?`,
      [id]
    );
    return (result.changes || 0) > 0;
  }

  async toggleActive(id: string): Promise<any> {
    const task = await this.getById(id);
    if (!task) return null;

    return this.update(id, { isActive: !task.isActive });
  }
}
