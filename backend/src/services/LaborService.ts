import LaborRepository from '../repositories/LaborRepository';
import type { Labor } from '../repositories/LaborRepository';
import logger from '@utils/logger';

class LaborService {
  async createLabor(name: string, description: string, positionId: string): Promise<Labor> {
    try {
      if (!name || !positionId) {
        throw new Error('Name and positionId are required');
      }
      return LaborRepository.create(name, description, positionId);
    } catch (error) {
      logger.error('Error creating labor', error);
      throw error;
    }
  }

  async getLabors(): Promise<Labor[]> {
    try {
      return LaborRepository.getAll();
    } catch (error) {
      logger.error('Error getting labors', error);
      throw error;
    }
  }

  async getLabor(id: string): Promise<Labor | null> {
    try {
      return LaborRepository.getById(id);
    } catch (error) {
      logger.error('Error getting labor', error);
      throw error;
    }
  }

  async getLaborsByPosition(positionId: string): Promise<Labor[]> {
    try {
      return LaborRepository.getByPositionId(positionId);
    } catch (error) {
      logger.error('Error getting labors by position', error);
      throw error;
    }
  }

  async updateLabor(id: string, name: string, description: string, positionId: string): Promise<Labor | null> {
    try {
      if (!name || !positionId) {
        throw new Error('Name and positionId are required');
      }
      return LaborRepository.update(id, name, description, positionId);
    } catch (error) {
      logger.error('Error updating labor', error);
      throw error;
    }
  }

  async deleteLabor(id: string): Promise<boolean> {
    try {
      return LaborRepository.delete(id);
    } catch (error) {
      logger.error('Error deleting labor', error);
      throw error;
    }
  }
}

export default new LaborService();
