import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import EmployeeService from './EmployeeService';
import PositionService from './PositionService';
import DepartmentService from './DepartmentService';
import LaborService from './LaborService';
import { getDatabase } from '@config/database';
import logger from '@utils/logger';
import type { Employee } from '../types';

export class BulkUploadService {
  async processEmployeeFile(fileBuffer: Buffer, fileName: string, status: string = 'active'): Promise<{
    processedCount: number;
    createdCount: number;
    updatedCount: number;
    errors: Array<{ row: number; error: string }>;
    data: Employee[];
  }> {
    try {
      const errors: Array<{ row: number; error: string }> = [];
      const processedEmployees: Employee[] = [];
      let createdCount = 0;
      let updatedCount = 0;

      logger.info(`Processing employee file: ${fileName}, Status: ${status}`);

      // Parse XLSX
      const wb = XLSX.read(fileBuffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

      if (rows.length === 0) {
        throw new Error('El archivo está vacío o no tiene datos');
      }

      logger.info(`XLSX Headers detected: ${JSON.stringify(Object.keys(rows[0]))}`);

      // Procesar cada fila
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        try {
          const row = rows[rowIndex];

          const lastName = this.toUpperCase(String(row['Apellidos'] ?? ''));
          const firstName = this.toUpperCase(String(row['Nombres'] ?? ''));
          let cedula = String(row['Cedula'] ?? '').trim();

          // Normalizar cédula: si tiene 9 dígitos, agregar 0 al inicio
          const cedulaDigits = cedula.replace(/\D/g, '');
          if (cedulaDigits.length === 9) {
            cedula = '0' + cedulaDigits;
          } else if (cedulaDigits.length === 10) {
            cedula = cedulaDigits;
          }

          if (!lastName || !firstName || !cedula) continue; // skip empty rows

          const contratoTipo = this.toUpperCase(String(row['TipoContrato'] ?? ''));
          const contratoActual = this.toUpperCase(String(row['ContratoActual'] ?? ''));
          const positionName = this.toUpperCase(String(row['Cargo'] ?? ''));
          const laborName = this.toUpperCase(String(row['Labor'] ?? ''));
          const departmentName = this.toUpperCase(String(row['CentroDeCosto'] ?? ''));
          const baseSalary = typeof row['Sueldo'] === 'number' ? row['Sueldo'] : parseFloat(String(row['Sueldo'] ?? '0').replace(/[$,\s]/g, '')) || 0;
          const dateOfBirth = String(row['FechaNacimiento'] ?? '');
          const genero = String(row['Genero'] ?? 'M').toUpperCase();
          const hireDate = String(row['FechaIngreso'] ?? '');
          const estadoCivil = this.toUpperCase(String(row['EstadoCivil'] ?? ''));
          const procedencia = this.toUpperCase(String(row['Procedencia'] ?? ''));
          const direccion = this.toUpperCase(String(row['Direccion'] ?? ''));
          const contractEndDate = String(row['FechaTerminacionContrato'] ?? '');
          const emailFromXlsx = String(row['Email'] ?? '').trim();
          const email = emailFromXlsx.length > 0 ? emailFromXlsx.toLowerCase() : undefined;
          const phone = String(row['Telefono'] ?? '');
          const hijos = parseInt(String(row['Hijos'] ?? '0')) || undefined;
          const nivelAcademico = String(row['NivelAcademico'] ?? '').trim() || undefined;
          const especialidad = String(row['Especialidad'] ?? '').trim() || undefined;

          // Validar datos requeridos
          if (!lastName || !firstName || !cedula) {
            errors.push({ row: rowIndex + 1, error: 'Apellidos, Nombres y Cédula son requeridos' });
            continue;
          }

          // Obtener o crear departamento
          const departments = await DepartmentService.getAllDepartments();
          let department = departments.find((d: any) => d.name.toUpperCase() === departmentName);
          if (!department) {
            department = await DepartmentService.createDepartment(departmentName, '');
          }

          // Obtener o crear posición (Cargo) - DEBE pertenecer al departamento correcto
          const positions = await PositionService.getAllPositions();
          let position = positions.find((p: any) => 
            p.name.toUpperCase() === positionName && p.departmentId === department.id
          );
          if (!position) {
            position = await PositionService.createPosition(
              positionName,
              department.id,
              '',
              0,
              0
            );
          }

          // Obtener o crear labor
          let labor = null;
          if (laborName) {
            const labors = await LaborService.getLabors();
            labor = labors.find((l: any) => l.name.toUpperCase() === laborName);
            if (!labor) {
              labor = await LaborService.createLabor(laborName, '', position.id);
            }
          }

          // Upsert catalog items and get IDs
          const afiliacion = this.toUpperCase(String(row['Afiliacion'] ?? ''));
          let estadoCivilId: string | undefined;
          let contratoTipoId: string | undefined;
          let contratoActualId: string | undefined;
          let afiliacionId: string | undefined;
          if (estadoCivil) estadoCivilId = await this.upsertCatalog('estado_civil', estadoCivil);
          if (contratoTipo) contratoTipoId = await this.upsertCatalog('tipo_contrato', contratoTipo);
          if (contratoActual) contratoActualId = await this.upsertCatalog('contrato_actual', contratoActual);
          if (afiliacion) afiliacionId = await this.upsertCatalog('afiliacion', afiliacion);

          // Preparar datos del empleado
          const genderValue: 'M' | 'F' | 'O' = genero === 'F' ? 'F' : genero === 'M' ? 'M' : 'O';
          const employeeStatus: 'active' | 'inactive' = status === 'inactive' ? 'inactive' : 'active';
          const employeeData = {
            firstName,
            lastName,
            email,
            cedula,
            phone: phone || undefined,
            departmentId: department.id,
            positionId: position.id,
            laborId: labor?.id,
            hireDate: this.formatDate(hireDate),
            baseSalary,
            dateOfBirth: this.formatDate(dateOfBirth),
            genero: genderValue,
            estadoCivil,
            estadoCivilId,
            procedencia,
            direccion,
            contratoTipo,
            contratoTipoId,
            contratoActual,
            contratoActualId,
            afiliacion,
            afiliacionId,
            contractEndDate: contractEndDate ? this.formatDate(contractEndDate) : undefined,
            status: employeeStatus,
            hijos,
            nivelAcademico,
            especialidad,
          };

          try {
            // Usar UPSERT: actualizar si existe, crear si no
            const existingEmployee = await EmployeeService.getEmployeeByCedula(cedula);
            
            if (existingEmployee) {
              // Actualizar empleado existente
              await EmployeeService.updateEmployee(existingEmployee.id, employeeData);
              updatedCount++;
              logger.info(`Employee updated: ${cedula}`);
            } else {
              // Crear nuevo empleado
              const employee = await EmployeeService.createEmployee(employeeData);
              createdCount++;
              logger.info(`Employee created: ${cedula}`);
              processedEmployees.push(employee);
            }
          } catch (createError) {
            logger.error(`Error upserting employee at row ${rowIndex + 1}:`, {
              employeeData,
              error: createError
            });
            errors.push({
              row: rowIndex + 1,
              error: `Error procesando empleado: ${createError instanceof Error ? createError.message : 'Error desconocido'}`
            });
          }
        } catch (error) {
          logger.error(`Error processing row ${rowIndex + 1}:`, error);
          errors.push({
            row: rowIndex + 1,
            error: error instanceof Error ? error.message : 'Error procesando fila'
          });
        }
      }

      return {
        processedCount: createdCount + updatedCount,
        createdCount,
        updatedCount,
        errors,
        data: processedEmployees,
      };
    } catch (error) {
      logger.error('Error processing employee file', error);
      throw error;
    }
  }

