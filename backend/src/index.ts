import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import { initializeDatabase } from '@config/database';
import { authMiddleware } from '@middleware/auth';
import AuthController from '@controllers/AuthController';
import EmployeeController from '@controllers/EmployeeController';
import ResourceController from '@controllers/ResourceController';
import SchedulerService from '@services/SchedulerService';
import DailyControlService from '@services/DailyControlService';
import logger from '@utils/logger';
import errorLogger from '@utils/errorLogger';

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar multer para subida de archivos
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error logs endpoint (solo para desarrollo)
app.get('/api/logs/errors', authMiddleware, (req, res) => {
  const lines = req.query.lines ? parseInt(req.query.lines as string) : 100;
  const errorLogs = errorLogger.getRecentErrors(lines);
  res.status(200).json({ success: true, data: errorLogs });
});

// Auth routes
app.post('/api/auth/register', (req, res) => AuthController.register(req, res));
app.post('/api/auth/login', (req, res) => AuthController.login(req, res));
app.post('/api/auth/change-password', authMiddleware, (req, res) =>
  AuthController.changePassword(req, res)
);

// Employee routes
app.post('/api/employees', authMiddleware, (req, res) => EmployeeController.create(req, res));
app.get('/api/employees', authMiddleware, (req, res) => EmployeeController.getAll(req, res));
app.get('/api/employees/count', authMiddleware, (req, res) => EmployeeController.getAllCountEmployees(req, res));
app.delete('/api/employees/clear', authMiddleware, (req, res) => ResourceController.clearEmployees(req, res));
app.get('/api/employees/contracts/expiring', authMiddleware, (req, res) =>
  EmployeeController.getExpiringContracts(req, res)
);
app.get('/api/employees/:id', authMiddleware, (req, res) => EmployeeController.getById(req, res));
app.put('/api/employees/:id', authMiddleware, (req, res) => EmployeeController.update(req, res));
app.delete('/api/employees/:id', authMiddleware, (req, res) =>
  EmployeeController.delete(req, res)
);
app.post('/api/employees/:id/terminate', authMiddleware, (req, res) =>
  EmployeeController.terminate(req, res)
);

// Department routes
app.post('/api/departments', authMiddleware, (req, res) => ResourceController.createDepartment(req, res));
app.get('/api/departments', authMiddleware, (req, res) => ResourceController.getDepartments(req, res));
app.put('/api/departments/:id', authMiddleware, (req, res) => ResourceController.updateDepartment(req, res));
app.delete('/api/departments/:id', authMiddleware, (req, res) => ResourceController.deleteDepartment(req, res));

// Department Schedule Configuration routes
app.post('/api/department-schedules', authMiddleware, (req, res) => ResourceController.createOrUpdateDepartmentSchedule(req, res));
app.get('/api/department-schedules', authMiddleware, (req, res) => ResourceController.getDepartmentSchedules(req, res));
app.get('/api/department-schedules/:id', authMiddleware, (req, res) => ResourceController.getDepartmentScheduleById(req, res));
app.get('/api/department-schedules/department/:departmentId', authMiddleware, (req, res) => ResourceController.getDepartmentScheduleByDepartmentId(req, res));
app.delete('/api/department-schedules/:id', authMiddleware, (req, res) => ResourceController.deleteDepartmentSchedule(req, res));

// Position routes
app.post('/api/positions', authMiddleware, (req, res) => ResourceController.createPosition(req, res));
app.get('/api/positions', authMiddleware, (req, res) => ResourceController.getPositions(req, res));
app.delete('/api/positions/:id', authMiddleware, (req, res) => ResourceController.deletePosition(req, res));

// Labor routes
app.post('/api/labors', authMiddleware, (req, res) => ResourceController.createLabor(req, res));
app.get('/api/labors', authMiddleware, (req, res) => ResourceController.getLabors(req, res));
app.put('/api/labors/:id', authMiddleware, (req, res) => ResourceController.updateLabor(req, res));
app.delete('/api/labors/:id', authMiddleware, (req, res) => ResourceController.deleteLabor(req, res));

// Document Generator routes
app.post('/api/document-templates', authMiddleware, (req, res) => ResourceController.createDocumentTemplate(req, res));
app.post('/api/document-templates/upload', authMiddleware, upload.single('file'), (req, res) => ResourceController.uploadDocumentTemplate(req, res));
app.get('/api/document-templates', authMiddleware, (req, res) => ResourceController.getDocumentTemplates(req, res));
app.put('/api/document-templates/:id', authMiddleware, (req, res) => ResourceController.updateDocumentTemplate(req, res));
app.delete('/api/document-templates/:id', authMiddleware, (req, res) => ResourceController.deleteDocumentTemplate(req, res));

