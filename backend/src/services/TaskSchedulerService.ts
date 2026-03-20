import cron from 'node-cron';
import { getDatabase } from '../config/database';
import TaskNotificationService from './TaskNotificationService';
import logger from '../utils/logger';

class TaskSchedulerService {
  private initialized = false;

  initialize(): void {
    if (this.initialized) {
      return;
    }

    // Ejecutar diariamente a las 8 AM
    cron.schedule('0 8 * * *', async () => {
      logger.info('Running daily overdue tasks check at 8 AM');
      await this.checkAndNotifyOverdueTasks();
    });

    this.initialized = true;
    logger.info('Task scheduler initialized');
  }

  private async checkAndNotifyOverdueTasks(): Promise<void> {
    try {
      const db = getDatabase();
      
      // Obtener tareas vencidas (fecha de vencimiento < hoy) que no están completadas
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = today.toISOString().split('T')[0];

      const overdueTasks = await db.all(
        `SELECT t.*, u.email as creatorEmail, u.username as creatorName 
         FROM tasks t 
         LEFT JOIN users u ON t.createdBy = u.id 
         WHERE DATE(t.dueDate) < ? AND t.status = 'pending'
         ORDER BY t.dueDate ASC`,
        [todayString]
      );

      if (overdueTasks && overdueTasks.length > 0) {
        logger.info(`Found ${overdueTasks.length} overdue tasks`);
        
        // Enviar notificación con resumen de tareas vencidas
        await this.sendOverdueTasksNotification(overdueTasks);
      } else {
        logger.info('No overdue tasks found');
      }
    } catch (error) {
      logger.error('Error checking overdue tasks:', error);
    }
  }

  private async sendOverdueTasksNotification(overdueTasks: any[]): Promise<void> {
    try {
      const subject = `⚠️ Tareas Vencidas - ${overdueTasks.length} tarea(s) pendiente(s)`;
      
      const tasksList = overdueTasks
        .map((task: any) => `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; text-align: left;">${task.title}</td>
            <td style="padding: 10px; text-align: left;">${new Date(task.dueDate).toLocaleDateString('es-ES')}</td>
            <td style="padding: 10px; text-align: left;">${task.priority === 'high' ? '🔴 Alta' : task.priority === 'medium' ? '🟡 Media' : '🟢 Baja'}</td>
            <td style="padding: 10px; text-align: left;">${task.creatorName || task.creatorEmail || 'Sistema'}</td>
          </tr>
        `)
        .join('');

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
          <h2 style="color: #dc3545;">⚠️ Tareas Vencidas</h2>
          <p>Se han detectado <strong>${overdueTasks.length}</strong> tarea(s) vencida(s) que aún no han sido completadas:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f5f5f5; border-bottom: 2px solid #dc3545;">
                <th style="padding: 10px; text-align: left; font-weight: bold;">Título</th>
                <th style="padding: 10px; text-align: left; font-weight: bold;">Fecha Vencimiento</th>
                <th style="padding: 10px; text-align: left; font-weight: bold;">Prioridad</th>
                <th style="padding: 10px; text-align: left; font-weight: bold;">Creador</th>
              </tr>
            </thead>
            <tbody>
              ${tasksList}
            </tbody>
          </table>
          
          <p style="color: #666; font-size: 12px;">
            Por favor, accede al sistema para actualizar el estado de estas tareas.
          </p>
          <p style="color: #666; font-size: 12px;">
            Esta es una notificación automática del sistema BEX HRIS enviada diariamente a las 8:00 AM
          </p>
        </div>
      `;

      await TaskNotificationService.sendOverdueTasksEmail(subject, html);
    } catch (error) {
      logger.error('Error sending overdue tasks notification:', error);
    }
  }
}

export default new TaskSchedulerService();
