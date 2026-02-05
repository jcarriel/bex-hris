import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

let db: Database | null = null;

export async function initializeDatabase(): Promise<Database> {
  if (db) {
    return db;
  }

  const dbPath = process.env.DATABASE_PATH || './data/hris.db';
  const dbDir = path.dirname(dbPath);

  // Create data directory if it doesn't exist
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Disable foreign keys temporarily for bulk insert
  await db.exec('PRAGMA foreign_keys = OFF');

  // Create tables
  await createTables(db);

  // Run migrations
  await runMigrations(db);

  // Create indexes for performance
  await createIndexes(db);

  return db;
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return db;
}

async function runMigrations(db: Database): Promise<void> {
  try {
    // Agregar columna currentContract a tabla employees si no existe
    try {
      await db.exec(`ALTER TABLE employees ADD COLUMN currentContract TEXT;`);
    } catch (error) {
      // Columna ya existe, ignorar error
      console.log('Column currentContract already exists or migration skipped');
    }

    // Agregar columna laborId a tabla employees si no existe
    try {
      await db.exec(`ALTER TABLE employees ADD COLUMN laborId TEXT;`);
      console.log('Added laborId column to employees table');
    } catch (error: any) {
      if (error.message && error.message.includes('duplicate column')) {
        console.log('laborId column already exists');
      } else {
        console.error('Error adding laborId column:', error);
      }
    }

    // Crear tabla payroll si no existe (sin borrar datos existentes)
    try {
      console.log('Ensuring payroll table exists...');
      await db.exec(`
        CREATE TABLE IF NOT EXISTS payroll (
          id TEXT PRIMARY KEY,
          payrollType TEXT NOT NULL,
          type TEXT NOT NULL,
          year INTEGER NOT NULL,
          month INTEGER NOT NULL,
          departmentId TEXT NOT NULL,
          employeeId TEXT NOT NULL,
          employeeName TEXT NOT NULL,
          cedula TEXT NOT NULL,
          position TEXT NOT NULL,
          paymentMethod TEXT,
          accountNumber TEXT,
          baseSalary REAL DEFAULT 0,
          workDays REAL DEFAULT 0,
          overtimeHours50 REAL DEFAULT 0,
          earnedSalary REAL DEFAULT 0,
          responsibilityBonus REAL DEFAULT 0,
          productivityBonus REAL DEFAULT 0,
          foodAllowance REAL DEFAULT 0,
          overtimeValue50 REAL DEFAULT 0,
          otherIncome REAL DEFAULT 0,
          medicalLeave REAL DEFAULT 0,
          twelfthSalary REAL DEFAULT 0,
          fourteenthSalary REAL DEFAULT 0,
          totalIncome REAL DEFAULT 0,
          vacation REAL DEFAULT 0,
          reserveFunds REAL DEFAULT 0,
          totalBenefits REAL DEFAULT 0,
          quincena REAL DEFAULT 0,
          iessContribution REAL DEFAULT 0,
          advance REAL DEFAULT 0,
          nonWorkDays REAL DEFAULT 0,
          incomeTax REAL DEFAULT 0,
          iessLoan REAL DEFAULT 0,
          companyLoan REAL DEFAULT 0,
          spouseExtension REAL DEFAULT 0,
          foodDeduction REAL DEFAULT 0,
          otherDeductions REAL DEFAULT 0,
          totalDeductions REAL DEFAULT 0,
          totalToPay REAL DEFAULT 0,
          status TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          FOREIGN KEY (employeeId) REFERENCES employees(id),
          UNIQUE(employeeId, year, month)
        )
      `);
      console.log('Payroll table ready');
      
      // Add quincena column if it doesn't exist
      try {
        await db.exec(`ALTER TABLE payroll ADD COLUMN quincena REAL DEFAULT 0`);
        console.log('Added quincena column to payroll table');
      } catch (error: any) {
        if (error.message && error.message.includes('duplicate column')) {
          console.log('quincena column already exists');
        } else {
          console.error('Error adding quincena column:', error);
        }
      }
    } catch (error) {
      console.error('Error ensuring payroll table:', error);
    }

    // Add positionId and workHours columns to departmentScheduleConfig if they don't exist
    try {
      await db.exec(`ALTER TABLE departmentScheduleConfig ADD COLUMN positionId TEXT`);
      console.log('Added positionId column to departmentScheduleConfig table');
    } catch (error: any) {
      if (error.message && error.message.includes('duplicate column')) {
        console.log('positionId column already exists');
      } else {
        console.error('Error adding positionId column:', error);
      }
    }

    try {
      await db.exec(`ALTER TABLE departmentScheduleConfig ADD COLUMN workHours REAL DEFAULT 9`);
      console.log('Added workHours column to departmentScheduleConfig table');
    } catch (error: any) {
      if (error.message && error.message.includes('duplicate column')) {
        console.log('workHours column already exists');
      } else {
        console.error('Error adding workHours column:', error);
      }
    }

    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
  }
}

