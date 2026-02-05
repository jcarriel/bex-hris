import { getDatabase } from '@config/database';
import { v4 as uuidv4 } from 'uuid';

interface DepartmentScheduleConfig {
  id: string;
  departmentId: string;
  positionId?: string;
  entryTimeMin: string;
  entryTimeMax: string;
  exitTimeMin: string;
  exitTimeMax: string;
  totalTimeMin: number;
  totalTimeMax: number;
  workHours: number;
  createdAt: string;
  updatedAt: string;
}

class DepartmentScheduleService {
  // Crear o actualizar configuración de horario para un departamento
  async createOrUpdate(departmentId: string, config: Omit<DepartmentScheduleConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<DepartmentScheduleConfig> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const existing = await this.getByDepartmentId(departmentId);

    if (existing) {
      await db.run(
        `UPDATE departmentScheduleConfig
         SET entryTimeMin = ?, entryTimeMax = ?, exitTimeMin = ?, exitTimeMax = ?,
             totalTimeMin = ?, totalTimeMax = ?, positionId = ?, workHours = ?, updatedAt = ?
         WHERE departmentId = ?`,
        [
          config.entryTimeMin,
          config.entryTimeMax,
          config.exitTimeMin,
          config.exitTimeMax,
          config.totalTimeMin,
          config.totalTimeMax,
          config.positionId || null,
          config.workHours || 9,
          now,
          departmentId,
        ]
      );
      return (await this.getByDepartmentId(departmentId))!;
    } else {
      const id = uuidv4();
      await db.run(
        `INSERT INTO departmentScheduleConfig
         (id, departmentId, positionId, entryTimeMin, entryTimeMax, exitTimeMin, exitTimeMax, totalTimeMin, totalTimeMax, workHours, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          departmentId,
          config.positionId || null,
          config.entryTimeMin,
          config.entryTimeMax,
          config.exitTimeMin,
          config.exitTimeMax,
          config.totalTimeMin,
          config.totalTimeMax,
          config.workHours || 9,
          now,
          now,
        ]
      );
      return (await this.getById(id))!;
    }
  }

  // Obtener configuración por ID
  async getById(id: string): Promise<DepartmentScheduleConfig | null> {
    const db = getDatabase();
    const result = await db.get('SELECT * FROM departmentScheduleConfig WHERE id = ?', [id]);
    return (result as DepartmentScheduleConfig) || null;
  }

  // Obtener configuración por departamento
  async getByDepartmentId(departmentId: string): Promise<DepartmentScheduleConfig | null> {
    const db = getDatabase();
    const result = await db.get('SELECT * FROM departmentScheduleConfig WHERE departmentId = ?', [departmentId]);
    return (result as DepartmentScheduleConfig) || null;
  }

  // Obtener todas las configuraciones
  async getAll(): Promise<DepartmentScheduleConfig[]> {
    const db = getDatabase();
    return db.all('SELECT * FROM departmentScheduleConfig ORDER BY createdAt DESC');
  }

  // Obtener configuración con datos del departamento
  async getAllWithDepartments(): Promise<(DepartmentScheduleConfig & { departmentName: string })[]> {
    const db = getDatabase();
    return db.all(`
      SELECT dsc.*, d.name as departmentName
      FROM departmentScheduleConfig dsc
      LEFT JOIN departments d ON dsc.departmentId = d.id
      ORDER BY d.name ASC
    `);
  }

  // Eliminar configuración
  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.run('DELETE FROM departmentScheduleConfig WHERE id = ?', [id]);
    return (result.changes ?? 0) > 0;
  }

  // Obtener configuración con valores por defecto si no existe
  async getWithDefaults(departmentId: string): Promise<DepartmentScheduleConfig> {
    const existing = await this.getByDepartmentId(departmentId);
    if (existing) {
      return existing;
    }
    // Retornar valores por defecto
    return {
      id: '',
      departmentId,
      positionId: undefined,
      entryTimeMin: '06:30',
      entryTimeMax: '07:30',
      exitTimeMin: '15:30',
      exitTimeMax: '16:30',
      totalTimeMin: 15,
      totalTimeMax: 15,
      workHours: 9,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

export default DepartmentScheduleService;
