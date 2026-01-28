import cron, { ScheduledTask } from 'node-cron';
import EmployeeService from './EmployeeService';
import LeaveService from './LeaveService';
import AttendanceService from './AttendanceService';
import NotificationService from '@notifications/NotificationService';
import logger from '@utils/logger';

interface DailyControl {
  type: string;
  name: string;
  description: string;
  enabled: boolean;
}

export class DailyControlService {
  private jobs: Map<string, ScheduledTask> = new Map();

  private generateReportHeader(title: string, color: string, summary: { label: string; value: string | number; color?: string }[]): string {
    const summaryHtml = summary
      .map((item) => `<p><strong>${item.label}:</strong> <span style="color: ${item.color || color}; font-size: 16px; font-weight: bold;">${item.value}</span></p>`)
      .join('');

    return `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: ${color}; border-bottom: 2px solid ${color}; padding-bottom: 10px;">
          ${title}
        </h2>
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid ${color};">
          <p><strong>Fecha del Reporte:</strong> ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          ${summaryHtml}
        </div>
    `;
  }

  private generateReportFooter(recommendations: string[]): string {
    const recHtml = recommendations.map((rec) => `<li>${rec}</li>`).join('');
    return `
      <div style="background-color: #e8f4f8; padding: 15px; margin: 20px 0; border-left: 4px solid #5bc0de; border-radius: 4px;">
        <h4 style="color: #31708f; margin-top: 0;">Acciones Recomendadas:</h4>
        <ul style="color: #31708f;">
          ${recHtml}
        </ul>
      </div>
      <div style="background-color: #f0f0f0; padding: 15px; margin: 20px 0; border-radius: 4px; font-size: 12px; color: #666;">
        <p><strong>Nota:</strong> Este reporte se genera automáticamente cada día a las 8:00 AM. Para más información, accede al sistema HRIS.</p>
      </div>
      </div>
    `;
  }

  private controls: DailyControl[] = [
    {
      type: 'expiring_contracts',
      name: 'Contratos Próximos a Vencer',
      description: 'Revisa contratos que vencen en los próximos 30 días',
      enabled: true,
    },
    {
      type: 'employee_absences',
      name: 'Faltas de Empleados',
      description: 'Revisa empleados con ausencias no justificadas',
      enabled: true,
    },
    {
      type: 'pending_leaves',
      name: 'Licencias Pendientes',
      description: 'Revisa solicitudes de licencia pendientes de aprobación',
      enabled: true,
    },
    {
      type: 'low_attendance',
      name: 'Asistencia Baja',
      description: 'Identifica empleados con baja asistencia (< 90%)',
      enabled: true,
    },
    {
      type: 'birthdays',
      name: 'Cumpleaños del Mes',
      description: 'Lista de empleados que cumplen años este mes',
      enabled: true,
    },
    {
      type: 'contract_anniversaries',
      name: 'Aniversarios de Contrato',
      description: 'Empleados que cumplen años en la empresa',
      enabled: true,
    },
    {
      type: 'pending_documents',
      name: 'Documentos Pendientes',
      description: 'Empleados con documentos vencidos o por vencer',
      enabled: true,
    },
    {
      type: 'salary_review_due',
      name: 'Revisión de Salario Pendiente',
      description: 'Empleados con revisión de salario vencida',
      enabled: true,
    },
  ];

  async initializeDailyControls(): Promise<void> {
    try {
      logger.info('Initializing daily control jobs...');

      // Ejecutar a las 8:00 AM todos los días
      const dailyJob = cron.schedule('0 8 * * *', async () => {
        logger.info('Running daily controls...');
        await this.executeAllControls();
      });

      this.jobs.set('daily-controls', dailyJob);
      logger.info('Daily control jobs initialized');
    } catch (error) {
      logger.error('Error initializing daily controls', error);
    }
  }

  private async executeAllControls(): Promise<void> {
    for (const control of this.controls) {
      if (!control.enabled) continue;

      try {
        switch (control.type) {
          case 'expiring_contracts':
            await this.checkExpiringContracts();
            break;
          case 'employee_absences':
            await this.checkEmployeeAbsences();
            break;
          case 'pending_leaves':
            await this.checkPendingLeaves();
            break;
          case 'low_attendance':
            await this.checkLowAttendance();
            break;
          case 'birthdays':
            await this.checkBirthdays();
            break;
          case 'contract_anniversaries':
            await this.checkContractAnniversaries();
            break;
          case 'pending_documents':
            await this.checkPendingDocuments();
            break;
          case 'salary_review_due':
            await this.checkSalaryReviewDue();
            break;
        }
      } catch (error) {
        logger.error(`Error executing control ${control.type}`, error);
      }
    }
  }