app.post('/api/generated-documents', authMiddleware, (req, res) => ResourceController.generateDocument(req, res));
app.get('/api/generated-documents', authMiddleware, (req, res) => ResourceController.getGeneratedDocuments(req, res));
app.get('/api/generated-documents/:id/download', authMiddleware, (req, res) => ResourceController.downloadGeneratedDocument(req, res));

// Bulk upload route
app.post('/api/bulk-upload', authMiddleware, upload.single('file'), (req, res) => ResourceController.bulkUpload(req, res));
app.post('/api/employees/register-not-found', authMiddleware, (req, res) => ResourceController.registerNotFoundEmployees(req, res));
app.delete('/api/employees/clear', authMiddleware, (req, res) => ResourceController.clearEmployees(req, res));

// Payroll routes
app.post('/api/payroll', authMiddleware, (req, res) => ResourceController.createPayroll(req, res));
app.get('/api/payroll', authMiddleware, (req, res) => ResourceController.getAllPayrolls(req, res));
app.delete('/api/payroll/clear', authMiddleware, (req, res) => ResourceController.clearPayrolls(req, res));
app.delete('/api/payroll/period/:year/:month', authMiddleware, (req, res) => ResourceController.deletePayrollByPeriod(req, res));
app.get('/api/payroll/period/:year/:month', authMiddleware, (req, res) => ResourceController.getPayrollByPeriod(req, res));
app.get('/api/payroll/sum/:year/:month', authMiddleware, (req, res) => ResourceController.getPayrollSumByPeriod(req, res));
app.get('/api/payroll/employee/:employeeId', authMiddleware, (req, res) => ResourceController.getPayrollByEmployee(req, res));
app.get('/api/payroll/:id', authMiddleware, (req, res) => ResourceController.getPayroll(req, res));
app.put('/api/payroll/:id', authMiddleware, (req, res) => ResourceController.updatePayroll(req, res));
app.delete('/api/payroll/:id', authMiddleware, (req, res) => ResourceController.deletePayroll(req, res));

// Attendance routes
app.post('/api/attendance', authMiddleware, (req, res) => ResourceController.createAttendance(req, res));
app.get('/api/attendance', authMiddleware, (req, res) => {
  // Si hay employeeId, obtener asistencia por empleado; si no, obtener toda la asistencia
  if (req.query.employeeId) {
    return ResourceController.getAttendanceByEmployee(req, res);
  } else {
    return ResourceController.getAllAttendance(req, res);
  }
});

// Marcación (Attendance Records) routes
app.get('/api/marcacion/periods', authMiddleware, (req, res) => ResourceController.getMarcacionPeriods(req, res));
app.get('/api/marcacion/period/data', authMiddleware, (req, res) => ResourceController.getMarcacionByPeriod(req, res));
app.post('/api/marcacion', authMiddleware, (req, res) => ResourceController.createMarcacion(req, res));
app.get('/api/marcacion', authMiddleware, (req, res) => ResourceController.getAllMarcacion(req, res));
app.get('/api/marcacion/:id', authMiddleware, (req, res) => ResourceController.getMarcacion(req, res));
app.get('/api/marcacion/cedula/:cedula', authMiddleware, (req, res) => ResourceController.getMarcacionByCedula(req, res));
app.get('/api/marcacion/month/:month', authMiddleware, (req, res) => ResourceController.getMarcacionByMonth(req, res));
app.get('/api/marcacion/cedula/:cedula/month/:month', authMiddleware, (req, res) => ResourceController.getMarcacionByCedulaAndMonth(req, res));
app.put('/api/marcacion/:id', authMiddleware, (req, res) => ResourceController.updateMarcacion(req, res));
app.delete('/api/marcacion/period', authMiddleware, (req, res) => ResourceController.deleteMarcacionByPeriod(req, res));
app.delete('/api/marcacion/month/:month', authMiddleware, (req, res) => ResourceController.deleteMarcacionByMonth(req, res));
app.delete('/api/marcacion/:id', authMiddleware, (req, res) => ResourceController.deleteMarcacion(req, res));

// Leave routes
app.get('/api/leaves', authMiddleware, (req, res) => ResourceController.getAllLeaves(req, res));
app.post('/api/leaves', authMiddleware, (req, res) => ResourceController.createLeave(req, res));
app.get('/api/leaves/pending', authMiddleware, (req, res) => ResourceController.getPendingLeaves(req, res));
app.get('/api/leaves/:employeeId', authMiddleware, (req, res) => ResourceController.getLeaveByEmployee(req, res));
app.post('/api/leaves/:id/approve', authMiddleware, (req, res) => ResourceController.approveLeave(req, res));

