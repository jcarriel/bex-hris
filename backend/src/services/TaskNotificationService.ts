import { Resend } from 'resend';
import { getDatabase } from '../config/database';
import logger from '../utils/logger';

class TaskNotificationService {
  private resend: Resend | null = null;

  private getResend(): Resend | null {
    if (!this.resend && process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
    return this.resend;
  }

  private async getAllUserEmails(): Promise<string[]> {
    try {
      const db = getDatabase();
      const users = await db.all('SELECT email FROM users WHERE email IS NOT NULL AND email != ""');
      return users.map((u: any) => u.email).filter(Boolean);
    } catch (error) {
      logger.error('Error fetching user emails:', error);
      const fallback = process.env.NOTIFICATION_EMAIL;
      return fallback ? [fallback] : [];
    }
  }

  private async sendToAllUsers(subject: string, html: string): Promise<void> {
    const resend = this.getResend();
    if (!resend) {
      logger.warn('Resend API not configured. Set RESEND_API_KEY environment variable.');
      return;
    }

    const emails = await this.getAllUserEmails();
    if (emails.length === 0) {
      logger.warn('No user emails found to send notification');
      return;
    }

    const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';

    for (const email of emails) {
      try {
        const result = await resend.emails.send({ from, to: email, subject, html });
        if (result.error) {
          logger.error(`Failed to send email to ${email}:`, result.error);
        } else {
          logger.info(`Notification sent to ${email}`);
        }
      } catch (error) {
        logger.error(`Error sending notification to ${email}:`, error);
      }
    }
  }

  async notifyTaskCreated(task: any, creator: any): Promise<void> {
    try {
      const subject = `Nueva Tarea Creada: ${task.title}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #00A86B;">📋 Nueva Tarea Creada</h2>
          <p>Se ha creado una nueva tarea en el sistema:</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Título:</strong> ${task.title}</p>
            <p><strong>Descripción:</strong> ${task.description || 'Sin descripción'}</p>
            <p><strong>Fecha de Vencimiento:</strong> ${new Date(task.dueDate).toLocaleDateString('es-ES')}</p>
            <p><strong>Prioridad:</strong> ${task.priority === 'high' ? '🔴 Alta' : task.priority === 'medium' ? '🟡 Media' : '🟢 Baja'}</p>
            <p><strong>Creada por:</strong> ${creator?.username || creator?.email || 'Sistema'}</p>
          </div>
          
          <p style="color: #666; font-size: 12px;">Esta es una notificación automática del sistema BEX HRIS</p>
        </div>
      `;

      await this.sendToAllUsers(subject, html);
      logger.info(`Task creation notification sent for task: ${task.id}`);
    } catch (error) {
      logger.error('Error sending task creation notification:', error);
    }
  }

  async notifyTaskCompleted(task: any, completedBy: any): Promise<void> {
    try {
      const subject = `Tarea Completada: ${task.title}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">✅ Tarea Completada</h2>
          <p>Una tarea ha sido marcada como completada:</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Título:</strong> ${task.title}</p>
            <p><strong>Descripción:</strong> ${task.description || 'Sin descripción'}</p>
            <p><strong>Fecha de Vencimiento:</strong> ${new Date(task.dueDate).toLocaleDateString('es-ES')}</p>
            <p><strong>Completada por:</strong> ${completedBy?.username || completedBy?.email || 'Sistema'}</p>
            <p><strong>Fecha de Completado:</strong> ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}</p>
          </div>
          
          <p style="color: #666; font-size: 12px;">Esta es una notificación automática del sistema BEX HRIS</p>
        </div>
      `;

      await this.sendToAllUsers(subject, html);
      logger.info(`Task completion notification sent for task: ${task.id}`);
    } catch (error) {
      logger.error('Error sending task completion notification:', error);
    }
  }

  async notifyTaskUpdated(task: any, updatedBy: any): Promise<void> {
    try {
      const subject = `Tarea Actualizada: ${task.title}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f0ad4e;">✏️ Tarea Actualizada</h2>
          <p>Una tarea ha sido modificada:</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Título:</strong> ${task.title}</p>
            <p><strong>Descripción:</strong> ${task.description || 'Sin descripción'}</p>
            <p><strong>Fecha de Vencimiento:</strong> ${new Date(task.dueDate).toLocaleDateString('es-ES')}</p>
            <p><strong>Prioridad:</strong> ${task.priority === 'high' ? '🔴 Alta' : task.priority === 'medium' ? '🟡 Media' : '🟢 Baja'}</p>
            <p><strong>Modificada por:</strong> ${updatedBy?.username || updatedBy?.email || 'Sistema'}</p>
          </div>
          
          <p style="color: #666; font-size: 12px;">Esta es una notificación automática del sistema BEX HRIS</p>
        </div>
      `;

      await this.sendToAllUsers(subject, html);
      logger.info(`Task update notification sent for task: ${task.id}`);
    } catch (error) {
      logger.error('Error sending task update notification:', error);
    }
  }

  async notifyTaskDeleted(task: any, deletedBy: any): Promise<void> {
    try {
      const subject = `Tarea Eliminada: ${task.title}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">🗑️ Tarea Eliminada</h2>
          <p>Una tarea ha sido eliminada del sistema:</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Título:</strong> ${task.title}</p>
            <p><strong>Descripción:</strong> ${task.description || 'Sin descripción'}</p>
            <p><strong>Fecha de Vencimiento:</strong> ${new Date(task.dueDate).toLocaleDateString('es-ES')}</p>
            <p><strong>Eliminada por:</strong> ${deletedBy?.username || deletedBy?.email || 'Sistema'}</p>
          </div>
          
          <p style="color: #666; font-size: 12px;">Esta es una notificación automática del sistema BEX HRIS</p>
        </div>
      `;

      await this.sendToAllUsers(subject, html);
      logger.info(`Task deletion notification sent for task: ${task.id}`);
    } catch (error) {
      logger.error('Error sending task deletion notification:', error);
    }
  }

  async notifyTaskReopened(task: any, reopenedBy: any): Promise<void> {
    try {
      const subject = `Tarea Reabierta: ${task.title}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #17a2b8;">🔄 Tarea Reabierta</h2>
          <p>Una tarea completada ha sido marcada como pendiente nuevamente:</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Título:</strong> ${task.title}</p>
            <p><strong>Descripción:</strong> ${task.description || 'Sin descripción'}</p>
            <p><strong>Fecha de Vencimiento:</strong> ${new Date(task.dueDate).toLocaleDateString('es-ES')}</p>
            <p><strong>Reabierta por:</strong> ${reopenedBy?.username || reopenedBy?.email || 'Sistema'}</p>
          </div>
          
          <p style="color: #666; font-size: 12px;">Esta es una notificación automática del sistema BEX HRIS</p>
        </div>
      `;

      await this.sendToAllUsers(subject, html);
      logger.info(`Task reopened notification sent for task: ${task.id}`);
    } catch (error) {
      logger.error('Error sending task reopened notification:', error);
    }
  }

  async sendOverdueTasksEmail(subject: string, html: string): Promise<void> {
    try {
      await this.sendToAllUsers(subject, html);
      logger.info('Overdue tasks notification sent to all users');
    } catch (error) {
      logger.error('Error sending overdue tasks notification:', error);
    }
  }
}

export default new TaskNotificationService();