  private async upsertCatalog(type: string, value: string): Promise<string> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO catalogs (id, type, value, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
      [id, type, value, now, now]
    );
    const row = await db.get('SELECT id FROM catalogs WHERE type = ? AND value = ?', [type, value]);
    return row.id;
  }

  private toUpperCase(data: any): any {
    if (typeof data === 'string') {
      return data.toUpperCase();
    }
    if (typeof data === 'object' && data !== null) {
      const result: any = {};
      for (const key in data) {
        if (typeof data[key] === 'string') {
          result[key] = data[key].toUpperCase();
        } else {
          result[key] = data[key];
        }
      }
      return result;
    }
    return data;
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    // Intentar parsear diferentes formatos de fecha
    const formats = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY o DD/MM/YYYY
      /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
      /(\d{1,2})-(\d{1,2})-(\d{4})/, // DD-MM-YYYY
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        let year, month, day;
        if (format.source.includes('4')) {
          // YYYY-MM-DD o DD-MM-YYYY
          if (parseInt(match[1]) > 31) {
            year = match[1];
            month = match[2];
            day = match[3];
          } else {
            day = match[1];
            month = match[2];
            year = match[3];
          }
        } else {
          // MM/DD/YYYY o DD/MM/YYYY - asumir DD/MM/YYYY
          day = match[1];
          month = match[2];
          year = match[3];
        }
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }

    return new Date().toISOString().split('T')[0];
  }

  private mapContractType(contractStr: string): 'indefinite' | 'fixed' | 'temporary' | 'intern' {
    const upper = contractStr.toUpperCase();
    if (upper.includes('INDEFINIDO') || upper.includes('PERMANENTE')) return 'indefinite';
    if (upper.includes('PLAZO') || upper.includes('FIJO')) return 'fixed';
    if (upper.includes('TEMPORAL')) return 'temporary';
    if (upper.includes('PRACTICANTE') || upper.includes('INTERN')) return 'intern';
    return 'indefinite';
  }

  private mapMaritalStatus(statusStr: string): 'SOLTERO' | 'CASADO' | 'DIVORCIADO' | 'VIUDO' {
    const upper = statusStr.toUpperCase();
    if (upper.includes('SOLTERO')) return 'SOLTERO';
    if (upper.includes('CASADO')) return 'CASADO';
    if (upper.includes('DIVORCIADO')) return 'DIVORCIADO';
    if (upper.includes('VIUDO')) return 'VIUDO';
    return 'SOLTERO';
  }

  async processRolesFile(fileBuffer: Buffer, fileName: string): Promise<{
    processedCount: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    try {
      const errors: Array<{ row: number; error: string }> = [];
      let processedCount = 0;

      // Aquí se procesaría el archivo Excel/CSV para roles
      // Por ahora, retornamos una estructura básica

      logger.info(`Processing roles file: ${fileName}`);

      return {
        processedCount,
        errors,
      };
    } catch (error) {
      logger.error('Error processing roles file', error);
      throw error;
    }
  }

  private validateEmployeeData(data: any): { valid: boolean; error?: string } {
    const requiredFields = ['lastName', 'firstName', 'email', 'cedula', 'departmentId', 'positionId'];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        return { valid: false, error: `Campo requerido faltante: ${field}` };
      }
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return { valid: false, error: 'Email inválido' };
    }

    return { valid: true };
  }
}

export default new BulkUploadService();