  private async checkExpiringContracts(): Promise<void> {
    try {
      const expiringContracts = await EmployeeService.getEmployeesWithExpiringContracts(30);

      if (expiringContracts.length > 0) {
        const today = new Date();
        const contractDetails = expiringContracts
          .map((emp: any) => {
            const endDate = new Date(emp.contractEndDate);
            const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const urgency = daysRemaining <= 7 ? '🔴 URGENTE' : daysRemaining <= 14 ? '🟠 IMPORTANTE' : '🟡 PRÓXIMO';
            
            return `
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${emp.firstName} ${emp.lastName}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${emp.employeeNumber || 'N/A'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${emp.position || 'N/A'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${emp.contractEndDate}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;"><strong>${daysRemaining}</strong> días</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${urgency}</td>
              </tr>
            `;
          })
          .join('');

        const htmlMessage = `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: #d9534f; border-bottom: 2px solid #d9534f; padding-bottom: 10px;">
              ⚠️ REPORTE DE CONTRATOS PRÓXIMOS A VENCER
            </h2>
            
            <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #d9534f;">
              <p><strong>Fecha del Reporte:</strong> ${today.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Total de Contratos en Riesgo:</strong> <span style="color: #d9534f; font-size: 18px; font-weight: bold;">${expiringContracts.length}</span></p>
              <p><strong>Período Analizado:</strong> Próximos 30 días</p>
            </div>

            <h3 style="color: #333; margin-top: 20px;">Detalle de Contratos:</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background-color: #f8f9fa;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; font-weight: bold;">Empleado</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; font-weight: bold;">Número</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; font-weight: bold;">Posición</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; font-weight: bold;">Fecha Vencimiento</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd; font-weight: bold;">Días Restantes</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd; font-weight: bold;">Urgencia</th>
                </tr>
              </thead>
              <tbody>
                ${contractDetails}
              </tbody>
            </table>

            <div style="background-color: #e8f4f8; padding: 15px; margin: 20px 0; border-left: 4px solid #5bc0de; border-radius: 4px;">
              <h4 style="color: #31708f; margin-top: 0;">Acciones Recomendadas:</h4>
              <ul style="color: #31708f;">
                <li>Revisar contratos con urgencia ROJA (≤7 días) inmediatamente</li>
                <li>Contactar a Recursos Humanos para renovación o terminación</li>
                <li>Preparar documentación necesaria para renovación</li>
                <li>Notificar al empleado con anticipación sobre cambios</li>
              </ul>
            </div>

            <div style="background-color: #f0f0f0; padding: 15px; margin: 20px 0; border-radius: 4px; font-size: 12px; color: #666;">
              <p><strong>Nota:</strong> Este reporte se genera automáticamente cada día a las 8:00 AM. Para más información, accede al sistema HRIS.</p>
            </div>
          </div>
        `;

        await NotificationService.sendViaMultipleChannels(['email', 'app'], {
          to: process.env.ADMIN_EMAIL || 'admin@company.com',
          title: '⚠️ Contratos Próximos a Vencer - Reporte Diario',
          message: htmlMessage,
        });

        logger.info(`Found ${expiringContracts.length} expiring contracts`);
      }
    } catch (error) {
      logger.error('Error checking expiring contracts', error);
    }
  }

