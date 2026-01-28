import cron, { ScheduledTask } from 'node-cron';
import NotificationScheduleService from './NotificationScheduleService';
import NotificationService from '@notifications/NotificationService';
import EmployeeService from './EmployeeService';
import logger from '@utils/logger';

export class SchedulerService {
  private jobs: Map<string, ScheduledTask> = new Map();

  async initializeScheduler(): Promise<void> {
    try {
      logger.info('Initializing notification scheduler...');
      const schedules = await NotificationScheduleService.getEnabledSchedules();

      for (const schedule of schedules) {
        this.createScheduleJob(schedule);
      }

      logger.info(`Scheduler initialized with ${schedules.length} active schedules`);
    } catch (error) {
      logger.error('Error initializing scheduler', error);
    }
  }

  private createScheduleJob(schedule: any): void {
    try {
      let cronExpression = '';

      // Construir expresión cron basada en la configuración
      if (schedule.dayOfWeek) {
        // Ejecutar en días específicos de la semana (0=domingo, 1=lunes, etc.)
        const dayMap: { [key: string]: number } = {
          'sunday': 0,
          'monday': 1,
          'tuesday': 2,
          'wednesday': 3,
          'thursday': 4,
          'friday': 5,
          'saturday': 6
        };
        const dayNum = dayMap[schedule.dayOfWeek.toLowerCase()] || 0;
        cronExpression = `${schedule.minute} ${schedule.hour} * * ${dayNum}`;
      } else if (schedule.dayOfMonth) {
        // Ejecutar en un día específico del mes
        cronExpression = `${schedule.minute} ${schedule.hour} ${schedule.dayOfMonth} * *`;
      } else {
        // Ejecutar todos los días
        cronExpression = `${schedule.minute} ${schedule.hour} * * *`;
      }

      const jobKey = `${schedule.type}-${schedule.id}`;

      // Cancelar job anterior si existe
      if (this.jobs.has(jobKey)) {
        const oldJob = this.jobs.get(jobKey);
        if (oldJob) oldJob.stop();
      }

      // Crear nuevo job
      const job = cron.schedule(cronExpression, async () => {
        logger.info(`Executing scheduled notification: ${schedule.type}`);
        await this.executeNotification(schedule);
      });

      this.jobs.set(jobKey, job);
      logger.info(`Scheduled job created: ${jobKey} (${cronExpression})`);
    } catch (error) {
      logger.error(`Error creating schedule job for ${schedule.type}`, error);
    }
  }

  private async executeNotification(schedule: any): Promise<void> {
    try {
      const channels = Array.isArray(schedule.channels) ? schedule.channels : JSON.parse(schedule.channels);

      switch (schedule.type) {
        case 'payroll':
          await this.sendPayrollNotification(channels, schedule.recipientEmail);
          break;
        case 'leaves':
          await this.sendLeavesNotification(channels, schedule.recipientEmail);
          break;
        case 'attendance':
          await this.sendAttendanceNotification(channels, schedule.recipientEmail);
          break;
        case 'contract_expiry':
          await this.sendContractExpiryNotification(channels, schedule.recipientEmail);
          break;
        default:
          logger.warn(`Unknown notification type: ${schedule.type}`);
      }
    } catch (error) {
      logger.error(`Error executing notification for ${schedule.type}`, error);
    }
  }

  private async sendPayrollNotification(channels: string[], recipientEmail?: string): Promise<void> {
    try {
      const result = await EmployeeService.getEmployees({ page: 1, limit: 1000, offset: 0 });
      const employees = result.data || [];
      const message = `Nómina del mes disponible para ${employees.length} empleados`;

      const typedChannels = channels as Array<'email' | 'app' | 'whatsapp' | 'telegram'>;
      await NotificationService.sendViaMultipleChannels(typedChannels, {
        to: recipientEmail || 'jcarrielroca98@gmail.com',
        title: 'Nómina del Mes',
        message
      });

      logger.info('Payroll notification sent');
    } catch (error) {
      logger.error('Error sending payroll notification', error);
    }
  }

  private async sendLeavesNotification(channels: string[], recipientEmail?: string): Promise<void> {
    try {
      const message = 'Recuerda revisar las licencias pendientes de aprobación';

      const typedChannels = channels as Array<'email' | 'app' | 'whatsapp' | 'telegram'>;
      await NotificationService.sendViaMultipleChannels(typedChannels, {
        to: recipientEmail || 'jcarrielroca98@gmail.com',
        title: 'Licencias Pendientes',
        message
      });

      logger.info('Leaves notification sent');
    } catch (error) {
      logger.error('Error sending leaves notification', error);
    }
  }

  private async sendAttendanceNotification(channels: string[], recipientEmail?: string): Promise<void> {
    try {
      const message = 'Recuerda registrar la asistencia del día';

      const typedChannels = channels as Array<'email' | 'app' | 'whatsapp' | 'telegram'>;
      await NotificationService.sendViaMultipleChannels(typedChannels, {
        to: recipientEmail || 'jcarrielroca98@gmail.com',
        title: 'Registro de Asistencia',
        message
      });

      logger.info('Attendance notification sent');
    } catch (error) {
      logger.error('Error sending attendance notification', error);
    }
  }

  private async sendContractExpiryNotification(channels: string[], recipientEmail?: string): Promise<void> {
    try {
      const employees = await EmployeeService.getEmployeesWithExpiringContracts(30);
      const message = `${employees.length} contrato(s) próximo(s) a vencer en los próximos 30 días`;

      const typedChannels = channels as Array<'email' | 'app' | 'whatsapp' | 'telegram'>;
      await NotificationService.sendViaMultipleChannels(typedChannels, {
        to: recipientEmail || 'jcarrielroca98@gmail.com',
        title: 'Contratos Próximos a Vencer',
        message
      });

      logger.info('Contract expiry notification sent');
    } catch (error) {
      logger.error('Error sending contract expiry notification', error);
    }
  }

  async updateSchedule(scheduleId: string): Promise<void> {
    try {
      const schedule = await NotificationScheduleService.getSchedule(scheduleId);
      if (schedule) {
        this.createScheduleJob(schedule);
      }
    } catch (error) {
      logger.error(`Error updating schedule ${scheduleId}`, error);
    }
  }

  async removeSchedule(scheduleId: string): Promise<void> {
    try {
      // Encontrar y detener el job
      for (const [key, job] of this.jobs.entries()) {
        if (key.includes(scheduleId)) {
          job.stop();
          this.jobs.delete(key);
          logger.info(`Schedule job removed: ${key}`);
        }
      }
    } catch (error) {
      logger.error(`Error removing schedule ${scheduleId}`, error);
    }
  }

  stopAll(): void {
    for (const [key, job] of this.jobs.entries()) {
      job.stop();
      logger.info(`Stopped job: ${key}`);
    }
    this.jobs.clear();
  }
}

export default new SchedulerService();
