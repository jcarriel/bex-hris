import { getDatabase } from '@config/database';
import type { Employee, PaginationParams, PaginatedResponse } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class EmployeeRepository {
  async create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    // Asegurar que los campos requeridos tengan valores
    const uniqueSuffix = id.substring(0, 8);
    const employeeData = {
      ...employee,
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      email: employee.email && employee.email.trim() !== '' ? employee.email.trim() : null,
      cedula: employee.cedula || `TEMP${uniqueSuffix}`,
      departmentId: employee.departmentId || '',
      positionId: employee.positionId || '',
      hireDate: employee.hireDate || now.split('T')[0],
      contratoTipo: employee.contratoTipo || '',
      baseSalary: employee.baseSalary || 0,
      status: employee.status || 'active',
    };

    // Construir INSERT statement de forma segura
    const insertFields: string[] = [];
    const insertValues: any[] = [];

    // Campos requeridos con valores por defecto
    insertFields.push('id');
    insertValues.push(id);
    
    insertFields.push('firstName');
    insertValues.push(employeeData.firstName || '');
    
    insertFields.push('lastName');
    insertValues.push(employeeData.lastName || '');
    
    if (employeeData.email !== null && employeeData.email !== undefined) {
      insertFields.push('email');
      insertValues.push(employeeData.email);
    }
    
    insertFields.push('cedula');
    insertValues.push(employeeData.cedula || `TEMP${id.substring(0, 8)}`);
    
    insertFields.push('departmentId');
    insertValues.push(employeeData.departmentId || '');
    
    insertFields.push('positionId');
    insertValues.push(employeeData.positionId || '');
    
    insertFields.push('hireDate');
    insertValues.push(employeeData.hireDate || now.split('T')[0]);
    
    insertFields.push('contratoTipo');
    insertValues.push(employeeData.contratoTipo || '');

    insertFields.push('baseSalary');
    insertValues.push(employeeData.baseSalary || 0);

    insertFields.push('status');
    insertValues.push(employeeData.status || 'active');

    // Campos opcionales
    const optionalFields = ['phone', 'dateOfBirth', 'genero', 'estadoCivil', 'procedencia', 'direccion', 'contratoActual', 'contractEndDate', 'laborId', 'managerId', 'hijos', 'nivelAcademico', 'especialidad', 'afiliacion', 'estadoCivilId', 'contratoTipoId', 'contratoActualId', 'afiliacionId'];
    
    optionalFields.forEach(field => {
      const value = (employeeData as any)[field];
      if (value !== undefined && value !== null && value !== '') {
        insertFields.push(field);
        insertValues.push(value);
      }
    });

    insertFields.push('createdAt');
    insertValues.push(now);
    
    insertFields.push('updatedAt');
    insertValues.push(now);

    const placeholders = insertFields.map(() => '?').join(', ');

    try {
      await db.run(
        `INSERT INTO employees (${insertFields.join(', ')}) VALUES (${placeholders})`,
        insertValues
      );
    } catch (error) {
      console.error('Error inserting employee:', { 
        id, 
        fields: insertFields, 
        values: insertValues,
        error 
      });
      throw error;
    }

    return this.findById(id) as Promise<Employee>;
  }

  async findById(id: string): Promise<Employee | null> {
    const db = getDatabase();
    const row = await db.get(`
      SELECT e.*,
        cc.name AS departmentName,
        c.name  AS positionName,
        l.name  AS laborName,
        COALESCE(ec.value, e.estadoCivil)    AS estadoCivil,
        COALESCE(ct.value, e.contratoTipo)   AS contratoTipo,
        COALESCE(ca.value, e.contratoActual) AS contratoActual,
        COALESCE(af.value, e.afiliacion)     AS afiliacion
      FROM employees e
      LEFT JOIN centros_costo cc ON e.departmentId     = cc.id
      LEFT JOIN cargos        c  ON e.positionId       = c.id
      LEFT JOIN labores        l  ON e.laborId         = l.id
      LEFT JOIN catalogs      ec ON e.estadoCivilId    = ec.id AND ec.type = 'estado_civil'
      LEFT JOIN catalogs      ct ON e.contratoTipoId   = ct.id AND ct.type = 'tipo_contrato'
      LEFT JOIN catalogs      ca ON e.contratoActualId = ca.id AND ca.type = 'contrato_actual'
      LEFT JOIN catalogs      af ON e.afiliacionId     = af.id AND af.type = 'afiliacion'
      WHERE e.id = ?
    `, [id]);
    return row || null;
  }

  async findByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    const db = getDatabase();
    return db.get('SELECT * FROM employees WHERE employeeNumber = ?', [employeeNumber]) || null;
  }

  async findByCedula(cedula: string): Promise<Employee | null> {
    const db = getDatabase();
    
    // Normalizar cédula: solo dígitos
    const normalizedCedula = cedula.trim().replace(/\D/g, '');
    
    // Buscar con búsqueda flexible ignorando ceros al inicio
    const result = db.get(
      'SELECT * FROM employees WHERE REPLACE(cedula, "0", "") = REPLACE(?, "0", "")',
      [normalizedCedula]
    );
    
    return result || null;
  }

  async upsert(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee> {
    const db = getDatabase();
    const existingEmployee = await this.findByCedula(employee.cedula);

    if (existingEmployee) {
      // Actualizar empleado existente
      return this.update(existingEmployee.id, employee) as Promise<Employee>;
    } else {
      // Crear nuevo empleado
      return this.create(employee);
    }
  }

  async findByDepartment(departmentId: string): Promise<Employee[]> {
    const db = getDatabase();
    return db.all('SELECT * FROM employees WHERE departmentId = ? ORDER BY firstName', [
      departmentId,
    ]);
  }

  async findByManager(managerId: string): Promise<Employee[]> {
    const db = getDatabase();
    return db.all('SELECT * FROM employees WHERE managerId = ? ORDER BY firstName', [managerId]);
  }

  async findByStatus(status: string): Promise<Employee[]> {
    const db = getDatabase();
    return db.all('SELECT * FROM employees WHERE status = ? ORDER BY firstName', [status]);
  }

  async getPaginated(
    params: PaginationParams,
    filters?: Record<string, unknown>
  ): Promise<PaginatedResponse<Employee>> {
    const db = getDatabase();

    let whereClause = '1=1';
    const values: unknown[] = [];

    const search = filters?.search as string | undefined;

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (key === 'search') return;
        if (value !== undefined && value !== null) {
          whereClause += ` AND e.${key} = ?`;
          values.push(value);
        }
      });
    }

    if (search) {
      whereClause += ` AND (e.firstName LIKE ? OR e.lastName LIKE ? OR e.cedula LIKE ?)`;
      const q = `%${search}%`;
      values.push(q, q, q);
    }

    const total = await db.get(
      `SELECT COUNT(*) as count FROM employees e WHERE ${whereClause}`,
      values
    );

    const data = await db.all(
      `SELECT e.*,
         cc.name AS departmentName,
         c.name  AS positionName,
         l.name  AS laborName,
         COALESCE(ec.value, e.estadoCivil)    AS estadoCivil,
         COALESCE(ct.value, e.contratoTipo)   AS contratoTipo,
         COALESCE(ca.value, e.contratoActual) AS contratoActual,
         COALESCE(af.value, e.afiliacion)     AS afiliacion
       FROM employees e
       LEFT JOIN centros_costo cc ON e.departmentId     = cc.id
       LEFT JOIN cargos        c  ON e.positionId       = c.id
       LEFT JOIN labores        l  ON e.laborId         = l.id
       LEFT JOIN catalogs      ec ON e.estadoCivilId    = ec.id AND ec.type = 'estado_civil'
       LEFT JOIN catalogs      ct ON e.contratoTipoId   = ct.id AND ct.type = 'tipo_contrato'
       LEFT JOIN catalogs      ca ON e.contratoActualId = ca.id AND ca.type = 'contrato_actual'
       LEFT JOIN catalogs      af ON e.afiliacionId     = af.id AND af.type = 'afiliacion'
       WHERE ${whereClause}
       ORDER BY e.firstName LIMIT ? OFFSET ?`,
      [...values, params.limit, params.offset]
    );

    return {
      data,
      total: total.count,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total.count / params.limit),
    };
  }

  async update(id: string, data: Partial<Employee>): Promise<Employee | null> {
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
      `UPDATE employees SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.run('DELETE FROM employees WHERE id = ?', [id]);
    return result.changes > 0;
  }

  async getAll(): Promise<Employee[]> {
    const db = getDatabase();
    return db.all('SELECT * FROM employees ORDER BY firstName');
  }

  async getActiveEmployees(): Promise<Employee[]> {
    const db = getDatabase();
    return db.all("SELECT * FROM employees WHERE status = 'active' ORDER BY firstName");
  }

  async getInactiveEmployees(): Promise<Employee[]> {
    const db = getDatabase();
    return db.all("SELECT * FROM employees WHERE status != 'active' ORDER BY firstName");
  }

  async getEmployeesByHireDateRange(startDate: string, endDate: string): Promise<Employee[]> {
    const db = getDatabase();
    return db.all(
      'SELECT * FROM employees WHERE hireDate BETWEEN ? AND ? ORDER BY hireDate',
      [startDate, endDate]
    );
  }

  async getEmployeesByTerminationDateRange(
    startDate: string,
    endDate: string
  ): Promise<Employee[]> {
    const db = getDatabase();
    return db.all(
      'SELECT * FROM employees WHERE terminationDate BETWEEN ? AND ? ORDER BY terminationDate',
      [startDate, endDate]
    );
  }

  async getEmployeesWithExpiringContracts(daysUntilExpiry: number): Promise<Employee[]> {
    const db = getDatabase();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysUntilExpiry);

    return db.all(
      `SELECT * FROM employees 
       WHERE contractEndDate IS NOT NULL 
       AND contractEndDate <= ? 
       AND status = 'active'
       ORDER BY contractEndDate`,
      [futureDate.toISOString().split('T')[0]]
    );
  }
}

export default new EmployeeRepository();
