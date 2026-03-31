import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import { initializeDatabase, getDatabase } from '@config/database';
import { authMiddleware, adminMiddleware, requireAction } from '@middleware/auth';
import AuthController from '@controllers/AuthController';
import UserAdminController from '@controllers/UserAdminController';
import RoleController from '@controllers/RoleController';
import EmployeeController from '@controllers/EmployeeController';
import ResourceController from '@controllers/ResourceController';
import RecurringTaskController from '@controllers/RecurringTaskController';
import CatalogController from '@controllers/CatalogController';
import SchedulerService from '@services/SchedulerService';
import DailyControlService from '@services/DailyControlService';
import TaskSchedulerService from '@services/TaskSchedulerService';
import RecurringTaskService from '@services/RecurringTaskService';
import RecurringTaskGeneratorService from '@services/RecurringTaskGeneratorService';
import EventController from '@controllers/EventController';
import TaskController from '@controllers/TaskController';
import NotificationController from '@controllers/NotificationController';
import WorkforceController from '@controllers/WorkforceController';
import SocialCaseController from '@controllers/SocialCaseController';
import EventDigestScheduler from '@services/EventDigestScheduler';
import EventTypeConfigService from '@services/EventTypeConfigService';
import AuditController from '@controllers/AuditController';
import { LockerController } from '@controllers/LockerController';
import DashboardController from '@controllers/DashboardController';
import { MayordomoController } from '@controllers/MayordomoController';
import NovedadController from '@controllers/NovedadController';
import logger from '@utils/logger';
import errorLogger from '@utils/errorLogger';

const app = express();
const PORT = process.env.PORT || 4000;

