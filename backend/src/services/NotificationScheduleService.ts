import NotificationScheduleRepository, { NotificationSchedule } from '@repositories/NotificationScheduleRepository';
import logger from '@utils/logger';

export class NotificationScheduleService {
  async createSchedule(schedule: Omit<NotificationSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationSchedule> {
    try {
      const result = await NotificationScheduleRepository.create(schedule);
      logger.info(`Notification schedule created: ${schedule.type}`);
      return result;
    } catch (error) {
      logger.error('Error creating notification schedule', error);
      throw error;
    }
  }

  async getSchedule(id: string): Promise<NotificationSchedule | null> {
    try {
      return await NotificationScheduleRepository.findById(id);
    } catch (error) {
      logger.error('Error getting notification schedule', error);
      throw error;
    }
  }

  async getAllSchedules(): Promise<NotificationSchedule[]> {
    try {
      return await NotificationScheduleRepository.getAll();
    } catch (error) {
      logger.error('Error getting all notification schedules', error);
      throw error;
    }
  }

  async getEnabledSchedules(): Promise<NotificationSchedule[]> {
    try {
      return await NotificationScheduleRepository.getEnabled();
    } catch (error) {
      logger.error('Error getting enabled notification schedules', error);
      throw error;
    }
  }

  async getSchedulesByType(type: string): Promise<NotificationSchedule[]> {
    try {
      return await NotificationScheduleRepository.getByType(type);
    } catch (error) {
      logger.error('Error getting notification schedules by type', error);
      throw error;
    }
  }

  async updateSchedule(id: string, data: Partial<NotificationSchedule>): Promise<NotificationSchedule | null> {
    try {
      const schedule = await NotificationScheduleRepository.update(id, data);
      logger.info(`Notification schedule updated: ${id}`);
      return schedule;
    } catch (error) {
      logger.error('Error updating notification schedule', error);
      throw error;
    }
  }

  async deleteSchedule(id: string): Promise<boolean> {
    try {
      const result = await NotificationScheduleRepository.delete(id);
      if (result) {
        logger.info(`Notification schedule deleted: ${id}`);
      }
      return result;
    } catch (error) {
      logger.error('Error deleting notification schedule', error);
      throw error;
    }
  }
}

export default new NotificationScheduleService();
