import { TaskRepository } from '../repositories/TaskRepository';
import { getDatabase } from '../config/database';

class TaskServiceClass {
  private taskRepository: TaskRepository | null = null;

  private getRepository(): TaskRepository {
    if (!this.taskRepository) {
      const db = getDatabase();
      this.taskRepository = new TaskRepository(db);
    }
    return this.taskRepository;
  }

  async createTask(taskData: any): Promise<any> {
    return this.getRepository().create(taskData);
  }

  async getAllTasks(): Promise<any[]> {
    return this.getRepository().getAll();
  }

  async getTaskById(id: string): Promise<any> {
    return this.getRepository().getById(id);
  }

  async updateTask(id: string, taskData: any): Promise<any> {
    return this.getRepository().update(id, taskData);
  }

  async deleteTask(id: string): Promise<boolean> {
    return this.getRepository().delete(id);
  }

  async getTasksByStatus(status: string): Promise<any[]> {
    return this.getRepository().getByStatus(status);
  }

  async getTasksByDueDate(date: string): Promise<any[]> {
    return this.getRepository().getByDueDate(date);
  }
}

export const TaskService = new TaskServiceClass();
