import { getDatabase } from '@config/database';
import { RecurringTaskRepository } from '@repositories/RecurringTaskRepository';
import { TaskRepository } from '@repositories/TaskRepository';
import logger from '@utils/logger';

class RecurringTaskService {
  private recurringTaskRepository: RecurringTaskRepository | null = null;
  private taskRepository: TaskRepository | null = null;

  private getRepositories() {
    if (!this.recurringTaskRepository || !this.taskRepository) {
      const db = getDatabase();
      this.recurringTaskRepository = new RecurringTaskRepository(db);
      this.taskRepository = new TaskRepository(db);
    }
    return {
      recurringTaskRepository: this.recurringTaskRepository,
      taskRepository: this.taskRepository,
    };
  }

  async createRecurringTask(taskData: any): Promise<any> {
    try {
      const { recurringTaskRepository, taskRepository } = this.getRepositories();
      const task = await recurringTaskRepository.create(taskData);
      logger.info(`Recurring task created: ${task.title}`);

      // Generate the first task instance immediately
      const nextDate = this.getNextDateForDay(task.dayOfWeek);
      const firstTaskData = {
        title: task.title,
        description: task.description,
        dueDate: nextDate,
        priority: task.priority,
        status: 'pending',
        createdBy: task.createdBy,
        recurringTaskId: task.id,
        isRecurringInstance: 1,
      };
      await taskRepository.create(firstTaskData);
      logger.info(`Generated first instance of recurring task: ${task.title} for ${nextDate}`);

      return task;
    } catch (error) {
      logger.error('Error creating recurring task', error);
      throw error;
    }
  }

  private getNextDateForDay(dayOfWeek: number): string {
    const today = new Date();
    const todayDay = today.getDay();
    let daysUntil = dayOfWeek - todayDay;
    if (daysUntil < 0) {
      daysUntil += 7;
    }
    const targetDate = new Date(today);
    if (daysUntil > 0) {
      targetDate.setDate(today.getDate() + daysUntil);
    }
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T12:00:00.000Z`;
  }

  async getRecurringTasks(): Promise<any[]> {
    try {
      const { recurringTaskRepository } = this.getRepositories();
      return await recurringTaskRepository.getAll();
    } catch (error) {
      logger.error('Error fetching recurring tasks', error);
      throw error;
    }
  }

  async getRecurringTaskById(id: string): Promise<any> {
    try {
      const { recurringTaskRepository } = this.getRepositories();
      return await recurringTaskRepository.getById(id);
    } catch (error) {
      logger.error('Error fetching recurring task', error);
      throw error;
    }
  }

  async updateRecurringTask(id: string, taskData: any): Promise<any> {
    try {
      const { recurringTaskRepository } = this.getRepositories();
      const task = await recurringTaskRepository.update(id, taskData);
      logger.info(`Recurring task updated: ${id}`);
      return task;
    } catch (error) {
      logger.error('Error updating recurring task', error);
      throw error;
    }
  }

  async deleteRecurringTask(id: string): Promise<boolean> {
    try {
      const { recurringTaskRepository } = this.getRepositories();
      const result = await recurringTaskRepository.delete(id);
      logger.info(`Recurring task deleted: ${id}`);
      return result;
    } catch (error) {
      logger.error('Error deleting recurring task', error);
      throw error;
    }
  }

  async toggleRecurringTaskActive(id: string): Promise<any> {
    try {
      const { recurringTaskRepository } = this.getRepositories();
      const task = await recurringTaskRepository.toggleActive(id);
      logger.info(`Recurring task toggled: ${id}`);
      return task;
    } catch (error) {
      logger.error('Error toggling recurring task', error);
      throw error;
    }
  }

  private toNoonUTC(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T12:00:00.000Z`;
  }

  async generateTasksForToday(): Promise<void> {
    try {
      const { recurringTaskRepository, taskRepository } = this.getRepositories();
      
      const today = new Date();
      const dayOfWeek = today.getDay();
      const todayNoon = this.toNoonUTC(today);

      const recurringTasks = await recurringTaskRepository.getByDayOfWeek(dayOfWeek);

      for (const recurringTask of recurringTasks) {
        const existingTask = await (getDatabase() as any).get(
          `SELECT id FROM tasks WHERE recurringTaskId = ? AND DATE(dueDate) = DATE(?)`,
          [recurringTask.id, todayNoon]
        );

        if (!existingTask) {
          const taskData = {
            title: recurringTask.title,
            description: recurringTask.description,
            dueDate: todayNoon,
            priority: recurringTask.priority,
            status: 'pending',
            createdBy: recurringTask.createdBy,
            recurringTaskId: recurringTask.id,
            isRecurringInstance: 1,
          };

          await taskRepository.create(taskData);
          logger.info(`Generated recurring task: ${recurringTask.title} for ${todayNoon}`);
        }
      }
    } catch (error) {
      logger.error('Error generating tasks for today', error);
    }
  }

  async handleTaskCompletion(taskId: string): Promise<void> {
    try {
      const { taskRepository, recurringTaskRepository } = this.getRepositories();
      
      const task = await taskRepository.getById(taskId);
      
      if (task && task.recurringTaskId && task.isRecurringInstance) {
        const recurringTask = await recurringTaskRepository.getById(task.recurringTaskId);
        
        if (recurringTask) {
          // Generate next task for 7 days from now
          const nextDate = new Date(task.dueDate);
          nextDate.setDate(nextDate.getDate() + 7);
          const nextDateStr = this.toNoonUTC(nextDate);

          const nextTaskData = {
            title: recurringTask.title,
            description: recurringTask.description,
            dueDate: nextDateStr,
            priority: recurringTask.priority,
            status: 'pending',
            createdBy: recurringTask.createdBy,
            recurringTaskId: recurringTask.id,
            isRecurringInstance: 1,
          };

          await taskRepository.create(nextTaskData);
          logger.info(`Generated next recurring task: ${recurringTask.title} for ${nextDateStr}`);
        }
      }
    } catch (error) {
      logger.error('Error handling task completion', error);
    }
  }
}

export default new RecurringTaskService();
