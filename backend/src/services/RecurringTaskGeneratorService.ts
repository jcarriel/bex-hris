import cron from 'node-cron';
import RecurringTaskService from './RecurringTaskService';
import logger from '@utils/logger';

class RecurringTaskGeneratorService {
  private initialized = false;

  initialize(): void {
    if (this.initialized) {
      return;
    }

    // Run every day at midnight to generate recurring tasks for today
    cron.schedule('0 0 * * *', async () => {
      logger.info('Running daily recurring task generation');
      await this.generateTasksForToday();
    });

    // Also run at startup to ensure tasks are generated for today
    this.generateTasksForToday();

    this.initialized = true;
    logger.info('Recurring task generator initialized');
  }

  private async generateTasksForToday(): Promise<void> {
    try {
      await RecurringTaskService.generateTasksForToday();
    } catch (error) {
      logger.error('Error generating tasks for today', error);
    }
  }
}

export default new RecurringTaskGeneratorService();
