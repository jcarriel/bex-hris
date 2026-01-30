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
import DocumentService from '@services/DocumentService';
import DocumentCategoryService from '@services/DocumentCategoryService';
import { TaskService } from '@services/TaskService';
import NotificationScheduleService from '@services/NotificationScheduleService';
import SchedulerService from '@services/SchedulerService';
import DocumentGeneratorService from '../services/DocumentGeneratorService';
import logger from '@utils/logger';

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

  async deletePosition(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
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
      const labor = LaborService.createLabor(name, description, positionId);
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
        labors = LaborService.getLaborsByPosition(positionId as string);
      } else {
        labors = LaborService.getLabors();
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
      const labor = LaborService.updateLabor(id, name, description, positionId);
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
      const result = LaborService.deleteLabor(id);
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
        return sum + (payroll.baseSalary || 0);
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
      const leave = await LeaveService.createLeave(req.body);
      res.status(201).json({ success: true, data: leave });
    } catch (error) {
      logger.error('Create leave error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
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
      const { id } = req.params;
      const leave = await LeaveService.approveLeave(id, req.userId || '');
      if (!leave) {
        res.status(404).json({ success: false, message: 'Leave not found' });
        return;
      }
      res.status(200).json({ success: true, data: leave });
    } catch (error) {
      logger.error('Approve leave error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  // ===== DOCUMENTS =====
  async uploadDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { employeeId, documentType } = req.body;
      const file = (req as any).file;

      // Si no hay archivo, intentar obtener del body (para multipart/form-data)
      if (!file && !employeeId && !documentType) {
        res.status(400).json({ success: false, message: 'Missing required fields: file, employeeId, documentType' });
        return;
      }

      if (!employeeId || !documentType) {
        res.status(400).json({ success: false, message: 'Missing required fields: employeeId, documentType' });
        return;
      }

      if (!file) {
        res.status(400).json({ success: false, message: 'Missing file' });
        return;
      }

      // Obtener cédula del empleado
      const employee = await EmployeeService.getEmployee(employeeId);
      if (!employee) {
        res.status(404).json({ success: false, message: 'Employee not found' });
        return;
      }

      const document = await DocumentService.uploadDocument(employeeId, file, documentType, (employee as any).cedula);
      res.status(201).json({ success: true, data: document });
    } catch (error) {
      logger.error('Upload document error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getAllDocuments(req: AuthRequest, res: Response): Promise<void> {
    try {
      const documents = await DocumentService.getAllDocuments();
      res.status(200).json({ success: true, data: documents });
    } catch (error) {
      logger.error('Get all documents error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getDocumentsByEmployee(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { employeeId } = req.params;
      const documents = await DocumentService.getDocumentsByEmployee(employeeId);
      res.status(200).json({ success: true, data: documents });
    } catch (error) {
      logger.error('Get documents error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getDocumentsByType(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const documents = await DocumentService.getDocumentsByType(type);
      res.status(200).json({ success: true, data: documents });
    } catch (error) {
      logger.error('Get documents by type error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async deleteDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await DocumentService.deleteDocument(id);
      if (!result) {
        res.status(404).json({ success: false, message: 'Document not found' });
        return;
      }
      res.status(200).json({ success: true, message: 'Document deleted' });
    } catch (error) {
      logger.error('Delete document error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async downloadDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { filePath, fileName } = await DocumentService.downloadDocument(id);
      res.download(filePath, fileName);
    } catch (error) {
      logger.error('Download document error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  // ===== DOCUMENT CATEGORIES =====
  async createDocumentCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, description } = req.body;
      if (!name) {
        res.status(400).json({ success: false, message: 'Name is required' });
        return;
      }
      const category = await DocumentCategoryService.createCategory(name, description);
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      logger.error('Create document category error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getDocumentCategories(req: AuthRequest, res: Response): Promise<void> {
    try {
      const categories = await DocumentCategoryService.getAllCategories();
      res.status(200).json({ success: true, data: categories });
    } catch (error) {
      logger.error('Get document categories error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async updateDocumentCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const category = await DocumentCategoryService.updateCategory(id, req.body);
      if (!category) {
        res.status(404).json({ success: false, message: 'Category not found' });
        return;
      }
      res.status(200).json({ success: true, data: category });
    } catch (error) {
      logger.error('Update document category error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async deleteDocumentCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await DocumentCategoryService.deleteCategory(id);
      if (!result) {
        res.status(404).json({ success: false, message: 'Category not found' });
        return;
      }
      res.status(200).json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
      logger.error('Delete document category error', error);
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

      const task = await TaskService.updateTask(id, taskData);

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
      const deleted = await TaskService.deleteTask(id);

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

  // ===== DOCUMENT GENERATOR =====
  async createDocumentTemplate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, type, content, variables } = req.body;
      if (!name || !type || !content) {
        res.status(400).json({ success: false, message: 'Name, type, and content are required' });
        return;
      }
      const template = await DocumentGeneratorService.createTemplate({ name, type, content, variables });
      res.status(201).json({ success: true, data: template });
    } catch (error) {
      logger.error('Create document template error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async uploadDocumentTemplate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, type, variables } = req.body;
      const file = (req as any).file;

      if (!name || !type || !file) {
        res.status(400).json({ success: false, message: 'Name, type, and file are required' });
        return;
      }

      const variablesArray = typeof variables === 'string' ? JSON.parse(variables) : variables || [];
      const template = await DocumentGeneratorService.createTemplateFromFile(
        name,
        type,
        file.buffer,
        file.originalname,
        variablesArray
      );
      res.status(201).json({ success: true, data: template });
    } catch (error) {
      logger.error('Upload document template error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getDocumentTemplates(req: AuthRequest, res: Response): Promise<void> {
    try {
      const templates = await DocumentGeneratorService.getAllTemplates();
      res.status(200).json({ success: true, data: templates });
    } catch (error) {
      logger.error('Get document templates error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async updateDocumentTemplate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const template = await DocumentGeneratorService.updateTemplate(id, req.body);
      if (!template) {
        res.status(404).json({ success: false, message: 'Template not found' });
        return;
      }
      res.status(200).json({ success: true, data: template });
    } catch (error) {
      logger.error('Update document template error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async deleteDocumentTemplate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await DocumentGeneratorService.deleteTemplate(id);
      res.status(200).json({ success: true, message: 'Template deleted' });
    } catch (error) {
      logger.error('Delete document template error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async generateDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { templateId, data } = req.body;
      if (!templateId || !data) {
        res.status(400).json({ success: false, message: 'Template ID and data are required' });
        return;
      }
      const document = await DocumentGeneratorService.generateDocument(templateId, data);
      res.status(201).json({ success: true, data: document });
    } catch (error) {
      logger.error('Generate document error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getGeneratedDocuments(req: AuthRequest, res: Response): Promise<void> {
    try {
      const documents = await DocumentGeneratorService.getAllGeneratedDocuments();
      res.status(200).json({ success: true, data: documents });
    } catch (error) {
      logger.error('Get generated documents error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  async downloadGeneratedDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const document = await DocumentGeneratorService.getGeneratedDocument(id);
      if (!document) {
        res.status(404).json({ success: false, message: 'Document not found' });
        return;
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=documento-${id}.pdf`);
      res.send(document.generatedContent);
    } catch (error) {
      logger.error('Download generated document error', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error' });
    }
  }

  // ===== BULK UPLOAD =====
  async bulkUpload(req: AuthRequest, res: Response): Promise<void> {
    try {
      logger.info('Bulk upload request received');
      const { type } = req.body;
      const file = (req as any).file;

      logger.info(`Bulk upload - Type: ${type}, File: ${file?.originalname}, Size: ${file?.size}`);

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
          file.originalname
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
      
      // Deshabilitar restricciones de clave foránea temporalmente
      await db.exec('PRAGMA foreign_keys = OFF');
      
      try {
        // Eliminar datos de tablas dependientes primero
        await db.exec('DELETE FROM documents');
        await db.exec('DELETE FROM attendance');
        await db.exec('DELETE FROM leaves');
        await db.exec('DELETE FROM payroll');
        await db.exec('DELETE FROM tasks WHERE assignedTo IS NOT NULL');
        
        // Finalmente eliminar empleados
        await db.exec('DELETE FROM employees');
        
        logger.info('Employees table and related data cleared');
        res.status(200).json({ success: true, message: 'Employees table cleared successfully' });
      } finally {
        // Reabilitar restricciones de clave foránea
        await db.exec('PRAGMA foreign_keys = ON');
      }
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
              email: `emp${emp.cedula}@temp.local`,
              personalEmail: `emp${emp.cedula}@temp.local`,
              cedula: emp.cedula,
              phone: '',
              personalPhone: '',
              departmentId: defaultDepartment.id,
              positionId: defaultPosition.id,
              hireDate: new Date().toISOString().split('T')[0],
              baseSalary: 0,
              contractType: 'indefinite',
              status: 'active',
              employeeNumber: `EMP-${emp.cedula}`,
              dateOfBirth: '',
              gender: 'O',
              maritalStatus: 'single',
              address: '',
            };

            const createdEmployee = await EmployeeService.createEmployee(employeeData);
            registered.push({
              ...createdEmployee,
              missingFields: ['baseSalary', 'phone', 'dateOfBirth', 'gender', 'maritalStatus', 'address'],
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
}

export default new ResourceController();
