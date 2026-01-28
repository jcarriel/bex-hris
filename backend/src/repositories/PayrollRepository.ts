import { getDatabase } from '@config/database';
import type { Payroll } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class PayrollRepository {
  async create(payroll: Omit<Payroll, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payroll> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    const fields = [
      'id', 'payrollType', 'type', 'year', 'month', 'departmentId', 'employeeId', 'employeeName', 'cedula', 'position',
      'paymentMethod', 'accountNumber', 'baseSalary', 'workDays', 'overtimeHours50', 'earnedSalary', 'responsibilityBonus',
      'productivityBonus', 'foodAllowance', 'overtimeValue50', 'otherIncome', 'medicalLeave', 'twelfthSalary', 'fourteenthSalary',
      'totalIncome', 'vacation', 'reserveFunds', 'totalBenefits', 'quincena', 'iessContribution', 'advance', 'nonWorkDays', 'incomeTax',
      'iessLoan', 'companyLoan', 'spouseExtension', 'foodDeduction', 'otherDeductions', 'totalDeductions', 'totalToPay',
      'status', 'createdAt', 'updatedAt'
    ];

    const values = [
      id, payroll.payrollType, payroll.type, payroll.year, payroll.month, payroll.departmentId, payroll.employeeId,
      payroll.employeeName, payroll.cedula, payroll.position, payroll.paymentMethod, payroll.accountNumber,
      payroll.baseSalary, payroll.workDays, payroll.overtimeHours50, payroll.earnedSalary, payroll.responsibilityBonus,
      payroll.productivityBonus, payroll.foodAllowance, payroll.overtimeValue50, payroll.otherIncome, payroll.medicalLeave,
      payroll.twelfthSalary, payroll.fourteenthSalary, payroll.totalIncome, payroll.vacation, payroll.reserveFunds,
      payroll.totalBenefits, payroll.quincena, payroll.iessContribution, payroll.advance, payroll.nonWorkDays, payroll.incomeTax,
      payroll.iessLoan, payroll.companyLoan, payroll.spouseExtension, payroll.foodDeduction, payroll.otherDeductions,
      payroll.totalDeductions, payroll.totalToPay, payroll.status, now, now
    ];

    const placeholders = fields.map(() => '?').join(', ');

    await db.run(
      `INSERT INTO payroll (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );

    return this.findById(id) as Promise<Payroll>;
  }

  async findById(id: string): Promise<Payroll | null> {
    const db = getDatabase();
    return db.get('SELECT * FROM payroll WHERE id = ?', [id]) || null;
  }

  async findByEmployeeAndPeriod(employeeId: string, year: number, month: number): Promise<Payroll | null> {
    const db = getDatabase();
    return db.get('SELECT * FROM payroll WHERE employeeId = ? AND year = ? AND month = ?', [employeeId, year, month]) || null;
  }

  async findByEmployee(employeeId: string): Promise<Payroll[]> {
    const db = getDatabase();
    return db.all('SELECT * FROM payroll WHERE employeeId = ? ORDER BY year DESC, month DESC', [employeeId]);
  }

  async findByPeriod(year: number, month: number): Promise<Payroll[]> {
    const db = getDatabase();
    return db.all('SELECT * FROM payroll WHERE year = ? AND month = ? ORDER BY employeeName', [year, month]);
  }

  async findAll(): Promise<Payroll[]> {
    const db = getDatabase();
    return db.all('SELECT * FROM payroll ORDER BY year DESC, month DESC, employeeName');
  }

  async update(id: string, data: Partial<Payroll>): Promise<Payroll | null> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: unknown[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt') {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push('updatedAt = ?');
    values.push(now);
    values.push(id);

    await db.run(
      `UPDATE payroll SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.run('DELETE FROM payroll WHERE id = ?', [id]);
    return (result.changes || 0) > 0;
  }

  async deleteByPeriod(year: number, month: number): Promise<boolean> {
    const db = getDatabase();
    const result = await db.run('DELETE FROM payroll WHERE year = ? AND month = ?', [year, month]);
    return (result.changes || 0) > 0;
  }
}

export default new PayrollRepository();
