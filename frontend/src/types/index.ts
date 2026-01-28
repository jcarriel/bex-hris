// User Types
export interface User {
  id: string;
  username: string;
  email: string;
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
  managerId?: string;
  hireDate: string;
  contractType: 'indefinite' | 'fixed' | 'temporary' | 'intern';
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

// Payroll Types
export interface Payroll {
  id: string;
  employeeId: string;
  period: string;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  taxes: number;
  netSalary: number;
  status: 'draft' | 'approved' | 'paid';
  paymentDate?: string;
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

// Notification Types
export interface Notification {
  id: string;
  userId?: string;
  employeeId?: string;
  type: 'contract_expiry' | 'salary_change' | 'document_expiry' | 'data_update' | 'system';
  title: string;
  message: string;
  read: boolean;
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
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
