import AttendanceRepository from '@repositories/AttendanceRepository';
import type { Attendance } from '../types';
import logger from '@utils/logger';

export class AttendanceService {
  async createAttendance(attendance: Omit<Attendance, 'id' | 'createdAt' | 'updatedAt'>): Promise<Attendance> {
    try {
      const result = await AttendanceRepository.create(attendance);
      logger.info(`Attendance created for employee ${attendance.employeeId}`);
      return result;
    } catch (error) {
      logger.error('Error creating attendance', error);
      throw error;
    }
  }

  async getAttendance(id: string): Promise<Attendance | null> {
    try {
      return await AttendanceRepository.findById(id);
    } catch (error) {
      logger.error('Error getting attendance', error);
      throw error;
    }
  }

  async getAttendanceByEmployeeAndDate(employeeId: string, date: string): Promise<Attendance | null> {
    try {
      return await AttendanceRepository.findByEmployeeAndDate(employeeId, date);
    } catch (error) {
      logger.error('Error getting attendance', error);
      throw error;
    }
  }

  async getAttendanceByEmployee(employeeId: string, startDate?: string, endDate?: string): Promise<Attendance[]> {
    try {
      return await AttendanceRepository.findByEmployee(employeeId, startDate, endDate);
    } catch (error) {
      logger.error('Error getting attendance by employee', error);
      throw error;
    }
  }

  async getAttendanceByDate(date: string): Promise<Attendance[]> {
    try {
      return await AttendanceRepository.findByDate(date);
    } catch (error) {
      logger.error('Error getting attendance by date', error);
      throw error;
    }
  }

  async updateAttendance(id: string, data: Partial<Attendance>): Promise<Attendance | null> {
    try {
      const attendance = await AttendanceRepository.update(id, data);
      logger.info(`Attendance updated: ${id}`);
      return attendance;
    } catch (error) {
      logger.error('Error updating attendance', error);
      throw error;
    }
  }

  async deleteAttendance(id: string): Promise<boolean> {
    try {
      const result = await AttendanceRepository.delete(id);
      if (result) {
        logger.info(`Attendance deleted: ${id}`);
      }
      return result;
    } catch (error) {
      logger.error('Error deleting attendance', error);
      throw error;
    }
  }
}

export default new AttendanceService();
