import { z } from 'zod';

// ===== AUTH SCHEMAS =====
export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain uppercase, lowercase, and numbers'
  ),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(8),
  newPassword: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain uppercase, lowercase, and numbers'
  ),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// ===== EMPLOYEE SCHEMAS =====
export const createEmployeeSchema = z.object({
  firstName: z.string().min(2, 'First name is required').max(50),
  lastName: z.string().min(2, 'Last name is required').max(50),
  email: z.string().email('Invalid email format'),
  cedula: z.string().min(5, 'Cedula is required').max(20),
  phone: z.string().optional(),
  departmentId: z.string().uuid('Invalid department ID'),
  positionId: z.string().uuid('Invalid position ID'),
  baseSalary: z.number().positive('Salary must be positive').optional(),
  contractStartDate: z.string().datetime().optional(),
  contractEndDate: z.string().datetime().optional(),
  status: z.enum(['active', 'inactive', 'terminated']).default('active'),
  employeeNumber: z.string().optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const terminateEmployeeSchema = z.object({
  terminationDate: z.string().datetime('Invalid date format'),
  reason: z.string().min(10, 'Termination reason must be at least 10 characters').max(500),
});

// ===== DEPARTMENT SCHEMAS =====
export const createDepartmentSchema = z.object({
  name: z.string().min(2, 'Department name is required').max(100),
  description: z.string().max(500).optional(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

// ===== POSITION SCHEMAS =====
export const createPositionSchema = z.object({
  name: z.string().min(2, 'Position name is required').max(100),
  departmentId: z.string().uuid('Invalid department ID'),
  description: z.string().max(500).optional(),
  salaryMin: z.number().positive().optional(),
  salaryMax: z.number().positive().optional(),
}).refine(
  (data) => !data.salaryMin || !data.salaryMax || data.salaryMin <= data.salaryMax,
  { message: 'Minimum salary cannot be greater than maximum salary', path: ['salaryMin'] }
);

export const updatePositionSchema = createPositionSchema.partial();

// ===== ATTENDANCE SCHEMAS =====
export const createAttendanceSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID'),
  date: z.string().datetime('Invalid date format'),
  status: z.enum(['present', 'absent', 'late', 'half-day']),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  reason: z.string().max(500).optional(),
  justified: z.boolean().default(false),
});

export const updateAttendanceSchema = createAttendanceSchema.partial();

// ===== LEAVE SCHEMAS =====
export const createLeaveSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID'),
  startDate: z.string().datetime('Invalid date format'),
  endDate: z.string().datetime('Invalid date format'),
  leaveType: z.enum(['vacation', 'sick', 'personal', 'unpaid', 'maternity']),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  { message: 'Start date must be before end date', path: ['endDate'] }
);

export const updateLeaveSchema = createLeaveSchema.partial();

export const approveLeaveSchema = z.object({
  approvedBy: z.string().uuid('Invalid user ID'),
});

// ===== PAYROLL SCHEMAS =====
export const createPayrollSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID'),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be YYYY-MM format'),
  baseSalary: z.number().positive('Salary must be positive'),
  bonuses: z.number().nonnegative().default(0),
  deductions: z.number().nonnegative().default(0),
  netSalary: z.number().positive('Net salary must be positive'),
  status: z.enum(['pending', 'processed', 'paid']).default('pending'),
});

export const updatePayrollSchema = createPayrollSchema.partial();

// ===== DOCUMENT SCHEMAS =====
export const uploadDocumentSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID'),
  documentType: z.string().min(2, 'Document type is required').max(50),
  expiryDate: z.string().datetime().optional(),
});

// ===== TASK SCHEMAS =====
export const createTaskSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().max(1000).optional(),
  dueDate: z.string().datetime('Invalid date format'),
  status: z.enum(['pending', 'in-progress', 'completed', 'cancelled']).default('pending'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assignedTo: z.string().uuid('Invalid user ID').optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

// ===== NOTIFICATION SCHEDULE SCHEMAS =====
export const createNotificationScheduleSchema = z.object({
  type: z.enum(['payroll', 'leaves', 'attendance', 'contract_expiry']),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  dayOfWeek: z.string().optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  enabled: z.boolean().default(true),
  channels: z.array(z.enum(['email', 'app', 'whatsapp', 'telegram'])).min(1),
  recipientEmail: z.string().email().optional(),
  description: z.string().max(500).optional(),
});

export const updateNotificationScheduleSchema = createNotificationScheduleSchema.partial();

// ===== BENEFIT SCHEMAS =====
export const createBenefitSchema = z.object({
  name: z.string().min(3, 'Benefit name is required').max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['health', 'retirement', 'insurance', 'bonus', 'allowance', 'other']),
  value: z.number().positive('Benefit value must be positive'),
  frequency: z.enum(['monthly', 'quarterly', 'annual']).default('monthly'),
  applicable: z.enum(['all', 'by-department', 'by-position']).default('all'),
});

export const updateBenefitSchema = createBenefitSchema.partial();

export const assignBenefitSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID'),
  benefitId: z.string().uuid('Invalid benefit ID'),
  startDate: z.string().datetime('Invalid date format'),
  endDate: z.string().datetime().optional(),
});

// ===== REPORT SCHEMAS =====
export const payrollReportSchema = z.object({
  startDate: z.string().datetime('Invalid date format'),
  endDate: z.string().datetime('Invalid date format'),
  departmentId: z.string().uuid().optional(),
  format: z.enum(['json', 'csv', 'pdf']).default('json'),
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  { message: 'Start date must be before end date', path: ['endDate'] }
);

export const attendanceReportSchema = z.object({
  startDate: z.string().datetime('Invalid date format'),
  endDate: z.string().datetime('Invalid date format'),
  employeeId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  format: z.enum(['json', 'csv', 'pdf']).default('json'),
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  { message: 'Start date must be before end date', path: ['endDate'] }
);

// Type exports for use in services
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type CreateBenefitInput = z.infer<typeof createBenefitSchema>;
export type AssignBenefitInput = z.infer<typeof assignBenefitSchema>;
