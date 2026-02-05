import * as XLSX from 'xlsx';
import MarcacionRepository from '@repositories/MarcacionRepository';
import logger from '@utils/logger';
import type { Marcacion } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class AttendanceBulkUploadService {
  private monthNameToNumber(monthName: string): number {
    const months: { [key: string]: number } = {
      'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4,
      'MAYO': 5, 'JUNIO': 6, 'JULIO': 7, 'AGOSTO': 8,
      'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12,
      'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
      'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
      'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12,
    };
    return months[monthName] || parseInt(monthName) || 1;
  }

  async processAttendanceFile(fileBuffer: Buffer, fileName: string): Promise<{
    processedCount: number;
    createdCount: number;
    updatedCount: number;
    errors: Array<{ row: number; error: string }>;
    notFoundEmployees: Array<{ row: number; cedula: string; name: string }>;
    pendingRecords: Array<Omit<Marcacion, 'id' | 'createdAt' | 'updatedAt'>>;
    data: Array<Omit<Marcacion, 'id' | 'createdAt' | 'updatedAt'>>;
  }> {
    try {
      const errors: Array<{ row: number; error: string }> = [];
      const notFoundEmployees: Array<{ row: number; cedula: string; name: string }> = [];
      const processedRecords: Array<Omit<Marcacion, 'id' | 'createdAt' | 'updatedAt'>> = [];
      const pendingRecords: Array<Omit<Marcacion, 'id' | 'createdAt' | 'updatedAt'>> = [];
      let createdCount = 0;
      let updatedCount = 0;

      logger.info(`Processing attendance file: ${fileName}`);

      // Leer archivo XLSX
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      
      // Buscar la hoja "BASE", si no existe usar la primera hoja
      let sheetName = workbook.SheetNames[0];
      if (workbook.SheetNames.includes('BASE')) {
        sheetName = 'BASE';
      }
      
      logger.info(`Reading sheet: ${sheetName}`);
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (rows.length === 0) {
        throw new Error('El archivo está vacío o no tiene datos');
      }

      logger.info(`Found ${rows.length} rows in attendance file`);
      
      if (rows.length > 0) {
        const firstRow = rows[0] as any;
        logger.info(`Column names in file: ${JSON.stringify(Object.keys(firstRow))}`);
      }

      // Mapeo de columnas esperadas
      const columnMapping: { [key: string]: string } = {
        'No.': 'no',
        'Id del Empleado': 'cedula',
        'Nombres': 'employeeName',
        'Departamento': 'department',
        'Mes': 'month',
        'Fecha': 'date',
        'Asistencia Diaria': 'dailyAttendance',
        'Primera Marcación': 'firstCheckIn',
        'Última Marcación': 'lastCheckOut',
        'Tiempo Total': 'totalTime',
      };

      // Crear mapeo normalizado
      const normalizedColumnMapping: { [key: string]: string } = {};
      for (const [key, value] of Object.entries(columnMapping)) {
        const normalizedKey = key.replace(/\s+/g, '').toUpperCase();
        normalizedColumnMapping[normalizedKey] = value;
      }
      
      logger.info(`Normalized column mapping: ${JSON.stringify(normalizedColumnMapping)}`);

      // Procesar cada fila
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        try {
          const row = rows[rowIndex] as any;

          // Normalizar la fila actual
          const normalizedCurrentRow: { [key: string]: any } = {};
          for (const [key, value] of Object.entries(row)) {
            const normalizedKey = (key as string).replace(/\s+/g, '').toUpperCase();
            normalizedCurrentRow[normalizedKey] = value;
          }

          logger.info(`Row ${rowIndex + 1} normalized keys: ${JSON.stringify(Object.keys(normalizedCurrentRow))}`);

          // Extraer datos del archivo
          let cedula = this.getStringFromNormalized(normalizedCurrentRow, 'IDDELEMPLEADO');
          const employeeName = this.getStringFromNormalized(normalizedCurrentRow, 'NOMBRES');
          const department = this.getStringFromNormalized(normalizedCurrentRow, 'DEPARTAMENTO');
          const monthStr = this.getStringFromNormalized(normalizedCurrentRow, 'MES');
          const dateStr = this.getStringFromNormalized(normalizedCurrentRow, 'FECHA');
          const dailyAttendance = this.getStringFromNormalized(normalizedCurrentRow, 'ASISTENCIADIARIA');
          const firstCheckIn = this.getStringFromNormalized(normalizedCurrentRow, 'PRIMERAMARCACIÓN');
          const lastCheckOut = this.getStringFromNormalized(normalizedCurrentRow, 'ÚLTIMAMARCACIÓN');
          const totalTime = this.getStringFromNormalized(normalizedCurrentRow, 'TIEMPOTOTAL');

          // Normalizar cédula: si tiene 9 dígitos, agregar 0 al inicio
          const cedulaDigits = cedula.replace(/\D/g, '');
          if (cedulaDigits.length === 9) {
            cedula = '0' + cedulaDigits;
          } else if (cedulaDigits.length === 10) {
            cedula = cedulaDigits;
          }

          // Parsear mes
          const month = this.monthNameToNumber(monthStr);

          // Parsear fecha (esperado formato DD-MM-YYYY o DD/MM/YYYY o YYYY-MM-DD)
          let date = dateStr;
          if (dateStr.includes('-')) {
            // Formato DD-MM-YYYY
            const parts = dateStr.split('-');
            if (parts.length === 3) {
              const day = parts[0];
              const month = parts[1];
              const year = parts[2];
              // Verificar si es DD-MM-YYYY (día < 32, mes < 13)
              if (parseInt(day) <= 31 && parseInt(month) <= 12) {
                date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              }
            }
          } else if (dateStr.includes('/')) {
            // Formato DD/MM/YYYY
            const [day, month, year] = dateStr.split('/');
            date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }

          const marcacionData: Omit<Marcacion, 'id' | 'createdAt' | 'updatedAt'> = {
            cedula,
            employeeName,
            department,
            month,
            date,
            dailyAttendance,
            firstCheckIn: firstCheckIn || undefined,
            lastCheckOut: lastCheckOut || undefined,
            totalTime: totalTime || undefined,
          };

          logger.info(`Row ${rowIndex + 1}: Employee ${employeeName} (${cedula}) - Date: ${date}`);

          // Validar datos requeridos
          if (!marcacionData.employeeName || !marcacionData.cedula || !marcacionData.date) {
            const missingFields = [];
            if (!marcacionData.employeeName) missingFields.push('Nombre');
            if (!marcacionData.cedula) missingFields.push('Cédula');
            if (!marcacionData.date) missingFields.push('Fecha');
            const errorMsg = `Faltan datos requeridos: ${missingFields.join(', ')}`;
            logger.error(`Row ${rowIndex + 1} validation error: ${errorMsg}`, marcacionData);
            errors.push({
              row: rowIndex + 1,
              error: errorMsg,
            });
            continue;
          }

          try {
            // SIEMPRE eliminar primero para evitar conflictos de restricción UNIQUE
            const db = (await import('@config/database')).getDatabase();
            try {
              const deleteResult = await db.run(
                'DELETE FROM marcacion WHERE cedula = ? AND date = ?',
                [marcacionData.cedula, marcacionData.date]
              );
              const wasDeleted = (deleteResult.changes || 0) > 0;
              if (wasDeleted) {
                logger.info(`Deleted existing marcacion for ${cedula} - ${date}`);
                updatedCount++;
              }
            } catch (deleteError) {
              logger.error(`Error deleting marcacion at row ${rowIndex + 1}:`, deleteError);
              throw deleteError;
            }
            
            // Crear nuevo registro
            try {
              const newMarcacion = await MarcacionRepository.create(marcacionData);
              createdCount++;
              logger.info(`Marcacion created: ${cedula} - ${date}`);
              processedRecords.push(marcacionData);
            } catch (createError) {
              logger.error(`Error creating marcacion at row ${rowIndex + 1}:`, createError);
              logger.error(`CREATE SQL Error Details:`, {
                message: createError instanceof Error ? createError.message : 'Unknown',
                code: (createError as any)?.code,
                errno: (createError as any)?.errno,
                sql: (createError as any)?.sql,
              });
              throw createError;
            }
          } catch (createError) {
            logger.error(`Error processing marcacion at row ${rowIndex + 1}:`, { marcacionData, error: createError });
            errors.push({
              row: rowIndex + 1,
              error: `Error procesando marcación: ${createError instanceof Error ? createError.message : 'Error desconocido'}`,
            });
          }
        } catch (error) {
          logger.error(`Error processing row ${rowIndex + 1}:`, error);
          errors.push({
            row: rowIndex + 1,
            error: error instanceof Error ? error.message : 'Error procesando fila',
          });
        }
      }

      return {
        processedCount: createdCount + updatedCount,
        createdCount,
        updatedCount,
        errors,
        notFoundEmployees,
        pendingRecords,
        data: processedRecords,
      };
    } catch (error) {
      logger.error('Error processing attendance file', error);
      throw error;
    }
  }

  private getStringFromNormalized(normalizedRow: any, normalizedColumnName: string): string {
    try {
      const value = normalizedRow[normalizedColumnName];
      if (value === undefined || value === null) {
        logger.warn(`Column "${normalizedColumnName}" not found in normalized row. Available keys: ${Object.keys(normalizedRow).slice(0, 10).join(', ')}`);
        return '';
      }
      return value ? String(value).trim() : '';
    } catch (error) {
      logger.error(`Error reading string from normalized column "${normalizedColumnName}":`, error);
      return '';
    }
  }

  private getNumberFromNormalized(normalizedRow: any, normalizedColumnName: string): number {
    try {
      const value = normalizedRow[normalizedColumnName];
      if (value === undefined || value === null || value === '') return 0;
      const num = parseFloat(String(value).replace(/[$,]/g, ''));
      return isNaN(num) ? 0 : num;
    } catch (error) {
      logger.error(`Error reading number from normalized column "${normalizedColumnName}":`, error);
      return 0;
    }
  }
}

export default new AttendanceBulkUploadService();
