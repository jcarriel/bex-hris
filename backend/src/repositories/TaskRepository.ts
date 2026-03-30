import type { DbAdapter as Database } from '@config/database';
import { v4 as uuidv4 } from 'uuid';

export class TaskRepository {
  constructor(private db: Database) {}

  async create(taskData: any): Promise<any> {
    const id = uuidv4();
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO tasks (id, title, description, dueDate, status, priority, assignedTo, createdBy, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        taskData.title,
        taskData.description || null,
        taskData.dueDate,
        taskData.status || 'pending',
        taskData.priority || 'medium',
        taskData.assignedTo || null,
        taskData.createdBy || null,
        now,
        now,
      ]
    );

    return this.getById(id);
  }

  async getAll(): Promise<any[]> {
    const tasks = await this.db.all(
      `SELECT * FROM tasks ORDER BY dueDate ASC`
    );
    return tasks || [];
  }

  async getById(id: string): Promise<any> {
    const task = await this.db.get(
      `SELECT * FROM tasks WHERE id = ?`,
      [id]
    );
    return task || null;
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
    if (taskData.dueDate !== undefined) {
      updates.push('dueDate = ?');
      values.push(taskData.dueDate);
    }
    if (taskData.status !== undefined) {
      updates.push('status = ?');
      values.push(taskData.status);
    }
    if (taskData.priority !== undefined) {
      updates.push('priority = ?');
      values.push(taskData.priority);
    }
    if (taskData.assignedTo !== undefined) {
      updates.push('assignedTo = ?');
      values.push(taskData.assignedTo);
    }
    if (taskData.completionNotes !== undefined) {
      updates.push('completionNotes = ?');
      values.push(taskData.completionNotes);
    }
    if (taskData.completedAt !== undefined) {
      updates.push('completedAt = ?');
      values.push(taskData.completedAt);
    }

    updates.push('updatedAt = ?');
    values.push(now);
    values.push(id);

    if (updates.length > 1) {
      await this.db.run(
        `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }

    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.run(
      `DELETE FROM tasks WHERE id = ?`,
      [id]
    );
    return (result.changes || 0) > 0;
  }

  async getByStatus(status: string): Promise<any[]> {
    const tasks = await this.db.all(
      `SELECT * FROM tasks WHERE status = ? ORDER BY dueDate ASC`,
      [status]
    );
    return tasks || [];
  }

  async getByDueDate(date: string): Promise<any[]> {
    const tasks = await this.db.all(
      `SELECT * FROM tasks WHERE DATE(dueDate) = DATE(?) ORDER BY dueDate ASC`,
      [date]
    );
    return tasks || [];
  }

  async getTasksByDateRange(startDate: string, endDate: string): Promise<any[]> {
    const tasks = await this.db.all(
      `SELECT * FROM tasks WHERE DATE(dueDate) BETWEEN DATE(?) AND DATE(?) ORDER BY dueDate ASC`,
      [startDate, endDate]
    );
    return tasks || [];
  }

  async getCompletedTasks(): Promise<any[]> {
    const tasks = await this.db.all(
      `SELECT * FROM tasks WHERE status = 'completed' ORDER BY updatedAt DESC`
    );
    return tasks || [];
  }

  async getPendingTasks(): Promise<any[]> {
    const tasks = await this.db.all(
      `SELECT * FROM tasks WHERE status = 'pending' ORDER BY dueDate ASC`
    );
    return tasks || [];
  }

  async getTasksWithCreatorInfo(): Promise<any[]> {
    const tasks = await this.db.all(
      `SELECT t.*, u.email as creatorEmail, u.username as creatorName 
       FROM tasks t 
       LEFT JOIN users u ON t.createdBy = u.id 
       ORDER BY t.dueDate ASC`
    );
    return tasks || [];
  }

  async markAsCompleted(id: string, completionNotes?: string): Promise<any> {
    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE tasks SET status = 'completed', completionNotes = ?, completedAt = ?, updatedAt = ? WHERE id = ?`,
      [completionNotes || null, now, now, id]
    );
    return this.getById(id);
  }

  async markAsPending(id: string): Promise<any> {
    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE tasks SET status = 'pending', updatedAt = ? WHERE id = ?`,
      [now, id]
    );
    return this.getById(id);
  }
}
