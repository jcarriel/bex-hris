import cron from 'node-cron';
import EventService from './EventService';
import EventTypeConfigService from './EventTypeConfigService';
import UserRepository from '@repositories/UserRepository';
import EmailService from './EmailService';
import logger from '@utils/logger';

const TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  birthday:        { label: 'Cumpleaños',          color: '#ec4899', icon: '🎂' },
  contract_expiry: { label: 'Contrato por vencer', color: '#f59e0b', icon: '📋' },
  training:        { label: 'Capacitación',         color: '#3b82f6', icon: '📚' },
  audit:           { label: 'Auditoría',            color: '#8b5cf6', icon: '🔍' },
  meeting:         { label: 'Reunión',              color: '#06b6d4', icon: '📅' },
  other:           { label: 'Otro',                 color: '#6b7280', icon: '📌' },
};

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function buildDigestHtml(events: any[], recipientName: string): string {
  const todayLabel = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const grouped: Record<string, any[]> = { today: [], upcoming: [] };
  events.forEach((e) => {
    if (e.daysAway === 0) grouped.today.push(e);
    else grouped.upcoming.push(e);
  });
  grouped.upcoming.sort((a, b) => a.daysAway - b.daysAway);

  const renderGroup = (label: string, items: any[], accent: string) => {
    if (items.length === 0) return '';
    const rows = items.map((e) => {
      const meta = TYPE_META[e.type] || TYPE_META.other;
      const dateStr = new Date(e.eventDate).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
      const daysLbl = e.daysAway === 0
        ? '<span style="color:#ef4444;font-weight:700;">HOY</span>'
        : e.daysAway === 1
          ? '<span style="color:#f97316;font-weight:700;">Mañana</span>'
          : `<span style="color:#6b7280;">En ${e.daysAway} días</span>`;
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:18px;">${meta.icon}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">
            <div style="font-size:13px;font-weight:600;color:#111827;">${e.title}</div>
            ${e.description ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">${e.description}</div>` : ''}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;white-space:nowrap;font-size:12px;color:#374151;">${dateStr}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;white-space:nowrap;text-align:right;">${daysLbl}</td>
        </tr>`;
    }).join('');

    return `
      <div style="margin-bottom:24px;">
        <div style="display:flex;align-items:center;margin-bottom:10px;">
          <div style="width:4px;height:18px;background:${accent};border-radius:2px;margin-right:10px;"></div>
          <span style="font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.5px;">${label}</span>
          <span style="margin-left:8px;background:#f3f4f6;color:#6b7280;font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;">${items.length}</span>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0"
          style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  };

  const body = [
    renderGroup('Hoy', grouped.today, '#ef4444'),
    renderGroup('Próximamente', grouped.upcoming, '#48bb78'),
  ].join('');

  if (!body.trim()) return '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f7f3;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7f3;padding:32px 16px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0"
        style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:linear-gradient(135deg,#48bb78,#38a169);padding:24px 32px;">
            <div style="display:inline-block;background:rgba(255,255,255,.2);border-radius:8px;padding:4px 12px;margin-bottom:12px;">
              <span style="font-size:16px;font-weight:800;color:#fff;">BEX HRIS</span>
            </div>
            <h1 style="margin:0;font-size:20px;font-weight:700;color:#fff;">Recordatorio de Eventos</h1>
            <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,.85);">${todayLabel}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 20px;font-size:14px;color:#374151;">
              Hola <strong>${recipientName}</strong>, tienes los siguientes eventos pendientes:
            </p>
            ${body}
            <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
              Correo automático de BEX HRIS · Notificaciones de eventos
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export class EventDigestScheduler {
  private job: any = null;

  /**
   * Collect only the events each type is "due" to notify today.
   *
   * Logic per event type (from config):
   *   – Include events where daysAway === 0  (always notify on the day itself)
   *   – Include events where daysAway === config.daysNotice (advance notice day)
   *
   * This means each event generates at most 2 emails:
   *   one advance warning + one on the day of the event.
   */
  async collectDueEvents(): Promise<any[]> {
    const configs = await EventTypeConfigService.getAll();
    const enabledConfigs = configs.filter((c) => c.enabled);

    if (enabledConfigs.length === 0) return [];

    // Max window = largest daysNotice among enabled configs
    const maxWindow = Math.max(...enabledConfigs.map((c) => c.daysNotice), 0);
    const allUpcoming = await EventService.getUpcoming(maxWindow);

    const configMap = new Map(enabledConfigs.map((c) => [c.type, c.daysNotice]));

    return allUpcoming.filter((e) => {
      const noticeDays = configMap.get(e.type);
      if (noticeDays === undefined) return false;       // type disabled
      const d = e.daysAway ?? 999;
      return d >= 0 && d <= noticeDays;                 // every day from noticeDays before up to the day itself
    });
  }

  async sendDigest(): Promise<number> {
    try {
      const due = await this.collectDueEvents();

      if (due.length === 0) {
        logger.info('Event digest: no due events today, skipping');
        return 0;
      }

      const users = await UserRepository.getAll();
      const targets = (users as any[]).filter((u) => u.email && u.status !== 'inactive');

      let sent = 0;
      for (const user of targets) {
        const html = buildDigestHtml(due, user.nombre || user.username);
        if (!html) continue;
        const ok = await EmailService.send({
          to: user.email,
          subject: `BEX HRIS — ${due.length} evento(s) pendiente(s)`,
          html,
        });
        if (ok) sent++;
      }

      logger.info(`Event digest sent to ${sent}/${targets.length} users (${due.length} events)`);
      return sent;
    } catch (error) {
      logger.error('Error sending event digest', error);
      return 0;
    }
  }

  initialize(): void {
    // Every day at 7:00 AM
    this.job = cron.schedule('0 7 * * *', async () => {
      logger.info('Running daily event digest...');
      await this.sendDigest();
    });
    logger.info('Event digest scheduler initialized (daily 07:00)');
  }

  stop(): void {
    if (this.job) { this.job.stop(); this.job = null; }
  }
}

export default new EventDigestScheduler();
