import { Pool, PoolConfig } from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// ─── PostgreSQL compatibility adapter (mimics the sqlite API used throughout) ─

/** Convert SQLite positional `?` placeholders to PostgreSQL `$1, $2, …` */
function toPositional(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export interface DbAdapter {
  run(sql: string, params?: any[]): Promise<{ changes: number }>;
  get<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
  all<T = any>(sql: string, params?: any[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

function wrapPool(pool: Pool): DbAdapter {
  return {
    async run(sql, params = []) {
      const res = await pool.query(toPositional(sql), params);
      return { changes: res.rowCount ?? 0 };
    },
    async get<T>(sql: string, params: any[] = []) {
      const res = await pool.query<T>(toPositional(sql), params);
      return res.rows[0];
    },
    async all<T>(sql: string, params: any[] = []) {
      const res = await pool.query<T>(toPositional(sql), params);
      return res.rows;
    },
    async exec(sql) {
      await pool.query(sql);
    },
    async close() {
      await pool.end();
    },
  };
}

let db: DbAdapter | null = null;

export async function initializeDatabase(): Promise<DbAdapter> {
  if (db) return db;

  // Try to build connection string from Railway public proxy variables
  let connectionString: string | null = null;
  
  if (process.env.RAILWAY_TCP_PROXY_DOMAIN && process.env.RAILWAY_TCP_PROXY_PORT && process.env.PGUSER && process.env.PGPASSWORD) {
    connectionString = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.RAILWAY_TCP_PROXY_DOMAIN}:${process.env.RAILWAY_TCP_PROXY_PORT}/${process.env.PGDATABASE || 'railway'}`;
  }
  
  console.log('Database config:', {
    hasRailwayProxy: !!process.env.RAILWAY_TCP_PROXY_DOMAIN,
    railwayDomain: process.env.RAILWAY_TCP_PROXY_DOMAIN,
    railwayPort: process.env.RAILWAY_TCP_PROXY_PORT,
    pguser: process.env.PGUSER,
    pgdatabase: process.env.PGDATABASE,
  });

  const cfg: PoolConfig = connectionString
    ? {
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
      }
    : {
        host:     process.env.DB_HOST     || 'localhost',
        port:     Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME     || 'hris',
        user:     process.env.DB_USER     || 'postgres',
        password: process.env.DB_PASSWORD || '',
        max: 10,
      };

  const pool = new Pool(cfg);

  // Verify connection before continuing
  const client = await pool.connect();
  client.release();
  console.log('PostgreSQL connection established');

  db = wrapPool(pool);

  await createTables(db);
  await runMigrations(db);
  await createIndexes(db);

  return db;
}

export function getDatabase(): DbAdapter {
  if (!db) throw new Error('Database not initialized. Call initializeDatabase first.');
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) { await db.close(); db = null; }
}

// ─── Table Creation ───────────────────────────────────────────────────────────

async function createTables(db: DbAdapter): Promise<void> {
  // Roles (must exist before users FK)
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

  // Users
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
      lastLoginAt TEXT,
      employeeId TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (roleId) REFERENCES roles(id)
    )
  `);

  // Centros de Costo (departments)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS centros_costo (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  // Cargos (positions)
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

  // Labores
  await db.exec(`
    CREATE TABLE IF NOT EXISTS labores (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      positionId TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (positionId) REFERENCES cargos(id)
    )
  `);

  // Department Schedule Configuration
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
      workHours REAL DEFAULT 9,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE(departmentId, positionId),
      FOREIGN KEY (departmentId) REFERENCES centros_costo(id) ON DELETE CASCADE,
      FOREIGN KEY (positionId) REFERENCES cargos(id) ON DELETE CASCADE
    )
  `);

  // Employees
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
      laborId TEXT,
      managerId TEXT,
      mayordomoId TEXT,
      hireDate TEXT NOT NULL,
      contratoTipo TEXT NOT NULL,
      contratoActual TEXT,
      contratoTipoId TEXT,
      contratoActualId TEXT,
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
      afiliacionId TEXT,
      estadoCivilId TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (departmentId) REFERENCES centros_costo(id),
      FOREIGN KEY (positionId) REFERENCES cargos(id),
      FOREIGN KEY (managerId) REFERENCES employees(id)
    )
  `);

  // Catalogs
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

  // Payroll
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
      FOREIGN KEY (departmentId) REFERENCES centros_costo(id),
      UNIQUE(employeeId, year, month)
    )
  `);

  // Attendance
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

  // Marcación (biometric attendance records)
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

  // Leaves
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
      submittedBy TEXT,
      approvedBy TEXT,
      approvedDate TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (employeeId) REFERENCES employees(id),
      FOREIGN KEY (approvedBy) REFERENCES users(id)
    )
  `);

  // Social Cases
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

  // Documents
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

  // Data Update Requests
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

  // Notifications
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

  // Notification Channels
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

  // System Configuration
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

  // Notification Schedules
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

  // Tasks
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
      completedAt TEXT,
      recurringTaskId TEXT,
      isRecurringInstance INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (assignedTo) REFERENCES users(id),
      FOREIGN KEY (createdBy) REFERENCES users(id)
    )
  `);

  // Recurring Tasks
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

  // Task Comments
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

  // Workforce Reports
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

  // Lockers
  await db.exec(`
    CREATE TABLE IF NOT EXISTS lockers (
      id TEXT PRIMARY KEY,
      number TEXT NOT NULL,
      section TEXT NOT NULL DEFAULT 'General',
      status TEXT NOT NULL DEFAULT 'available',
      employeeId TEXT,
      assignedDate TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE SET NULL
    )
  `);

  // Novedades
  await db.exec(`
    CREATE TABLE IF NOT EXISTS novedades (
      id TEXT PRIMARY KEY,
      employeeId TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      response TEXT,
      respondedBy TEXT,
      respondedDate TEXT,
      createdBy TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (employeeId) REFERENCES employees(id)
    )
  `);

  // Audit Log
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

  // App Settings
  await db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Mayordomos
  await db.exec(`
    CREATE TABLE IF NOT EXISTS mayordomos (
      id TEXT PRIMARY KEY,
      employeeId TEXT NOT NULL,
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (employeeId) REFERENCES employees(id)
    )
  `);

  // Events
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

  // Event Type Configs
  await db.exec(`
    CREATE TABLE IF NOT EXISTS event_type_configs (
      type TEXT PRIMARY KEY,
      daysNotice INTEGER NOT NULL DEFAULT 7,
      enabled INTEGER NOT NULL DEFAULT 1,
      updatedAt TEXT NOT NULL
    )
  `);

  // Maestro General
  await db.exec(`
    CREATE TABLE IF NOT EXISTS maestro_general (
      id TEXT PRIMARY KEY,
      tipoTrabajadorId TEXT,
      fechaIngreso TEXT,
      semanaIngreso INTEGER,
      apellidos TEXT,
      nombres TEXT,
      cedula TEXT,
      centroDeCostoId TEXT,
      laborId TEXT,
      fechaNacimiento TEXT,
      tituloBachiller TEXT,
      semanaSalida INTEGER,
      fechaSalida TEXT,
      estado TEXT DEFAULT 'ACTIVO',
      createdAt TEXT,
      updatedAt TEXT
    )
  `);

  console.log('Database tables created successfully');
}

// ─── Migrations (idempotent — safe to run on existing databases) ───────────────

async function runMigrations(db: DbAdapter): Promise<void> {
  try {
    // ADD COLUMN IF NOT EXISTS — safe to run repeatedly on existing deployments
    const addCols: [table: string, col: string, def: string][] = [
      // users
      ['users', 'nombre',      'TEXT'],
      ['users', 'roleId',      'TEXT'],
      ['users', 'status',      "TEXT DEFAULT 'active'"],
      ['users', 'lastLoginAt', 'TEXT'],
      ['users', 'employeeId',  'TEXT'],
      // employees
      ['employees', 'laborId',         'TEXT'],
      ['employees', 'mayordomoId',      'TEXT'],
      ['employees', 'hijos',            'INTEGER'],
      ['employees', 'nivelAcademico',   'TEXT'],
      ['employees', 'especialidad',     'TEXT'],
      ['employees', 'afiliacion',       'TEXT'],
      ['employees', 'estadoCivilId',    'TEXT'],
      ['employees', 'contratoTipoId',   'TEXT'],
      ['employees', 'contratoActualId', 'TEXT'],
      ['employees', 'afiliacionId',     'TEXT'],
      // payroll
      ['payroll', 'quincena', 'REAL DEFAULT 0'],
      // departmentScheduleConfig
      ['departmentScheduleConfig', 'positionId', 'TEXT'],
      ['departmentScheduleConfig', 'workHours',  'REAL DEFAULT 9'],
      // tasks
      ['tasks', 'completedAt',          'TEXT'],
      ['tasks', 'recurringTaskId',       'TEXT'],
      ['tasks', 'isRecurringInstance',   'INTEGER DEFAULT 0'],
      // leaves
      ['leaves', 'submittedBy', 'TEXT'],
      // notification_schedules
      ['notification_schedules', 'recipientEmail', 'TEXT'],
      // maestro_general
      ['maestro_general', 'centroDeCostoId',  'TEXT'],
      ['maestro_general', 'laborId',          'TEXT'],
      ['maestro_general', 'tipoTrabajadorId', 'TEXT'],
    ];

    for (const [table, col, def] of addCols) {
      try {
        await db.exec(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${def}`);
      } catch (e: any) {
        // Silently skip (column or table might not exist yet in edge cases)
        if (!e.message?.includes('already exists')) {
          console.error(`Migration warning — ALTER TABLE ${table} ADD COLUMN ${col}:`, e.message);
        }
      }
    }

    // Seed default admin user
    try {
      const userCount = await db.get<{ count: string }>(`SELECT COUNT(*) as count FROM users`);
      if (userCount && Number(userCount.count) === 0) {
        const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin123!';
        const hashed = await bcrypt.hash(adminPassword, 10);
        const now = new Date().toISOString();
        await db.run(
          `INSERT INTO users (id, username, password, email, nombre, role, roleId, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), 'admin', hashed, 'admin@bexhris.com', 'Administrador', 'admin', 'role-admin', 'active', now, now],
        );
        console.log(`Default admin user created — usuario: admin, contraseña: ${adminPassword}`);
      }
    } catch (e) {
      console.error('Error seeding admin user:', e);
    }

    // Seed default company settings
    try {
      const existing = await db.get(`SELECT key FROM app_settings WHERE key = 'company'`);
      if (!existing) {
        await db.run(
          `INSERT INTO app_settings (key, value) VALUES (?, ?)`,
          ['company', JSON.stringify({
            name:    'BIOEXPORTVAL S.A.S.',
            address: 'SEGUNDA OESTE 205A Y AV PRINC / SAMBORONDON',
            ruc:     '0992989464001',
          })],
        );
      }
    } catch (e) {
      console.error('Error seeding company settings:', e);
    }

    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
  }
}

// ─── Indexes ──────────────────────────────────────────────────────────────────

async function createIndexes(db: DbAdapter): Promise<void> {
  try {
    const idxs: [name: string, table: string, cols: string][] = [
      ['idx_employees_email',           'employees',             'email'],
      ['idx_employees_cedula',          'employees',             'cedula'],
      ['idx_employees_departmentId',    'employees',             'departmentId'],
      ['idx_employees_positionId',      'employees',             'positionId'],
      ['idx_employees_status',          'employees',             'status'],
      ['idx_employees_contractEndDate', 'employees',             'contractEndDate'],
      ['idx_attendance_employeeId',     'attendance',            'employeeId'],
      ['idx_attendance_date',           'attendance',            'date'],
      ['idx_attendance_status',         'attendance',            'status'],
      ['idx_attendance_empId_date',     'attendance',            'employeeId, date'],
      ['idx_marcacion_cedula',          'marcacion',             'cedula'],
      ['idx_marcacion_date',            'marcacion',             'date'],
      ['idx_marcacion_month',           'marcacion',             'month'],
      ['idx_marcacion_cedula_date',     'marcacion',             'cedula, date'],
      ['idx_leaves_employeeId',         'leaves',                'employeeId'],
      ['idx_leaves_status',             'leaves',                'status'],
      ['idx_leaves_startDate',          'leaves',                'startDate'],
      ['idx_leaves_endDate',            'leaves',                'endDate'],
      ['idx_social_cases_employeeId',   'social_cases',          'employeeId'],
      ['idx_social_cases_status',       'social_cases',          'status'],
      ['idx_payroll_employeeId',        'payroll',               'employeeId'],
      ['idx_payroll_year_month',        'payroll',               'year, month'],
      ['idx_payroll_status',            'payroll',               'status'],
      ['idx_documents_employeeId',      'documents',             'employeeId'],
      ['idx_documents_type',            'documents',             'documentType'],
      ['idx_documents_expiryDate',      'documents',             'expiryDate'],
      ['idx_tasks_status',              'tasks',                 'status'],
      ['idx_tasks_dueDate',             'tasks',                 'dueDate'],
      ['idx_tasks_assignedTo',          'tasks',                 'assignedTo'],
      ['idx_tasks_priority',            'tasks',                 'priority'],
      ['idx_notif_sched_type',          'notification_schedules','type'],
      ['idx_notif_sched_enabled',       'notification_schedules','enabled'],
      ['idx_audit_logs_userId',         'audit_logs',            'userId'],
      ['idx_audit_logs_entityType',     'audit_logs',            'entityType'],
      ['idx_audit_logs_createdAt',      'audit_logs',            'createdAt'],
    ];

    for (const [name, table, cols] of idxs) {
      await db.exec(`CREATE INDEX IF NOT EXISTS ${name} ON ${table}(${cols})`);
    }

    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
}