  private async checkEmployeeAbsences(): Promise<void> {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const attendanceRecords = await AttendanceService.getAttendanceByDate(todayStr);

      const absences = attendanceRecords.filter((record: any) => record.status === 'absent');

      if (absences.length > 0) {
        const absenceDetails = absences
          .map((record: any) => `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${record.employeeId}</td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${record.date}</td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${record.reason || 'No especificado'}</td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">
                ${record.justified ? '✅ Justificada' : '❌ No Justificada'}
              </td>
            </tr>
          `)
          .join('');

        const htmlMessage = `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: #f0ad4e; border-bottom: 2px solid #f0ad4e; padding-bottom: 10px;">
              📋 REPORTE DIARIO DE FALTAS Y AUSENCIAS
            </h2>
            
            <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #f0ad4e;">
              <p><strong>Fecha del Reporte:</strong> ${today.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Total de Ausencias Registradas:</strong> <span style="color: #f0ad4e; font-size: 18px; font-weight: bold;">${absences.length}</span></p>
              <p><strong>No Justificadas:</strong> <span style="color: #d9534f; font-weight: bold;">${absences.filter((a: any) => !a.justified).length}</span></p>
              <p><strong>Justificadas:</strong> <span style="color: #5cb85c; font-weight: bold;">${absences.filter((a: any) => a.justified).length}</span></p>
            </div>

            <h3 style="color: #333; margin-top: 20px;">Detalle de Ausencias:</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background-color: #f8f9fa;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; font-weight: bold;">ID Empleado</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; font-weight: bold;">Fecha</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; font-weight: bold;">Razón</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd; font-weight: bold;">Estado</th>
                </tr>
              </thead>
              <tbody>
                ${absenceDetails}
              </tbody>
            </table>

            <div style="background-color: #e8f4f8; padding: 15px; margin: 20px 0; border-left: 4px solid #5bc0de; border-radius: 4px;">
              <h4 style="color: #31708f; margin-top: 0;">Acciones Recomendadas:</h4>
              <ul style="color: #31708f;">
                <li>Contactar inmediatamente a empleados con ausencias no justificadas</li>
                <li>Solicitar documentación de justificación (certificados médicos, etc.)</li>
                <li>Registrar en el expediente del empleado</li>
                <li>Considerar impacto en nómina y beneficios</li>
              </ul>
            </div>

            <div style="background-color: #f0f0f0; padding: 15px; margin: 20px 0; border-radius: 4px; font-size: 12px; color: #666;">
              <p><strong>Nota:</strong> Este reporte se genera automáticamente cada día. Verifica que los datos sean precisos en el sistema HRIS.</p>
            </div>
          </div>
        `;

        await NotificationService.sendViaMultipleChannels(['email', 'app'], {
          to: process.env.ADMIN_EMAIL || 'admin@company.com',
          title: '📋 Reporte de Faltas y Ausencias - ' + todayStr,
          message: htmlMessage,
        });

        logger.info(`Found ${absences.length} employee absences`);
      }
    } catch (error) {
      logger.error('Error checking employee absences', error);
    }
  }

  private async checkPendingLeaves(): Promise<void> {
    try {
      logger.info('Checking pending leaves...');
      // Implementar cuando LeaveService tenga método getLeavesByStatus
    } catch (error) {
      logger.error('Error checking pending leaves', error);
    }
  }

  private async checkLowAttendance(): Promise<void> {
    try {
      logger.info('Checking low attendance...');
      // Implementar cuando AttendanceService tenga método getAttendanceByDateRange
    } catch (error) {
      logger.error('Error checking low attendance', error);
    }
  }

  private async checkBirthdays(): Promise<void> {
    try {
      logger.info('Checking birthdays...');
      // Implementar cuando EmployeeService tenga método getAllEmployees
    } catch (error) {
      logger.error('Error checking birthdays', error);
    }
  }

  private async checkContractAnniversaries(): Promise<void> {
    try {
      logger.info('Checking contract anniversaries...');
      // Implementar cuando EmployeeService tenga método getAllEmployees
    } catch (error) {
      logger.error('Error checking contract anniversaries', error);
    }
  }

  private async checkPendingDocuments(): Promise<void> {
    try {
      logger.info('Checking pending documents...');
      // Implementar cuando DocumentService esté disponible
    } catch (error) {
      logger.error('Error checking pending documents', error);
    }
  }

  private async checkSalaryReviewDue(): Promise<void> {
    try {
      logger.info('Checking salary review due...');
      // Implementar cuando EmployeeService tenga método getAllEmployees
    } catch (error) {
      logger.error('Error checking salary review due', error);
    }
  }

  stopAllJobs(): void {
    for (const [key, job] of this.jobs.entries()) {
      job.stop();
      logger.info(`Stopped job: ${key}`);
    }
    this.jobs.clear();
  }

  getControls(): DailyControl[] {
    return this.controls;
  }

  enableControl(type: string): void {
    const control = this.controls.find((c) => c.type === type);
    if (control) {
      control.enabled = true;
      logger.info(`Enabled control: ${type}`);
    }
  }

  disableControl(type: string): void {
    const control = this.controls.find((c) => c.type === type);
    if (control) {
      control.enabled = false;
      logger.info(`Disabled control: ${type}`);
    }
  }
}

export default new DailyControlService();
