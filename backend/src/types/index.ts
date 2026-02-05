// User Types
export interface User {
  id: string;
  username: string;
  password: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

// Employee Types
export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  personalEmail: string;
  phone: string;
  personalPhone: string;
  dateOfBirth: string;
  gender: 'M' | 'F' | 'O';
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  nationality: string;
  cedula: string;
  passport?: string;
  address: string;
  profilePhoto?: string;
  departmentId: string;
  positionId: string;
  laborId?: string;
  managerId?: string;
  hireDate: string;
  contractType: 'indefinite' | 'fixed' | 'temporary' | 'intern';
  currentContract?: string;
  contractEndDate?: string;
  status: 'active' | 'inactive' | 'on_leave' | 'terminated';
  terminationDate?: string;
  terminationReason?: string;
  baseSalary: number;
  bankAccount?: string;
  bankName?: string;
  accountType?: string;
  createdAt: string;
  updatedAt: string;
}

// Department Types
export interface Department {
  id: string;
  name: string;
  description?: string;
  managerId?: string;
  createdAt: string;
  updatedAt: string;
}

// Position Types
export interface Position {
  id: string;
  name: string;
  description?: string;
  departmentId: string;
  salaryRange: {
    min: number;
    max: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Payroll Types
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
  quincena: number; // QUINCENA
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

// Attendance Types
export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'late' | 'leave' | 'holiday';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Marcación (Attendance Records) Types
export interface Marcacion {
  id: string;
  cedula: string;
  employeeName: string;
  department: string;
  month: number;
  date: string;
  dailyAttendance: string;
  firstCheckIn?: string;
  lastCheckOut?: string;
  totalTime?: string;
  createdAt: string;
  updatedAt: string;
}

// Leave Types
export interface Leave {
  id: string;
  employeeId: string;
  type: 'vacation' | 'medical' | 'maternity' | 'personal' | 'unpaid';
  startDate: string;
  endDate: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  approvedBy?: string;
  approvedDate?: string;
  createdAt: string;
  updatedAt: string;
}

// Document Types
export interface Document {
  id: string;
  employeeId: string;
  documentType: 'cedula' | 'passport' | 'contract' | 'memorandum' | 'certificate' | 'other';
  fileName: string;
  filePath: string;
  fileSize: number;
  uploadedBy: string;
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
}

// Data Update Request Types
export interface DataUpdateRequest {
  id: string;
  employeeId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

// Notification Types
export interface Notification {
  id: string;
  userId?: string;
  employeeId?: string;
  type: 'contract_expiry' | 'salary_change' | 'document_expiry' | 'data_update' | 'system';
  title: string;
  message: string;
  read: boolean;
  channels: NotificationChannel[];
  createdAt: string;
  updatedAt: string;
}

export interface NotificationChannel {
  type: 'app' | 'email' | 'whatsapp' | 'telegram';
  sent: boolean;
  sentAt?: string;
  error?: string;
}

// Configuration Types
export interface SystemConfig {
  id: string;
  companyName: string;
  companyLogo?: string;
  currency: string;
  timezone: string;
  language: string;
  vacationDaysPerYear: number;
  contractExpiryNotificationDays: number;
  documentExpiryNotificationDays: number;
  createdAt: string;
  updatedAt: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Pagination Types
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
