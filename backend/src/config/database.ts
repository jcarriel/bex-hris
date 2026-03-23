import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

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
    // Ensure catalogs table exists
    try {
      await db.exec(`CREATE TABLE IF NOT EXISTS catalogs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        UNIQUE(type, value)
      )`);
      console.log('Catalogs table ensured');
    } catch (error: any) {
      console.error('Error ensuring catalogs table:', error);
    }

    // Ensure roles table exists and seed default roles
    try {
      await db.exec(`CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        permissions TEXT NOT NULL DEFAULT '[]',
        isSystem INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )`);
    } catch (error: any) {
      console.error('Error ensuring roles:', error);
    }

    // Add nombre, roleId, status columns to users if not exists
    for (const colDef of ['nombre TEXT', 'roleId TEXT', "status TEXT DEFAULT 'active'"]) {
      const colName = colDef.split(' ')[0];
      try {
        await db.exec(`ALTER TABLE users ADD COLUMN ${colDef};`);
        console.log(`Added ${colName} column to users table`);
      } catch (error: any) {
        if (!error.message?.includes('duplicate column')) {
          console.error(`Error adding ${colName} to users:`, error);
        }
      }
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

    // Agregar columnas hijos, nivelAcademico, especialidad, afiliacion, estadoCivilId, contratoTipoId, contratoActualId si no existen
    for (const colDef of ['hijos INTEGER', 'nivelAcademico TEXT', 'especialidad TEXT', 'afiliacion TEXT', 'estadoCivilId TEXT', 'contratoTipoId TEXT', 'contratoActualId TEXT', 'afiliacionId TEXT']) {
      const colName = colDef.split(' ')[0];
      try {
        await db.exec(`ALTER TABLE employees ADD COLUMN ${colDef};`);
        console.log(`Added ${colName} column to employees table`);
      } catch (error: any) {
        if (!error.message?.includes('duplicate column')) {
          console.error(`Error adding ${colName} column:`, error);
        }
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

    // Migration: Recreate departmentScheduleConfig table to remove UNIQUE constraint on departmentId
    // and add UNIQUE constraint on (departmentId, positionId)
    try {
      const tableInfo = await db.all(`PRAGMA table_info(departmentScheduleConfig)`);
      const hasUniqueConstraint = tableInfo.some((col: any) => col.name === 'departmentId' && col.notnull === 1);
      
      // Check if table has the old UNIQUE constraint by trying to insert a duplicate
      const existingCount = await db.get(
        `SELECT COUNT(*) as count FROM departmentScheduleConfig WHERE positionId IS NULL`
      );
      
      if (existingCount && existingCount.count > 1) {
        console.log('Migrating departmentScheduleConfig table to support multiple positions per department...');
        
        // Backup existing data
        await db.exec(`
          CREATE TABLE IF NOT EXISTS departmentScheduleConfig_backup AS 
          SELECT * FROM departmentScheduleConfig
        `);
        
        // Drop old table
        await db.exec(`DROP TABLE departmentScheduleConfig`);
        
        // Create new table with correct constraints
        await db.exec(`
          CREATE TABLE departmentScheduleConfig (
            id TEXT PRIMARY KEY,
            departmentId TEXT NOT NULL,
            positionId TEXT,
            entryTimeMin TEXT NOT NULL DEFAULT '06:30',
            entryTimeMax TEXT NOT NULL DEFAULT '07:30',
            exitTimeMin TEXT NOT NULL DEFAULT '15:30',
            exitTimeMax TEXT NOT NULL DEFAULT '16:30',
            totalTimeMin TEXT NOT NULL DEFAULT '08:45',
            totalTimeMax TEXT NOT NULL DEFAULT '09:15',
            workHours REAL DEFAULT 9,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL,
            UNIQUE(departmentId, positionId),
            FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE CASCADE,
            FOREIGN KEY (positionId) REFERENCES positions(id) ON DELETE CASCADE
          )
        `);
        
        // Restore data
        await db.exec(`
          INSERT INTO departmentScheduleConfig 
          SELECT id, departmentId, positionId, entryTimeMin, entryTimeMax, exitTimeMin, exitTimeMax, 
                 totalTimeMin, totalTimeMax, workHours, createdAt, updatedAt 
          FROM departmentScheduleConfig_backup
        `);
        
        // Drop backup
        await db.exec(`DROP TABLE departmentScheduleConfig_backup`);
        
        console.log('Migration completed successfully');
      }
    } catch (error: any) {
      if (error.message && error.message.includes('already exists')) {
        console.log('departmentScheduleConfig table migration already completed');
      } else {
        console.error('Error migrating departmentScheduleConfig table:', error);
      }
    }

    // Add completedAt column to tasks table if it doesn't exist
    try {
      await db.exec(`ALTER TABLE tasks ADD COLUMN completedAt TEXT`);
      console.log('Added completedAt column to tasks table');
    } catch (error: any) {
      if (error.message && error.message.includes('duplicate column')) {
        console.log('completedAt column already exists');
      } else {
        console.error('Error adding completedAt column:', error);
      }
    }

    // Add recurringTaskId column to tasks table if it doesn't exist
    try {
      await db.exec(`ALTER TABLE tasks ADD COLUMN recurringTaskId TEXT`);
      console.log('Added recurringTaskId column to tasks table');
    } catch (error: any) {
      if (error.message && error.message.includes('duplicate column')) {
        console.log('recurringTaskId column already exists');
      } else {
        console.error('Error adding recurringTaskId column:', error);
      }
    }

    // Add isRecurringInstance column to tasks table if it doesn't exist
    try {
      await db.exec(`ALTER TABLE tasks ADD COLUMN isRecurringInstance INTEGER DEFAULT 0`);
      console.log('Added isRecurringInstance column to tasks table');
    } catch (error: any) {
      if (error.message && error.message.includes('duplicate column')) {
        console.log('isRecurringInstance column already exists');
      } else {
        console.error('Error adding isRecurringInstance column:', error);
      }
    }

    // Seed default admin user if no users exist
    try {
      const userCount = await db.get<{ count: number }>(`SELECT COUNT(*) as count FROM users`);
      if (userCount && userCount.count === 0) {
        const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin123!';
        const hashed = await bcrypt.hash(adminPassword, 10);
        const now = new Date().toISOString();
        await db.run(
          `INSERT INTO users (id, username, password, email, nombre, role, roleId, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), 'admin', hashed, 'admin@bexhris.com', 'Administrador', 'admin', 'role-admin', 'active', now, now]
        );
        console.log(`Default admin user created — usuario: admin, contraseña: ${adminPassword}`);
      }
    } catch (error) {
      console.error('Error seeding admin user:', error);
    }

    // Create events table
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS events (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          eventDate TEXT NOT NULL,
          employeeId TEXT,
          daysNotice INTEGER DEFAULT 7,
          createdBy TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE SET NULL
        )
      `);
      console.log('Events table ready');
    } catch (error) {
      console.error('Error ensuring events table:', error);
    }

    // Create event_type_configs table
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS event_type_configs (
          type TEXT PRIMARY KEY,
          daysNotice INTEGER NOT NULL DEFAULT 7,
          enabled INTEGER NOT NULL DEFAULT 1,
          updatedAt TEXT NOT NULL
        )
      `);
      console.log('Event type configs table ready');
    } catch (error) {
      console.error('Error ensuring event_type_configs table:', error);
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

    // Social Cases indexes
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_social_cases_employeeId ON social_cases(employeeId)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_social_cases_status ON social_cases(status)`);

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
      nombre TEXT,
      role TEXT DEFAULT 'user',
      roleId TEXT,
      status TEXT DEFAULT 'active',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (roleId) REFERENCES roles(id)
    )
  `);

  // Roles table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      permissions TEXT NOT NULL DEFAULT '[]',
      isSystem INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  // Centros de Costo table (formerly departments)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS centros_costo (
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
      departmentId TEXT NOT NULL,
      positionId TEXT,
      entryTimeMin TEXT NOT NULL DEFAULT '06:30',
      entryTimeMax TEXT NOT NULL DEFAULT '07:30',
      exitTimeMin TEXT NOT NULL DEFAULT '15:30',
      exitTimeMax TEXT NOT NULL DEFAULT '16:30',
      totalTimeMin TEXT NOT NULL DEFAULT '08:45',
      totalTimeMax TEXT NOT NULL DEFAULT '09:15',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE(departmentId, positionId),
      FOREIGN KEY (departmentId) REFERENCES centros_costo(id) ON DELETE CASCADE,
      FOREIGN KEY (positionId) REFERENCES cargos(id) ON DELETE CASCADE
    )
  `);

  // Cargos table (formerly positions)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS cargos (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      departmentId TEXT NOT NULL,
      salaryMin REAL NOT NULL,
      salaryMax REAL NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (departmentId) REFERENCES centros_costo(id)
    )
  `);

  // Labores table (formerly labors)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS labores (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      positionId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (positionId) REFERENCES cargos(id)
    )
  `);

  // Employees table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      dateOfBirth TEXT,
      genero TEXT,
      estadoCivil TEXT,
      procedencia TEXT,
      cedula TEXT UNIQUE,
      passport TEXT,
      direccion TEXT,
      profilePhoto TEXT,
      departmentId TEXT NOT NULL,
      positionId TEXT NOT NULL,
      managerId TEXT,
      hireDate TEXT NOT NULL,
      contratoTipo TEXT NOT NULL,
      contratoActual TEXT,
      contractEndDate TEXT,
      status TEXT NOT NULL,
      terminationDate TEXT,
      terminationReason TEXT,
      baseSalary REAL NOT NULL,
      bankAccount TEXT,
      bankName TEXT,
      accountType TEXT,
      hijos INTEGER,
      nivelAcademico TEXT,
      especialidad TEXT,
      afiliacion TEXT,
      estadoCivilId TEXT,
      contratoTipoId TEXT,
      contratoActualId TEXT,
      afiliacionId TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (departmentId) REFERENCES centros_costo(id),
      FOREIGN KEY (positionId) REFERENCES cargos(id),
      FOREIGN KEY (managerId) REFERENCES employees(id)
    )
  `);

  // Catalogs table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS catalogs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE(type, value)
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

  // Social Cases table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS social_cases (
      id TEXT PRIMARY KEY,
      employeeId TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      resolution TEXT,
      resolvedDate TEXT,
      resolvedBy TEXT,
      createdBy TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (employeeId) REFERENCES employees(id)
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

  // Tasks table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      completionNotes TEXT,
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

  // Recurring Tasks table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS recurring_tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT DEFAULT 'medium',
      dayOfWeek INTEGER NOT NULL,
      isActive INTEGER DEFAULT 1,
      createdBy TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (createdBy) REFERENCES users(id)
    )
  `);

  // Task Comments table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS task_comments (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      userId TEXT NOT NULL,
      userName TEXT,
      comment TEXT NOT NULL,
      action TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // Workforce Reports table (Fuerza Laboral)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS workforce_reports (
      id TEXT PRIMARY KEY,
      week INTEGER NOT NULL,
      year INTEGER NOT NULL,
      department TEXT NOT NULL DEFAULT 'BIOEXPORTVAL',
      cajas_realizadas REAL,
      dias_proceso INTEGER,
      data TEXT NOT NULL DEFAULT '{}',
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (created_by) REFERENCES users(id)
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

  console.log('Database tables created successfully');
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}
