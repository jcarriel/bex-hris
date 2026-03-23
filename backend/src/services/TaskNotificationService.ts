import { getDatabase } from '../config/database';
import EmailService from './EmailService';
import NotificationRepository from '@repositories/NotificationRepository';
import logger from '../utils/logger';

const PRIORITY_LABEL: Record<string, string> = {
  high:   '🔴 Alta',
  medium: '🟡 Media',
  low:    '🟢 Baja',
};

const STATUS_LABEL: Record<string, string> = {
  pending:     'Pendiente',
  in_progress: 'En progreso',
  paused:      'Pausada',
  completed:   'Completada',
  rejected:    'Rechazada',
};

class TaskNotificationService {
  /** Send email + in-app notification to a list of user IDs */
  private async notifyUsers(
    userIds: string[],
    notification: { type: string; title: string; message: string },
    emailSubject: string,
    emailHtml: string,
  ): Promise<void> {
    const db = getDatabase();
    const unique = [...new Set(userIds.filter(Boolean))];

    for (const uid of unique) {
      try {
        // In-app
        await NotificationRepository.create({ userId: uid, ...notification });

        // Email via nodemailer (same transport the rest of the app uses)
        const user = await db.get('SELECT email FROM users WHERE id = ?', [uid]);
        if (user?.email) {
          const ok = await EmailService.send({ to: user.email, subject: emailSubject, html: emailHtml });
          if (ok) logger.info(`Task email sent to ${user.email}`);
        }
      } catch (err) {
        logger.error(`Error notifying user ${uid}:`, err);
      }
    }
  }

  private buildHtml(task: any, heading: string, accentColor: string, extra = ''): string {
    const dueDateStr = task.dueDate
      ? new Date(task.dueDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : '—';
    return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f7f3;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7f3;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.07);">
        <tr>
          <td style="background:${accentColor};padding:22px 32px;">
            <div style="font-size:15px;font-weight:800;color:#fff;margin-bottom:6px;">BEX HRIS</div>
            <h1 style="margin:0;font-size:18px;font-weight:700;color:#fff;">${heading}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:16px;">
              <tr>
                <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:12px;font-weight:600;color:#374151;width:130px;">Tarea</td>
                <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:600;color:#111827;">${task.title}</td>
              </tr>
              ${task.description ? `
              <tr>
                <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:12px;font-weight:600;color:#374151;">Descripción</td>
                <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;">${task.description}</td>
              </tr>` : ''}
              <tr>
                <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:12px;font-weight:600;color:#374151;">Estado</td>
                <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#374151;">${STATUS_LABEL[task.status] ?? task.status}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:12px;font-weight:600;color:#374151;">Prioridad</td>
                <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#374151;">${PRIORITY_LABEL[task.priority] ?? task.priority}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-size:12px;font-weight:600;color:#374151;">Vence</td>
                <td style="padding:10px 14px;font-size:13px;color:#374151;">${dueDateStr}</td>
              </tr>
            </table>
            ${extra}
            <p style="margin:20px 0 0;font-size:11px;color:#9ca3af;text-align:center;">
              Correo automático · BEX HRIS
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  }

  async notifyTaskCreated(task: any, creator: any): Promise<void> {
    if (!task.assignedTo) return;
    const creatorName = creator?.nombre || creator?.username || 'Sistema';
    const html = this.buildHtml(
      task,
      '📋 Te han asignado una tarea',
      '#3b82f6',
      `<p style="font-size:13px;color:#374151;margin:0;">Asignada por <strong>${creatorName}</strong>. Ingresa al sistema para verla.</p>`,
    );
    await this.notifyUsers(
      [task.assignedTo],
      { type: 'task_assigned', title: `Nueva tarea: ${task.title}`, message: `${creatorName} te asignó una tarea.` },
      `BEX HRIS — Nueva tarea asignada: ${task.title}`,
      html,
    );
  }

  async notifyStatusChanged(task: any, changedBy: any, oldStatus: string): Promise<void> {
    const byName = changedBy?.nombre || changedBy?.username || 'Sistema';
    const recipients = [task.createdBy, task.assignedTo].filter((id) => id && id !== changedBy?.id);
    if (!recipients.length) return;
    const html = this.buildHtml(
      task,
      '🔄 Estado de tarea actualizado',
      '#8b5cf6',
      `<p style="font-size:13px;color:#374151;margin:0;">
        <strong>${byName}</strong> cambió el estado de
        <strong>${STATUS_LABEL[oldStatus] ?? oldStatus}</strong> a
        <strong>${STATUS_LABEL[task.status] ?? task.status}</strong>.
      </p>`,
    );
    await this.notifyUsers(
      recipients,
      { type: 'task_status', title: `Tarea "${task.title}" — ${STATUS_LABEL[task.status] ?? task.status}`, message: `${byName} cambió el estado.` },
      `BEX HRIS — Tarea actualizada: ${task.title}`,
      html,
    );
  }

