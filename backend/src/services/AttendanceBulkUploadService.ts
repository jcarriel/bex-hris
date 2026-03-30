import * as XLSX from 'xlsx';
import MarcacionRepository from '@repositories/MarcacionRepository';
import logger from '@utils/logger';
import type { Marcacion } from '../types';


export class AttendanceBulkUploadService {
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

      // Leer todas las filas como arrays para detectar filas de encabezado
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

      if (rawRows.length === 0) {
        throw new Error('El archivo está vacío o no tiene datos');
      }

      // Buscar la fila de encabezados (contiene "Id del Empleado" o similar)
      let headerRowIndex = -1;
      for (let i = 0; i < rawRows.length; i++) {
        const normalized = rawRows[i].map((c: any) => String(c).replace(/\s+/g, '').toUpperCase());
        if (normalized.includes('IDDELEMPLEADO') || normalized.includes('NOMBRES')) {
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex === -1) {
        throw new Error('No se encontró la fila de encabezados en el archivo. Verifique que el archivo tenga las columnas: Id del Empleado, Nombres, Fecha');
      }

      // Construir mapa de columna → índice
      const headerRow = rawRows[headerRowIndex];
      const colMap: { [key: string]: number } = {};
      for (let i = 0; i < headerRow.length; i++) {
        const key = String(headerRow[i]).replace(/\s+/g, '').toUpperCase();
        if (key) colMap[key] = i;
      }

      logger.info(`Header row found at index ${headerRowIndex}. Columns: ${JSON.stringify(colMap)}`);

      const getVal = (row: any[], colKey: string): string => {
        const idx = colMap[colKey];
        if (idx === undefined) return '';
        const v = row[idx];
        return v !== undefined && v !== null ? String(v).trim() : '';
      };

      const dataRows = rawRows.slice(headerRowIndex + 1);
      logger.info(`Found ${dataRows.length} potential data rows`);

      // Procesar cada fila de datos
      for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
        try {
          const row = dataRows[rowIndex];

          // Saltar filas vacías
          if (!row || row.every((c: any) => !c && c !== 0)) continue;

          // Saltar filas donde No. no es un número válido (filas de encabezado residuales, totales, etc.)
          const noVal = getVal(row, 'NO.');
          if (!noVal || isNaN(Number(noVal))) continue;

          // Extraer datos del archivo
          let cedula = getVal(row, 'IDDELEMPLEADO');
          const employeeName = getVal(row, 'NOMBRES');
          const department = getVal(row, 'DEPARTAMENTO');
          const dateStr = getVal(row, 'FECHA');
          const dailyAttendance = getVal(row, 'ASISTENCIADIARIA');
          const firstCheckIn = getVal(row, 'PRIMERAMARCACIÓN') || getVal(row, 'PRIMERAMARCACION');
          const lastCheckOut = getVal(row, 'ÚLTIMAMARCACIÓN') || getVal(row, 'ULTIMAMARCACION') || getVal(row, 'ÚLTIMAMARCACION');
          const totalTime = getVal(row, 'TIEMPOTOTAL');

          // Saltar filas sin datos de empleado
          if (!cedula && !employeeName) continue;

          // Normalizar cédula: si tiene 9 dígitos, agregar 0 al inicio
          const cedulaDigits = cedula.replace(/\D/g, '');
          if (cedulaDigits.length === 9) {
            cedula = '0' + cedulaDigits;
          } else if (cedulaDigits.length === 10) {
            cedula = cedulaDigits;
          }

          // Parsear fecha (DD-MM-YYYY → YYYY-MM-DD) y derivar mes de la fecha
          let date = dateStr;
          let month = 1;
          if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
              const day = parts[0];
              const monthPart = parts[1];
              const year = parts[2];
              if (parseInt(day) <= 31 && parseInt(monthPart) <= 12) {
                date = `${year}-${monthPart.padStart(2, '0')}-${day.padStart(2, '0')}`;
                month = parseInt(monthPart);
              }
            }
          } else if (dateStr.includes('/')) {
            const [day, monthPart, year] = dateStr.split('/');
            date = `${year}-${monthPart.padStart(2, '0')}-${day.padStart(2, '0')}`;
            month = parseInt(monthPart);
          } else if (dateStr.length === 10 && dateStr[4] === '-') {
            // Ya está en formato YYYY-MM-DD
            month = parseInt(dateStr.split('-')[1]);
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
            errors.push({ row: rowIndex + 1, error: errorMsg });
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
              await MarcacionRepository.create(marcacionData);
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

}

export default new AttendanceBulkUploadService();
