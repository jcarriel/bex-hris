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
      email: employee.email || `emp-${uniqueSuffix}@temp.local`,
      cedula: employee.cedula || `TEMP${uniqueSuffix}`,
      departmentId: employee.departmentId || '',
      positionId: employee.positionId || '',
      hireDate: employee.hireDate || now.split('T')[0],
      contractType: employee.contractType || 'indefinite',
      baseSalary: employee.baseSalary || 0,
      employeeNumber: employee.employeeNumber || `EMP-${uniqueSuffix}`,
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
    
    insertFields.push('email');
    insertValues.push(employeeData.email || `${id}@temp.local`);
    
    insertFields.push('cedula');
    insertValues.push(employeeData.cedula || `TEMP${id.substring(0, 8)}`);
    
    insertFields.push('departmentId');
    insertValues.push(employeeData.departmentId || '');
    
    insertFields.push('positionId');
    insertValues.push(employeeData.positionId || '');
    
    insertFields.push('hireDate');
    insertValues.push(employeeData.hireDate || now.split('T')[0]);
    
    insertFields.push('contractType');
    insertValues.push(employeeData.contractType || 'indefinite');
    
    insertFields.push('baseSalary');
    insertValues.push(employeeData.baseSalary || 0);
    
    insertFields.push('employeeNumber');
    insertValues.push(employeeData.employeeNumber || `EMP-${id.substring(0, 8)}`);
    
    insertFields.push('status');
    insertValues.push(employeeData.status || 'active');

    // Campos opcionales
    const optionalFields = ['personalEmail', 'phone', 'personalPhone', 'dateOfBirth', 'gender', 'maritalStatus', 'nationality', 'address', 'currentContract', 'managerId'];
    
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
    return db.get('SELECT * FROM employees WHERE id = ?', [id]) || null;
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

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          whereClause += ` AND ${key} = ?`;
          values.push(value);
        }
      });
    }

    const total = await db.get(
      `SELECT COUNT(*) as count FROM employees WHERE ${whereClause}`,
      values
    );

    const data = await db.all(
      `SELECT * FROM employees WHERE ${whereClause} ORDER BY firstName LIMIT ? OFFSET ?`,
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
       WHERE contractType = 'fixed' 
       AND contractEndDate IS NOT NULL 
       AND contractEndDate <= ? 
       AND status = 'active'
       ORDER BY contractEndDate`,
      [futureDate.toISOString().split('T')[0]]
    );
  }
}

export default new EmployeeRepository();
