import { Resend } from 'resend';
import { INotificationProvider, NotificationPayload } from '../interfaces/INotificationProvider';
import logger from '@utils/logger';

export class EmailProvider implements INotificationProvider {
  private resend: Resend | null = null;

  constructor() {
    this.initializeResend();
  }

  private initializeResend(): void {
    if (!this.isConfigured()) {
      logger.warn('Email provider not configured. Check RESEND_API_KEY environment variable.');
      return;
    }

    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  isConfigured(): boolean {
    return !!process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_test_key_placeholder';
  }

  async send(payload: NotificationPayload): Promise<boolean> {
    if (!this.resend) {
      logger.error('Email provider not initialized. Please configure RESEND_API_KEY.');
      return false;
    }

    try {
      const result = await this.resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@bexhris.com',
        to: payload.to,
        subject: payload.subject || payload.title,
        html: this.generateHtmlTemplate(payload),
      });

      if (result.error) {
        logger.error(`Failed to send email to ${payload.to}`, result.error);
        return false;
      }

      logger.info(`Email sent successfully to ${payload.to}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send email to ${payload.to}`, error);
      return false;
    }
  }

  private generateHtmlTemplate(payload: NotificationPayload): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
            .content { padding: 20px; background-color: #ffffff; border: 1px solid #ddd; border-radius: 5px; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            h2 { color: #2c3e50; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${payload.title}</h2>
            </div>
            <div class="content">
              <p>${payload.message}</p>
            </div>
            <div class="footer">
              <p>Este es un mensaje automático del sistema HRIS. Por favor, no responda a este correo.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