async function createIndexes(db: Database): Promise<void> {
  try {
    // Employees indexes
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_employees_cedula ON employees(cedula)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_employees_departmentId ON employees(departmentId)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_employees_positionId ON employees(positionId)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_employees_contractEndDate ON employees(contractEndDate)`);

    // Attendance indexes
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_attendance_employeeId ON attendance(employeeId)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_attendance_employeeId_date ON attendance(employeeId, date)`);

    // Marcación indexes
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_marcacion_cedula ON marcacion(cedula)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_marcacion_date ON marcacion(date)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_marcacion_month ON marcacion(month)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_marcacion_cedula_date ON marcacion(cedula, date)`);

    // Leaves indexes
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_leaves_employeeId ON leaves(employeeId)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_leaves_startDate ON leaves(startDate)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_leaves_endDate ON leaves(endDate)`);

    // Payroll indexes
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_payroll_employeeId ON payroll(employeeId)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_payroll_year_month ON payroll(year, month)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll(status)`);

    // Documents indexes
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_documents_employeeId ON documents(employeeId)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(documentType)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_documents_expiryDate ON documents(expiryDate)`);

    // Tasks indexes
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_dueDate ON tasks(dueDate)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_assignedTo ON tasks(assignedTo)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)`);

    // Notification schedules indexes
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_notification_schedules_type ON notification_schedules(type)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_notification_schedules_enabled ON notification_schedules(enabled)`);

    // Audit logs indexes
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_logs_userId ON audit_logs(userId)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_logs_entityType ON audit_logs(entityType)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_logs_createdAt ON audit_logs(createdAt)`);

    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
}

async function createTables(db: Database): Promise<void> {
  // Users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'active',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  // Departments table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  // Department Schedule Configuration table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS departmentScheduleConfig (
      id TEXT PRIMARY KEY,
      departmentId TEXT NOT NULL UNIQUE,
      entryTimeMin TEXT NOT NULL DEFAULT '06:30',
      entryTimeMax TEXT NOT NULL DEFAULT '07:30',
      exitTimeMin TEXT NOT NULL DEFAULT '15:30',
      exitTimeMax TEXT NOT NULL DEFAULT '16:30',
      totalTimeMin TEXT NOT NULL DEFAULT '08:45',
      totalTimeMax TEXT NOT NULL DEFAULT '09:15',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE CASCADE
    )
  `);

  // Positions table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS positions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      departmentId TEXT NOT NULL,
      salaryMin REAL NOT NULL,
      salaryMax REAL NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (departmentId) REFERENCES departments(id)
    )
  `);

  // Labors table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS labors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      positionId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (positionId) REFERENCES positions(id)
    )
  `);

  // Employees table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      employeeNumber TEXT UNIQUE NOT NULL,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      personalEmail TEXT,
      phone TEXT,
      personalPhone TEXT,
      dateOfBirth TEXT,
      gender TEXT,
      maritalStatus TEXT,
      nationality TEXT,
      cedula TEXT UNIQUE,
      passport TEXT,
      address TEXT,
      profilePhoto TEXT,
      departmentId TEXT NOT NULL,
      positionId TEXT NOT NULL,
      managerId TEXT,
      hireDate TEXT NOT NULL,
      contractType TEXT NOT NULL,
      currentContract TEXT,
      contractEndDate TEXT,
      status TEXT NOT NULL,
      terminationDate TEXT,
      terminationReason TEXT,
      baseSalary REAL NOT NULL,
      bankAccount TEXT,
      bankName TEXT,
      accountType TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (departmentId) REFERENCES departments(id),
      FOREIGN KEY (positionId) REFERENCES positions(id),
      FOREIGN KEY (managerId) REFERENCES employees(id)
    )
  `);

  // Payroll table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS payroll (
      id TEXT PRIMARY KEY,
      payrollType TEXT NOT NULL,
      type TEXT NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      departmentId TEXT NOT NULL,
      employeeId TEXT NOT NULL,
      employeeName TEXT NOT NULL,
      cedula TEXT NOT NULL,
      position TEXT NOT NULL,
      paymentMethod TEXT,
      accountNumber TEXT,
      baseSalary REAL DEFAULT 0,
      workDays REAL DEFAULT 0,
      overtimeHours50 REAL DEFAULT 0,
      earnedSalary REAL DEFAULT 0,
      responsibilityBonus REAL DEFAULT 0,
      productivityBonus REAL DEFAULT 0,
      foodAllowance REAL DEFAULT 0,
      overtimeValue50 REAL DEFAULT 0,
      otherIncome REAL DEFAULT 0,
      medicalLeave REAL DEFAULT 0,
      twelfthSalary REAL DEFAULT 0,
      fourteenthSalary REAL DEFAULT 0,
      totalIncome REAL DEFAULT 0,
      vacation REAL DEFAULT 0,
      reserveFunds REAL DEFAULT 0,
      totalBenefits REAL DEFAULT 0,
      iessContribution REAL DEFAULT 0,
      advance REAL DEFAULT 0,
      nonWorkDays REAL DEFAULT 0,
      incomeTax REAL DEFAULT 0,
      iessLoan REAL DEFAULT 0,
      companyLoan REAL DEFAULT 0,
      spouseExtension REAL DEFAULT 0,
      foodDeduction REAL DEFAULT 0,
      otherDeductions REAL DEFAULT 0,
      totalDeductions REAL DEFAULT 0,
      totalToPay REAL DEFAULT 0,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (employeeId) REFERENCES employees(id),
      FOREIGN KEY (departmentId) REFERENCES departments(id),
      UNIQUE(employeeId, year, month)
    )
  `);

  // Attendance table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      employeeId TEXT NOT NULL,
      date TEXT NOT NULL,
      checkIn TEXT,
      checkOut TEXT,
      status TEXT NOT NULL,
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (employeeId) REFERENCES employees(id),
      UNIQUE(employeeId, date)
    )
  `);

  // Marcación (Attendance Records) table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS marcacion (
      id TEXT PRIMARY KEY,
      cedula TEXT NOT NULL,
      employeeName TEXT NOT NULL,
      department TEXT NOT NULL,
      month INTEGER NOT NULL,
      date TEXT NOT NULL,
      dailyAttendance TEXT NOT NULL,
      firstCheckIn TEXT,
      lastCheckOut TEXT,
      totalTime TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE(cedula, date)
    )
  `);

  // Leave table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS leaves (
      id TEXT PRIMARY KEY,
      employeeId TEXT NOT NULL,
      type TEXT NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      days INTEGER NOT NULL,
      status TEXT NOT NULL,
      reason TEXT,
      approvedBy TEXT,
      approvedDate TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (employeeId) REFERENCES employees(id),
      FOREIGN KEY (approvedBy) REFERENCES users(id)
    )
  `);

  // Documents table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      employeeId TEXT NOT NULL,
      documentType TEXT NOT NULL,
      fileName TEXT NOT NULL,
      filePath TEXT NOT NULL,
      fileSize INTEGER NOT NULL,
      uploadedBy TEXT NOT NULL,
      expiryDate TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (employeeId) REFERENCES employees(id),
      FOREIGN KEY (uploadedBy) REFERENCES users(id)
    )
  `);

  // Data Update Requests table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS data_update_requests (
      id TEXT PRIMARY KEY,
      employeeId TEXT NOT NULL,
      fieldName TEXT NOT NULL,
      oldValue TEXT,
      newValue TEXT NOT NULL,
      status TEXT NOT NULL,
      requestedAt TEXT NOT NULL,
      approvedBy TEXT,
      approvedAt TEXT,
      rejectionReason TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (employeeId) REFERENCES employees(id),
      FOREIGN KEY (approvedBy) REFERENCES users(id)
    )
  `);

  // Notifications table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      userId TEXT,
      employeeId TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (employeeId) REFERENCES employees(id)
    )
  `);

  // Notification Channels table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS notification_channels (
      id TEXT PRIMARY KEY,
      notificationId TEXT NOT NULL,
      type TEXT NOT NULL,
      sent INTEGER DEFAULT 0,
      sentAt TEXT,
      error TEXT,
      FOREIGN KEY (notificationId) REFERENCES notifications(id)
    )
  `);

  // System Configuration table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS system_config (
      id TEXT PRIMARY KEY,
      companyName TEXT NOT NULL,
      companyLogo TEXT,
      currency TEXT NOT NULL,
      timezone TEXT NOT NULL,
      language TEXT NOT NULL,
      vacationDaysPerYear INTEGER NOT NULL,
      contractExpiryNotificationDays INTEGER NOT NULL,
      documentExpiryNotificationDays INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  // Notification Schedules table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS notification_schedules (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      dayOfWeek TEXT,
      dayOfMonth INTEGER,
      hour INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      enabled INTEGER DEFAULT 1,
      channels TEXT NOT NULL,
      recipientEmail TEXT,
      description TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  // Migration: Add recipientEmail column if it doesn't exist
  try {
    await db.exec(`
      ALTER TABLE notification_schedules ADD COLUMN recipientEmail TEXT;
    `);
  } catch (error) {
    // Column already exists, ignore error
  }

  // Document Categories table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS document_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  // Tasks table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      dueDate TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      assignedTo TEXT,
      createdBy TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (assignedTo) REFERENCES users(id),
      FOREIGN KEY (createdBy) REFERENCES users(id)
    )
  `);

  // Audit Log table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      userId TEXT,
      action TEXT NOT NULL,
      entityType TEXT NOT NULL,
      entityId TEXT NOT NULL,
      changes TEXT,
      ipAddress TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // Insert default document categories if they don't exist
  await db.run(`
    INSERT OR IGNORE INTO document_categories (id, name, description, createdAt, updatedAt)
    VALUES 
      ('1', 'Contrato', 'Contratos laborales', datetime('now'), datetime('now')),
      ('2', 'Certificado', 'Certificados profesionales', datetime('now'), datetime('now')),
      ('3', 'IESS', 'Documentos del IESS', datetime('now'), datetime('now')),
      ('4', 'Memorandum', 'Memorandums', datetime('now'), datetime('now')),
      ('5', 'Identificacion', 'Documentos de identificación', datetime('now'), datetime('now')),
      ('6', 'Otro', 'Otros documentos', datetime('now'), datetime('now'))
  `);

  // Insert system user for document uploads if it doesn't exist
  await db.run(`
    INSERT OR IGNORE INTO users (id, username, email, password, role, status, createdAt, updatedAt)
    VALUES 
      ('system-upload', 'system', 'system@hris.local', '', 'admin', 'active', datetime('now'), datetime('now'))
  `);

  console.log('Database tables created successfully');
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}
