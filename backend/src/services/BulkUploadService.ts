import EmployeeService from './EmployeeService';
import PositionService from './PositionService';
import DepartmentService from './DepartmentService';
import LaborService from './LaborService';
import logger from '@utils/logger';
import type { Employee } from '../types';

export class BulkUploadService {
  async processEmployeeFile(fileBuffer: Buffer, fileName: string): Promise<{
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

      logger.info(`Processing employee file: ${fileName}`);

      // Parse CSV
      const csvText = fileBuffer.toString('utf-8');
      const lines = csvText.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('El archivo está vacío o no tiene datos');
      }

      const headers = lines[0].split(',').map(h => h.trim());
      
      logger.info(`CSV Headers detected: ${JSON.stringify(headers)}`);
      
      // Mapeo de columnas esperadas
      const columnMap: Record<string, number> = {};
      const expectedColumns = [
        'Apellidos', 'Nombres', 'Cedula', 'TipoContrato', 'ContratoActual',
        'Cargo', 'Labor', 'CentroDeCosto', 'Sueldo', 'FechaNacimiento',
        'Edad', 'Genero', 'FechaIngreso', 'Mes', 'Año', 'EstadoCivil',
        'Procedencia', 'Direccion', 'FechaTerminacionContrato', 'Email', 'Telefono'
      ];

      headers.forEach((header, index) => {
        columnMap[header] = index;
      });
      
      logger.info(`Column map: ${JSON.stringify(columnMap)}`);

      // Procesar cada fila
      for (let rowIndex = 1; rowIndex < lines.length; rowIndex++) {
        try {
          const values = lines[rowIndex].split(',').map(v => v.trim());
          
          if (values.length < 3 || !values[0]) continue; // Skip empty rows

          const lastName = this.toUpperCase(values[columnMap['Apellidos']] || '');
          const firstName = this.toUpperCase(values[columnMap['Nombres']] || '');
          let cedula = this.toUpperCase(values[columnMap['Cedula']] || '');
          
          // Normalizar cédula: si tiene 9 dígitos, agregar 0 al inicio
          const cedulaDigits = cedula.replace(/\D/g, '');
          if (cedulaDigits.length === 9) {
            cedula = '0' + cedulaDigits;
          } else if (cedulaDigits.length === 10) {
            cedula = cedulaDigits;
          }
          
          const contractType = this.toUpperCase(values[columnMap['TipoContrato']] || 'indefinite');
          const currentContract = this.toUpperCase(values[columnMap['ContratoActual']] || '');
          const positionName = this.toUpperCase(values[columnMap['Cargo']] || '');
          const laborName = this.toUpperCase(values[columnMap['Labor']] || '');
          const departmentName = this.toUpperCase(values[columnMap['CentroDeCosto']] || '');
          const salaryStr = values[columnMap['Sueldo']] || '0';
          const baseSalary = parseFloat(salaryStr.replace(/[$,]/g, '')) || 0;
          const dateOfBirth = values[columnMap['FechaNacimiento']] || '';
          const gender = (values[columnMap['Genero']] || 'M').toUpperCase();
          const hireDate = values[columnMap['FechaIngreso']] || new Date().toISOString().split('T')[0];
          const maritalStatus = this.toUpperCase(values[columnMap['EstadoCivil']] || 'single');
          const address = this.toUpperCase(values[columnMap['Procedencia']] || '');
          const contractEndDate = values[columnMap['FechaTerminacionContrato']] || '';
          const emailFromCsv = values[columnMap['Email']]?.trim();
          const email = emailFromCsv && emailFromCsv.length > 0 ? emailFromCsv.toLowerCase() : `emp${cedula}@temp.local`;
          const phone = values[columnMap['Telefono']] || '';

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

          // Obtener o crear posición (Cargo)
          const positions = await PositionService.getAllPositions();
          let position = positions.find((p: any) => p.name.toUpperCase() === positionName);
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
            const labors = LaborService.getLabors();
            labor = labors.find((l: any) => l.name.toUpperCase() === laborName);
            if (!labor) {
              labor = LaborService.createLabor(laborName, '', position.id);
            }
          }

          // Preparar datos del empleado
          const genderValue: 'M' | 'F' | 'O' = gender === 'F' ? 'F' : gender === 'M' ? 'M' : 'O';
          const employeeData = {
            firstName,
            lastName,
            email,
            personalEmail: email,
            cedula,
            phone: phone || '',
            personalPhone: phone || '',
            departmentId: department.id,
            positionId: position.id,
            laborId: labor?.id,
            hireDate: this.formatDate(hireDate),
            baseSalary,
            dateOfBirth: this.formatDate(dateOfBirth),
            gender: genderValue,
            maritalStatus: this.mapMaritalStatus(maritalStatus),
            nationality: address,
            address,
            contractType: this.mapContractType(contractType),
            currentContract: currentContract || '',
            contractEndDate: contractEndDate ? this.formatDate(contractEndDate) : undefined,
            employeeNumber: `EMP-${cedula}`,
            status: 'active' as const,
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

  private mapMaritalStatus(statusStr: string): 'single' | 'married' | 'divorced' | 'widowed' {
    const upper = statusStr.toUpperCase();
    if (upper.includes('SOLTERO')) return 'single';
    if (upper.includes('CASADO')) return 'married';
    if (upper.includes('DIVORCIADO')) return 'divorced';
    if (upper.includes('VIUDO')) return 'widowed';
    return 'single';
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