// Document routes
app.post('/api/documents/upload', authMiddleware, upload.single('file'), (req, res) => ResourceController.uploadDocument(req, res));
app.get('/api/documents', authMiddleware, (req, res) => ResourceController.getAllDocuments(req, res));
app.get('/api/documents/employee/:employeeId', authMiddleware, (req, res) => ResourceController.getDocumentsByEmployee(req, res));
app.get('/api/documents/type/:type', authMiddleware, (req, res) => ResourceController.getDocumentsByType(req, res));
app.delete('/api/documents/:id', authMiddleware, (req, res) => ResourceController.deleteDocument(req, res));
app.get('/api/documents/:id/download', authMiddleware, (req, res) => ResourceController.downloadDocument(req, res));

// Document Categories routes
app.post('/api/document-categories', authMiddleware, (req, res) => ResourceController.createDocumentCategory(req, res));
app.get('/api/document-categories', authMiddleware, (req, res) => ResourceController.getDocumentCategories(req, res));
app.put('/api/document-categories/:id', authMiddleware, (req, res) => ResourceController.updateDocumentCategory(req, res));
app.delete('/api/document-categories/:id', authMiddleware, (req, res) => ResourceController.deleteDocumentCategory(req, res));

// Tasks routes
app.post('/api/tasks', authMiddleware, (req, res) => ResourceController.createTask(req, res));
app.get('/api/tasks', authMiddleware, (req, res) => ResourceController.getAllTasks(req, res));
app.get('/api/tasks/:id', authMiddleware, (req, res) => ResourceController.getTaskById(req, res));
app.put('/api/tasks/:id', authMiddleware, (req, res) => ResourceController.updateTask(req, res));
app.delete('/api/tasks/:id', authMiddleware, (req, res) => ResourceController.deleteTask(req, res));
app.get('/api/tasks/status/:status', authMiddleware, (req, res) => ResourceController.getTasksByStatus(req, res));
app.get('/api/tasks/date/:date', authMiddleware, (req, res) => ResourceController.getTasksByDueDate(req, res));

// Notification Schedule routes
app.post('/api/notification-schedules', authMiddleware, (req, res) => ResourceController.createNotificationSchedule(req, res));
app.get('/api/notification-schedules', authMiddleware, (req, res) => ResourceController.getAllNotificationSchedules(req, res));
app.get('/api/notification-schedules/:id', authMiddleware, (req, res) => ResourceController.getNotificationSchedule(req, res));
app.put('/api/notification-schedules/:id', authMiddleware, (req, res) => ResourceController.updateNotificationSchedule(req, res));
app.delete('/api/notification-schedules/:id', authMiddleware, (req, res) => ResourceController.deleteNotificationSchedule(req, res));

// Daily Controls routes
app.get('/api/daily-controls', authMiddleware, (req, res) => ResourceController.getDailyControls(req, res));
app.post('/api/daily-controls/:type/enable', authMiddleware, (req, res) => ResourceController.enableDailyControl(req, res));
app.post('/api/daily-controls/:type/disable', authMiddleware, (req, res) => ResourceController.disableDailyControl(req, res));

// Benefits routes
app.post('/api/benefits', authMiddleware, (req, res) => ResourceController.createBenefit(req, res));
app.get('/api/benefits', authMiddleware, (req, res) => ResourceController.getAllBenefits(req, res));
app.get('/api/benefits/:id', authMiddleware, (req, res) => ResourceController.getBenefit(req, res));
app.put('/api/benefits/:id', authMiddleware, (req, res) => ResourceController.updateBenefit(req, res));
app.delete('/api/benefits/:id', authMiddleware, (req, res) => ResourceController.deleteBenefit(req, res));
app.post('/api/benefits/assign', authMiddleware, (req, res) => ResourceController.assignBenefit(req, res));
app.get('/api/benefits/employee/:employeeId', authMiddleware, (req, res) => ResourceController.getEmployeeBenefits(req, res));
app.get('/api/benefits/employee/:employeeId/total', authMiddleware, (req, res) => ResourceController.calculateEmployeeBenefitsTotal(req, res));

// Reports routes
app.post('/api/reports/payroll', authMiddleware, (req, res) => ResourceController.generatePayrollReport(req, res));
app.post('/api/reports/attendance', authMiddleware, (req, res) => ResourceController.generateAttendanceReport(req, res));
app.post('/api/reports/leaves', authMiddleware, (req, res) => ResourceController.generateLeaveReport(req, res));
app.post('/api/reports/employees', authMiddleware, (req, res) => ResourceController.generateEmployeeReport(req, res));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    logger.info('Database initialized successfully');

    // Initialize notification scheduler
    await SchedulerService.initializeScheduler();
    logger.info('Notification scheduler initialized');

    // Initialize daily controls
    await DailyControlService.initializeDailyControls();
    logger.info('Daily control service initialized');

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

startServer();
