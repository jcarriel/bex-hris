import LeaveRepository from '@repositories/LeaveRepository';
import type { Leave } from '../types';
import logger from '@utils/logger';

export class LeaveService {
  async createLeave(leave: Omit<Leave, 'id' | 'createdAt' | 'updatedAt'>): Promise<Leave> {
    try {
      const result = await LeaveRepository.create(leave);
      logger.info(`Leave created for employee ${leave.employeeId}`);
      return result;
    } catch (error) {
      logger.error('Error creating leave', error);
      throw error;
    }
  }

  async getLeave(id: string): Promise<Leave | null> {
    try {
      return await LeaveRepository.findById(id);
    } catch (error) {
      logger.error('Error getting leave', error);
      throw error;
    }
  }

  async getLeaveByEmployee(employeeId: string): Promise<Leave[]> {
    try {
      console.log("entra 1")
      return await LeaveRepository.findByEmployee(employeeId);
    } catch (error) {
      logger.error('Error getting leave by employee', error);
      throw error;
    }
  }

  async getLeaveByEmployeeAndStatus(employeeId: string, status: string): Promise<Leave[]> {
    try {
      return await LeaveRepository.findByEmployeeAndStatus(employeeId, status);
    } catch (error) {
      logger.error('Error getting leave by employee and status', error);
      throw error;
    }
  }

  async getPendingLeaves(): Promise<Leave[]> {
    try {
      return await LeaveRepository.findPending();
    } catch (error) {
      logger.error('Error getting pending leaves', error);
      throw error;
    }
  }

  async getAllLeaves(): Promise<Leave[]> {
    try {
      return await LeaveRepository.getAll();
    } catch (error) {
      logger.error('Error getting all leaves', error);
      throw error;
    }
  }

  async approveLeave(id: string, approvedBy: string): Promise<Leave | null> {
    try {
      const now = new Date().toISOString();
      const leave = await LeaveRepository.update(id, {
        status: 'approved',
        approvedBy,
        approvedDate: now
      });
      logger.info(`Leave approved: ${id}`);
      return leave;
    } catch (error) {
      logger.error('Error approving leave', error);
      throw error;
    }
  }

  async rejectLeave(id: string): Promise<Leave | null> {
    try {
      const leave = await LeaveRepository.update(id, { status: 'rejected' });
      logger.info(`Leave rejected: ${id}`);
      return leave;
    } catch (error) {
      logger.error('Error rejecting leave', error);
      throw error;
    }
  }

  async updateLeave(id: string, data: Partial<Leave>): Promise<Leave | null> {
    try {
      const leave = await LeaveRepository.update(id, data);
      logger.info(`Leave updated: ${id}`);
      return leave;
    } catch (error) {
      logger.error('Error updating leave', error);
      throw error;
    }
  }

  async deleteLeave(id: string): Promise<boolean> {
    try {
      const result = await LeaveRepository.delete(id);
      if (result) {
        logger.info(`Leave deleted: ${id}`);
      }
      return result;
    } catch (error) {
      logger.error('Error deleting leave', error);
      throw error;
    }
  }
}

export default new LeaveService();
