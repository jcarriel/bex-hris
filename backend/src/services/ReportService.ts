import EmployeeService from './EmployeeService';
import PayrollService from './PayrollService';
import AttendanceService from './AttendanceService';
import LeaveService from './LeaveService';
import logger from '@utils/logger';

interface PayrollReport {
  period: string;
  totalEmployees: number;
  totalPayroll: number;
  totalBonuses: number;
  totalDeductions: number;
  averageSalary: number;
  byDepartment: {
    departmentId: string;
    count: number;
    total: number;
    average: number;
  }[];
  details: any[];
}

interface AttendanceReport {
  period: string;
  totalEmployees: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  attendanceRate: number;
  byEmployee: {
    employeeId: string;
    name: string;
    present: number;
    absent: number;
    late: number;
    halfDay: number;
    rate: number;
  }[];
}

interface LeaveReport {
  period: string;
  totalRequests: number;
  approved: number;
  rejected: number;
  pending: number;
  byType: {
    type: string;
    count: number;
    approved: number;
    rejected: number;
  }[];
  byEmployee: {
    employeeId: string;
    name: string;
    requests: number;
    approved: number;
    rejected: number;
  }[];
}

interface EmployeeReport {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  terminatedEmployees: number;
  byDepartment: {
    departmentId: string;
    count: number;
    active: number;
    inactive: number;
  }[];
  byPosition: {
    positionId: string;
    count: number;
  }[];
  newHires: any[];
  terminations: any[];
}

export class ReportService {
  /**
   * Generar reporte de nómina
   */
  async generatePayrollReport(
    startDate: string,
    endDate: string,
    departmentId?: string
  ): Promise<PayrollReport> {
    try {
      logger.info(`Generating payroll report from ${startDate} to ${endDate}`);

      // Obtener todos los empleados
      const employees = await EmployeeService.getEmployees(
        { page: 1, limit: 10000, offset: 0 },
        departmentId ? { departmentId } : undefined
      );

      const payrolls: any[] = [];
      let totalPayroll = 0;
      let totalBonuses = 0;
      let totalDeductions = 0;

      // Simular obtención de nóminas (en producción, consultar BD)
      const employeeList = employees.data || [];
      for (const emp of employeeList) {
        const salary = (emp as any).baseSalary || 0;
        totalPayroll += salary;
        payrolls.push({
          employeeId: emp.id,
          salary,
          bonuses: 0,
          deductions: 0,
        });
      }

      const byDepartment = this.groupPayrollByDepartment(payrolls, employeeList);

      return {
        period: `${startDate} to ${endDate}`,
        totalEmployees: employeeList.length,
        totalPayroll,
        totalBonuses,
        totalDeductions,
        averageSalary: employeeList.length > 0 ? totalPayroll / employeeList.length : 0,
        byDepartment,
        details: payrolls,
      };
    } catch (error) {
      logger.error('Error generating payroll report', error);
      throw error;
    }
  }

  /**
   * Generar reporte de asistencia
   */
  async generateAttendanceReport(
    startDate: string,
    endDate: string,
    employeeId?: string
  ): Promise<AttendanceReport> {
    try {
      logger.info(`Generating attendance report from ${startDate} to ${endDate}`);

      // Obtener todos los empleados
      const employees = await EmployeeService.getEmployees(
        { page: 1, limit: 10000, offset: 0 }
      );

      const employeeList = employees.data || [];
      const byEmployee: any[] = [];

      let totalPresent = 0;
      let totalAbsent = 0;
      let totalLate = 0;
      let totalHalfDay = 0;

      // Simular obtención de registros de asistencia
      for (const emp of employeeList) {
        const present = Math.floor(Math.random() * 20);
        const absent = Math.floor(Math.random() * 5);
        const late = Math.floor(Math.random() * 3);
        const halfDay = Math.floor(Math.random() * 2);

        totalPresent += present;
        totalAbsent += absent;
        totalLate += late;
        totalHalfDay += halfDay;

        const total = present + absent + late + halfDay;
        const rate = total > 0 ? (present / total) * 100 : 0;

        byEmployee.push({
          employeeId: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          present,
          absent,
          late,
          halfDay,
          rate: Math.round(rate),
        });
      }

      const totalDays = totalPresent + totalAbsent + totalLate + totalHalfDay;
      const attendanceRate = totalDays > 0 ? (totalPresent / totalDays) * 100 : 0;

      return {
        period: `${startDate} to ${endDate}`,
        totalEmployees: employeeList.length,
        presentDays: totalPresent,
        absentDays: totalAbsent,
        lateDays: totalLate,
        halfDays: totalHalfDay,
        attendanceRate: Math.round(attendanceRate),
        byEmployee,
      };
    } catch (error) {
      logger.error('Error generating attendance report', error);
      throw error;
    }
  }

