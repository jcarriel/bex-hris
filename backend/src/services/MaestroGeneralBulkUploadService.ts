import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '@config/database';
import DepartmentService from '@services/DepartmentService';
import LaborService from '@services/LaborService';
import logger from '@utils/logger';

export interface MaestroGeneralResult {
  processedCount: number;
  createdCount: number;
  updatedCount: number;
  errors: Array<{ row: number; error: string }>;
}

class MaestroGeneralBulkUploadService {
  async processMaestroFile(fileBuffer: Buffer, fileName: string): Promise<MaestroGeneralResult> {
    const errors: Array<{ row: number; error: string }> = [];
    let createdCount = 0;
    let updatedCount = 0;

    logger.info(`Processing maestro general file: ${fileName}`);

    const wb = XLSX.read(fileBuffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

    if (rows.length === 0) throw new Error('El archivo está vacío o no tiene datos');

    logger.info(`Maestro headers: ${JSON.stringify(Object.keys(rows[0]))}`);

    const db = getDatabase();
    const now = new Date().toISOString();

    // Cache para evitar queries repetidas
    const deptCache:  Record<string, string> = {};
    const laborCache: Record<string, string> = {};
    const tipoCache:  Record<string, string> = {};

    const resolveTipo = async (value: string): Promise<string | null> => {
      if (!value) return null;
      const key = value.trim().toUpperCase();
      if (tipoCache[key]) return tipoCache[key];
      const existing = await db.get(
        "SELECT id FROM catalogs WHERE type = 'tipo_trabajador' AND UPPER(value) = ?", [key]
      ) as any;
      if (existing) { tipoCache[key] = existing.id; return existing.id; }
      const id = uuidv4();
      await db.run(
        'INSERT INTO catalogs (id, type, value, createdAt, updatedAt) VALUES (?,?,?,?,?)',
        [id, 'tipo_trabajador', key, now, now]
      );
      tipoCache[key] = id;
      return id;
    };

    const resolveDept = async (name: string): Promise<string | null> => {
      if (!name) return null;
      const key = name.trim().toUpperCase();
      if (deptCache[key]) return deptCache[key];
      const departments = await DepartmentService.getAllDepartments();
      let dept = departments.find((d: any) => d.name.toUpperCase() === key);
      if (!dept) dept = await DepartmentService.createDepartment(key, '');
      deptCache[key] = dept.id;
      return dept.id;
    };

    const resolveLabor = async (name: string): Promise<string | null> => {
      if (!name) return null;
      const key = name.trim().toUpperCase();
      if (laborCache[key]) return laborCache[key];
      const labors = await LaborService.getLabors();
      let labor = labors.find((l: any) => l.name.toUpperCase() === key);
      if (!labor) {
        // Insertar labor directamente sin cargo (positionId nullable para Maestro General)
        const id = uuidv4();
        await db.run(
          'INSERT INTO labores (id, name, description, positionId, createdAt, updatedAt) VALUES (?,?,?,?,?,?)',
          [id, key, null, null, now, now]
        );
        labor = { id, name: key, description: null, positionId: null, createdAt: now, updatedAt: now } as any;
      }
      laborCache[key] = labor.id;
      return labor.id;
    };

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];

        let cedula = String(row['Cedula'] ?? '').trim().replace(/\D/g, '');
        if (cedula.length === 9) cedula = '0' + cedula;

        const apellidos = String(row['Apellidos'] ?? '').trim().toUpperCase();
        const nombres   = String(row['Nombres']   ?? '').trim().toUpperCase();

        if (!cedula || (!apellidos && !nombres)) {
          errors.push({ row: i + 1, error: 'Cédula y nombre son requeridos' });
          continue;
        }

        const tipoTrabajadorRaw = String(row['TipoTrabajador'] ?? '').trim().toUpperCase();
        const centroDeCostoRaw  = String(row['CentroDeCosto'] ?? '').trim().toUpperCase();
        const laborRaw          = String(row['Labor'] ?? '').trim().toUpperCase();

        const tipoTrabajadorId = await resolveTipo(tipoTrabajadorRaw);
        const centroDeCostoId  = await resolveDept(centroDeCostoRaw);
        const laborId          = await resolveLabor(laborRaw);

        const record = {
          tipoTrabajadorId,
          fechaIngreso:    this.parseDate(String(row['FechaIngreso'] ?? '')),
          semanaIngreso:   parseInt(String(row['SemanaIngreso'] ?? '0')) || null,
          apellidos,
          nombres,
          cedula,
          centroDeCostoId,
          laborId,
          fechaNacimiento: this.parseDate(String(row['FechaNacimiento'] ?? '')),
          tituloBachiller: String(row['TituloBachiller'] ?? '').toUpperCase(),
          semanaSalida:    parseInt(String(row['SemanaSalida'] ?? '0')) || null,
          fechaSalida:     this.parseDate(String(row['FechaSalida'] ?? '')),
          estado:          String(row['Estado'] ?? 'ACTIVO').toUpperCase(),
        };

        const existing = await db.get('SELECT id FROM maestro_general WHERE cedula = ?', [cedula]);

        if (existing) {
          await db.run(
            `UPDATE maestro_general SET
              tipoTrabajadorId=?, fechaIngreso=?, semanaIngreso=?,
              apellidos=?, nombres=?, centroDeCostoId=?, laborId=?,
              fechaNacimiento=?, tituloBachiller=?, semanaSalida=?,
              fechaSalida=?, estado=?, updatedAt=?
            WHERE cedula=?`,
            [
              record.tipoTrabajadorId, record.fechaIngreso, record.semanaIngreso,
              record.apellidos, record.nombres, record.centroDeCostoId, record.laborId,
              record.fechaNacimiento, record.tituloBachiller, record.semanaSalida,
              record.fechaSalida, record.estado, now,
              cedula,
            ],
          );
          updatedCount++;
        } else {
          await db.run(
            `INSERT INTO maestro_general
              (id, tipoTrabajadorId, fechaIngreso, semanaIngreso,
               apellidos, nombres, cedula, centroDeCostoId, laborId,
               fechaNacimiento, tituloBachiller, semanaSalida,
               fechaSalida, estado, createdAt, updatedAt)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              uuidv4(),
              record.tipoTrabajadorId, record.fechaIngreso, record.semanaIngreso,
              record.apellidos, record.nombres, cedula, record.centroDeCostoId, record.laborId,
              record.fechaNacimiento, record.tituloBachiller, record.semanaSalida,
              record.fechaSalida, record.estado, now, now,
            ],
          );
          createdCount++;
        }
      } catch (err) {
        logger.error(`Error at row ${i + 1}`, err);
        errors.push({ row: i + 1, error: err instanceof Error ? err.message : 'Error desconocido' });
      }
    }

    return { processedCount: createdCount + updatedCount, createdCount, updatedCount, errors };
  }

  private parseDate(value: string): string | null {
    if (!value || value === '') return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const m = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return null;
  }
}

export default new MaestroGeneralBulkUploadService();
