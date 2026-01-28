import PositionRepository from '@repositories/PositionRepository';
import type { Position } from '../types';
import logger from '@utils/logger';

export class PositionService {
  async createPosition(name: string, departmentId: string, description?: string, salaryMin?: number, salaryMax?: number): Promise<Position> {
    try {
      const position = await PositionRepository.create(name, departmentId, description, salaryMin, salaryMax);
      logger.info(`Position created: ${name}`);
      return position;
    } catch (error) {
      logger.error('Error creating position', error);
      throw error;
    }
  }

  async getPosition(id: string): Promise<Position | null> {
    try {
      return await PositionRepository.findById(id);
    } catch (error) {
      logger.error('Error getting position', error);
      throw error;
    }
  }

  async getPositionsByDepartment(departmentId: string): Promise<Position[]> {
    try {
      return await PositionRepository.findByDepartment(departmentId);
    } catch (error) {
      logger.error('Error getting positions by department', error);
      throw error;
    }
  }

  async getAllPositions(): Promise<Position[]> {
    try {
      return await PositionRepository.findAll();
    } catch (error) {
      logger.error('Error getting positions', error);
      throw error;
    }
  }

  async updatePosition(id: string, data: Partial<Position>): Promise<Position | null> {
    try {
      const position = await PositionRepository.update(id, data);
      logger.info(`Position updated: ${id}`);
      return position;
    } catch (error) {
      logger.error('Error updating position', error);
      throw error;
    }
  }

  async deletePosition(id: string): Promise<boolean> {
    try {
      const result = await PositionRepository.delete(id);
      if (result) {
        logger.info(`Position deleted: ${id}`);
      }
      return result;
    } catch (error) {
      logger.error('Error deleting position', error);
      throw error;
    }
  }
}

export default new PositionService();
