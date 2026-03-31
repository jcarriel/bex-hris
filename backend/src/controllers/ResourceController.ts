import { Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import EmployeeService from '@services/EmployeeService';
import EmployeeRepository from '@repositories/EmployeeRepository';
import PayrollRepository from '@repositories/PayrollRepository';
import DepartmentService from '@services/DepartmentService';
import PositionService from '@services/PositionService';
import PayrollService from '@services/PayrollService';
import AttendanceService from '@services/AttendanceService';
import LeaveService from '@services/LeaveService';
import { TaskService } from '@services/TaskService';
import NotificationScheduleService from '@services/NotificationScheduleService';
import SchedulerService from '@services/SchedulerService';
import DepartmentScheduleService from '@services/DepartmentScheduleService';
import NotificationRepository from '@repositories/NotificationRepository';
import UserRepository from '@repositories/UserRepository';
import logger from '@utils/logger';
import { getDatabase } from '@config/database';
import { logAudit } from '@utils/audit';

export class ResourceController {
  // ===== DEPARTMENTS =====
  async createDepartment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, description } = req.body;
      if (!name) {
        res.status(400).json({ success: false, message: 'Name is required' });
        return;
      }
      const department = await DepartmentService.createDepartment(name, description);
      res.status(201).json({ success: true, data: department });
    } catch (error) {
      logger.error('Create department error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getDepartments(req: AuthRequest, res: Response): Promise<void> {
    try {
      const departments = await DepartmentService.getAllDepartments();
      res.status(200).json({ success: true, data: departments });
    } catch (error) {
      logger.error('Get departments error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async updateDepartment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const department = await DepartmentService.updateDepartment(id, req.body);
      if (!department) {
        res.status(404).json({ success: false, message: 'Department not found' });
        return;
      }
      res.status(200).json({ success: true, data: department });
    } catch (error) {
      logger.error('Update department error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async deleteDepartment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const db = getDatabase();
      const count = await db.get(`SELECT COUNT(*) as c FROM employees WHERE departmentId = ? AND status != 'inactive'`, [id]) as any;
      if (count && count.c > 0) {
        res.status(409).json({ success: false, message: `No se puede eliminar: hay ${count.c} empleado(s) asignado(s) a este centro de costo` });
        return;
      }
      const result = await DepartmentService.deleteDepartment(id);
      if (!result) {
        res.status(404).json({ success: false, message: 'Department not found' });
        return;
      }
      res.status(200).json({ success: true, message: 'Department deleted successfully' });
    } catch (error) {
      logger.error('Delete department error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  // ===== POSITIONS =====
  async createPosition(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, departmentId, description, salaryMin, salaryMax } = req.body;
      if (!name || !departmentId) {
        res.status(400).json({ success: false, message: 'Name and departmentId are required' });
        return;
      }
      const position = await PositionService.createPosition(name, departmentId, description, salaryMin, salaryMax);
      res.status(201).json({ success: true, data: position });
    } catch (error) {
      logger.error('Create position error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getPositions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { departmentId } = req.query;
      let positions;
      if (departmentId) {
        positions = await PositionService.getPositionsByDepartment(departmentId as string);
      } else {
        positions = await PositionService.getAllPositions();
      }
      res.status(200).json({ success: true, data: positions });
    } catch (error) {
      logger.error('Get positions error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async updatePosition(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, salaryMin, salaryMax } = req.body;
      const position = await PositionService.updatePosition(id, { name, description, salaryMin, salaryMax } as any);
      if (!position) {
        res.status(404).json({ success: false, message: 'Position not found' });
        return;
      }
      res.status(200).json({ success: true, data: position });
    } catch (error) {
      logger.error('Update position error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Failed to update position' });
    }
  }

  async deletePosition(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const db = getDatabase();
      const count = await db.get(`SELECT COUNT(*) as c FROM employees WHERE positionId = ? AND status != 'inactive'`, [id]) as any;
      if (count && count.c > 0) {
        res.status(409).json({ success: false, message: `No se puede eliminar: hay ${count.c} empleado(s) con este cargo asignado` });
        return;
      }
      const result = await PositionService.deletePosition(id);
      if (!result) {
        res.status(404).json({ success: false, message: 'Position not found' });
        return;
      }
      res.status(200).json({ success: true, message: 'Position deleted successfully' });
    } catch (error) {
      logger.error('Delete position error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  // ===== LABORS =====
  async createLabor(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, positionId, description } = req.body;
      if (!name || !positionId) {
        res.status(400).json({ success: false, message: 'Name and positionId are required' });
        return;
      }
      const LaborService = (await import('../services/LaborService')).default;
      const labor = await LaborService.createLabor(name, description, positionId);
      res.status(201).json({ success: true, data: labor });
    } catch (error) {
      logger.error('Create labor error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getLabors(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { positionId } = req.query;
      const LaborService = (await import('../services/LaborService')).default;
      let labors;
      if (positionId) {
        labors = await LaborService.getLaborsByPosition(positionId as string);
      } else {
        labors = await LaborService.getLabors();
      }
      res.status(200).json({ success: true, data: labors });
    } catch (error) {
      logger.error('Get labors error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async updateLabor(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, positionId, description } = req.body;
      if (!name || !positionId) {
        res.status(400).json({ success: false, message: 'Name and positionId are required' });
        return;
      }
      const LaborService = (await import('../services/LaborService')).default;
      const labor = await LaborService.updateLabor(id, name, description, positionId);
      if (!labor) {
        res.status(404).json({ success: false, message: 'Labor not found' });
        return;
      }
      res.status(200).json({ success: true, data: labor });
    } catch (error) {
      logger.error('Update labor error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async deleteLabor(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const LaborService = (await import('../services/LaborService')).default;
      const result = await LaborService.deleteLabor(id);
      if (!result) {
        res.status(404).json({ success: false, message: 'Labor not found' });
        return;
      }
      res.status(200).json({ success: true, message: 'Labor deleted successfully' });
    } catch (error) {
      logger.error('Delete labor error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  // ===== PAYROLL =====
  async createPayroll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const payroll = await PayrollService.createPayroll(req.body);
      logAudit(req.userId, 'CREATE', 'payroll', payroll.id || payroll.employeeId || 'batch');
      res.status(201).json({ success: true, data: payroll });
    } catch (error) {
      logger.error('Create payroll error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getAllPayrolls(req: AuthRequest, res: Response): Promise<void> {
    try {
      const payrolls = await PayrollRepository.findAll();
      res.status(200).json({ success: true, data: payrolls });
    } catch (error) {
      logger.error('Get all payrolls error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getPayroll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const payroll = await PayrollService.getPayroll(id);
      if (!payroll) {
        res.status(404).json({ success: false, message: 'Payroll not found' });
        return;
      }
      res.status(200).json({ success: true, data: payroll });
    } catch (error) {
      logger.error('Get payroll error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getPayrollByPeriod(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { year, month } = req.params;
      const period = `${year}/${month}`;
      const payrolls = await PayrollService.getPayrollByPeriod(period);
      res.status(200).json({ success: true, data: payrolls });
    } catch (error) {
      logger.error('Get payroll error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getPayrollSumByPeriod(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { year, month } = req.params;
      const period = `${year}/${month}`;
      const payrolls = await PayrollService.getPayrollByPeriod(period);
      
      // Sumar todos los baseSalary de las nóminas
      const totalPayroll = payrolls.reduce((sum: number, payroll: any) => {
        return sum + (payroll.earnedSalary || 0);
      }, 0);
      
      res.status(200).json({ success: true, data: totalPayroll });
    } catch (error) {
      logger.error('Get payroll sum error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  // ===== ATTENDANCE =====
  async createAttendance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const attendance = await AttendanceService.createAttendance(req.body);
      res.status(201).json({ success: true, data: attendance });
    } catch (error) {
      logger.error('Create attendance error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getAttendanceByEmployee(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { employeeId, startDate, endDate } = req.query;
      const attendance = await AttendanceService.getAttendanceByEmployee(
        employeeId as string,
        startDate as string,
        endDate as string
      );
      res.status(200).json({ success: true, data: attendance });
    } catch (error) {
      logger.error('Get attendance error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getAllAttendance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const attendance = await AttendanceService.getAllAttendance();
      res.status(200).json({ success: true, data: attendance });
    } catch (error) {
      logger.error('Get all attendance error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  // ===== LEAVES =====
  async createLeave(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = { ...req.body, status: req.body.status || 'pending', submittedBy: req.userId || null };

      // Check for overlapping leaves of the same type
      if (data.employeeId && data.startDate && data.endDate && data.type) {
        const db = getDatabase();
        const overlap = await db.get(
          `SELECT id FROM leaves
           WHERE employeeId = ? AND type = ? AND status != 'rejected'
           AND startDate <= ? AND endDate >= ?`,
          [data.employeeId, data.type, data.endDate, data.startDate]
        );
        if (overlap) {
          res.status(409).json({ success: false, message: 'Ya existe una solicitud del mismo tipo en ese rango de fechas' });
          return;
        }
      }

      const leave = await LeaveService.createLeave(data);
      logAudit(req.userId, 'CREATE', 'leave', leave.id);
      res.status(201).json({ success: true, data: leave });
    } catch (error) {
      logger.error('Create leave error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getLeaveBalance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const { employeeId } = req.params;

      const employee = await db.get(
        'SELECT hireDate FROM employees WHERE id = ?',
        [employeeId]
      ) as any;
      if (!employee) {
        res.status(404).json({ success: false, message: 'Employee not found' });
        return;
      }

      // Calculate accrued vacation days: 15 days per year worked (proportional)
      const hireDate = new Date(employee.hireDate);
      const now = new Date();
      const yearsWorked = (now.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      const accruedDays = Math.floor(yearsWorked * 15);

      // Used vacation days (approved vacation leaves)
      const usedResult = await db.get(
        `SELECT COALESCE(SUM(
          (endDate::date - startDate::date + 1)
        ), 0) as used
        FROM leaves
        WHERE employeeId = ? AND type = 'vacation' AND status = 'approved'`,
        [employeeId]
      ) as any;

      const used = usedResult.used || 0;
      const available = Math.max(0, accruedDays - used);

      res.json({ success: true, data: { accrued: accruedDays, used, available } });
    } catch (err) {
      logger.error('Get leave balance error', err);
      res.status(500).json({ success: false, message: 'Error calculating leave balance' });
    }
  }

  async getLeaveByEmployee(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { employeeId } = req.params;
      const leaves = await LeaveService.getLeaveByEmployee(employeeId);
      res.status(200).json({ success: true, data: leaves });
    } catch (error) {
      logger.error('Get leave error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getPendingLeaves(req: AuthRequest, res: Response): Promise<void> {
    try {
      const leaves = await LeaveService.getPendingLeaves();
      res.status(200).json({ success: true, data: leaves });
    } catch (error) {
      logger.error('Get pending leaves error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getAllLeaves(req: AuthRequest, res: Response): Promise<void> {
    try {
      const leaves = await LeaveService.getAllLeaves();
      res.status(200).json({ success: true, data: leaves });
    } catch (error) {
      logger.error('Get all leaves error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async approveLeave(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Permission check: admin always allowed; others need 'bienestar:aprobar' in their role
      if (req.userRole !== 'admin') {
        const db = getDatabase();
        const role = req.userRoleId
          ? await db.get<{ permissions: string }>('SELECT permissions FROM roles WHERE id = ?', [req.userRoleId])
          : null;
        const perms: string[] = role ? JSON.parse(role.permissions || '[]') : [];
        if (!perms.includes('*') && !perms.includes('bienestar:aprobar')) {
          res.status(403).json({ success: false, message: 'No tienes permiso para aprobar solicitudes' });
          return;
        }
      }
      const { id } = req.params;
      const leave = await LeaveService.approveLeave(id, req.userId || '');
      if (!leave) {
        res.status(404).json({ success: false, message: 'Leave not found' });
        return;
      }
      // Notify all admin users
      try {
        const users = await UserRepository.getAll() as any[];
        const label: Record<string, string> = { vacation: 'Vacaciones', medical: 'Permiso médico', maternity: 'Maternidad', personal: 'Permiso personal' };
        for (const u of users.filter(u => u.status !== 'inactive')) {
          await NotificationRepository.create({
            userId: u.id,
            type: 'leave_approved',
            title: `✅ ${label[leave.type] || 'Permiso'} aprobado`,
            message: `Se aprobó la solicitud de ${leave.days} día(s) (${leave.startDate} → ${leave.endDate}).`,
          });
        }
      } catch (e) { logger.warn('Could not send leave approval notifications', e); }
      logAudit(req.userId, 'APPROVE', 'leave', id);
      res.status(200).json({ success: true, data: leave });
    } catch (error) {
      logger.error('Approve leave error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async rejectLeave(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Permission check: admin always allowed; others need 'bienestar:aprobar' in their role
      if (req.userRole !== 'admin') {
        const db = getDatabase();
        const role = req.userRoleId
          ? await db.get<{ permissions: string }>('SELECT permissions FROM roles WHERE id = ?', [req.userRoleId])
          : null;
        const perms: string[] = role ? JSON.parse(role.permissions || '[]') : [];
        if (!perms.includes('*') && !perms.includes('bienestar:aprobar')) {
          res.status(403).json({ success: false, message: 'No tienes permiso para rechazar solicitudes' });
          return;
        }
      }
      const { id } = req.params;
      const leave = await LeaveService.rejectLeave(id, req.userId || undefined);
      if (!leave) { res.status(404).json({ success: false, message: 'Leave not found' }); return; }
      // Notify all admin users
      try {
        const users = await UserRepository.getAll() as any[];
        const label: Record<string, string> = { vacation: 'Vacaciones', medical: 'Permiso médico', maternity: 'Maternidad', personal: 'Permiso personal' };
        for (const u of users.filter(u => u.status !== 'inactive')) {
          await NotificationRepository.create({
            userId: u.id,
            type: 'leave_rejected',
            title: `❌ ${label[leave.type] || 'Permiso'} rechazado`,
            message: `Se rechazó la solicitud de ${leave.days} día(s) (${leave.startDate} → ${leave.endDate}).`,
          });
        }
      } catch (e) { logger.warn('Could not send leave rejection notifications', e); }
      logAudit(req.userId, 'REJECT', 'leave', id);
      res.status(200).json({ success: true, data: leave });
    } catch (error) {
      logger.error('Reject leave error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async updateLeave(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const leave = await LeaveService.updateLeave(id, req.body);
      if (!leave) { res.status(404).json({ success: false, message: 'Leave not found' }); return; }
      res.status(200).json({ success: true, data: leave });
    } catch (error) {
      logger.error('Update leave error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async deleteLeave(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const ok = await LeaveService.deleteLeave(id);
      if (!ok) { res.status(404).json({ success: false, message: 'Leave not found' }); return; }
      res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Delete leave error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  // ===== TASKS =====
  async createTask(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { title, description, dueDate, status, priority, assignedTo } = req.body;

      if (!title || !dueDate) {
        res.status(400).json({ success: false, message: 'Title and dueDate are required' });
        return;
      }

      logger.info('Creating task with data:', { title, description, dueDate, status, priority });

      const task = await TaskService.createTask({
        title,
        description,
        dueDate,
        status: status || 'pending',
        priority: priority || 'medium',
        assignedTo,
        createdBy: req.user?.id,
      });

      logger.info('Task created:', task);
      res.status(201).json({ success: true, message: 'Task created successfully', data: task });
    } catch (error) {
      logger.error('Create task error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getAllTasks(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tasks = await TaskService.getAllTasks();
      res.status(200).json({ success: true, data: tasks });
    } catch (error) {
      logger.error('Get all tasks error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getTaskById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const task = await TaskService.getTaskById(id);

      if (!task) {
        res.status(404).json({ success: false, message: 'Task not found' });
        return;
      }

      res.status(200).json({ success: true, data: task });
    } catch (error) {
      logger.error('Get task by id error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async updateTask(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const taskData = req.body;

      const task = await TaskService.updateTask(id, taskData, req.user?.id);

      if (!task) {
        res.status(404).json({ success: false, message: 'Task not found' });
        return;
      }

      res.status(200).json({ success: true, message: 'Task updated successfully', data: task });
    } catch (error) {
      logger.error('Update task error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async deleteTask(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await TaskService.deleteTask(id, req.user?.id);

      if (!deleted) {
        res.status(404).json({ success: false, message: 'Task not found' });
        return;
      }

      res.status(200).json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
      logger.error('Delete task error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getTasksByStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status } = req.params;
      const tasks = await TaskService.getTasksByStatus(status);
      res.status(200).json({ success: true, data: tasks });
    } catch (error) {
      logger.error('Get tasks by status error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getTasksByDueDate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { date } = req.params;
      const tasks = await TaskService.getTasksByDueDate(date);
      res.status(200).json({ success: true, data: tasks });
    } catch (error) {
      logger.error('Get tasks by due date error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getTodayTasks(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tasks = await TaskService.getTodayTasks();
      res.status(200).json({ success: true, data: tasks });
    } catch (error) {
      logger.error('Get today tasks error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getUpcomingTasks(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tasks = await TaskService.getUpcomingTasks();
      res.status(200).json({ success: true, data: tasks });
    } catch (error) {
      logger.error('Get upcoming tasks error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getCompletedTasks(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tasks = await TaskService.getCompletedTasks();
      res.status(200).json({ success: true, data: tasks });
    } catch (error) {
      logger.error('Get completed tasks error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getTaskStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const stats = await TaskService.getTaskStats();
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      logger.error('Get task stats error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async markTaskAsCompleted(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const task = await TaskService.markTaskAsCompleted(id, undefined, req.user?.id);
      res.status(200).json({ success: true, data: task });
    } catch (error) {
      logger.error('Mark task as completed error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async markTaskAsPending(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const task = await TaskService.markTaskAsPending(id, req.user?.id);
      res.status(200).json({ success: true, data: task });
    } catch (error) {
      logger.error('Mark task as pending error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  // ===== NOTIFICATION SCHEDULES =====
  async createNotificationSchedule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { type, hour, minute, channels } = req.body;

      // Validate required fields
      if (!type || hour === undefined || hour === null || minute === undefined || minute === null || !channels) {
        res.status(400).json({
          success: false,
          message: 'type, hour, minute, and channels are required'
        });
        return;
      }

      // Validate channels is valid JSON if it's a string
      if (typeof channels === 'string') {
        try {
          JSON.parse(channels);
        } catch (e) {
          res.status(400).json({
            success: false,
            message: 'channels must be valid JSON'
          });
          return;
        }
      }

      const schedule = await NotificationScheduleService.createSchedule(req.body);
      try {
        await SchedulerService.updateSchedule(schedule.id);
      } catch (schedulerError) {
        logger.warn('Scheduler update warning (non-critical)', schedulerError);
      }
      res.status(201).json({ success: true, data: schedule });
    } catch (error) {
      logger.error('Create notification schedule error', error);
      const message = error instanceof Error ? error.message : 'Error creating notification schedule';
      res.status(400).json({ success: false, message });
    }
  }

  async getAllNotificationSchedules(req: AuthRequest, res: Response): Promise<void> {
    try {
      const schedules = await NotificationScheduleService.getAllSchedules();
      res.status(200).json({ success: true, data: schedules });
    } catch (error) {
      logger.error('Get all notification schedules error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getNotificationSchedule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const schedule = await NotificationScheduleService.getSchedule(id);
      if (!schedule) {
        res.status(404).json({ success: false, message: 'Schedule not found' });
        return;
      }
      res.status(200).json({ success: true, data: schedule });
    } catch (error) {
      logger.error('Get notification schedule error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async updateNotificationSchedule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { type, hour, minute, channels } = req.body;

      // Validate required fields
      if (!type || hour === undefined || hour === null || minute === undefined || minute === null || !channels) {
        res.status(400).json({
          success: false,
          message: 'type, hour, minute, and channels are required'
        });
        return;
      }

      // Validate channels is valid JSON if it's a string
      if (typeof channels === 'string') {
        try {
          JSON.parse(channels);
        } catch (e) {
          res.status(400).json({
            success: false,
            message: 'channels must be valid JSON'
          });
          return;
        }
      }

      const schedule = await NotificationScheduleService.updateSchedule(id, req.body);
      try {
        await SchedulerService.updateSchedule(id);
      } catch (schedulerError) {
        logger.warn('Scheduler update warning (non-critical)', schedulerError);
      }
      res.status(200).json({ success: true, data: schedule });
    } catch (error) {
      logger.error('Update notification schedule error', error);
      const message = error instanceof Error ? error.message : 'Error updating notification schedule';
      res.status(400).json({ success: false, message });
    }
  }

  async deleteNotificationSchedule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await NotificationScheduleService.deleteSchedule(id);
      await SchedulerService.removeSchedule(id);
      if (!result) {
        res.status(404).json({ success: false, message: 'Schedule not found' });
        return;
      }
      res.status(200).json({ success: true, message: 'Schedule deleted' });
    } catch (error) {
      logger.error('Delete notification schedule error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  // ===== DAILY CONTROLS =====
  async getDailyControls(req: AuthRequest, res: Response): Promise<void> {
    try {
      const DailyControlService = (await import('@services/DailyControlService')).default;
      const controls = DailyControlService.getControls();
      res.status(200).json({ success: true, data: controls });
    } catch (error) {
      logger.error('Get daily controls error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async enableDailyControl(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const DailyControlService = (await import('@services/DailyControlService')).default;
      DailyControlService.enableControl(type);
      res.status(200).json({ success: true, message: `Control ${type} enabled` });
    } catch (error) {
      logger.error('Enable daily control error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async disableDailyControl(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const DailyControlService = (await import('@services/DailyControlService')).default;
      DailyControlService.disableControl(type);
      res.status(200).json({ success: true, message: `Control ${type} disabled` });
    } catch (error) {
      logger.error('Disable daily control error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  // ===== BENEFITS =====
  async createBenefit(req: AuthRequest, res: Response): Promise<void> {
    try {
      const BenefitService = (await import('@services/BenefitService')).default;
      const benefit = await BenefitService.createBenefit(req.body);
      res.status(201).json({ success: true, data: benefit });
    } catch (error) {
      logger.error('Create benefit error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getAllBenefits(req: AuthRequest, res: Response): Promise<void> {
    try {
      const BenefitService = (await import('@services/BenefitService')).default;
      const benefits = await BenefitService.getAllBenefits();
      res.status(200).json({ success: true, data: benefits });
    } catch (error) {
      logger.error('Get all benefits error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getBenefit(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const BenefitService = (await import('@services/BenefitService')).default;
      const benefit = await BenefitService.getBenefit(id);
      if (!benefit) {
        res.status(404).json({ success: false, message: 'Benefit not found' });
        return;
      }
      res.status(200).json({ success: true, data: benefit });
    } catch (error) {
      logger.error('Get benefit error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async updateBenefit(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const BenefitService = (await import('@services/BenefitService')).default;
      const benefit = await BenefitService.updateBenefit(id, req.body);
      res.status(200).json({ success: true, data: benefit });
    } catch (error) {
      logger.error('Update benefit error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async deleteBenefit(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const BenefitService = (await import('@services/BenefitService')).default;
      const result = await BenefitService.deleteBenefit(id);
      if (!result) {
        res.status(404).json({ success: false, message: 'Benefit not found' });
        return;
      }
      res.status(200).json({ success: true, message: 'Benefit deleted' });
    } catch (error) {
      logger.error('Delete benefit error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async assignBenefit(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { employeeId, benefitId, startDate, endDate } = req.body;
      const BenefitService = (await import('@services/BenefitService')).default;
      const employeeBenefit = await BenefitService.assignBenefitToEmployee(
        employeeId,
        benefitId,
        startDate,
        endDate
      );
      res.status(201).json({ success: true, data: employeeBenefit });
    } catch (error) {
      logger.error('Assign benefit error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getEmployeeBenefits(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { employeeId } = req.params;
      const BenefitService = (await import('@services/BenefitService')).default;
      const benefits = await BenefitService.getEmployeeBenefits(employeeId);
      res.status(200).json({ success: true, data: benefits });
    } catch (error) {
      logger.error('Get employee benefits error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async calculateEmployeeBenefitsTotal(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { employeeId } = req.params;
      const BenefitService = (await import('@services/BenefitService')).default;
      const totals = await BenefitService.calculateEmployeeBenefitsTotal(employeeId);
      res.status(200).json({ success: true, data: totals });
    } catch (error) {
      logger.error('Calculate employee benefits total error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  // ===== REPORTS =====
  async generatePayrollReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate, departmentId, format } = req.body;
      const ReportService = (await import('@services/ReportService')).default;
      const report = await ReportService.generatePayrollReport(startDate, endDate, departmentId);

      if (format === 'csv') {
        const csv = ReportService.exportToCSV(report.details, 'payroll_report.csv');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=payroll_report.csv');
        res.send(csv);
      } else {
        res.status(200).json({ success: true, data: report });
      }
    } catch (error) {
      logger.error('Generate payroll report error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async generateAttendanceReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate, employeeId, departmentId, format } = req.body;
      const ReportService = (await import('@services/ReportService')).default;
      const report = await ReportService.generateAttendanceReport(startDate, endDate, employeeId);

      if (format === 'csv') {
        const csv = ReportService.exportToCSV(report.byEmployee, 'attendance_report.csv');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.csv');
        res.send(csv);
      } else {
        res.status(200).json({ success: true, data: report });
      }
    } catch (error) {
      logger.error('Generate attendance report error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async generateLeaveReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate, format } = req.body;
      const ReportService = (await import('@services/ReportService')).default;
      const report = await ReportService.generateLeaveReport(startDate, endDate);

      if (format === 'csv') {
        const csv = ReportService.exportToCSV(report.byEmployee, 'leave_report.csv');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=leave_report.csv');
        res.send(csv);
      } else {
        res.status(200).json({ success: true, data: report });
      }
    } catch (error) {
      logger.error('Generate leave report error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async generateEmployeeReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { format } = req.body;
      const ReportService = (await import('@services/ReportService')).default;
      const report = await ReportService.generateEmployeeReport();

      if (format === 'csv') {
        const csv = ReportService.exportToCSV(report.byDepartment, 'employee_report.csv');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=employee_report.csv');
        res.send(csv);
      } else {
        res.status(200).json({ success: true, data: report });
      }
    } catch (error) {
      logger.error('Generate employee report error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  // ===== MAESTRO GENERAL =====
  private async resolveMaestroDept(name: string): Promise<string | null> {
    if (!name || !name.trim()) return null
    const trimmed = name.trim().toUpperCase()
    const departments = await DepartmentService.getAllDepartments()
    let dept = (departments as any[]).find((d: any) => d.name.toUpperCase() === trimmed)
    if (!dept) dept = await DepartmentService.createDepartment(trimmed, '')
    return dept.id
  }

  private async resolveMaestroLabor(name: string): Promise<string | null> {
    if (!name || !name.trim()) return null
    const { v4: uuidv4 } = await import('uuid')
    const trimmed = name.trim().toUpperCase()
    const db = getDatabase()
    const LaborService = (await import('@services/LaborService')).default
    const labors = await LaborService.getLabors()
    let labor = (labors as any[]).find((l: any) => l.name.toUpperCase() === trimmed)
    if (!labor) {
      // Insertar labor directamente sin cargo (positionId nullable para Maestro General)
      const id = uuidv4()
      const now = new Date().toISOString()
      await db.run(
        'INSERT INTO labores (id, name, description, positionId, createdAt, updatedAt) VALUES (?,?,?,?,?,?)',
        [id, trimmed, null, null, now, now]
      )
      labor = { id }
    }
    return labor.id
  }

  private async resolveTipoTrabajador(value: string): Promise<string | null> {
    if (!value || !value.trim()) return null
    const { v4: uuidv4 } = await import('uuid')
    const trimmed = value.trim().toUpperCase()
    const db = getDatabase()
    const existing = await db.get(
      "SELECT id FROM catalogs WHERE type = 'tipo_trabajador' AND UPPER(value) = ?", [trimmed]
    ) as any
    if (existing) return existing.id
    const id = uuidv4()
    const now = new Date().toISOString()
    await db.run('INSERT INTO catalogs (id, type, value, createdAt, updatedAt) VALUES (?,?,?,?,?)',
      [id, 'tipo_trabajador', trimmed, now, now])
    return id
  }

  private async getMaestroRow(db: any, id: string): Promise<any> {
    return db.get(`
      SELECT mg.*,
             ct.value AS tipoTrabajador,
             cc.name  AS centroDeCosto,
             l.name   AS labor
      FROM   maestro_general mg
      LEFT JOIN catalogs    ct ON mg.tipoTrabajadorId = ct.id
      LEFT JOIN centros_costo cc ON mg.centroDeCostoId = cc.id
      LEFT JOIN labores        l ON mg.laborId         = l.id
      WHERE  mg.id = ?`, [id])
  }

  async getMaestroGeneral(req: AuthRequest, res: Response): Promise<void> {
    try {
      const db = getDatabase()
      const { search, estado, centroDeCosto, labor, tipoTrabajador } = req.query as Record<string, string>

      let sql = `
        SELECT mg.*,
               ct.value AS tipoTrabajador,
               cc.name  AS centroDeCosto,
               l.name   AS labor
        FROM   maestro_general mg
        LEFT JOIN catalogs      ct ON mg.tipoTrabajadorId = ct.id
        LEFT JOIN centros_costo cc ON mg.centroDeCostoId  = cc.id
        LEFT JOIN labores        l ON mg.laborId          = l.id
        WHERE  1=1`
      const params: unknown[] = []

      if (search) {
        sql += ' AND (mg.apellidos LIKE ? OR mg.nombres LIKE ? OR mg.cedula LIKE ?)'
        const q = `%${search}%`
        params.push(q, q, q)
      }
      if (estado)         { sql += ' AND mg.estado = ?';            params.push(estado.toUpperCase()) }
      if (centroDeCosto)  { sql += ' AND cc.name LIKE ?';           params.push(`%${centroDeCosto}%`) }
      if (labor)          { sql += ' AND l.name LIKE ?';            params.push(`%${labor}%`) }
      if (tipoTrabajador) { sql += ' AND ct.value = ?';             params.push(tipoTrabajador.toUpperCase()) }

      sql += ' ORDER BY mg.apellidos ASC'

      const rows = await db.all(sql, params)
      res.json({ success: true, data: rows })
    } catch (error) {
      logger.error('Error fetching maestro general', error)
      res.status(500).json({ success: false, message: 'Error al obtener maestro general' })
    }
  }

  async createMaestro(req: AuthRequest, res: Response): Promise<void> {
    try {
      const db = getDatabase()
      const { tipoTrabajador, fechaIngreso, semanaIngreso, apellidos, nombres, cedula,
              centroDeCosto, labor, fechaNacimiento, tituloBachiller,
              semanaSalida, fechaSalida, estado, observacion } = req.body
      if (!cedula || !apellidos) {
        res.status(400).json({ success: false, message: 'Cédula y apellidos son requeridos' })
        return
      }
      const dup = await db.get('SELECT id FROM maestro_general WHERE cedula = ?', [cedula]) as any
      if (dup) {
        res.status(409).json({ success: false, message: 'Ya existe un registro con esa cédula' })
        return
      }

      const tipoTrabajadorId = await this.resolveTipoTrabajador(tipoTrabajador)
      const centroDeCostoId  = await this.resolveMaestroDept(centroDeCosto)
      const laborId          = await this.resolveMaestroLabor(labor)

      const { v4: uuidv4 } = await import('uuid')
      const id = uuidv4()
      const now = new Date().toISOString()
      await db.run(
        `INSERT INTO maestro_general
          (id, tipoTrabajadorId, fechaIngreso, semanaIngreso, apellidos, nombres, cedula,
           centroDeCostoId, laborId, fechaNacimiento, tituloBachiller, semanaSalida, fechaSalida, estado, observacion, createdAt, updatedAt)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id, tipoTrabajadorId, fechaIngreso ?? null, semanaIngreso ?? null,
         apellidos, nombres ?? null, cedula, centroDeCostoId, laborId,
         fechaNacimiento ?? null, tituloBachiller ?? null, semanaSalida ?? null,
         fechaSalida ?? null, estado ?? 'ACTIVO', observacion ?? null, now, now]
      )
      const row = await this.getMaestroRow(db, id)
      res.status(201).json({ success: true, data: row })
    } catch (error) {
      logger.error('Create maestro error', error)
      res.status(500).json({ success: false, message: 'Error al crear registro' })
    }
  }

  async updateMaestro(req: AuthRequest, res: Response): Promise<void> {
    try {
      const db = getDatabase()
      const { id } = req.params
      const { tipoTrabajador, fechaIngreso, semanaIngreso, apellidos, nombres, cedula,
              centroDeCosto, labor, fechaNacimiento, tituloBachiller,
              semanaSalida, fechaSalida, estado, observacion } = req.body
      const existing = await db.get('SELECT id FROM maestro_general WHERE id = ?', [id]) as any
      if (!existing) {
        res.status(404).json({ success: false, message: 'Registro no encontrado' })
        return
      }

      const tipoTrabajadorId = await this.resolveTipoTrabajador(tipoTrabajador)
      const centroDeCostoId  = await this.resolveMaestroDept(centroDeCosto)
      const laborId          = await this.resolveMaestroLabor(labor)

      const now = new Date().toISOString()
      await db.run(
        `UPDATE maestro_general SET
           tipoTrabajadorId=?, fechaIngreso=?, semanaIngreso=?, apellidos=?, nombres=?, cedula=?,
           centroDeCostoId=?, laborId=?, fechaNacimiento=?, tituloBachiller=?,
           semanaSalida=?, fechaSalida=?, estado=?, observacion=?, updatedAt=?
         WHERE id=?`,
        [tipoTrabajadorId, fechaIngreso ?? null, semanaIngreso ?? null,
         apellidos ?? null, nombres ?? null, cedula ?? null,
         centroDeCostoId, laborId,
         fechaNacimiento ?? null, tituloBachiller ?? null,
         semanaSalida ?? null, fechaSalida ?? null, estado ?? 'ACTIVO',
         observacion ?? null, now, id]
      )
      const row = await this.getMaestroRow(db, id)
      res.status(200).json({ success: true, data: row })
    } catch (error) {
      logger.error('Update maestro error', error)
      res.status(500).json({ success: false, message: 'Error al actualizar registro' })
    }
  }

  async deleteMaestro(req: AuthRequest, res: Response): Promise<void> {
    try {
      const db = getDatabase()
      const { id } = req.params
      const existing = await db.get('SELECT id FROM maestro_general WHERE id = ?', [id]) as any
      if (!existing) {
        res.status(404).json({ success: false, message: 'Registro no encontrado' })
        return
      }
      await db.run('DELETE FROM maestro_general WHERE id = ?', [id])
      res.status(200).json({ success: true, message: 'Registro eliminado' })
    } catch (error) {
      logger.error('Delete maestro error', error)
      res.status(500).json({ success: false, message: 'Error al eliminar registro' })
    }
  }

  // ===== BULK UPLOAD =====
  async bulkUpload(req: AuthRequest, res: Response): Promise<void> {
    try {
      logger.info('Bulk upload request received');
      const { type, status } = req.body;
      const file = (req as any).file;

      logger.info(`Bulk upload - Type: ${type}, Status: ${status}, File: ${file?.originalname}, Size: ${file?.size}`);

      if (!type || !file) {
        logger.error('Missing type or file in bulk upload');
        res.status(400).json({ success: false, message: 'Type and file are required' });
        return;
      }

      logger.info(`Processing ${type} file: ${file.originalname}`);

      if (type === 'employees') {
        // Procesar archivo de empleados
        const result = await (await import('@services/BulkUploadService')).default.processEmployeeFile(
          file.buffer,
          file.originalname,
          status || 'active'
        );
        res.status(200).json({ success: true, data: result });
      } else if (type === 'payroll') {
        // Procesar archivo de nómina (XLSX)
        const result = await (await import('@services/PayrollBulkUploadService')).default.processPayrollFile(
          file.buffer,
          file.originalname
        );
        res.status(200).json({ success: true, data: result });
      } else if (type === 'roles') {
        // Procesar archivo de roles
        const result = await (await import('@services/BulkUploadService')).default.processRolesFile(
          file.buffer,
          file.originalname
        );
        res.status(200).json({ success: true, data: result });
      } else if (type === 'attendance' || type === 'marcacion') {
        // Procesar archivo de marcación (asistencia)
        const result = await (await import('@services/AttendanceBulkUploadService')).default.processAttendanceFile(
          file.buffer,
          file.originalname
        );
        res.status(200).json({ success: true, data: result });
      } else if (type === 'maestro') {
        // Procesar archivo de Maestro General
        const result = await (await import('@services/MaestroGeneralBulkUploadService')).default.processMaestroFile(
          file.buffer,
          file.originalname
        );
        res.status(200).json({ success: true, data: result });
      } else {
        res.status(400).json({ success: false, message: 'Invalid type' });
      }
    } catch (error) {
      logger.error('Bulk upload error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async clearEmployees(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { getDatabase } = await import('@config/database');
      const db = getDatabase();
      
      // Eliminar datos de tablas dependientes primero (orden correcto para FK)
      await db.exec('DELETE FROM documents');
      await db.exec('DELETE FROM attendance');
      await db.exec('DELETE FROM leaves');
      await db.exec('DELETE FROM payroll');
      await db.exec('DELETE FROM tasks WHERE assignedTo IS NOT NULL');

      // Finalmente eliminar empleados
      await db.exec('DELETE FROM employees');

      logger.info('Employees table and related data cleared');
      res.status(200).json({ success: true, message: 'Employees table cleared successfully' });
    } catch (error) {
      logger.error('Clear employees error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getPayrollByEmployee(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { employeeId } = req.params;
      const payrolls = await (await import('@repositories/PayrollRepository')).default.findByEmployee(employeeId);
      res.status(200).json({ success: true, data: payrolls });
    } catch (error) {
      logger.error('Get payroll by employee error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async updatePayroll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const payrollData = req.body;
      const payroll = await (await import('@repositories/PayrollRepository')).default.update(id, payrollData);
      if (!payroll) {
        res.status(404).json({ success: false, message: 'Payroll not found' });
        return;
      }
      res.status(200).json({ success: true, data: payroll });
    } catch (error) {
      logger.error('Update payroll error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async deletePayroll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await (await import('@repositories/PayrollRepository')).default.delete(id);
      if (!success) {
        res.status(404).json({ success: false, message: 'Payroll not found' });
        return;
      }
      logAudit(req.userId, 'DELETE', 'payroll', id);
      res.status(200).json({ success: true, message: 'Payroll deleted successfully' });
    } catch (error) {
      logger.error('Delete payroll error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async deletePayrollByPeriod(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { year, month } = req.params;
      const success = await (await import('@repositories/PayrollRepository')).default.deleteByPeriod(
        parseInt(year),
        parseInt(month)
      );
      if (!success) {
        res.status(404).json({ success: false, message: 'No payroll records found for this period' });
        return;
      }
      res.status(200).json({ success: true, message: 'Payroll records deleted successfully' });
    } catch (error) {
      logger.error('Delete payroll by period error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async clearPayrolls(req: AuthRequest, res: Response): Promise<void> {
    try {
      const db = (await import('@config/database')).getDatabase();
      await db.run('DELETE FROM payroll');
      logger.info('All payroll records cleared');
      res.status(200).json({ success: true, message: 'All payroll records cleared successfully' });
    } catch (error) {
      logger.error('Clear payrolls error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async registerNotFoundEmployees(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { employees } = req.body;

      if (!Array.isArray(employees) || employees.length === 0) {
        res.status(400).json({ success: false, message: 'No employees provided' });
        return;
      }

      // Obtener un departamento por defecto
      const departments = await DepartmentService.getAllDepartments();
      const defaultDepartment = departments.length > 0 ? departments[0] : null;

      if (!defaultDepartment) {
        res.status(400).json({ 
          success: false, 
          message: 'No hay departamentos disponibles. Crea al menos uno antes de registrar empleados.' 
        });
        return;
      }

      // Obtener una posición por defecto del departamento
      const positions = await PositionService.getAllPositions();
      const defaultPosition = positions.find((p: any) => p.departmentId === defaultDepartment.id) || positions[0];

      if (!defaultPosition) {
        res.status(400).json({ 
          success: false, 
          message: 'No hay posiciones disponibles. Crea al menos una antes de registrar empleados.' 
        });
        return;
      }

      const registered: any[] = [];
      const errors: any[] = [];

      for (const emp of employees) {
        try {
          // Verificar si el empleado ya existe por cédula
          const existingEmployee = await EmployeeRepository.findByCedula(emp.cedula);
          
          if (existingEmployee) {
            // Si existe, solo agregarlo a la lista de registrados (ya estaba en la BD)
            registered.push({
              ...existingEmployee,
              missingFields: [],
              alreadyExists: true,
            });
          } else {
            // Si no existe, crear nuevo
            const employeeData: any = {
              firstName: emp.name?.split(' ').slice(1).join(' ') || 'SIN NOMBRE',
              lastName: emp.name?.split(' ')[0] || 'SIN APELLIDO',
              cedula: emp.cedula,
              departmentId: defaultDepartment.id,
              positionId: defaultPosition.id,
              hireDate: new Date().toISOString().split('T')[0],
              baseSalary: 0,
              contratoTipo: '',
              status: 'active',
              dateOfBirth: '',
              genero: 'O',
              estadoCivil: 'single',
              direccion: '',
            };

            const createdEmployee = await EmployeeService.createEmployee(employeeData);
            registered.push({
              ...createdEmployee,
              missingFields: ['baseSalary', 'phone', 'dateOfBirth', 'genero', 'estadoCivil', 'direccion'],
              alreadyExists: false,
            });
          }
        } catch (createError) {
          logger.error(`Error registering employee ${emp.cedula}:`, createError);
          errors.push({
            cedula: emp.cedula,
            name: emp.name,
            error: createError instanceof Error ? createError.message : 'Unknown error',
          });
        }
      }

      // Procesar nóminas pendientes después de registrar empleados
      const pendingPayrolls = req.body.pendingPayrolls || [];
      const processedPayrolls: any[] = [];
      const payrollErrors: any[] = [];

      if (pendingPayrolls.length > 0) {
        logger.info(`Processing ${pendingPayrolls.length} pending payrolls after employee registration`);
        
        for (const payrollData of pendingPayrolls) {
          try {
            // Buscar el empleado recién creado por cédula
            const employee = await EmployeeRepository.findByCedula(payrollData.cedula);
            
            if (employee) {
              payrollData.employeeId = employee.id;
              
              // Eliminar nómina existente si la hay
              const db = (await import('@config/database')).getDatabase();
              await db.run(
                'DELETE FROM payroll WHERE employeeId = ? AND year = ? AND month = ?',
                [payrollData.employeeId, payrollData.year, payrollData.month]
              );
              
              // Crear la nómina
              const newPayroll = await PayrollRepository.create(payrollData);
              processedPayrolls.push(newPayroll);
              logger.info(`Pending payroll processed for ${payrollData.cedula} - ${payrollData.year}/${payrollData.month}`);
            } else {
              payrollErrors.push({
                cedula: payrollData.cedula,
                error: 'Empleado no encontrado después del registro',
              });
            }
          } catch (error) {
            logger.error(`Error processing pending payroll for ${payrollData.cedula}:`, error);
            payrollErrors.push({
              cedula: payrollData.cedula,
              error: error instanceof Error ? error.message : 'Error procesando nómina',
            });
          }
        }
      }

      res.status(201).json({
        success: true,
        message: `${registered.length} empleados registrados, ${errors.length} con errores`,
        data: {
          registered,
          errors,
          processedPayrolls,
          payrollErrors,
        },
      });
    } catch (error) {
      logger.error('Register not found employees error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  // ===== MARCACIÓN (ATTENDANCE RECORDS) =====
  async getMarcacion(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const MarcacionService = (await import('@services/MarcacionService')).default;
      const marcacion = await MarcacionService.getMarcacion(id);
      if (!marcacion) {
        res.status(404).json({ success: false, message: 'Marcación not found' });
        return;
      }
      res.status(200).json({ success: true, data: marcacion });
    } catch (error) {
      logger.error('Get marcacion error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getMarcacionByCedula(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { cedula } = req.params;
      const MarcacionService = (await import('@services/MarcacionService')).default;
      const marcaciones = await MarcacionService.getMarcacionByCedula(cedula);
      res.status(200).json({ success: true, data: marcaciones });
    } catch (error) {
      logger.error('Get marcacion by cedula error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getMarcacionByMonth(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { month } = req.params;
      const MarcacionService = (await import('@services/MarcacionService')).default;
      const marcaciones = await MarcacionService.getMarcacionByMonth(parseInt(month));
      res.status(200).json({ success: true, data: marcaciones });
    } catch (error) {
      logger.error('Get marcacion by month error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getMarcacionByCedulaAndMonth(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { cedula, month } = req.params;
      const MarcacionService = (await import('@services/MarcacionService')).default;
      const marcaciones = await MarcacionService.getMarcacionByCedulaAndMonth(cedula, parseInt(month));
      res.status(200).json({ success: true, data: marcaciones });
    } catch (error) {
      logger.error('Get marcacion by cedula and month error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getAllMarcacion(req: AuthRequest, res: Response): Promise<void> {
    try {
      const MarcacionService = (await import('@services/MarcacionService')).default;
      const marcaciones = await MarcacionService.getAllMarcacion();
      res.status(200).json({ success: true, data: marcaciones });
    } catch (error) {
      logger.error('Get all marcacion error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async createMarcacion(req: AuthRequest, res: Response): Promise<void> {
    try {
      const MarcacionService = (await import('@services/MarcacionService')).default;
      const marcacion = await MarcacionService.createMarcacion(req.body);
      res.status(201).json({ success: true, data: marcacion });
    } catch (error) {
      logger.error('Create marcacion error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async updateMarcacion(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const MarcacionService = (await import('@services/MarcacionService')).default;
      const marcacion = await MarcacionService.updateMarcacion(id, req.body);
      if (!marcacion) {
        res.status(404).json({ success: false, message: 'Marcación not found' });
        return;
      }
      res.status(200).json({ success: true, data: marcacion });
    } catch (error) {
      logger.error('Update marcacion error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async deleteMarcacion(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const MarcacionService = (await import('@services/MarcacionService')).default;
      const success = await MarcacionService.deleteMarcacion(id);
      if (!success) {
        res.status(404).json({ success: false, message: 'Marcación not found' });
        return;
      }
      res.status(200).json({ success: true, message: 'Marcación deleted successfully' });
    } catch (error) {
      logger.error('Delete marcacion error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async deleteMarcacionByMonth(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { month } = req.params;
      const MarcacionService = (await import('@services/MarcacionService')).default;
      const success = await MarcacionService.deleteMarcacionByMonth(parseInt(month));
      res.status(200).json({ success: true, message: 'Marcación records deleted successfully' });
    } catch (error) {
      logger.error('Delete marcacion by month error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async deleteMarcacionByPeriod(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        res.status(400).json({ success: false, message: 'startDate and endDate are required' });
        return;
      }

      const db = getDatabase();
      const result = await db.run(
        `DELETE FROM marcacion WHERE date >= ? AND date <= ?`,
        [startDate, endDate]
      );

      res.status(200).json({ 
        success: true, 
        message: 'Marcación records deleted successfully',
        deletedCount: result.changes || 0
      });
    } catch (error) {
      logger.error('Delete marcacion by period error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getMarcacionPeriods(req: AuthRequest, res: Response): Promise<void> {
    try {
      const MarcacionService = (await import('@services/MarcacionService')).default;
      const periods = await MarcacionService.getAvailablePeriods();
      res.status(200).json({ success: true, data: periods });
    } catch (error) {
      logger.error('Get marcacion periods error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getMarcacionByPeriod(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        res.status(400).json({ success: false, message: 'startDate and endDate are required' });
        return;
      }
      const MarcacionService = (await import('@services/MarcacionService')).default;
      const marcaciones = await MarcacionService.getMarcacionByPeriod(startDate as string, endDate as string);
      res.status(200).json({ success: true, data: marcaciones });
    } catch (error) {
      logger.error('Get marcacion by period error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  // ===== DEPARTMENT SCHEDULE CONFIGURATION =====
  async createOrUpdateDepartmentSchedule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { departmentId, positionId, entryTimeMin, entryTimeMax, exitTimeMin, exitTimeMax, totalTimeMin, totalTimeMax, workHours } = req.body;

      if (!departmentId) {
        res.status(400).json({ success: false, message: 'departmentId is required' });
        return;
      }

      if (!positionId) {
        res.status(400).json({ success: false, message: 'positionId is required' });
        return;
      }

      // Validar formato de horas (HH:MM) para entrada y salida
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      const entryExitTimes = [entryTimeMin, entryTimeMax, exitTimeMin, exitTimeMax];
      
      for (const time of entryExitTimes) {
        if (time && !timeRegex.test(time)) {
          res.status(400).json({ success: false, message: `Invalid time format: ${time}. Use HH:MM format` });
          return;
        }
      }

      // Validar que totalTimeMin y totalTimeMax sean números
      if (totalTimeMin !== undefined && totalTimeMin !== null && isNaN(Number(totalTimeMin))) {
        res.status(400).json({ success: false, message: `Invalid totalTimeMin: ${totalTimeMin}. Debe ser un numero (minutes)` });
        return;
      }
      if (totalTimeMax !== undefined && totalTimeMax !== null && isNaN(Number(totalTimeMax))) {
        res.status(400).json({ success: false, message: `Invalid totalTimeMax: ${totalTimeMax}. Debe ser un numero (minutes)` });
        return;
      }

      // Validar que workHours sea un número
      if (workHours !== undefined && workHours !== null && isNaN(Number(workHours))) {
        res.status(400).json({ success: false, message: `Invalid workHours: ${workHours}. Debe ser un numero` });
        return;
      }

      const scheduleService = new DepartmentScheduleService();

      const config = await scheduleService.createOrUpdate(departmentId, {
        departmentId,
        positionId: positionId || undefined,
        entryTimeMin: entryTimeMin || '06:30',
        entryTimeMax: entryTimeMax || '07:30',
        exitTimeMin: exitTimeMin || '15:30',
        exitTimeMax: exitTimeMax || '16:30',
        totalTimeMin: Number(totalTimeMin) || 15,
        totalTimeMax: Number(totalTimeMax) || 15,
        workHours: Number(workHours) || 9,
      });

      res.status(201).json({ success: true, data: config });
    } catch (error) {
      logger.error('Create/Update department schedule error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getDepartmentSchedules(req: AuthRequest, res: Response): Promise<void> {
    try {
      const scheduleService = new DepartmentScheduleService();
      const configs = await scheduleService.getAllWithDepartments();
      res.status(200).json({ success: true, data: configs });
    } catch (error) {
      logger.error('Get department schedules error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getDepartmentScheduleById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const scheduleService = new DepartmentScheduleService();
      const config = await scheduleService.getById(id);

      if (!config) {
        res.status(404).json({ success: false, message: 'Schedule configuration not found' });
        return;
      }

      res.status(200).json({ success: true, data: config });
    } catch (error) {
      logger.error('Get department schedule error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getDepartmentScheduleByDepartmentId(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { departmentId } = req.params;
      const scheduleService = new DepartmentScheduleService();
      const config = await scheduleService.getWithDefaults(departmentId);

      res.status(200).json({ success: true, data: config });
    } catch (error) {
      logger.error('Get department schedule by department error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async deleteDepartmentSchedule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const scheduleService = new DepartmentScheduleService();
      const deleted = await scheduleService.delete(id);

      if (!deleted) {
        res.status(404).json({ success: false, message: 'Schedule configuration not found' });
        return;
      }

      res.status(200).json({ success: true, message: 'Schedule configuration deleted' });
    } catch (error) {
      logger.error('Delete department schedule error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }
}

export default new ResourceController();
