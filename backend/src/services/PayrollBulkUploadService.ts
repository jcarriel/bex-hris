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
    consolidatedPayrolls: Array<{ name: string; cedula: string; year: number; month: number; previousValues: any; newValues: any; consolidatedValues: any }>;
    pendingPayrolls: Array<Omit<Payroll, 'id' | 'createdAt' | 'updatedAt'>>;
    data: Array<Omit<Payroll, 'id' | 'createdAt' | 'updatedAt'>>;
  }> {
    try {
      const errors: Array<{ row: number; error: string }> = [];
      const notFoundEmployees: Array<{ row: number; cedula: string; name: string }> = [];
      const consolidatedPayrolls: Array<{ name: string; cedula: string; year: number; month: number; previousValues: any; newValues: any; consolidatedValues: any }> = [];
      const processedPayrolls: Array<Omit<Payroll, 'id' | 'createdAt' | 'updatedAt'>> = [];
      const pendingPayrolls: Array<Omit<Payroll, 'id' | 'createdAt' | 'updatedAt'>> = [];
      let createdCount = 0;
      let updatedCount = 0;

      logger.info(`Processing payroll file: ${fileName}`);

      // Leer archivo XLSX
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      
      // Buscar la hoja "BASE" (mayúscula o minúscula), si no existe usar la primera hoja
      let sheetName = workbook.SheetNames[0];
      const baseSheet = workbook.SheetNames.find(name => name.toUpperCase() === 'BASE');
      if (baseSheet) {
        sheetName = baseSheet;
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

          // Buscar departamento por nombre para obtener el departmentId
          try {
            const DepartmentService = (await import('@services/DepartmentService')).default;
            const departments = await DepartmentService.getAllDepartments();
            const department = departments.find((d: any) => d.name.toUpperCase() === payrollData.departmentId.toUpperCase());
            
            if (!department) {
              logger.warn(`Department "${payrollData.departmentId}" not found, using employee's department`);
              // Se usará el departamento del empleado en su lugar
            } else {
              payrollData.departmentId = department.id;
              logger.info(`Mapped department name "${payrollData.departmentId}" to ID: ${department.id}`);
            }
          } catch (deptError) {
            logger.error(`Error finding department:`, deptError);
          }

          // Buscar empleado por nombre (employeeName) para obtener el employeeId
          try {
            const EmployeeRepository = (await import('@repositories/EmployeeRepository')).default;
            
            // Buscar empleado por nombre (case-insensitive)
            const employees = await EmployeeRepository.getAll();
            const employee = employees.find((emp: any) => 
              emp.firstName && emp.lastName &&
              `${emp.lastName} ${emp.firstName}`.toUpperCase() === payrollData.employeeName.toUpperCase()
            );
            
            logger.info(`Looking for employee with name: ${payrollData.employeeName}, found: ${employee ? 'YES' : 'NO'}`);
            
            if (!employee) {
              notFoundEmployees.push({
                row: rowIndex + 1,
                cedula: payrollData.cedula,
                name: payrollData.employeeName,
              });
              // Guardar la nómina como pendiente para procesarla después de crear el empleado
              pendingPayrolls.push(payrollData);
              logger.info(`Payroll for employee ${payrollData.employeeName} saved as pending - will be processed after employee registration`);
              continue;
            }
            
            // Asignar el employeeId del empleado encontrado
            payrollData.employeeId = employee.id;
            // Si no se encontró el departamento, usar el del empleado
            if (!payrollData.departmentId || payrollData.departmentId.length < 20) {
              payrollData.departmentId = employee.departmentId;
              logger.info(`Using employee's department: ${employee.departmentId}`);
            }
            logger.info(`Assigned employeeId: ${employee.id} for name: ${payrollData.employeeName}`);
          } catch (employeeError) {
            logger.error(`Error finding employee by name ${payrollData.employeeName}:`, employeeError);
            errors.push({
              row: rowIndex + 1,
              error: `Error buscando empleado con nombre: ${payrollData.employeeName}`,
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
            const db = (await import('@config/database')).getDatabase();
            
            if (existingPayroll) {
              // Si existe un registro previo, consolidar sumando los valores
              logger.info(`Found existing payroll for ${payrollData.employeeName} - ${payrollData.year}/${payrollData.month}, consolidating...`);
              
              // Guardar valores previos para el reporte
              const previousValues = {
                baseSalary: existingPayroll.baseSalary,
                workDays: existingPayroll.workDays,
                overtimeHours50: existingPayroll.overtimeHours50,
                earnedSalary: existingPayroll.earnedSalary,
                totalIncome: existingPayroll.totalIncome,
                totalDeductions: existingPayroll.totalDeductions,
                totalToPay: existingPayroll.totalToPay,
              };
              
              // Sumar valores numéricos
              const consolidatedPayrollData = {
                ...payrollData,
                baseSalary: (existingPayroll.baseSalary || 0) + (payrollData.baseSalary || 0),
                workDays: (existingPayroll.workDays || 0) + (payrollData.workDays || 0),
                overtimeHours50: (existingPayroll.overtimeHours50 || 0) + (payrollData.overtimeHours50 || 0),
                earnedSalary: (existingPayroll.earnedSalary || 0) + (payrollData.earnedSalary || 0),
                responsibilityBonus: (existingPayroll.responsibilityBonus || 0) + (payrollData.responsibilityBonus || 0),
                productivityBonus: (existingPayroll.productivityBonus || 0) + (payrollData.productivityBonus || 0),
                foodAllowance: (existingPayroll.foodAllowance || 0) + (payrollData.foodAllowance || 0),
                overtimeValue50: (existingPayroll.overtimeValue50 || 0) + (payrollData.overtimeValue50 || 0),
                otherIncome: (existingPayroll.otherIncome || 0) + (payrollData.otherIncome || 0),
                medicalLeave: (existingPayroll.medicalLeave || 0) + (payrollData.medicalLeave || 0),
                twelfthSalary: (existingPayroll.twelfthSalary || 0) + (payrollData.twelfthSalary || 0),
                fourteenthSalary: (existingPayroll.fourteenthSalary || 0) + (payrollData.fourteenthSalary || 0),
                totalIncome: (existingPayroll.totalIncome || 0) + (payrollData.totalIncome || 0),
                vacation: (existingPayroll.vacation || 0) + (payrollData.vacation || 0),
                reserveFunds: (existingPayroll.reserveFunds || 0) + (payrollData.reserveFunds || 0),
                totalBenefits: (existingPayroll.totalBenefits || 0) + (payrollData.totalBenefits || 0),
                iessContribution: (existingPayroll.iessContribution || 0) + (payrollData.iessContribution || 0),
                advance: (existingPayroll.advance || 0) + (payrollData.advance || 0),
                nonWorkDays: (existingPayroll.nonWorkDays || 0) + (payrollData.nonWorkDays || 0),
                incomeTax: (existingPayroll.incomeTax || 0) + (payrollData.incomeTax || 0),
                iessLoan: (existingPayroll.iessLoan || 0) + (payrollData.iessLoan || 0),
                companyLoan: (existingPayroll.companyLoan || 0) + (payrollData.companyLoan || 0),
                spouseExtension: (existingPayroll.spouseExtension || 0) + (payrollData.spouseExtension || 0),
                foodDeduction: (existingPayroll.foodDeduction || 0) + (payrollData.foodDeduction || 0),
                otherDeductions: (existingPayroll.otherDeductions || 0) + (payrollData.otherDeductions || 0),
                totalDeductions: (existingPayroll.totalDeductions || 0) + (payrollData.totalDeductions || 0),
                totalToPay: (existingPayroll.totalToPay || 0) + (payrollData.totalToPay || 0),
              };
              
              // Eliminar el registro anterior
              try {
                await db.run(
                  'DELETE FROM payroll WHERE employeeId = ? AND year = ? AND month = ?',
                  [payrollData.employeeId, payrollData.year, payrollData.month]
                );
              } catch (deleteError) {
                logger.error(`Error deleting existing payroll at row ${rowIndex + 1}:`, deleteError);
                throw deleteError;
              }
              
              // Crear la nómina consolidada
              try {
                const newPayroll = await PayrollRepository.create(consolidatedPayrollData);
                updatedCount++;
                logger.info(`Payroll consolidated for ${payrollData.employeeName} - ${payrollData.year}/${payrollData.month}`);
                processedPayrolls.push(consolidatedPayrollData);
                
                // Registrar la consolidación
                consolidatedPayrolls.push({
                  name: payrollData.employeeName,
                  cedula: payrollData.cedula,
                  year: payrollData.year,
                  month: payrollData.month,
                  previousValues,
                  newValues: {
                    baseSalary: payrollData.baseSalary,
                    workDays: payrollData.workDays,
                    overtimeHours50: payrollData.overtimeHours50,
                    earnedSalary: payrollData.earnedSalary,
                    totalIncome: payrollData.totalIncome,
                    totalDeductions: payrollData.totalDeductions,
                    totalToPay: payrollData.totalToPay,
                  },
                  consolidatedValues: {
                    baseSalary: consolidatedPayrollData.baseSalary,
                    workDays: consolidatedPayrollData.workDays,
                    overtimeHours50: consolidatedPayrollData.overtimeHours50,
                    earnedSalary: consolidatedPayrollData.earnedSalary,
                    totalIncome: consolidatedPayrollData.totalIncome,
                    totalDeductions: consolidatedPayrollData.totalDeductions,
                    totalToPay: consolidatedPayrollData.totalToPay,
                  },
                });
              } catch (createError) {
                logger.error(`Error creating consolidated payroll at row ${rowIndex + 1}:`, createError);
                throw createError;
              }
            } else {
              // Si no existe registro previo, crear normalmente
              try {
                const newPayroll = await PayrollRepository.create(payrollData);
                createdCount++;
                logger.info(`Payroll created: ${payrollData.cedula} - ${payrollData.year}/${payrollData.month}`);
                processedPayrolls.push(payrollData);
              } catch (createError) {
                logger.error(`Error creating payroll at row ${rowIndex + 1}:`, createError);
                throw createError;
              }
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
        consolidatedPayrolls,
        pendingPayrolls,
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
