import { Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import RecurringTaskService from '@services/RecurringTaskService';
import logger from '@utils/logger';

export class RecurringTaskController {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { title, description, priority, dayOfWeek } = req.body;
      const userId = req.userId;

      if (!title || dayOfWeek === undefined) {
        res.status(400).json({
          success: false,
          message: 'Title and dayOfWeek are required',
        });
        return;
      }

      if (dayOfWeek < 0 || dayOfWeek > 6) {
        res.status(400).json({
          success: false,
          message: 'dayOfWeek must be between 0 (Sunday) and 6 (Saturday)',
        });
        return;
      }

      const task = await RecurringTaskService.createRecurringTask({
        title,
        description,
        priority: priority || 'medium',
        dayOfWeek,
        createdBy: userId,
      });

      res.status(201).json({
        success: true,
        message: 'Recurring task created successfully',
        data: task,
      });
    } catch (error) {
      logger.error('Error creating recurring task', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create recurring task',
      });
    }
  }

  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tasks = await RecurringTaskService.getRecurringTasks();
      res.status(200).json({
        success: true,
        data: tasks,
      });
    } catch (error) {
      logger.error('Error fetching recurring tasks', error);
      res.status(400).json({
        success: false,
        message: 'Failed to fetch recurring tasks',
      });
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const task = await RecurringTaskService.getRecurringTaskById(id);

      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Recurring task not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: task,
      });
    } catch (error) {
      logger.error('Error fetching recurring task', error);
      res.status(400).json({
        success: false,
        message: 'Failed to fetch recurring task',
      });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, description, priority, dayOfWeek, isActive } = req.body;

      if (dayOfWeek !== undefined && (dayOfWeek < 0 || dayOfWeek > 6)) {
        res.status(400).json({
          success: false,
          message: 'dayOfWeek must be between 0 (Sunday) and 6 (Saturday)',
        });
        return;
      }

      const task = await RecurringTaskService.updateRecurringTask(id, {
        title,
        description,
        priority,
        dayOfWeek,
        isActive,
      });

      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Recurring task not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Recurring task updated successfully',
        data: task,
      });
    } catch (error) {
      logger.error('Error updating recurring task', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update recurring task',
      });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await RecurringTaskService.deleteRecurringTask(id);

      if (!result) {
        res.status(404).json({
          success: false,
          message: 'Recurring task not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Recurring task deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting recurring task', error);
      res.status(400).json({
        success: false,
        message: 'Failed to delete recurring task',
      });
    }
  }

  async toggleActive(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const task = await RecurringTaskService.toggleRecurringTaskActive(id);

      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Recurring task not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Recurring task toggled successfully',
        data: task,
      });
    } catch (error) {
      logger.error('Error toggling recurring task', error);
      res.status(400).json({
        success: false,
        message: 'Failed to toggle recurring task',
      });
    }
  }
}

export default new RecurringTaskController();
