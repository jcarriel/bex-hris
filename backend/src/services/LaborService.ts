import LaborRepository from '../repositories/LaborRepository';
import logger from '@utils/logger';

interface Labor {
  id: string;
  name: string;
  description?: string;
  positionId: string;
  createdAt: string;
  updatedAt: string;
}

class LaborService {
  createLabor(name: string, description: string, positionId: string): Labor {
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

  getLabors(): Labor[] {
    try {
      return LaborRepository.getAll();
    } catch (error) {
      logger.error('Error getting labors', error);
      throw error;
    }
  }

  getLabor(id: string): Labor | undefined {
    try {
      return LaborRepository.getById(id);
    } catch (error) {
      logger.error('Error getting labor', error);
      throw error;
    }
  }

  getLaborsByPosition(positionId: string): Labor[] {
    try {
      return LaborRepository.getByPositionId(positionId);
    } catch (error) {
      logger.error('Error getting labors by position', error);
      throw error;
    }
  }

  updateLabor(id: string, name: string, description: string, positionId: string): Labor | undefined {
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

  deleteLabor(id: string): boolean {
    try {
      return LaborRepository.delete(id);
    } catch (error) {
      logger.error('Error deleting labor', error);
      throw error;
    }
  }
}

export default new LaborService();