  async notifyTaskRejected(task: any, rejectedBy: any): Promise<void> {
    const byName = rejectedBy?.nombre || rejectedBy?.username || 'El asignado';
    const recipients = [task.createdBy].filter((id) => id && id !== rejectedBy?.id);
    if (!recipients.length) return;
    const html = this.buildHtml(
      task,
      '❌ Tarea rechazada',
      '#dc2626',
      `<p style="font-size:13px;color:#374151;margin:0;">
        <strong>${byName}</strong> rechazó la tarea.
        ${task.completionNotes ? `<br><em>Motivo: ${task.completionNotes}</em>` : ''}
      </p>`,
    );
    await this.notifyUsers(
      recipients,
      { type: 'task_rejected', title: `Tarea rechazada: ${task.title}`, message: `${byName} rechazó la tarea.` },
      `BEX HRIS — Tarea rechazada: ${task.title}`,
      html,
    );
  }

  async notifyTaskReassigned(task: any, reassignedBy: any, oldAssigneeId: string | null): Promise<void> {
    const byName = reassignedBy?.nombre || reassignedBy?.username || 'Sistema';
    const recipients = [task.assignedTo, oldAssigneeId].filter((id) => id && id !== reassignedBy?.id);
    if (!recipients.length) return;
    const html = this.buildHtml(
      task,
      '👤 Tarea reasignada',
      '#f59e0b',
      `<p style="font-size:13px;color:#374151;margin:0;"><strong>${byName}</strong> reasignó esta tarea.</p>`,
    );
    await this.notifyUsers(
      recipients,
      { type: 'task_reassigned', title: `Tarea reasignada: ${task.title}`, message: `${byName} reasignó la tarea.` },
      `BEX HRIS — Tarea reasignada: ${task.title}`,
      html,
    );
  }

  async notifyTaskCompleted(task: any, completedBy: any): Promise<void> {
    const byName = completedBy?.nombre || completedBy?.username || 'Sistema';
    const recipients = [task.createdBy].filter((id) => id && id !== completedBy?.id);
    if (!recipients.length) return;
    const html = this.buildHtml(task, '✅ Tarea completada', '#10b981',
      `<p style="font-size:13px;color:#374151;margin:0;"><strong>${byName}</strong> completó la tarea.</p>`);
    await this.notifyUsers(
      recipients,
      { type: 'task_completed', title: `Completada: ${task.title}`, message: `${byName} completó la tarea.` },
      `BEX HRIS — Tarea completada: ${task.title}`,
      html,
    );
  }

  async notifyTaskDeleted(task: any, deletedBy: any): Promise<void> {
    const byName = deletedBy?.nombre || deletedBy?.username || 'Sistema';
    const recipients = [task.assignedTo, task.createdBy].filter((id) => id && id !== deletedBy?.id);
    if (!recipients.length) return;
    const db = getDatabase();
    for (const uid of [...new Set(recipients)]) {
      try {
        await NotificationRepository.create({
          userId: uid,
          type: 'task_deleted',
          title: `Tarea eliminada: ${task.title}`,
          message: `${byName} eliminó la tarea.`,
        });
        const user = await db.get('SELECT email FROM users WHERE id = ?', [uid]);
        if (user?.email) {
          await EmailService.send({
            to: user.email,
            subject: `BEX HRIS — Tarea eliminada: ${task.title}`,
            html: this.buildHtml(task, '🗑️ Tarea eliminada', '#6b7280',
              `<p style="font-size:13px;color:#374151;margin:0;"><strong>${byName}</strong> eliminó esta tarea.</p>`),
          });
        }
      } catch (err) {
        logger.error(`Error notifying deletion to ${uid}:`, err);
      }
    }
  }

  // Kept for backward compat with other callers
  async notifyTaskUpdated(_task: any, _updatedBy: any): Promise<void> {}
  async notifyTaskReopened(_task: any, _reopenedBy: any): Promise<void> {}
  async sendOverdueTasksEmail(subject: string, html: string): Promise<void> {
    const db = getDatabase();
    const users = await db.all(`SELECT email FROM users WHERE email IS NOT NULL AND email != '' AND status != 'inactive'`);
    for (const u of users as any[]) {
      if (u.email) await EmailService.send({ to: u.email, subject, html });
    }
  }
}

export default new TaskNotificationService();
