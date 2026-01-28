import { Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import EmployeeService from '@services/EmployeeService';
import logger from '@utils/logger';

export class EmployeeController {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const employeeData = req.body;

      if (!employeeData.firstName || !employeeData.lastName || !employeeData.email || !employeeData.cedula || !employeeData.departmentId || !employeeData.positionId) {
        res.status(400).json({
          success: false,
          message: 'First name, last name, email, cedula, department ID, and position ID are required',
        });
        return;
      }

      const employee = await EmployeeService.createEmployee(employeeData);

      res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        data: employee,
      });
    } catch (error) {
      logger.error('Create employee error', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create employee',
      });
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const employee = await EmployeeService.getEmployee(id);

      if (!employee) {
        res.status(404).json({
          success: false,
          message: 'Employee not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: employee,
      });
    } catch (error) {
      logger.error('Get employee error', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get employee',
      });
    }
  }

  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      const filters: Record<string, unknown> = {};
      if (req.query.departmentId) filters.departmentId = req.query.departmentId;
      if (req.query.status) filters.status = req.query.status;

      const result = await EmployeeService.getEmployees(
        { page, limit, offset },
        filters
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Get employees error', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get employees',
      });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const employee = await EmployeeService.updateEmployee(id, updateData);

      if (!employee) {
        res.status(404).json({
          success: false,
          message: 'Employee not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Employee updated successfully',
        data: employee,
      });
    } catch (error) {
      logger.error('Update employee error', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update employee',
      });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await EmployeeService.deleteEmployee(id);

      if (!result) {
        res.status(404).json({
          success: false,
          message: 'Employee not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Employee deleted successfully',
      });
    } catch (error) {
      logger.error('Delete employee error', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete employee',
      });
    }
  }

  async terminate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { terminationDate, reason } = req.body;

      if (!terminationDate || !reason) {
        res.status(400).json({
          success: false,
          message: 'Termination date and reason are required',
        });
        return;
      }

      const employee = await EmployeeService.terminateEmployee(id, terminationDate, reason);

      if (!employee) {
        res.status(404).json({
          success: false,
          message: 'Employee not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Employee terminated successfully',
        data: employee,
      });
    } catch (error) {
      logger.error('Terminate employee error', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to terminate employee',
      });
    }
  }

  async getExpiringContracts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 30;

      const employees = await EmployeeService.getEmployeesWithExpiringContracts(days);

      res.status(200).json({
        success: true,
        data: employees,
      });
    } catch (error) {
      logger.error('Get expiring contracts error', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get expiring contracts',
      });
    }
  }
}

export default new EmployeeController();
