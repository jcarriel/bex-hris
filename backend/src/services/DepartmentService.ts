import DepartmentRepository from '@repositories/DepartmentRepository';
import type { Department } from '../types';
import logger from '@utils/logger';

export class DepartmentService {
  async createDepartment(name: string, description?: string): Promise<Department> {
    try {
      const department = await DepartmentRepository.create(name, description);
      logger.info(`Department created: ${name}`);
      return department;
    } catch (error) {
      logger.error('Error creating department', error);
      throw error;
    }
  }

  async getDepartment(id: string): Promise<Department | null> {
    try {
      return await DepartmentRepository.findById(id);
    } catch (error) {
      logger.error('Error getting department', error);
      throw error;
    }
  }

  async getAllDepartments(): Promise<Department[]> {
    try {
      return await DepartmentRepository.findAll();
    } catch (error) {
      logger.error('Error getting departments', error);
      throw error;
    }
  }

  async updateDepartment(id: string, data: Partial<Department>): Promise<Department | null> {
    try {
      const department = await DepartmentRepository.update(id, data);
      logger.info(`Department updated: ${id}`);
      return department;
    } catch (error) {
      logger.error('Error updating department', error);
      throw error;
    }
  }

  async deleteDepartment(id: string): Promise<boolean> {
    try {
      const result = await DepartmentRepository.delete(id);
      if (result) {
        logger.info(`Department deleted: ${id}`);
      }
      return result;
    } catch (error) {
      logger.error('Error deleting department', error);
      throw error;
    }
  }
}

export default new DepartmentService();
