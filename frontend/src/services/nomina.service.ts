import { api } from './api'

export interface PayrollRecord {
  id: string
  payrollType: string
  type: string
  year: number
  month: number
  departmentId: string
  employeeId: string
  employeeName: string
  cedula: string
  position: string
  paymentMethod: string
  accountNumber: string
  // Ingresos
  baseSalary: number
  workDays: number
  overtimeHours50: number
  earnedSalary: number
  responsibilityBonus: number
  productivityBonus: number
  foodAllowance: number
  overtimeValue50: number
  otherIncome: number
  medicalLeave: number
  twelfthSalary: number
  fourteenthSalary: number
  totalIncome: number
  // Beneficios
  vacation: number
  reserveFunds: number
  totalBenefits: number
  // Egresos
  quincena: number
  iessContribution: number
  advance: number
  nonWorkDays: number
  incomeTax: number
  iessLoan: number
  companyLoan: number
  spouseExtension: number
  foodDeduction: number
  otherDeductions: number
  totalDeductions: number
  // Total
  totalToPay: number
  status: 'draft' | 'processed' | 'paid' | 'cancelled'
  createdAt: string
  updatedAt: string
}

export const nominaService = {
  getAll: () =>
    api.get<{ success: boolean; data: PayrollRecord[] }>('/payroll')
      .then((r) => r.data.data),

  getByPeriod: (year: number, month: number) =>
    api.get<{ success: boolean; data: PayrollRecord[] }>(`/payroll/period/${year}/${month}`)
      .then((r) => r.data.data),

  update: (id: string, data: Partial<PayrollRecord>) =>
    api.put<{ success: boolean; data: PayrollRecord }>(`/payroll/${id}`, data)
      .then((r) => r.data.data),

  deleteOne: (id: string) =>
    api.delete(`/payroll/${id}`).then((r) => r.data),

  deleteByPeriod: (year: number, month: number) =>
    api.delete(`/payroll/period/${year}/${month}`).then((r) => r.data),
}
