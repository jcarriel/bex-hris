import * as XLSX from 'xlsx';
import PayrollRepository from '@repositories/PayrollRepository';
import logger from '@utils/logger';
import type { Payroll } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class PayrollBulkUploadService {
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

  async processPayrollFile(fileBuffer: Buffer, fileName: string): Promise<{
    processedCount: number;
    createdCount: number;
    updatedCount: number;
    errors: Array<{ row: number; error: string }>;
    notFoundEmployees: Array<{ row: number; cedula: string; name: string }>;
    data: Array<Omit<Payroll, 'id' | 'createdAt' | 'updatedAt'>>;
  }> {
    try {
      const errors: Array<{ row: number; error: string }> = [];
      const notFoundEmployees: Array<{ row: number; cedula: string; name: string }> = [];
      const processedPayrolls: Array<Omit<Payroll, 'id' | 'createdAt' | 'updatedAt'>> = [];
      let createdCount = 0;
      let updatedCount = 0;

      logger.info(`Processing payroll file: ${fileName}`);

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

      logger.info(`Found ${rows.length} rows in payroll file`);
      
      // Log de las claves del primer registro para debugging
      if (rows.length > 0) {
        const firstRow = rows[0] as any;
        logger.info(`Column names in file: ${JSON.stringify(Object.keys(firstRow))}`);
      }

      // Mapeo de columnas esperadas en orden - con variaciones de nombres
      const columnMapping: { [key: string]: string } = {
        'Tipo de Nomina': 'payrollType',
        'Tipo': 'type',
        'AÑO': 'year',
        'MES': 'month',
        'CENTRO DE COSTO': 'departmentId',
        'APELLIDOS Y NOMBRES': 'employeeName',
        'CEDULA': 'cedula',
        'CARGO': 'position',
        'FORMA DE PAGO': 'paymentMethod',
        'NUMERO DE CUENTA': 'accountNumber',
        'SUELDO BASE': 'baseSalary',
        'DIAS LABORADO': 'workDays',
        'NRO HORAS EXTRAS 50%': 'overtimeHours50',
        'SUELDO GANADO': 'earnedSalary',
        'BONIFICACION RESPONSABILIDAD': 'responsibilityBonus',
        'BONIFICACION PRODUCTIVIDAD': 'productivityBonus',
        'ALIMENTACION': 'foodAllowance',
        'VALOR HORAS EXTRAS 50%': 'overtimeValue50',
        'OTROS INGRESOS': 'otherIncome',
        'DESCANSO MEDICO': 'medicalLeave',
        'XII SUELDO': 'twelfthSalary',
        'XIII SUELDO': 'twelfthSalary',
        'DECIMO TERCERO': 'twelfthSalary',
        'DÉCIMO TERCERO': 'twelfthSalary',
        'XIV SUELDO': 'fourteenthSalary',
        'DECIMO CUARTO': 'fourteenthSalary',
        'DÉCIMO CUARTO': 'fourteenthSalary',
        'TOTAL INGRESOS': 'totalIncome',
        'VACACIONES': 'vacation',
        'FONDOS DE RESERVA': 'reserveFunds',
        'FONDOS RESERVA': 'reserveFunds',
        'TOTAL DE BENEFICIOS': 'totalBenefits',
        'Aporte IESS': 'iessContribution',
        'APORTE IESS': 'iessContribution',
        'ANTICIPO': 'advance',
        'QUINCENA': 'quincena',
        'DIAS NO LABORADOS': 'nonWorkDays',
        'IMPUESTO A LA RENTA': 'incomeTax',
        'PRESTAMO IESS': 'iessLoan',
        'PRESTAMO EMPRESARIAL': 'companyLoan',
        'EXTENSION CONYUGAL': 'spouseExtension',
        'OTROS DESCUENTOS': 'otherDeductions',
        'TOTAL EGRESOS': 'totalDeductions',
        'TOTAL A PAGAR': 'totalToPay',
      };

      // Crear mapeo normalizado: todas las claves sin espacios
      const normalizedColumnMapping: { [key: string]: string } = {};
      for (const [key, value] of Object.entries(columnMapping)) {
        const normalizedKey = key.replace(/\s+/g, '').toUpperCase();
        normalizedColumnMapping[normalizedKey] = value;
      }
      
      logger.info(`Normalized column mapping: ${JSON.stringify(normalizedColumnMapping)}`);

      // Encontrar índices de columnas especiales ANTES del loop
      // Estas columnas se leen directamente desde las celdas para evitar problemas con espacios y caracteres especiales
      let alimentacionIngresosIndex: number = -1;
      let alimentacionEgresosIndex: number = -1;
      let iessLoanIndex: number = -1;
      let companyLoanIndex: number = -1;
      let spouseExtensionIndex: number = -1;
      let nonWorkDaysIndex: number = -1;
      let otherDeductionsIndex: number = -1;
      let otherIncomeIndex: number = -1;
      let medicalLeaveIndex: number = -1;
      let vacationIndex: number = -1;
      let reserveFundsIndex: number = -1;
      
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      
      // Leer la fila de encabezados (fila 0)
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        const cell = worksheet[cellAddress];
        if (cell && cell.v) {
          const headerText = String(cell.v).toUpperCase().trim();
          
          // Buscar columna de egreso primero (más específica)
          if (headerText.includes('ALIMENTACION') && (headerText.includes('DESC') || headerText.includes('EGRESO') || headerText.includes('DEDUCTION'))) {
            alimentacionEgresosIndex = col;
            logger.info(`Found ALIMENTACION DESC/EGRESO column at index: ${col}`);
          }
          // Buscar columna de ingresos (solo "ALIMENTACION" sin DESC/EGRESO)
          else if (headerText === 'ALIMENTACION') {
            alimentacionIngresosIndex = col;
            logger.info(`Found ALIMENTACION INGRESOS column at index: ${col}`);
          }
          // Buscar columnas de egresos con espacios
          else if (headerText === 'PRESTAMO IESS') {
            iessLoanIndex = col;
            logger.info(`Found PRESTAMO IESS column at index: ${col}`);
          }
          else if (headerText === 'PRESTAMO EMPRESARIAL') {
            companyLoanIndex = col;
            logger.info(`Found PRESTAMO EMPRESARIAL column at index: ${col}`);
          }
          else if (headerText === 'EXTENSION CONYUGAL') {
            spouseExtensionIndex = col;
            logger.info(`Found EXTENSION CONYUGAL column at index: ${col}`);
          }
          else if (headerText === 'DIAS NO LABORADOS') {
            nonWorkDaysIndex = col;
            logger.info(`Found DIAS NO LABORADOS column at index: ${col}`);
          }
          else if (headerText === 'OTROS DESCUENTOS') {
            otherDeductionsIndex = col;
            logger.info(`Found OTROS DESCUENTOS column at index: ${col}`);
          }
          // Buscar columnas de ingresos con espacios
          else if (headerText === 'OTROS INGRESOS') {
            otherIncomeIndex = col;
            logger.info(`Found OTROS INGRESOS column at index: ${col}`);
          }
          else if (headerText === 'DESCANSO MEDICO') {
            medicalLeaveIndex = col;
            logger.info(`Found DESCANSO MEDICO column at index: ${col}`);
          }
          else if (headerText === 'VACACIONES') {
            vacationIndex = col;
            logger.info(`Found VACACIONES column at index: ${col}`);
          }
          else if (headerText.includes('FONDOS') && headerText.includes('RESERVA')) {
            reserveFundsIndex = col;
            logger.info(`Found FONDOS RESERVA column at index: ${col}`);
          }
        }
      }
      
      logger.info(`Column indices - ALIMENTACION Ingresos: ${alimentacionIngresosIndex}, Egresos: ${alimentacionEgresosIndex}, IESS Loan: ${iessLoanIndex}, Company Loan: ${companyLoanIndex}, Spouse Ext: ${spouseExtensionIndex}, Non Work Days: ${nonWorkDaysIndex}, Other Deductions: ${otherDeductionsIndex}, Other Income: ${otherIncomeIndex}, Medical Leave: ${medicalLeaveIndex}, Vacation: ${vacationIndex}, Reserve Funds: ${reserveFundsIndex}`);

      // Procesar cada fila
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        try {
          const row = rows[rowIndex] as any;

          // Leer valores especiales directamente desde las celdas del worksheet
          // Esto evita problemas con espacios y caracteres especiales en nombres de columnas
          let alimentacionIngresos = 0;
          let alimentacionEgresos = 0;
          let iessLoanValue = 0;
          let companyLoanValue = 0;
          let spouseExtensionValue = 0;
          let nonWorkDaysValue = 0;
          let otherDeductionsValue = 0;
          let otherIncomeValue = 0;
          let medicalLeaveValue = 0;
          let vacationValue = 0;
          let reserveFundsValue = 0;
          
          const readCellValue = (colIndex: number): number => {
            if (colIndex < 0) return 0;
            const cellAddress = XLSX.utils.encode_cell({ r: rowIndex + 1, c: colIndex });
            const cell = worksheet[cellAddress];
            const numValue = cell && cell.v ? parseFloat(String(cell.v).replace(/[$,]/g, '')) : 0;
            return isNaN(numValue) ? 0 : numValue;
          };
          
          alimentacionIngresos = readCellValue(alimentacionIngresosIndex);
          alimentacionEgresos = readCellValue(alimentacionEgresosIndex);
          iessLoanValue = readCellValue(iessLoanIndex);
          companyLoanValue = readCellValue(companyLoanIndex);
          spouseExtensionValue = readCellValue(spouseExtensionIndex);
          nonWorkDaysValue = readCellValue(nonWorkDaysIndex);
          otherDeductionsValue = readCellValue(otherDeductionsIndex);
          otherIncomeValue = readCellValue(otherIncomeIndex);
          medicalLeaveValue = readCellValue(medicalLeaveIndex);
          vacationValue = readCellValue(vacationIndex);
          reserveFundsValue = readCellValue(reserveFundsIndex);

          // Normalizar la fila actual: remover espacios de todas las claves
          const normalizedCurrentRow: { [key: string]: any } = {};
          for (const [key, value] of Object.entries(row)) {
            const normalizedKey = (key as string).replace(/\s+/g, '').toUpperCase();
            normalizedCurrentRow[normalizedKey] = value;
          }

          logger.info(`Row ${rowIndex + 1} normalized keys: ${JSON.stringify(Object.keys(normalizedCurrentRow).slice(0, 15))}`);

          // Usar mapeo normalizado
          const mappingToUse = normalizedColumnMapping;

          const totalAlimentacion = alimentacionIngresos + alimentacionEgresos;
          logger.info(`Row ${rowIndex + 1}: Alimentacion Ingresos=${alimentacionIngresos}, Egresos=${alimentacionEgresos}, Total=${totalAlimentacion}`);

          // Mapear datos del archivo a estructura de nómina
          // Normalizar cédula: si tiene 9 dígitos, agregar 0 al inicio
          let normalizedCedulaForPayroll = this.getStringFromNormalized(normalizedCurrentRow, 'CEDULA');
          const cedulaDigits = normalizedCedulaForPayroll.replace(/\D/g, '');
          if (cedulaDigits.length === 9) {
            normalizedCedulaForPayroll = '0' + cedulaDigits;
          } else if (cedulaDigits.length === 10) {
            normalizedCedulaForPayroll = cedulaDigits;
          }

          const payrollData: Omit<Payroll, 'id' | 'createdAt' | 'updatedAt'> = {
            payrollType: this.getStringFromNormalized(normalizedCurrentRow, 'TIPODENOMINA'),
            type: this.getStringFromNormalized(normalizedCurrentRow, 'TIPO'),
            year: this.getNumberFromNormalized(normalizedCurrentRow, 'AÑO'),
            month: this.monthNameToNumber(this.getStringFromNormalized(normalizedCurrentRow, 'MES')),
            departmentId: this.getStringFromNormalized(normalizedCurrentRow, 'CENTRODECOSTO'),
            employeeId: '', // Se llenará después
            employeeName: this.getStringFromNormalized(normalizedCurrentRow, 'APELLIDOSYNOMBRES'),
            cedula: normalizedCedulaForPayroll,
            position: this.getStringFromNormalized(normalizedCurrentRow, 'CARGO'),
            paymentMethod: this.getStringFromNormalized(normalizedCurrentRow, 'FORMADEPAGO'),
            accountNumber: this.getStringFromNormalized(normalizedCurrentRow, 'NUMERODECUENTA'),
            baseSalary: this.getNumberFromNormalized(normalizedCurrentRow, 'SUELDOBASE'),
            workDays: this.getNumberFromNormalized(normalizedCurrentRow, 'DIASLABORADO'),
            overtimeHours50: this.getNumberFromNormalized(normalizedCurrentRow, 'NROHORASEXTRAS50%'),
            earnedSalary: this.getNumberFromNormalized(normalizedCurrentRow, 'SUELDOGANADO'),
            responsibilityBonus: this.getNumberFromNormalized(normalizedCurrentRow, 'BONIFICACIONRESPONSABILIDAD'),
            productivityBonus: this.getNumberFromNormalized(normalizedCurrentRow, 'BONIFICACIONPRODUCTIVIDAD'),
            foodAllowance: alimentacionIngresos, // ALIMENTACION de ingresos
            overtimeValue50: this.getNumberFromNormalized(normalizedCurrentRow, 'VALORHORASEXTRAS50%'),
            otherIncome: otherIncomeValue, // Leído directamente desde la celda del worksheet
            medicalLeave: medicalLeaveValue, // Leído directamente desde la celda del worksheet
            twelfthSalary: this.getNumberFromNormalized(normalizedCurrentRow, 'XIISUELDO'),
            fourteenthSalary: this.getNumberFromNormalized(normalizedCurrentRow, 'XIVSUELDO'),
            totalIncome: this.getNumberFromNormalized(normalizedCurrentRow, 'TOTALINGRESOS'),
            vacation: vacationValue, // Leído directamente desde la celda del worksheet
            reserveFunds: reserveFundsValue, // Leído directamente desde la celda del worksheet
            totalBenefits: this.getNumberFromNormalized(normalizedCurrentRow, 'TOTALDEBENEFICOS'),
            quincena: this.getNumberFromNormalized(normalizedCurrentRow, 'QUINCENA'),
            iessContribution: this.getNumberFromNormalized(normalizedCurrentRow, 'APORTEIESS'),
            advance: this.getNumberFromNormalized(normalizedCurrentRow, 'ANTICIPO'),
            nonWorkDays: nonWorkDaysValue, // Leído directamente desde la celda del worksheet
            incomeTax: this.getNumberFromNormalized(normalizedCurrentRow, 'IMPUESTOALARENTA'),
            iessLoan: iessLoanValue, // Leído directamente desde la celda del worksheet
            companyLoan: companyLoanValue, // Leído directamente desde la celda del worksheet
            spouseExtension: spouseExtensionValue, // Leído directamente desde la celda del worksheet
            foodDeduction: alimentacionEgresos, // ALIMENTACION de egresos (descuento)
            otherDeductions: otherDeductionsValue, // Leído directamente desde la celda del worksheet
            totalDeductions: this.getNumberFromNormalized(normalizedCurrentRow, 'TOTALEGRESOS'),
            totalToPay: this.getNumberFromNormalized(normalizedCurrentRow, 'TOTALAPAGAR'),
            status: 'draft',
          };

          // LOG DETALLADO DE DATOS LEÍDOS (solo para debugging, sin logs de error)
          if (rowIndex < 5 || rowIndex % 50 === 0) {
            logger.info(`\n========== ROW ${rowIndex + 1} - DEBUG INFO ==========`);
            logger.info(`Normalized keys (first 15): ${JSON.stringify(Object.keys(normalizedCurrentRow).slice(0, 15))}`);
            logger.info(`Employee: ${payrollData.employeeName} (${payrollData.cedula})`);
            logger.info(`Period: ${payrollData.year}/${payrollData.month}`);
            logger.info(`Ingresos - Sueldo: ${payrollData.baseSalary}, XII: ${payrollData.twelfthSalary}, XIV: ${payrollData.fourteenthSalary}, Fondos: ${payrollData.reserveFunds}, Total: ${payrollData.totalIncome}`);
            logger.info(`Egresos - IESS: ${payrollData.iessContribution}, Total: ${payrollData.totalDeductions}, A Pagar: ${payrollData.totalToPay}`);
            logger.info(`========== END ROW ${rowIndex + 1} ==========\n`);
          }

          // Validar datos requeridos
          if (!payrollData.employeeName || !payrollData.cedula || !payrollData.year || !payrollData.month) {
            const missingFields = [];
            if (!payrollData.employeeName) missingFields.push('Nombre');
            if (!payrollData.cedula) missingFields.push('Cédula');
            if (!payrollData.year) missingFields.push('Año');
            if (!payrollData.month) missingFields.push('Mes');
            const errorMsg = `Faltan datos requeridos: ${missingFields.join(', ')}`;
            logger.error(`Row ${rowIndex + 1} validation error: ${errorMsg}`, payrollData);
            errors.push({
              row: rowIndex + 1,
              error: errorMsg,
            });
            continue;
          }

          // Buscar empleado por cédula para obtener el employeeId
          try {
            const EmployeeRepository = (await import('@repositories/EmployeeRepository')).default;
            
            // Normalizar cédula: si tiene 9 dígitos, agregar 0 al inicio
            let normalizedCedula = payrollData.cedula;
            const cedulaDigits = payrollData.cedula.replace(/\D/g, '');
            if (cedulaDigits.length === 9) {
              normalizedCedula = '0' + cedulaDigits;
            } else if (cedulaDigits.length === 10) {
              normalizedCedula = cedulaDigits;
            }
            
            const employee = await EmployeeRepository.findByCedula(normalizedCedula);
            
            logger.info(`Looking for employee with cedula: ${normalizedCedula}, found: ${employee ? 'YES' : 'NO'}`);
            
            if (!employee) {
              notFoundEmployees.push({
                row: rowIndex + 1,
                cedula: payrollData.cedula,
                name: payrollData.employeeName,
              });
              errors.push({
                row: rowIndex + 1,
                error: `Empleado no encontrado con cédula: ${payrollData.cedula}`,
              });
              continue;
            }
            
            // Asignar el employeeId del empleado encontrado
            payrollData.employeeId = employee.id;
            logger.info(`Assigned employeeId: ${employee.id} for cedula: ${payrollData.cedula}`);
          } catch (employeeError) {
            logger.error(`Error finding employee by cedula ${payrollData.cedula}:`, employeeError);
            errors.push({
              row: rowIndex + 1,
              error: `Error buscando empleado con cédula: ${payrollData.cedula}`,
            });
            continue;
          }

          // Buscar nómina existente por período y employeeId
          const existingPayroll = await PayrollRepository.findByEmployeeAndPeriod(
            payrollData.employeeId,
            payrollData.year,
            payrollData.month
          );

          try {
            // SIEMPRE eliminar primero para evitar conflictos de restricción UNIQUE
            const db = (await import('@config/database')).getDatabase();
            try {
              const deleteResult = await db.run(
                'DELETE FROM payroll WHERE employeeId = ? AND year = ? AND month = ?',
                [payrollData.employeeId, payrollData.year, payrollData.month]
              );
              const wasUpdated = (deleteResult.changes || 0) > 0;
              if (wasUpdated) {
                logger.info(`Deleted existing payroll for ${payrollData.cedula} - ${payrollData.year}/${payrollData.month}`);
              }
            } catch (deleteError) {
              logger.error(`Error deleting payroll at row ${rowIndex + 1}:`, deleteError);
              throw deleteError;
            }
            
            // Crear nueva nómina
            try {
              const newPayroll = await PayrollRepository.create(payrollData);
              createdCount++;
              logger.info(`Payroll created: ${payrollData.cedula} - ${payrollData.year}/${payrollData.month}`);
              processedPayrolls.push(payrollData);
            } catch (createError) {
              logger.error(`Error creating payroll at row ${rowIndex + 1}:`, createError);
              logger.error(`CREATE SQL Error Details:`, {
                message: createError instanceof Error ? createError.message : 'Unknown',
                code: (createError as any)?.code,
                errno: (createError as any)?.errno,
                sql: (createError as any)?.sql,
              });
              throw createError;
            }
          } catch (createError) {
            logger.error(`Error processing payroll at row ${rowIndex + 1}:`, { payrollData, error: createError });
            errors.push({
              row: rowIndex + 1,
              error: `Error procesando nómina: ${createError instanceof Error ? createError.message : 'Error desconocido'}`,
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
        data: processedPayrolls,
      };
    } catch (error) {
      logger.error('Error processing payroll file', error);
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

export default new PayrollBulkUploadService();