  /**
   * Generar reporte de licencias
   */
  async generateLeaveReport(startDate: string, endDate: string): Promise<LeaveReport> {
    try {
      logger.info(`Generating leave report from ${startDate} to ${endDate}`);

      const leaves = await LeaveService.getAllLeaves();
      const employees = await EmployeeService.getEmployees(
        { page: 1, limit: 10000, offset: 0 }
      );

      const employeeMap = new Map(
        (employees.data || []).map(e => [e.id, `${e.firstName} ${e.lastName}`])
      );

      const byType: any = {};
      const byEmployee: any = {};

      let approved = 0;
      let rejected = 0;
      let pending = 0;

      for (const leave of leaves) {
        const type = (leave as any).leaveType || 'unknown';
        const status = (leave as any).status || 'pending';
        const empId = (leave as any).employeeId;

        // Contar por tipo
        if (!byType[type]) {
          byType[type] = { type, count: 0, approved: 0, rejected: 0 };
        }
        byType[type].count++;
        if (status === 'approved') byType[type].approved++;
        else if (status === 'rejected') byType[type].rejected++;

        // Contar por empleado
        if (!byEmployee[empId]) {
          byEmployee[empId] = {
            employeeId: empId,
            name: employeeMap.get(empId) || 'Unknown',
            requests: 0,
            approved: 0,
            rejected: 0,
          };
        }
        byEmployee[empId].requests++;
        if (status === 'approved') byEmployee[empId].approved++;
        else if (status === 'rejected') byEmployee[empId].rejected++;

        // Contar totales
        if (status === 'approved') approved++;
        else if (status === 'rejected') rejected++;
        else pending++;
      }

      return {
        period: `${startDate} to ${endDate}`,
        totalRequests: leaves.length,
        approved,
        rejected,
        pending,
        byType: Object.values(byType),
        byEmployee: Object.values(byEmployee),
      };
    } catch (error) {
      logger.error('Error generating leave report', error);
      throw error;
    }
  }

  /**
   * Generar reporte de empleados
   */
  async generateEmployeeReport(): Promise<EmployeeReport> {
    try {
      logger.info('Generating employee report');

      const employees = await EmployeeService.getEmployees(
        { page: 1, limit: 10000, offset: 0 }
      );

      const employeeList = employees.data || [];
      const byDepartment: any = {};
      const byPosition: any = {};

      let activeCount = 0;
      let inactiveCount = 0;
      let terminatedCount = 0;

      for (const emp of employeeList) {
        const status = (emp as any).status || 'active';
        const deptId = (emp as any).departmentId;
        const posId = (emp as any).positionId;

        // Contar por estado
        if (status === 'active') activeCount++;
        else if (status === 'inactive') inactiveCount++;
        else if (status === 'terminated') terminatedCount++;

        // Contar por departamento
        if (!byDepartment[deptId]) {
          byDepartment[deptId] = {
            departmentId: deptId,
            count: 0,
            active: 0,
            inactive: 0,
          };
        }
        byDepartment[deptId].count++;
        if (status === 'active') byDepartment[deptId].active++;
        else byDepartment[deptId].inactive++;

        // Contar por posición
        if (!byPosition[posId]) {
          byPosition[posId] = { positionId: posId, count: 0 };
        }
        byPosition[posId].count++;
      }

      return {
        totalEmployees: employeeList.length,
        activeEmployees: activeCount,
        inactiveEmployees: inactiveCount,
        terminatedEmployees: terminatedCount,
        byDepartment: Object.values(byDepartment),
        byPosition: Object.values(byPosition),
        newHires: [],
        terminations: [],
      };
    } catch (error) {
      logger.error('Error generating employee report', error);
      throw error;
    }
  }

  /**
   * Exportar reporte a CSV
   */
  exportToCSV(data: any[], filename: string): string {
    try {
      if (data.length === 0) {
        return '';
      }

      const headers = Object.keys(data[0]);
      const csv = [
        headers.join(','),
        ...data.map(row =>
          headers.map(header => {
            const value = row[header];
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value}"`;
            }
            return value;
          }).join(',')
        ),
      ].join('\n');

      logger.info(`Report exported to CSV: ${filename}`);
      return csv;
    } catch (error) {
      logger.error('Error exporting to CSV', error);
      throw error;
    }
  }

  /**
   * Helper: Agrupar nómina por departamento
   */
  private groupPayrollByDepartment(payrolls: any[], employees: any[]): any[] {
    const grouped: any = {};

    for (const payroll of payrolls) {
      const emp = employees.find(e => e.id === payroll.employeeId);
      if (!emp) continue;

      const deptId = (emp as any).departmentId;
      if (!grouped[deptId]) {
        grouped[deptId] = {
          departmentId: deptId,
          count: 0,
          total: 0,
          average: 0,
        };
      }

      grouped[deptId].count++;
      grouped[deptId].total += payroll.salary;
      grouped[deptId].average = grouped[deptId].total / grouped[deptId].count;
    }

    return Object.values(grouped);
  }
}

export default new ReportService();
