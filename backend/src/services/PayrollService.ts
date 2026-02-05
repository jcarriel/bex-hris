import PayrollRepository from '@repositories/PayrollRepository';
import type { Payroll } from '../types';
import logger from '@utils/logger';

export class PayrollService {
  async createPayroll(payroll: Omit<Payroll, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payroll> {
    try {
      const result = await PayrollRepository.create(payroll);
      logger.info(`Payroll created for employee ${payroll.employeeId}`);
      return result;
    } catch (error) {
      logger.error('Error creating payroll', error);
      throw error;
    }
  }

  async getPayroll(id: string): Promise<Payroll | null> {
    try {
      return await PayrollRepository.findById(id);
    } catch (error) {
      logger.error('Error getting payroll', error);
      throw error;
    }
  }

  async getPayrollByEmployeeAndPeriod(employeeId: string, period: string): Promise<Payroll | null> {
    try {
      const [yearStr, monthStr] = period.includes('/') ? period.split('/') : period.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      if (isNaN(year) || isNaN(month)) throw new Error(`Invalid period: ${period}`);
      return await PayrollRepository.findByEmployeeAndPeriod(employeeId, year, month);
    } catch (error) {
      logger.error('Error getting payroll', error);
      throw error;
    }
  }

  async getPayrollByEmployee(employeeId: string, period: string): Promise<Payroll | null> {
    try {
      const [yearStr, monthStr] = period.includes('/') ? period.split('/') : period.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      if (isNaN(year) || isNaN(month)) throw new Error(`Invalid period: ${period}`);
      return await PayrollRepository.findByEmployeeAndPeriod(employeeId, year, month);
    } catch (error) {
      logger.error('Error getting payroll', error);
      throw error;
    }
  }

  async getPayrollByPeriod(period: string): Promise<Payroll[]> {
    try {
      const [yearStr, monthStr] = period.includes('/') ? period.split('/') : period.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      if (isNaN(year) || isNaN(month)) throw new Error(`Invalid period: ${period}`);
      const result = await PayrollRepository.findByPeriod(year, month);
      return result;
    } catch (error) {
      logger.error('Error getting payroll by period:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  async updatePayroll(id: string, data: Partial<Payroll>): Promise<Payroll | null> {
    try {
      const payroll = await PayrollRepository.update(id, data);
      return payroll;
    } catch (error) {
      logger.error('Error updating payroll', error);
      throw error;
    }
  }

  async deletePayroll(id: string): Promise<boolean> {
    try {
      const result = await PayrollRepository.delete(id);
      if (result) {
        logger.info(`Payroll deleted: ${id}`);
      }
      return result;
    } catch (error) {
      logger.error('Error deleting payroll', error);
      throw error;
    }
  }
}

export default new PayrollService();
