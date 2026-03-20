import { TaskRepository } from '../repositories/TaskRepository';
import { getDatabase } from '../config/database';
import TaskNotificationService from './TaskNotificationService';
import RecurringTaskService from './RecurringTaskService';

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
    const task = await this.getRepository().create(taskData);
    
    // Enviar notificación de tarea creada
    if (taskData.createdBy) {
      try {
        const db = getDatabase();
        const creator = await db.get('SELECT id, username, email FROM users WHERE id = ?', [taskData.createdBy]);
        await TaskNotificationService.notifyTaskCreated(task, creator);
      } catch (error) {
        console.error('Error sending task creation notification:', error);
      }
    }
    
    return task;
  }

  async getAllTasks(): Promise<any[]> {
    return this.getRepository().getTasksWithCreatorInfo();
  }

  async getTaskById(id: string): Promise<any> {
    return this.getRepository().getById(id);
  }

  async updateTask(id: string, taskData: any, userId?: string): Promise<any> {
    const task = await this.getRepository().update(id, taskData);
    
    if (task) {
      try {
        const db = getDatabase();
        const updatedBy = userId 
          ? await db.get('SELECT id, username, email FROM users WHERE id = ?', [userId])
          : await db.get('SELECT id, username, email FROM users LIMIT 1');
        await TaskNotificationService.notifyTaskUpdated(task, updatedBy);
      } catch (error) {
        console.error('Error sending task update notification:', error);
      }
    }
    
    return task;
  }

  async deleteTask(id: string, userId?: string): Promise<boolean> {
    const task = await this.getRepository().getById(id);
    const result = await this.getRepository().delete(id);
    
    if (result && task) {
      try {
        const db = getDatabase();
        const deletedBy = userId
          ? await db.get('SELECT id, username, email FROM users WHERE id = ?', [userId])
          : await db.get('SELECT id, username, email FROM users LIMIT 1');
        await TaskNotificationService.notifyTaskDeleted(task, deletedBy);
      } catch (error) {
        console.error('Error sending task deletion notification:', error);
      }
    }
    
    return result;
  }

  async getTasksByStatus(status: string): Promise<any[]> {
    return this.getRepository().getByStatus(status);
  }

  async getTasksByDueDate(date: string): Promise<any[]> {
    return this.getRepository().getByDueDate(date);
  }

  async getTodayTasks(): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];
    const tasks = await this.getRepository().getByDueDate(today);
    return tasks.filter(t => t.status === 'pending');
  }

  async getUpcomingTasks(): Promise<any[]> {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startDate = today.toISOString().split('T')[0];
    const endDate = nextWeek.toISOString().split('T')[0];
    const tasks = await this.getRepository().getTasksByDateRange(startDate, endDate);
    return tasks.filter(t => t.status === 'pending');
  }

  async getCompletedTasks(): Promise<any[]> {
    return this.getRepository().getCompletedTasks();
  }

  async getPendingTasks(): Promise<any[]> {
    return this.getRepository().getPendingTasks();
  }

  async markTaskAsCompleted(id: string, completionNotes?: string, userId?: string): Promise<any> {
    const task = await this.getRepository().markAsCompleted(id, completionNotes);
    
    // Generar siguiente tarea recurrente si aplica
    if (task) {
      try {
        await RecurringTaskService.handleTaskCompletion(id);
      } catch (error) {
        console.error('Error generating next recurring task:', error);
      }
    }
    
    // Enviar notificación de tarea completada
    if (task) {
      try {
        const db = getDatabase();
        const completedBy = userId
          ? await db.get('SELECT id, username, email FROM users WHERE id = ?', [userId])
          : await db.get('SELECT id, username, email FROM users LIMIT 1');
        await TaskNotificationService.notifyTaskCompleted(task, completedBy);
      } catch (error) {
        console.error('Error sending task completion notification:', error);
      }
    }
    
    return task;
  }

  async markTaskAsPending(id: string, userId?: string): Promise<any> {
    const task = await this.getRepository().markAsPending(id);
    
    if (task) {
      try {
        const db = getDatabase();
        const reopenedBy = userId
          ? await db.get('SELECT id, username, email FROM users WHERE id = ?', [userId])
          : await db.get('SELECT id, username, email FROM users LIMIT 1');
        await TaskNotificationService.notifyTaskReopened(task, reopenedBy);
      } catch (error) {
        console.error('Error sending task reopened notification:', error);
      }
    }
    
    return task;
  }

  async getTasksGroupedByDate(): Promise<any> {
    const allTasks = await this.getAllTasks();
    const grouped: { [key: string]: any[] } = {};

    allTasks.forEach((task: any) => {
      const date = task.dueDate.split('T')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(task);
    });

    return grouped;
  }

  async getTaskStats(): Promise<any> {
    const allTasks = await this.getAllTasks();
    const pending = allTasks.filter(t => t.status === 'pending');
    const completed = allTasks.filter(t => t.status === 'completed');
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = pending.filter(t => t.dueDate.split('T')[0] === today);

    return {
      total: allTasks.length,
      pending: pending.length,
      completed: completed.length,
      today: todayTasks.length,
      completionRate: allTasks.length > 0 ? Math.round((completed.length / allTasks.length) * 100) : 0,
    };
  }
}

export const TaskService = new TaskServiceClass();
