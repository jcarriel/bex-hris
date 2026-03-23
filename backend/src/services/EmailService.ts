import nodemailer from 'nodemailer';
import logger from '@utils/logger';

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.init();
  }

  private init() {
    const host     = process.env.MAIL_HOST;
    const port     = parseInt(process.env.MAIL_PORT || '587', 10);
    const user     = process.env.MAIL_USER;
    const pass     = process.env.MAIL_PASS;

    if (!host || !user || !pass) {
      logger.warn('SMTP not configured (MAIL_HOST / MAIL_USER / MAIL_PASS) — email disabled');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }

  async send(options: MailOptions): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('Email send skipped — transporter not configured');
      return false;
    }
    try {
      const from = process.env.MAIL_FROM || `"BEX HRIS" <${process.env.MAIL_USER}>`;
      const info = await this.transporter.sendMail({ from, ...options });
      logger.info(`Email sent to ${options.to} | subject: "${options.subject}" | messageId: ${info.messageId} | response: ${info.response}`);
      return true;
    } catch (error) {
      logger.error(`Email send error to ${options.to} | subject: "${options.subject}"`, error);
      return false;
    }
  }

  async sendWelcome(to: string, nombre: string, username: string, password: string): Promise<boolean> {
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    return this.send({
      to,
      subject: 'Bienvenido a BEX HRIS — Tus credenciales de acceso',
      html: welcomeTemplate(nombre, username, password, appUrl),
    });
  }

  async sendPasswordReset(to: string, nombre: string, username: string, newPassword: string): Promise<boolean> {
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    return this.send({
      to,
      subject: 'BEX HRIS — Tu contraseña ha sido restablecida',
      html: passwordResetTemplate(nombre, username, newPassword, appUrl),
    });
  }
}

// ─── Email templates ──────────────────────────────────────────────────────────

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f7f3;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7f3;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:linear-gradient(135deg,#48bb78,#38a169);padding:28px 40px;text-align:center;">
            <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:10px;padding:6px 14px;">
              <span style="font-size:18px;font-weight:800;color:#fff;letter-spacing:-0.5px;">BEX HRIS</span>
            </div>
          </td>
        </tr>
        <tr><td style="padding:36px 40px 28px;">${content}</td></tr>
        <tr>
          <td style="padding:16px 40px;background:#f0f7f3;text-align:center;">
            <p style="margin:0;font-size:11px;color:#93b0a1;">BEX HRIS · Sistema de Gestión de Recursos Humanos</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function credentialsBox(username: string, password: string): string {
  return `
  <div style="background:#f0f7f3;border:1.5px solid #c6e8d5;border-radius:10px;padding:20px 24px;margin:20px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0 0 12px;">
          <span style="font-size:11px;color:#93b0a1;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Usuario</span><br>
          <span style="font-size:18px;font-weight:700;color:#111d17;font-family:'Courier New',monospace;">${username}</span>
        </td>
      </tr>
      <tr><td style="height:1px;background:#c6e8d5;"></td></tr>
      <tr>
        <td style="padding:12px 0 0;">
          <span style="font-size:11px;color:#93b0a1;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Contraseña</span><br>
          <span style="font-size:18px;font-weight:700;color:#111d17;font-family:'Courier New',monospace;">${password}</span>
        </td>
      </tr>
    </table>
  </div>`;
}

function actionButton(url: string, text: string): string {
  return `<a href="${url}" style="display:inline-block;background:#48bb78;color:#fff;text-decoration:none;padding:11px 28px;border-radius:8px;font-weight:600;font-size:14px;margin-top:8px;">${text} →</a>`;
}

function welcomeTemplate(nombre: string, username: string, password: string, appUrl: string): string {
  return baseLayout(`
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111d17;">¡Bienvenido, ${nombre}!</h1>
    <p style="margin:0 0 4px;font-size:14px;color:#526b5e;line-height:1.6;">
      Tu cuenta en <strong>BEX HRIS</strong> ha sido creada exitosamente. Aquí están tus credenciales de acceso:
    </p>
    ${credentialsBox(username, password)}
    <p style="margin:0 0 20px;font-size:13px;color:#93b0a1;">
      Por seguridad, te recomendamos cambiar tu contraseña después del primer inicio de sesión.
    </p>
    ${actionButton(appUrl, 'Iniciar sesión')}
  `);
}

function passwordResetTemplate(nombre: string, username: string, newPassword: string, appUrl: string): string {
  return baseLayout(`
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111d17;">Contraseña restablecida</h1>
    <p style="margin:0 0 4px;font-size:14px;color:#526b5e;line-height:1.6;">
      Hola <strong>${nombre}</strong>, un administrador ha restablecido tu contraseña. Estas son tus nuevas credenciales:
    </p>
    ${credentialsBox(username, newPassword)}
    <p style="margin:0 0 20px;font-size:13px;color:#93b0a1;">
      Si no solicitaste este cambio, contacta a tu administrador.
    </p>
    ${actionButton(appUrl, 'Iniciar sesión')}
  `);
}

export default new EmailService();