// Configurar multer para subida de archivos
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(helmet());
// Handle preflight requests explicitly before other middleware
app.options('*', (req, res) => {
  const origin = req.headers.origin || '';
  const isAllowed =
    !origin ||
    /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
    origin.endsWith('.vercel.app') ||
    origin.endsWith('.railway.app') ||
    (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).includes(origin);
  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Biometrico-Target,X-Biometrico-Token');
  }
  res.sendStatus(204);
});
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    const allowed = (process.env.CORS_ORIGINS || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    // Always allow localhost and vercel/railway previews
    const isAllowed =
      allowed.includes(origin) ||
      /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.railway.app');
    return callback(isAllowed ? null : new Error('Not allowed by CORS'), isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Biometrico-Target', 'X-Biometrico-Token'],
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

// Company settings routes
app.get('/api/settings/company', authMiddleware, async (req, res) => {
  try {
    const db = getDatabase();
    const row = await db.get(`SELECT value FROM app_settings WHERE key = 'company'`) as any;
    res.json({ success: true, data: row ? JSON.parse(row.value) : {} });
  } catch (e) { res.status(500).json({ success: false }); }
});
app.put('/api/settings/company', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = getDatabase();
    const value = JSON.stringify(req.body);
    await db.run(`INSERT INTO app_settings (key, value) VALUES ('company', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, [value]);
    res.json({ success: true, data: req.body });
  } catch (e) { res.status(500).json({ success: false }); }
});

// ─── Biométrico proxy (evita CORS: el backend hace las peticiones a UTimeMaster) ───
// El frontend envía el header X-Biometrico-Target con la URL base de UTimeMaster
// Ej: X-Biometrico-Target: http://192.168.20.3:8081

app.post('/api/biometrico/auth', authMiddleware, async (req: any, res: any) => {
  const target = req.headers['x-biometrico-target'] as string;
  if (!target) return res.status(400).json({ success: false, message: 'Falta header X-Biometrico-Target' });
  try {
    const response = await axios.post(`${target}/jwt-api-token-auth/`, req.body, { timeout: 10000 });
    res.json(response.data);
  } catch (e: any) {
    const status = e?.response?.status ?? 502;
    res.status(status).json(e?.response?.data ?? { detail: 'Error conectando a UTimeMaster' });
  }
});

// app.use monta el handler en el prefijo — req.path contiene solo el sufijo (/api/iclock/...)
app.use('/api/biometrico/proxy', authMiddleware, async (req: any, res: any) => {
  const target = req.headers['x-biometrico-target'] as string;
  if (!target) return res.status(400).json({ success: false, message: 'Falta header X-Biometrico-Target' });

  const url = `${target}${req.path}`;
  logger.info(`[Biometrico Proxy] ${req.method} ${url}`);

  try {
    const response = await axios({
      method:  req.method,
      url,
      params:  req.query,
      data:    ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : undefined,
      headers: {
        ...(req.headers['x-biometrico-token'] ? { Authorization: `JWT ${req.headers['x-biometrico-token']}` } : {}),
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
    logger.info(`[Biometrico Proxy] Response ${response.status} from ${url}`);
    res.status(response.status).json(response.data);
  } catch (e: any) {
    const status = e?.response?.status ?? 502;
    logger.warn(`[Biometrico Proxy] Error ${status} from ${url}: ${JSON.stringify(e?.response?.data)}`);
    res.status(status).json(e?.response?.data ?? { detail: 'Error en proxy biométrico' });
  }
});

// Auth routes
app.post('/api/auth/register', (req, res) => AuthController.register(req, res));
app.post('/api/auth/login', (req, res) => AuthController.login(req, res));
app.post('/api/auth/change-password', authMiddleware, (req, res) =>
  AuthController.changePassword(req, res)
);

// Admin user routes (admin only)
app.get('/api/admin/users',                      authMiddleware, adminMiddleware, (req, res) => UserAdminController.getAll(req, res));
app.post('/api/admin/users',                     authMiddleware, adminMiddleware, (req, res) => UserAdminController.create(req, res));
app.put('/api/admin/users/:id',                  authMiddleware, adminMiddleware, (req, res) => UserAdminController.update(req, res));
app.delete('/api/admin/users/:id',               authMiddleware, adminMiddleware, (req, res) => UserAdminController.delete(req, res));
app.post('/api/admin/users/:id/reset-password',  authMiddleware, adminMiddleware, (req, res) => UserAdminController.resetPassword(req, res));

// Audit logs route (admin only)
app.get('/api/audit-logs', authMiddleware, adminMiddleware, (req, res) => AuditController.getAll(req, res));

// Roles routes (admin only for write, all authenticated for read)
app.get('/api/roles',         authMiddleware,                    (req, res) => RoleController.getAll(req, res));
app.get('/api/roles/modules', authMiddleware,                    (req, res) => RoleController.getModules(req, res));
app.post('/api/roles',        authMiddleware, adminMiddleware,   (req, res) => RoleController.create(req, res));
app.put('/api/roles/:id',     authMiddleware, adminMiddleware,   (req, res) => RoleController.update(req, res));
app.delete('/api/roles/:id',  authMiddleware, adminMiddleware,   (req, res) => RoleController.delete(req, res));

// Dashboard stats route
app.get('/api/dashboard/stats', authMiddleware, (req, res) => DashboardController.getStats(req, res));

// Employee routes
app.post('/api/employees', authMiddleware, requireAction('empleados:crear'), (req, res) => EmployeeController.create(req, res));
app.get('/api/employees', authMiddleware, (req, res) => EmployeeController.getAll(req, res));
app.get('/api/employees/count', authMiddleware, (req, res) => EmployeeController.getAllCountEmployees(req, res));
app.delete('/api/employees/clear', authMiddleware, adminMiddleware, (req, res) => ResourceController.clearEmployees(req, res));
app.get('/api/employees/contracts/expiring', authMiddleware, (req, res) =>
  EmployeeController.getExpiringContracts(req, res)
);
app.get('/api/employees/:id', authMiddleware, requireAction('empleados:ver'), (req, res) => EmployeeController.getById(req, res));
app.put('/api/employees/:id', authMiddleware, requireAction('empleados:editar'), (req, res) => EmployeeController.update(req, res));
app.delete('/api/employees/:id', authMiddleware, requireAction('empleados:eliminar'), (req, res) =>
  EmployeeController.delete(req, res)
);
app.post('/api/employees/:id/terminate', authMiddleware, requireAction('empleados:editar'), (req, res) =>
  EmployeeController.terminate(req, res)
);

// Department routes
app.post('/api/departments', authMiddleware, requireAction('tablas:crear'), (req, res) => ResourceController.createDepartment(req, res));
app.get('/api/departments', authMiddleware, (req, res) => ResourceController.getDepartments(req, res));
app.put('/api/departments/:id', authMiddleware, requireAction('tablas:editar'), (req, res) => ResourceController.updateDepartment(req, res));
app.delete('/api/departments/:id', authMiddleware, requireAction('tablas:eliminar'), (req, res) => ResourceController.deleteDepartment(req, res));

// Department Schedule Configuration routes
app.post('/api/department-schedules', authMiddleware, (req, res) => ResourceController.createOrUpdateDepartmentSchedule(req, res));
app.get('/api/department-schedules', authMiddleware, (req, res) => ResourceController.getDepartmentSchedules(req, res));
app.get('/api/department-schedules/:id', authMiddleware, (req, res) => ResourceController.getDepartmentScheduleById(req, res));
app.get('/api/department-schedules/department/:departmentId', authMiddleware, (req, res) => ResourceController.getDepartmentScheduleByDepartmentId(req, res));
app.delete('/api/department-schedules/:id', authMiddleware, (req, res) => ResourceController.deleteDepartmentSchedule(req, res));

// Position routes
app.post('/api/positions', authMiddleware, requireAction('tablas:crear'), (req, res) => ResourceController.createPosition(req, res));
app.get('/api/positions', authMiddleware, (req, res) => ResourceController.getPositions(req, res));
app.put('/api/positions/:id', authMiddleware, requireAction('tablas:editar'), (req, res) => ResourceController.updatePosition(req, res));
app.delete('/api/positions/:id', authMiddleware, requireAction('tablas:eliminar'), (req, res) => ResourceController.deletePosition(req, res));

// Labor routes
app.post('/api/labors', authMiddleware, requireAction('tablas:crear'), (req, res) => ResourceController.createLabor(req, res));
app.get('/api/labors', authMiddleware, (req, res) => ResourceController.getLabors(req, res));
app.put('/api/labors/:id', authMiddleware, requireAction('tablas:editar'), (req, res) => ResourceController.updateLabor(req, res));
app.delete('/api/labors/:id', authMiddleware, requireAction('tablas:eliminar'), (req, res) => ResourceController.deleteLabor(req, res));

// Catalog routes
app.get('/api/catalogs/:type', authMiddleware, (req, res) => CatalogController.getByType(req, res));
app.post('/api/catalogs', authMiddleware, requireAction('tablas:crear'), (req, res) => CatalogController.create(req, res));
app.put('/api/catalogs/:id', authMiddleware, requireAction('tablas:editar'), (req, res) => CatalogController.update(req, res));
app.delete('/api/catalogs/:id', authMiddleware, requireAction('tablas:eliminar'), (req, res) => CatalogController.delete(req, res));

// Maestro General routes
app.get('/api/maestro-general',        authMiddleware, (req, res) => ResourceController.getMaestroGeneral(req, res));
app.post('/api/maestro-general',       authMiddleware, (req, res) => ResourceController.createMaestro(req, res));
app.put('/api/maestro-general/:id',    authMiddleware, (req, res) => ResourceController.updateMaestro(req, res));
app.delete('/api/maestro-general/:id', authMiddleware, (req, res) => ResourceController.deleteMaestro(req, res));

// Bulk upload route
app.post('/api/bulk-upload', authMiddleware, requireAction('carga-masiva:crear'), upload.single('file'), (req, res) => ResourceController.bulkUpload(req, res));
app.post('/api/employees/register-not-found', authMiddleware, (req, res) => ResourceController.registerNotFoundEmployees(req, res));
app.delete('/api/employees/clear', authMiddleware, (req, res) => ResourceController.clearEmployees(req, res));

// Payroll routes
app.post('/api/payroll', authMiddleware, requireAction('nomina'), (req, res) => ResourceController.createPayroll(req, res));
app.get('/api/payroll', authMiddleware, (req, res) => ResourceController.getAllPayrolls(req, res));
app.delete('/api/payroll/clear', authMiddleware, adminMiddleware, (req, res) => ResourceController.clearPayrolls(req, res));
app.delete('/api/payroll/period/:year/:month', authMiddleware, requireAction('nomina:eliminar'), (req, res) => ResourceController.deletePayrollByPeriod(req, res));
app.get('/api/payroll/period/:year/:month', authMiddleware, (req, res) => ResourceController.getPayrollByPeriod(req, res));
app.get('/api/payroll/sum/:year/:month', authMiddleware, (req, res) => ResourceController.getPayrollSumByPeriod(req, res));
app.get('/api/payroll/employee/:employeeId', authMiddleware, (req, res) => ResourceController.getPayrollByEmployee(req, res));
app.get('/api/payroll/:id', authMiddleware, (req, res) => ResourceController.getPayroll(req, res));
app.put('/api/payroll/:id', authMiddleware, requireAction('nomina'), (req, res) => ResourceController.updatePayroll(req, res));
app.delete('/api/payroll/:id', authMiddleware, requireAction('nomina:eliminar'), (req, res) => ResourceController.deletePayroll(req, res));

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
app.delete('/api/marcacion/period', authMiddleware, requireAction('asistencia:eliminar'), (req, res) => ResourceController.deleteMarcacionByPeriod(req, res));
app.delete('/api/marcacion/month/:month', authMiddleware, requireAction('asistencia:eliminar'), (req, res) => ResourceController.deleteMarcacionByMonth(req, res));
app.delete('/api/marcacion/:id', authMiddleware, requireAction('asistencia:eliminar'), (req, res) => ResourceController.deleteMarcacion(req, res));

// Leave routes
app.get('/api/leaves', authMiddleware, (req, res) => ResourceController.getAllLeaves(req, res));
app.post('/api/leaves', authMiddleware, requireAction('bienestar:crear'), (req, res) => ResourceController.createLeave(req, res));
app.get('/api/leaves/pending', authMiddleware, (req, res) => ResourceController.getPendingLeaves(req, res));
app.get('/api/leaves/balance/:employeeId', authMiddleware, (req, res) => ResourceController.getLeaveBalance(req, res));
app.get('/api/leaves/:employeeId', authMiddleware, (req, res) => ResourceController.getLeaveByEmployee(req, res));
app.post('/api/leaves/:id/approve', authMiddleware, requireAction('bienestar:aprobar'), (req, res) => ResourceController.approveLeave(req, res));
app.post('/api/leaves/:id/reject', authMiddleware, requireAction('bienestar:aprobar'), (req, res) => ResourceController.rejectLeave(req, res));
app.put('/api/leaves/:id', authMiddleware, requireAction('bienestar:editar'), (req, res) => ResourceController.updateLeave(req, res));
app.delete('/api/leaves/:id', authMiddleware, requireAction('bienestar:eliminar'), (req, res) => ResourceController.deleteLeave(req, res));

// Novedades routes
app.get('/api/novedades',                         authMiddleware, (req, res) => NovedadController.getAll(req, res));
app.post('/api/novedades',                        authMiddleware, requireAction('bienestar:crear'), (req, res) => NovedadController.create(req, res));
app.get('/api/novedades/employee/:employeeId',    authMiddleware, (req, res) => NovedadController.getByEmployee(req, res));
app.put('/api/novedades/:id',                     authMiddleware, requireAction('bienestar:editar'), (req, res) => NovedadController.update(req, res));
app.delete('/api/novedades/:id',                  authMiddleware, requireAction('bienestar:eliminar'), (req, res) => NovedadController.delete(req, res));

// Social Cases routes
app.get('/api/social-cases', authMiddleware, (req, res) => SocialCaseController.getAll(req, res));
app.post('/api/social-cases', authMiddleware, requireAction('bienestar:crear'), (req, res) => SocialCaseController.create(req, res));
app.get('/api/social-cases/employee/:employeeId', authMiddleware, (req, res) => SocialCaseController.getByEmployee(req, res));
app.put('/api/social-cases/:id', authMiddleware, requireAction('bienestar:editar'), (req, res) => SocialCaseController.update(req, res));
app.delete('/api/social-cases/:id', authMiddleware, requireAction('bienestar:eliminar'), (req, res) => SocialCaseController.delete(req, res));

// Lockers routes
app.get('/api/lockers/stats',    authMiddleware, (req, res) => LockerController.getStats(req, res));
app.get('/api/lockers/sections', authMiddleware, (req, res) => LockerController.getSections(req, res));
app.get('/api/lockers',          authMiddleware, (req, res) => LockerController.getAll(req, res));
app.post('/api/lockers',         authMiddleware, requireAction('casilleros:crear'), (req, res) => LockerController.create(req, res));
app.get('/api/lockers/:id',      authMiddleware, (req, res) => LockerController.getById(req, res));
app.put('/api/lockers/:id',      authMiddleware, requireAction('casilleros:editar'), (req, res) => LockerController.update(req, res));
app.delete('/api/lockers/:id',   authMiddleware, requireAction('casilleros:eliminar'), (req, res) => LockerController.delete(req, res));

// Tasks routes (new TaskController)
app.get('/api/tasks/my',            authMiddleware, (req, res) => TaskController.getMyTasks(req, res));
app.get('/api/tasks/stats',         authMiddleware, (req, res) => TaskController.getStats(req, res));
app.get('/api/tasks',               authMiddleware, (req, res) => TaskController.getAll(req, res));
app.post('/api/tasks',              authMiddleware, requireAction('tareas:crear'), (req, res) => TaskController.create(req, res));
app.get('/api/tasks/:id/comments',  authMiddleware, (req, res) => TaskController.getComments(req, res));
app.post('/api/tasks/:id/comments', authMiddleware, (req, res) => TaskController.addComment(req, res));
app.put('/api/tasks/:id/status',    authMiddleware, (req, res) => TaskController.changeStatus(req, res));
app.put('/api/tasks/:id/reassign',  authMiddleware, (req, res) => TaskController.reassign(req, res));
app.get('/api/tasks/:id',           authMiddleware, (req, res) => TaskController.getById(req, res));
app.put('/api/tasks/:id',           authMiddleware, (req, res) => TaskController.update(req, res));
app.delete('/api/tasks/:id',        authMiddleware, requireAction('tareas:eliminar'), (req, res) => TaskController.delete(req, res));

// Users list (for task assignment - all authenticated users)
app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const db = getDatabase();
    const users = await db.all(`SELECT id, nombre, username, email FROM users WHERE status != 'inactive' ORDER BY nombre ASC`);
    res.json({ success: true, data: users });
  } catch { res.status(500).json({ success: false, message: 'Error' }); }
});

// Notifications routes
app.get('/api/notifications',              authMiddleware, (req, res) => NotificationController.getMyNotifications(req, res));
app.get('/api/notifications/unread-count', authMiddleware, (req, res) => NotificationController.getUnreadCount(req, res));
app.put('/api/notifications/read-all',     authMiddleware, (req, res) => NotificationController.markAllRead(req, res));
app.put('/api/notifications/:id/read',     authMiddleware, (req, res) => NotificationController.markRead(req, res));
app.delete('/api/notifications/all',       authMiddleware, (req, res) => NotificationController.deleteAll(req, res));
app.delete('/api/notifications/:id',       authMiddleware, (req, res) => NotificationController.deleteOne(req, res));

// Recurring Tasks routes
app.post('/api/recurring-tasks', authMiddleware, (req, res) => RecurringTaskController.create(req, res));
app.get('/api/recurring-tasks', authMiddleware, (req, res) => RecurringTaskController.getAll(req, res));
app.get('/api/recurring-tasks/:id', authMiddleware, (req, res) => RecurringTaskController.getById(req, res));
app.put('/api/recurring-tasks/:id', authMiddleware, (req, res) => RecurringTaskController.update(req, res));
app.delete('/api/recurring-tasks/:id', authMiddleware, (req, res) => RecurringTaskController.delete(req, res));
app.post('/api/recurring-tasks/:id/toggle', authMiddleware, (req, res) => RecurringTaskController.toggleActive(req, res));

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

// Events routes
app.get('/api/events/upcoming', authMiddleware, (req, res) => EventController.getUpcoming(req, res));
app.get('/api/events', authMiddleware, (req, res) => EventController.getAll(req, res));
app.post('/api/events', authMiddleware, (req, res) => EventController.create(req, res));
app.put('/api/events/:id', authMiddleware, (req, res) => EventController.update(req, res));
app.delete('/api/events/:id', authMiddleware, (req, res) => EventController.delete(req, res));
app.post('/api/events/send-digest', authMiddleware, (req, res) => EventController.triggerDigest(req, res));
app.get('/api/event-configs', authMiddleware, (req, res) => EventController.getConfigs(req, res));
app.put('/api/event-configs/:type', authMiddleware, (req, res) => EventController.updateConfig(req, res));

// Workforce routes
app.get('/api/workforce',     authMiddleware, (req, res) => WorkforceController.getAll(req, res));
app.post('/api/workforce',    authMiddleware, requireAction('fuerza-laboral:crear'), (req, res) => WorkforceController.create(req, res));
app.get('/api/workforce/:id', authMiddleware, (req, res) => WorkforceController.getById(req, res));
app.put('/api/workforce/:id', authMiddleware, requireAction('fuerza-laboral:editar'), (req, res) => WorkforceController.update(req, res));
app.delete('/api/workforce/:id', authMiddleware, requireAction('fuerza-laboral:eliminar'), (req, res) => WorkforceController.delete(req, res));

// Mayordomos routes
app.get('/api/mayordomos',                         authMiddleware, (req, res) => MayordomoController.getAll(req, res));
app.post('/api/mayordomos',                        authMiddleware, requireAction('mayordomos:crear'), (req, res) => MayordomoController.create(req, res));
app.put('/api/mayordomos/:id',                     authMiddleware, requireAction('mayordomos:crear'), (req, res) => MayordomoController.update(req, res));
app.delete('/api/mayordomos/:id',                  authMiddleware, requireAction('mayordomos:eliminar'), (req, res) => MayordomoController.delete(req, res));
app.post('/api/mayordomos/:id/employees',          authMiddleware, requireAction('mayordomos:crear'), (req, res) => MayordomoController.assignEmployee(req, res));
app.delete('/api/mayordomos/employees/:employeeId',authMiddleware, requireAction('mayordomos:crear'), (req, res) => MayordomoController.removeEmployee(req, res));

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

    // Initialize task scheduler
    TaskSchedulerService.initialize();
    logger.info('Task scheduler initialized');

    // Initialize recurring task generator
    RecurringTaskGeneratorService.initialize();
    logger.info('Recurring task generator initialized');

    // Seed event type configs (inserts defaults if not present)
    await EventTypeConfigService.seed();
    logger.info('Event type configs seeded');

    EventDigestScheduler.initialize();
    logger.info('Event digest scheduler initialized');

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message + '\n' + error.stack : String(error);
    console.error('Failed to start server:', errorMsg);
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

startServer();
