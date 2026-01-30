import EmployeeRepository from '@repositories/EmployeeRepository';
import NotificationService from '@notifications/NotificationService';
import type { Employee, PaginationParams, PaginatedResponse } from '../types';
import logger from '@utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class EmployeeService {
  async createEmployee(
    employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Employee> {
    try {
      // Generate employee number if not provided
      if (!employeeData.employeeNumber) {
        employeeData.employeeNumber = `EMP-${Date.now()}`;
      }

      const employee = await EmployeeRepository.create(employeeData);
      logger.info(`Employee created: ${employee.employeeNumber}`);

      // Send notification
      await NotificationService.sendViaChannel('app', {
        to: employee.email,
        title: 'Nuevo Empleado Registrado',
        message: `El empleado ${employee.firstName} ${employee.lastName} ha sido registrado en el sistema.`,
        data: {
          type: 'employee_created',
          employeeId: employee.id,
        },
      });

      return employee;
    } catch (error) {
      logger.error('Error creating employee', error);
      throw error;
    }
  }

  async getEmployee(id: string): Promise<Employee | null> {
    try {
      return await EmployeeRepository.findById(id);
    } catch (error) {
      logger.error('Error getting employee', error);
      throw error;
    }
  }

  async getEmployeeByCedula(cedula: string): Promise<Employee | null> {
    try {
      return await EmployeeRepository.findByCedula(cedula);
    } catch (error) {
      logger.error('Error getting employee by cedula', error);
      throw error;
    }
  }

  async getEmployees(
    params: PaginationParams,
    filters?: Record<string, unknown>
  ): Promise<PaginatedResponse<Employee>> {
    try {
      return await EmployeeRepository.getPaginated(params, filters);
    } catch (error) {
      logger.error('Error getting employees', error);
      throw error;
    }
  }

async getActiveEmployeesCount(): Promise<number> {
  try {
    const activeEmployees = await EmployeeRepository.getActiveEmployees();
    return activeEmployees.length;
  } catch (error) {
    logger.error('Error counting active employees', error);
    throw error;
  }
}


  async updateEmployee(id: string, data: Partial<Employee>): Promise<Employee | null> {
    try {
      const employee = await EmployeeRepository.update(id, data);

      // Send notification if important fields changed
      if (data.baseSalary || data.status || data.contractEndDate) {
        await NotificationService.sendViaChannel('app', {
          to: employee?.email || '',
          title: 'Información del Empleado Actualizada',
          message: 'Tu información ha sido actualizada en el sistema.',
          data: {
            type: 'employee_updated',
            employeeId: id,
          },
        });
      }

      return employee;
    } catch (error) {
      logger.error('Error updating employee', error);
      throw error;
    }
  }

  async deleteEmployee(id: string): Promise<boolean> {
    try {
      const result = await EmployeeRepository.delete(id);
      if (result) {
        logger.info(`Employee deleted: ${id}`);
      }
      return result;
    } catch (error) {
      logger.error('Error deleting employee', error);
      throw error;
    }
  }

  async getEmployeesWithExpiringContracts(daysUntilExpiry: number = 30): Promise<Employee[]> {
    try {
      const employees = await EmployeeRepository.getEmployeesWithExpiringContracts(daysUntilExpiry);

      // Send notifications for expiring contracts
      for (const employee of employees) {
        await NotificationService.sendViaMultipleChannels(['app', 'email'], {
          to: employee.email,
          subject: 'Contrato Próximo a Vencer',
          title: 'Contrato Próximo a Vencer',
          message: `El contrato de ${employee.firstName} ${employee.lastName} vence el ${employee.contractEndDate}. Por favor, tomar acción.`,
          data: {
            type: 'contract_expiry',
            employeeId: employee.id,
            contractEndDate: employee.contractEndDate,
          },
        });
      }

      return employees;
    } catch (error) {
      logger.error('Error getting employees with expiring contracts', error);
      throw error;
    }
  }

  async terminateEmployee(
    id: string,
    terminationDate: string,
    reason: string
  ): Promise<Employee | null> {
    try {
      const employee = await EmployeeRepository.update(id, {
        status: 'terminated',
        terminationDate,
        terminationReason: reason,
      });

      if (employee) {
        logger.info(`Employee terminated: ${id}`);

        // Send notification
        await NotificationService.sendViaMultipleChannels(['app', 'email'], {
          to: employee.email,
          subject: 'Notificación de Salida',
          title: 'Notificación de Salida',
          message: `Tu relación laboral ha terminado efectiva el ${terminationDate}. Motivo: ${reason}`,
          data: {
            type: 'employee_terminated',
            employeeId: id,
            terminationDate,
          },
        });
      }

      return employee;
    } catch (error) {
      logger.error('Error terminating employee', error);
      throw error;
    }
  }

  async getActiveEmployees(): Promise<Employee[]> {
    try {
      return await EmployeeRepository.getActiveEmployees();
    } catch (error) {
      logger.error('Error getting active employees', error);
      throw error;
    }
  }

  async getEmployeesByDepartment(departmentId: string): Promise<Employee[]> {
    try {
      return await EmployeeRepository.findByDepartment(departmentId);
    } catch (error) {
      logger.error('Error getting employees by department', error);
      throw error;
    }
  }
}

export default new EmployeeService();
