export interface Payroll {
  id: string;
  payrollType: string; // Tipo de Nómina
  type: string; // Tipo (Regular, Especial, etc)
  year: number; // AÑO
  month: number; // MES
  departmentId: string; // CENTRO DE COSTO
  employeeId: string; // Referencia a empleado
  employeeName: string; // APELLIDOS Y NOMBRES
  cedula: string; // CEDULA
  position: string; // CARGO
  paymentMethod: string; // FORMA DE PAGO
  accountNumber: string; // NUMERO DE CUENTA
  
  // Ingresos
  baseSalary: number; // SUELDO BASE
  workDays: number; // DIAS LABORADO
  overtimeHours50: number; // NRO HORAS EXTRAS 50%
  earnedSalary: number; // SUELDO GANADO
  responsibilityBonus: number; // BONIFICACION RESPONSABILIDAD
  productivityBonus: number; // BONIFICACION PRODUCTIVIDAD
  foodAllowance: number; // ALIMENTACION
  overtimeValue50: number; // VALOR HORAS EXTRAS 50%
  otherIncome: number; // OTROS INGRESOS
  medicalLeave: number; // DESCANSO MEDICO
  twelfthSalary: number; // XII SUELDO
  fourteenthSalary: number; // XIV SUELDO
  totalIncome: number; // TOTAL INGRESOS
  
  // Beneficios
  vacation: number; // VACACIONES
  reserveFunds: number; // FONDOS DE RESERVA
  totalBenefits: number; // TOTAL DE BENEFICIOS
  
  // Egresos
  iessContribution: number; // Aporte IESS
  advance: number; // ANTICIPO
  nonWorkDays: number; // DIAS NO LABORADOS
  incomeTax: number; // IMPUESTO A LA RENTA
  iessLoan: number; // PRESTAMO IESS
  companyLoan: number; // PRESTAMO EMPRESARIAL
  spouseExtension: number; // EXTENSION CONYUGAL
  foodDeduction: number; // ALIMENTACION (descuento)
  otherDeductions: number; // OTROS DESCUENTOS
  totalDeductions: number; // TOTAL EGRESOS
  
  // Total
  totalToPay: number; // TOTAL A PAGAR
  
  // Metadata
  status: 'draft' | 'processed' | 'paid' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}
