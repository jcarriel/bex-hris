import ReportService from '../ReportService';

describe('ReportService', () => {
  describe('generatePayrollReport', () => {
    it('should generate a payroll report', async () => {
      const startDate = '2026-01-01T00:00:00Z';
      const endDate = '2026-01-31T23:59:59Z';

      const report = await ReportService.generatePayrollReport(startDate, endDate);

      expect(report).toBeDefined();
      expect(report.period).toBe(`${startDate} to ${endDate}`);
      expect(report.totalEmployees).toBeGreaterThanOrEqual(0);
      expect(report.totalPayroll).toBeGreaterThanOrEqual(0);
      expect(report.averageSalary).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(report.byDepartment)).toBe(true);
      expect(Array.isArray(report.details)).toBe(true);
    });

    it('should include department breakdown', async () => {
      const startDate = '2026-01-01T00:00:00Z';
      const endDate = '2026-01-31T23:59:59Z';

      const report = await ReportService.generatePayrollReport(startDate, endDate);

      expect(report.byDepartment).toBeDefined();
      report.byDepartment.forEach((dept) => {
        expect(dept.departmentId).toBeDefined();
        expect(dept.count).toBeGreaterThanOrEqual(0);
        expect(dept.total).toBeGreaterThanOrEqual(0);
        expect(dept.average).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('generateAttendanceReport', () => {
    it('should generate an attendance report', async () => {
      const startDate = '2026-01-01T00:00:00Z';
      const endDate = '2026-01-31T23:59:59Z';

      const report = await ReportService.generateAttendanceReport(startDate, endDate);

      expect(report).toBeDefined();
      expect(report.period).toBe(`${startDate} to ${endDate}`);
      expect(report.totalEmployees).toBeGreaterThanOrEqual(0);
      expect(report.presentDays).toBeGreaterThanOrEqual(0);
      expect(report.absentDays).toBeGreaterThanOrEqual(0);
      expect(report.attendanceRate).toBeGreaterThanOrEqual(0);
      expect(report.attendanceRate).toBeLessThanOrEqual(100);
    });

    it('should include employee breakdown', async () => {
      const startDate = '2026-01-01T00:00:00Z';
      const endDate = '2026-01-31T23:59:59Z';

      const report = await ReportService.generateAttendanceReport(startDate, endDate);

      expect(Array.isArray(report.byEmployee)).toBe(true);
      report.byEmployee.forEach((emp) => {
        expect(emp.employeeId).toBeDefined();
        expect(emp.name).toBeDefined();
        expect(emp.present).toBeGreaterThanOrEqual(0);
        expect(emp.absent).toBeGreaterThanOrEqual(0);
        expect(emp.rate).toBeGreaterThanOrEqual(0);
        expect(emp.rate).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('generateLeaveReport', () => {
    it('should generate a leave report', async () => {
      const startDate = '2026-01-01T00:00:00Z';
      const endDate = '2026-01-31T23:59:59Z';

      const report = await ReportService.generateLeaveReport(startDate, endDate);

      expect(report).toBeDefined();
      expect(report.period).toBe(`${startDate} to ${endDate}`);
      expect(report.totalRequests).toBeGreaterThanOrEqual(0);
      expect(report.approved).toBeGreaterThanOrEqual(0);
      expect(report.rejected).toBeGreaterThanOrEqual(0);
      expect(report.pending).toBeGreaterThanOrEqual(0);
    });

    it('should include leave type breakdown', async () => {
      const startDate = '2026-01-01T00:00:00Z';
      const endDate = '2026-01-31T23:59:59Z';

      const report = await ReportService.generateLeaveReport(startDate, endDate);

      expect(Array.isArray(report.byType)).toBe(true);
      report.byType.forEach((type) => {
        expect(type.type).toBeDefined();
        expect(type.count).toBeGreaterThanOrEqual(0);
        expect(type.approved).toBeGreaterThanOrEqual(0);
        expect(type.rejected).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('generateEmployeeReport', () => {
    it('should generate an employee report', async () => {
      const report = await ReportService.generateEmployeeReport();

      expect(report).toBeDefined();
      expect(report.totalEmployees).toBeGreaterThanOrEqual(0);
      expect(report.activeEmployees).toBeGreaterThanOrEqual(0);
      expect(report.inactiveEmployees).toBeGreaterThanOrEqual(0);
      expect(report.terminatedEmployees).toBeGreaterThanOrEqual(0);
    });

    it('should include department breakdown', async () => {
      const report = await ReportService.generateEmployeeReport();

      expect(Array.isArray(report.byDepartment)).toBe(true);
      report.byDepartment.forEach((dept) => {
        expect(dept.departmentId).toBeDefined();
        expect(dept.count).toBeGreaterThanOrEqual(0);
        expect(dept.active).toBeGreaterThanOrEqual(0);
        expect(dept.inactive).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('exportToCSV', () => {
    it('should export data to CSV format', () => {
      const data = [
        { id: '1', name: 'John', salary: 5000 },
        { id: '2', name: 'Jane', salary: 6000 },
      ];

      const csv = ReportService.exportToCSV(data, 'test.csv');

      expect(csv).toBeDefined();
      expect(typeof csv).toBe('string');
      expect(csv).toContain('id,name,salary');
      expect(csv).toContain('1,John,5000');
      expect(csv).toContain('2,Jane,6000');
    });

    it('should handle empty data', () => {
      const csv = ReportService.exportToCSV([], 'test.csv');

      expect(csv).toBe('');
    });

    it('should escape commas in CSV values', () => {
      const data = [
        { id: '1', name: 'Smith, John', salary: 5000 },
      ];

      const csv = ReportService.exportToCSV(data, 'test.csv');

      expect(csv).toContain('"Smith, John"');
    });
  });
});
