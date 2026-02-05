import { useState, useEffect } from 'react';
import api from '../services/api';
import DataTableWithChildRows from '../components/DataTableWithChildRows';
import DataTableAdvanced from '../components/DataTableAdvanced';
import { useThemeStore } from '../stores/themeStore';
import { showSuccess, showError, showConfirm } from '../utils/alertify';

interface Marcacion {
  id: string;
  cedula: string;
  employeeName: string;
  department: string;
  departmentId?: string;
  positionId?: string;
  month: number;
  date: string;
  dailyAttendance: string;
  firstCheckIn?: string;
  lastCheckOut?: string;
  totalTime?: string;
  createdAt: string;
  updatedAt: string;
}

interface PeriodOption {
  label: string;
  startDate: string;
  endDate: string;
  month: number;
}

export default function MarcacionPage() {
  const { theme } = useThemeStore();
  const [allMarcaciones, setAllMarcaciones] = useState<Marcacion[]>([]);
  const [filteredMarcaciones, setFilteredMarcaciones] = useState<Marcacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [periodsLoaded, setPeriodsLoaded] = useState(false);
  // Filtros para Marcación
  const [filterCedulaMarcacion, setFilterCedulaMarcacion] = useState('');
  const [filterNombreMarcacion, setFilterNombreMarcacion] = useState('');
  const [filterDepartamentoMarcacion, setFilterDepartamentoMarcacion] = useState('');
  
  // Filtros para Inconsistencias
  const [filterCedulaInconsistencias, setFilterCedulaInconsistencias] = useState('');
  const [filterNombreInconsistencias, setFilterNombreInconsistencias] = useState('');
  const [filterDepartamentoInconsistencias, setFilterDepartamentoInconsistencias] = useState('');
  
  // Filtros para Horas Extras
  const [filterCedulaHorasExtras, setFilterCedulaHorasExtras] = useState('');
  const [filterNombreHorasExtras, setFilterNombreHorasExtras] = useState('');
  const [filterDepartamentoHorasExtras, setFilterDepartamentoHorasExtras] = useState('');
  
  const [uniqueDepartamentos, setUniqueDepartamentos] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'marcacion' | 'inconsistencias' | 'horas_extras' | 'generar'>('marcacion');
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [loadingPayroll, setLoadingPayroll] = useState(false);
  const [generarOption, setGenerarOption] = useState<'marcaciones' | 'horas_extras'>('marcaciones');
  const [generatingExcel, setGeneratingExcel] = useState(false);
  const [scheduleConfigs, setScheduleConfigs] = useState<Map<string, any>>(new Map());

  // Cargar períodos disponibles al montar el componente
  useEffect(() => {
    loadAvailablePeriods();
  }, []);

  // Cargar datos cuando se selecciona un período
  useEffect(() => {
    if (selectedPeriod) {
      loadMarcacionesByPeriod();
    } else {
      setFilteredMarcaciones([]);
    }
  }, [selectedPeriod]);

  // Aplicar filtros cuando cambian (solo para Marcación)
  useEffect(() => {
    let filtered = [...allMarcaciones];

    if (filterCedulaMarcacion) {
      filtered = filtered.filter(m => m.cedula.toLowerCase().includes(filterCedulaMarcacion.toLowerCase()));
    }

    if (filterNombreMarcacion) {
      filtered = filtered.filter(m => m.employeeName.toLowerCase().includes(filterNombreMarcacion.toLowerCase()));
    }

    if (filterDepartamentoMarcacion) {
      filtered = filtered.filter(m => m.department === filterDepartamentoMarcacion);
    }

    setFilteredMarcaciones(filtered);
  }, [filterCedulaMarcacion, filterNombreMarcacion, filterDepartamentoMarcacion, allMarcaciones]);

  const loadAvailablePeriods = async () => {
    try {
      const response = await api.client.get('/marcacion/periods');
      const periodsList = response.data.data || [];
      
      setPeriods(periodsList);
      setPeriodsLoaded(true);
    } catch (error) {
      console.error('Error loading available periods:', error);
      setPeriodsLoaded(true);
    }
  };

  const loadScheduleConfigs = async () => {
    try {
      const response = await api.client.get('/department-schedules');
      const configs = response.data.data || [];
      
      // Crear un mapa de departmentId -> array de configuraciones (puede haber múltiples por cargo)
      const configMap = new Map();
      configs.forEach((config: any) => {
        const deptId = config.departmentId;
        if (!configMap.has(deptId)) {
          configMap.set(deptId, []);
        }
        configMap.get(deptId).push(config);
      });
      
      setScheduleConfigs(configMap);
    } catch (error) {
      console.error('Error loading schedule configs:', error);
      setScheduleConfigs(new Map());
    }
  };

  const loadMarcacionesByPeriod = async () => {
    try {
      setLoading(true);
      const period = periods.find(p => p.startDate === selectedPeriod);
      if (!period) {
        setAllMarcaciones([]);
        setFilteredMarcaciones([]);
        setUniqueDepartamentos([]);
        return;
      }

      const response = await api.client.get('/marcacion/period/data', {
        params: {
          startDate: period.startDate,
          endDate: period.endDate,
        },
      });

      const data = response.data.data || [];
      setAllMarcaciones(data);
      
      // Extraer departamentos únicos
      const depts = Array.from(new Set(data.map(m => m.department))).sort() as string[];
      setUniqueDepartamentos(depts);
      
      // Cargar configuraciones de horarios
      await loadScheduleConfigs();
      
      // Resetear filtros
      setFilterCedulaMarcacion('');
      setFilterNombreMarcacion('');
      setFilterDepartamentoMarcacion('');
    } catch (error) {
      console.error('Error loading marcaciones:', error);
      setAllMarcaciones([]);
      setFilteredMarcaciones([]);
      setUniqueDepartamentos([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteMarcacionesByPeriod = async () => {
    if (!selectedPeriod) return;
    
    const period = periods.find(p => p.startDate === selectedPeriod);
    if (!period) return;
    
    showConfirm(
      `¿Estás seguro de que deseas eliminar todos los registros de marcación del período ${period.label}? Esta acción no se puede deshacer.`,
      async () => {
        try {
          setLoading(true);
          await api.client.delete('/marcacion/period', {
            params: {
              startDate: period.startDate,
              endDate: period.endDate,
            },
          });
          
          // Recargar los datos después de eliminar
          setAllMarcaciones([]);
          setFilteredMarcaciones([]);
          setUniqueDepartamentos([]);
          
          // Mostrar mensaje de éxito
          showSuccess('Registros de marcación eliminados correctamente');
        } catch (error) {
          console.error('Error deleting marcaciones:', error);
          showError('Error al eliminar los registros de marcación');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const loadPayrollByPeriod = async (): Promise<any[]> => {
    try {
      setLoadingPayroll(true);
      if (!selectedPeriod) return [];
      
      const period = periods.find(p => p.startDate === selectedPeriod);
      if (!period) return [];
      
      // Extraer mes y año del período (endDate es el mes de la nómina)
      const [endYear, endMonth] = period.endDate.split('-').map(Number);
      
      const response = await api.client.get(`/payroll/period/${endYear}/${endMonth}`);
      const data = response.data.data || [];
      
      // Filtrar solo empleados con horas extras (overtimeHours50 > 0)
      const withOvertime = data.filter((p: any) => p.overtimeHours50 > 0);
      
      // Enriquecer con datos de marcación
      const enriched = withOvertime.map((payroll: any) => {
        // Hacer match por nombre (case-insensitive)
        const marcacionRecords = allMarcaciones.filter(m => 
          m.employeeName.toLowerCase() === payroll.employeeName.toLowerCase()
        );
        
        // Calcular total de horas en marcación
        let totalHours = 0;
        let totalMinutes = 0;
        marcacionRecords.forEach(r => {
          if (r.totalTime && r.totalTime !== '00:00') {
            const parts = r.totalTime.split(':');
            const hours = parseInt(parts[0]) || 0;
            const minutes = parseInt(parts[1]) || 0;
            totalHours += hours;
            totalMinutes += minutes;
          }
        });
        
        totalHours += Math.floor(totalMinutes / 60);
        totalMinutes = totalMinutes % 60;
        
        // Calcular días con marcación válida (entrada diferente a salida) e inválida (entrada igual a salida)
        let validDays = 0;
        let invalidDays = 0;
        
        marcacionRecords.forEach(r => {
          if (r.firstCheckIn && r.lastCheckOut) {
            if (r.firstCheckIn === r.lastCheckOut) {
              invalidDays++;
            } else {
              validDays++;
            }
          }
        });
        
        const validInvalidDays = `${validDays}/${invalidDays}`;
        
        // Obtener configuración del departamento y cargo del empleado
        let departmentConfig = null;
        
        let deptId = null;
        if (payroll.departmentId) {
          Array.from(scheduleConfigs.entries()).forEach(([key, configs]) => {
            if (Array.isArray(configs) && configs.length > 0) {
              if (configs[0].departmentName === payroll.departmentId) {
                deptId = key;
              }
            }
          });
        }
        
        if (deptId) {
          const deptConfigs = scheduleConfigs.get(deptId);
          if (deptConfigs && Array.isArray(deptConfigs)) {
            // Buscar configuración específica por cargo si existe
            // Primero intentar por positionId si existe
            if (payroll.positionId) {
              departmentConfig = deptConfigs.find((c: any) => c.positionId === payroll.positionId);
            }
            
            // Si no encontró por positionId, usar la primera configuración del departamento
            if (!departmentConfig && deptConfigs.length > 0) {
              departmentConfig = deptConfigs[0];
            }
          }
        }
        
        // Obtener horas de trabajo configuradas (por defecto 9)
        const workHours = departmentConfig?.workHours ? Number(departmentConfig.workHours) : 9;
        
        // Calcular tiempo excedente (horas extras - horas configuradas por día * días trabajados)
        const daysWorked = marcacionRecords.filter(m => m.totalTime && m.totalTime !== '00:00').length;
        const expectedHours = daysWorked * workHours;
        const excessHours = totalHours - expectedHours;
        
        // Si hay excedente (más horas trabajadas), es negativo (se quita)
        // Si hay carencia (menos horas trabajadas), es positivo (se suma)
        const excessHoursAdjusted = excessHours > 0 ? -excessHours : Math.abs(excessHours);
        const excessMinutesAdjusted = excessHours > 0 ? -totalMinutes : totalMinutes;
        
        // Calcular ajuste de horas con días sin marcación (00:00)
        // Contar días donde no marcó entrada o salida (totalTime = 00:00)
        const daysWithoutMarking = marcacionRecords.filter(m => m.totalTime === '00:00').length;
        const hoursFromMissingDays = daysWithoutMarking * workHours; // horas configuradas por cada día sin marcación (positivo)
        
        // Total Ajustable = tiempo excedente (con signo) + horas de días sin marcación
        let totalAdjustableHours = excessHoursAdjusted + hoursFromMissingDays;
        let totalAdjustableMinutes = excessMinutesAdjusted;
        
        // Si Total Ajustable es negativo, se convierte a positivo
        let isNegativeAdjustable = false;
        if (totalAdjustableHours < 0) {
          isNegativeAdjustable = true;
          totalAdjustableHours = Math.abs(totalAdjustableHours);
          totalAdjustableMinutes = Math.abs(totalAdjustableMinutes);
        }
        
        // Ajuste final = Total Ajustable - Horas Extras de Nómina
        // Si el Total Ajustable era negativo (excedente), el resultado es negativo (se quita)
        let hoursDifference = totalAdjustableHours - payroll.overtimeHours50;
        if (isNegativeAdjustable) {
          hoursDifference = -hoursDifference; // Convertir a negativo si era excedente
        }
        const minutesDifference = totalAdjustableMinutes;
        
        // Formato: +HH:MM (aumentar) o -HH:MM (quitar)
        const sign = hoursDifference >= 0 ? '+' : '-';
        const absHours = Math.abs(Math.floor(hoursDifference));
        const absMinutes = Math.abs(minutesDifference);
        const hoursDifferenceFormatted = `${sign}${String(absHours).padStart(2, '0')}:${String(absMinutes).padStart(2, '0')}`;
        
        return {
          ...payroll,
          marcacionTotalHours: totalHours,
          marcacionTotalMinutes: totalMinutes,
          marcacionTotalFormatted: `${String(totalHours).padStart(2, '0')}:${String(totalMinutes).padStart(2, '0')}`,
          excessHours: Math.max(0, excessHours),
          excessMinutes: totalMinutes,
          excessFormatted: `${String(Math.max(0, excessHours)).padStart(2, '0')}:${String(totalMinutes).padStart(2, '0')}`,
          hoursDifference: hoursDifference,
          minutesDifference: minutesDifference,
          hoursDifferenceFormatted: hoursDifferenceFormatted,
          validInvalidDays: validInvalidDays,
        };
      });
      
      setPayrollData(enriched);
      return enriched;
    } catch (error) {
      console.error('Error loading payroll:', error);
      return [];
    } finally {
      setLoadingPayroll(false);
    }
  };

  const generateCorrectedExcel = async (payrollDataToUse?: any[]) => {
    try {
      setGeneratingExcel(true);
      
      // Usar los datos pasados como parámetro o los del estado
      const dataToUse = payrollDataToUse || payrollData;
      
      if (generarOption === 'marcaciones') {
        // Generar Excel de marcaciones corregidas
        generateMarcacionesExcel();
      } else {
        // Generar Excel de horas extras con correcciones
        generateHorasExtrasExcel();
      }
    } catch (error) {
      console.error('Error generating Excel:', error);
      alert('Error al generar el Excel');
    } finally {
      setGeneratingExcel(false);
    }
  };

  const getRandomTime = (minHour: number, minMinute: number, maxHour: number, maxMinute: number): string => {
    const minTotalMinutes = minHour * 60 + minMinute;
    const maxTotalMinutes = maxHour * 60 + maxMinute;
    const randomMinutes = Math.floor(Math.random() * (maxTotalMinutes - minTotalMinutes + 1)) + minTotalMinutes;
    const hours = Math.floor(randomMinutes / 60);
    const minutes = randomMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const getRandomTargetMinutes = (totalTimeMin: string = '08:45', totalTimeMax: string = '09:15'): number => {
    // Retorna un valor aleatorio entre los minutos configurados
    const [minHours, minMins] = totalTimeMin.split(':').map(Number);
    const [maxHours, maxMins] = totalTimeMax.split(':').map(Number);
    const TARGET_MIN = minHours * 60 + minMins;
    const TARGET_MAX = maxHours * 60 + maxMins;
    return Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1)) + TARGET_MIN;
  };

  const correctMarcacion = (
    firstCheckIn: string | null,
    lastCheckOut: string | null,
    originalTotalTime: string,
    scheduleConfig?: any,
    cedula?: string
  ): { correctedFirst: string; correctedLast: string; detail: string } => {
    // Usar configuración del departamento o valores por defecto
    const entryTimeMin = scheduleConfig?.entryTimeMin || '06:30';
    const entryTimeMax = scheduleConfig?.entryTimeMax || '07:30';
    const exitTimeMin = scheduleConfig?.exitTimeMin || '15:30';
    const exitTimeMax = scheduleConfig?.exitTimeMax || '16:30';
    
    // workHours es el número de horas de trabajo por día (por defecto 9)
    const workHours = Number(scheduleConfig?.workHours) || 9;
    const workMinutes = workHours * 60;
    
    // totalTimeMin y totalTimeMax ahora son números (minutos de tolerancia)
    // Convertir a minutos de tolerancia alrededor de workHours
    const toleranceMin = Number(scheduleConfig?.totalTimeMin) || 15; // minutos menos
    const toleranceMax = Number(scheduleConfig?.totalTimeMax) || 15; // minutos más
    
    // Calcular tiempos reales basados en workHours
    const TARGET_MIN = workMinutes - toleranceMin;
    const TARGET_MAX = workMinutes + toleranceMax;
   
    // Convertir a minutos
    const [entryMinH, entryMinM] = entryTimeMin.split(':').map(Number);
    const [entryMaxH, entryMaxM] = entryTimeMax.split(':').map(Number);
    const [exitMinH, exitMinM] = exitTimeMin.split(':').map(Number);
    const [exitMaxH, exitMaxM] = exitTimeMax.split(':').map(Number);

    const ENTRY_MIN = entryMinH * 60 + entryMinM;
    const ENTRY_MAX = entryMaxH * 60 + entryMaxM;
    const EXIT_MIN = exitMinH * 60 + exitMinM;
    const EXIT_MAX = exitMaxH * 60 + exitMaxM;

    // Caso: ambas son 00:00
    if (originalTotalTime === '00:00') {
      const randomEntry = getRandomTime(entryMinH, entryMinM, entryMaxH, entryMaxM);
      const randomTargetMinutes = Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1)) + TARGET_MIN;
      let randomExitMinutes = timeToMinutes(randomEntry) + randomTargetMinutes;
      
      // Asegurar que la salida esté dentro del rango permitido
      if (randomExitMinutes < EXIT_MIN) {
        randomExitMinutes = EXIT_MIN + Math.floor(Math.random() * (EXIT_MAX - EXIT_MIN + 1));
      } else if (randomExitMinutes > EXIT_MAX) {
        randomExitMinutes = EXIT_MAX - Math.floor(Math.random() * (EXIT_MAX - EXIT_MIN + 1));
      }
      
      const randomExit = minutesToTime(randomExitMinutes);
      return {
        correctedFirst: randomEntry,
        correctedLast: randomExit,
        detail: `Día sin marcación: entrada ${randomEntry}, salida ${randomExit}`,
      };
    }

    // Caso: solo falta entrada o salida
    if (!firstCheckIn || firstCheckIn === '00:00') {
      // Falta entrada, usar salida como referencia
      const exitMinutes = timeToMinutes(lastCheckOut || '00:00');
      const [entryMinH, entryMinM] = entryTimeMin.split(':').map(Number);
      const [entryMaxH, entryMaxM] = entryTimeMax.split(':').map(Number);
      const randomEntry = getRandomTime(entryMinH, entryMinM, entryMaxH, entryMaxM);
      const entryMinutes = timeToMinutes(randomEntry);
      const totalMinutes = exitMinutes - entryMinutes;

      if (totalMinutes >= TARGET_MIN && totalMinutes <= TARGET_MAX) {
        return {
          correctedFirst: randomEntry,
          correctedLast: lastCheckOut || '00:00',
          detail: `Entrada faltante: asignada ${randomEntry}`,
        };
      } else {
        // Ajustar salida con tiempo aleatorio en rango
        const randomTargetMinutes = Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1)) + TARGET_MIN;
        const newExitMinutes = entryMinutes + randomTargetMinutes;
        const newExit = minutesToTime(newExitMinutes);
        return {
          correctedFirst: randomEntry,
          correctedLast: newExit,
          detail: `Entrada faltante: asignada ${randomEntry}, salida ajustada a ${newExit}`,
        };
      }
    }

    if (!lastCheckOut || lastCheckOut === '00:00') {
      // Falta salida, usar entrada como referencia
      const entryMinutes = timeToMinutes(firstCheckIn);
      const [exitMinH, exitMinM] = exitTimeMin.split(':').map(Number);
      const [exitMaxH, exitMaxM] = exitTimeMax.split(':').map(Number);
      const randomExit = getRandomTime(exitMinH, exitMinM, exitMaxH, exitMaxM);
      const exitMinutes = timeToMinutes(randomExit);
      const totalMinutes = exitMinutes - entryMinutes;

      if (totalMinutes >= TARGET_MIN && totalMinutes <= TARGET_MAX) {
        return {
          correctedFirst: firstCheckIn,
          correctedLast: randomExit,
          detail: `Salida faltante: asignada ${randomExit}`,
        };
      } else {
        // Ajustar entrada con tiempo aleatorio en rango
        const randomTargetMinutes = Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1)) + TARGET_MIN;
        const newEntryMinutes = exitMinutes - randomTargetMinutes;
        const newEntry = minutesToTime(newEntryMinutes);
        return {
          correctedFirst: newEntry,
          correctedLast: randomExit,
          detail: `Salida faltante: asignada ${randomExit}, entrada ajustada a ${newEntry}`,
        };
      }
    }

    // Caso: ambas tienen valores
    const entryMinutes = timeToMinutes(firstCheckIn);
    const exitMinutes = timeToMinutes(lastCheckOut);
    const totalMinutes = exitMinutes - entryMinutes;

    // Verificar si está en rango y en intervalos correctos
    if (totalMinutes >= TARGET_MIN && totalMinutes <= TARGET_MAX && 
        entryMinutes >= ENTRY_MIN && entryMinutes <= ENTRY_MAX && 
        exitMinutes >= EXIT_MIN && exitMinutes <= EXIT_MAX) {

      return {
        correctedFirst: firstCheckIn,
        correctedLast: lastCheckOut,
        detail: `Marcación correcta`,
      };
    }

    // Necesita corrección
    let correctedFirst = firstCheckIn;
    let correctedLast = lastCheckOut;
    let adjustmentDetail = '';

    // Verificar entrada
    if (entryMinutes < ENTRY_MIN || entryMinutes > ENTRY_MAX) {
      correctedFirst = getRandomTime(entryMinH, entryMinM, entryMaxH, entryMaxM);
      adjustmentDetail += `Entrada corregida: ${firstCheckIn} → ${correctedFirst}. `;
    }

    // Verificar salida
    if (exitMinutes < EXIT_MIN || exitMinutes > EXIT_MAX) {
      correctedLast = getRandomTime(exitMinH, exitMinM, exitMaxH, exitMaxM);
      adjustmentDetail += `Salida corregida: ${lastCheckOut} → ${correctedLast}. `;
    }

    // Recalcular total con correcciones
    let correctedEntryMinutes = timeToMinutes(correctedFirst);
    let correctedExitMinutes = timeToMinutes(correctedLast);
    let correctedTotalMinutes = correctedExitMinutes - correctedEntryMinutes;

    // Si aún no está en rango, ajustar la salida con tiempo aleatorio
    if (correctedTotalMinutes < TARGET_MIN || correctedTotalMinutes > TARGET_MAX) {
      const randomTargetMinutes = Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1)) + TARGET_MIN;
      const newExitMinutes = correctedEntryMinutes + randomTargetMinutes;
      // Asegurar que la salida esté en su intervalo
      if (newExitMinutes >= EXIT_MIN && newExitMinutes <= EXIT_MAX) {
        correctedLast = minutesToTime(newExitMinutes);
        adjustmentDetail += `Salida ajustada a ${correctedLast} para cumplir rango.`;
      }
    }

    return {
      correctedFirst,
      correctedLast,
      detail: adjustmentDetail.trim() || 'Sin cambios',
    };
  };

  const generateMarcacionesExcel = () => {
    // Preparar datos para el Excel con correcciones de marcaciones
    const excelData: any[] = [];
    
    allMarcaciones.forEach(marcacion => {
      const originalFirst = marcacion.firstCheckIn || null;
      const originalLast = marcacion.lastCheckOut || null;
      const originalTime = marcacion.totalTime || '00:00';
      
      // Obtener configuración del departamento y cargo
      // Buscar por departmentId primero, luego filtrar por positionId si existe
      let departmentConfig = null;
      
      if (marcacion.departmentId) {
        const deptConfigs = scheduleConfigs.get(marcacion.departmentId);
        if (deptConfigs) {
          // Si hay positionId, buscar configuración específica para ese cargo
          if (marcacion.positionId && Array.isArray(deptConfigs)) {
            departmentConfig = deptConfigs.find((c: any) => c.positionId === marcacion.positionId);
          }
          // Si no hay configuración específica por cargo, usar la del departamento
          if (!departmentConfig) {
            departmentConfig = Array.isArray(deptConfigs) ? deptConfigs[0] : deptConfigs;
          }
        }
      }
      
      // Aplicar corrección con configuración del departamento y cargo
      const correction = correctMarcacion(originalFirst, originalLast, originalTime, departmentConfig, marcacion.cedula);
      
      // Calcular tiempo corregido
      const correctedEntryMinutes = timeToMinutes(correction.correctedFirst);
      const correctedExitMinutes = timeToMinutes(correction.correctedLast);
      const correctedTotalMinutes = correctedExitMinutes - correctedEntryMinutes;
      const correctedHours = Math.floor(correctedTotalMinutes / 60);
      const correctedMins = correctedTotalMinutes % 60;
      const correctedTime = `${String(correctedHours).padStart(2, '0')}:${String(correctedMins).padStart(2, '0')}`;
      
      excelData.push({
        'Id del Empleado': marcacion.cedula,
        'Nombres': marcacion.employeeName,
        'Departamento': marcacion.department,
        'Mes': marcacion.month,
        'Fecha': new Date(marcacion.date).toLocaleDateString('es-ES'),
        'Asistencia Diaria': marcacion.dailyAttendance,
        'Primera Marcación (Original)': originalFirst || '-',
        'Última Marcación (Original)': originalLast || '-',
        'Tiempo Total (Original)': originalTime,
        'Primera Marcación (Corregida)': correction.correctedFirst,
        'Última Marcación (Corregida)': correction.correctedLast,
        'Tiempo Total (Corregido)': correctedTime,
        //'Detalle de Cambios': correction.detail,
      });
    });

    // Ordenar por nombre
    excelData.sort((a, b) => a['Nombres'].localeCompare(b['Nombres']));

    downloadExcel(excelData, `Marcaciones_Corregidas_${selectedPeriod}.xlsx`);
  };

  const generateHorasExtrasExcel = (payrollDataToUse?: any[]) => {
    // Preparar datos para el Excel con correcciones de marcaciones
    const excelData: any[] = [];
    
    // Usar los datos pasados como parámetro o los del estado
    const dataToUse = payrollDataToUse || payrollData;
    
    // Mapa para rastrear las horas extras distribuidas por empleado (se crea nuevo cada vez)
    const employeeOvertimeMap = new Map<string, { remaining: number; distribution: Map<string, number> }>();
        
    // Procesar TODOS los empleados como en generateMarcacionesExcel
    allMarcaciones.forEach(marcacion => {
      const originalFirst = marcacion.firstCheckIn || null;
      const originalLast = marcacion.lastCheckOut || null;
      const originalTime = marcacion.totalTime || '00:00';
      
      // Obtener configuración del departamento y cargo
      let departmentConfig = null;
      if (marcacion.departmentId) {
        const deptConfigs = scheduleConfigs.get(marcacion.departmentId);
        if (deptConfigs) {
          // Si hay positionId, buscar configuración específica para ese cargo
          if (marcacion.positionId && Array.isArray(deptConfigs)) {
            departmentConfig = deptConfigs.find((c: any) => c.positionId === marcacion.positionId);
          }
          // Si no hay configuración específica por cargo, usar la del departamento
          if (!departmentConfig) {
            departmentConfig = Array.isArray(deptConfigs) ? deptConfigs[0] : deptConfigs;
          }
        }
      }
      
      // Aplicar corrección con configuración del departamento y cargo
      const correction = correctMarcacion(originalFirst, originalLast, originalTime, departmentConfig, marcacion.cedula);
      
      // Calcular tiempo corregido
      let correctedEntryMinutes = timeToMinutes(correction.correctedFirst);
      let correctedExitMinutes = timeToMinutes(correction.correctedLast);
      let correctedTotalMinutes = correctedExitMinutes - correctedEntryMinutes;
      
      // Buscar si este empleado tiene horas extras en la nómina
      const payrollRecord = dataToUse.find(p => 
        p.employeeName.toLowerCase() === marcacion.employeeName.toLowerCase()
      );
      
      let finalExitTime = correction.correctedLast;
      let finalCorrectedTime = `${String(Math.floor(correctedTotalMinutes / 60)).padStart(2, '0')}:${String(correctedTotalMinutes % 60).padStart(2, '0')}`;
      let addedOvertimeDisplay = '-';
      // Si el empleado tiene horas extras, distribuirlas aleatoriamente
      if (payrollRecord && payrollRecord.overtimeHours50 > 0) {
        const employeeName = marcacion.employeeName.toLowerCase();
        const overtimeHours = payrollRecord.overtimeHours50;
        const overtimeMinutes = Math.round(overtimeHours * 60);
        if (!employeeOvertimeMap.has(employeeName)) {
          // Obtener todos los registros del empleado
          const employeeMarcaciones = allMarcaciones.filter(m => 
            m.employeeName.toLowerCase() === employeeName
          );
          
          // Distribuir horas extras uniformemente entre los registros
          const distribution = new Map<string, number>();
          const baseMinutesPerRecord = Math.floor(overtimeMinutes / employeeMarcaciones.length);
          let remainingMinutes = overtimeMinutes % employeeMarcaciones.length;
          
          employeeMarcaciones.forEach((m, index) => {
            let addedMinutes = baseMinutesPerRecord;
            // Distribuir los minutos restantes en los últimos registros
            if (index >= employeeMarcaciones.length - remainingMinutes) {
              addedMinutes += 1;
            }
            distribution.set(m.id, addedMinutes);
          });
          
          employeeOvertimeMap.set(employeeName, { remaining: 0, distribution });
        }
        
        // Obtener las horas extras asignadas a este registro
        const overtimeData = employeeOvertimeMap.get(employeeName);
        const addedMinutes = overtimeData?.distribution.get(marcacion.id) || 0;
        
        // Agregar horas extras a la salida
        if (addedMinutes > 0) {
          correctedExitMinutes += addedMinutes;
          correctedTotalMinutes = correctedExitMinutes - correctedEntryMinutes;
        }
        
        // Calcular la salida final con las horas extras
        finalExitTime = correctedExitMinutes >= 24 * 60 
          ? minutesToTime(correctedExitMinutes - 24 * 60) 
          : minutesToTime(correctedExitMinutes);
        
        finalCorrectedTime = `${String(Math.floor(correctedTotalMinutes / 60)).padStart(2, '0')}:${String(correctedTotalMinutes % 60).padStart(2, '0')}`;
        
        // Mostrar horas extras agregadas
        if (addedMinutes > 0) {
          const addedHours = Math.floor(addedMinutes / 60);
          const addedMins = addedMinutes % 60;
          addedOvertimeDisplay = `${String(addedHours).padStart(2, '0')}:${String(addedMins).padStart(2, '0')}`;
        }
      }

      const totalWithoutOvertime = `${String(Math.floor((timeToMinutes(correction.correctedLast) - timeToMinutes(correction.correctedFirst)) / 60)).padStart(2, '0')}:${String((timeToMinutes(correction.correctedLast) - timeToMinutes(correction.correctedFirst)) % 60).padStart(2, '0')}`;
      
      excelData.push({
        'Id del Empleado': marcacion.cedula,
        'Nombres': marcacion.employeeName,
        'Departamento': marcacion.department,
        'Mes': marcacion.month,
        'Fecha': new Date(marcacion.date).toLocaleDateString('es-ES'),
        'Asistencia Diaria': marcacion.dailyAttendance,
        'Primera Marcación (Original)': originalFirst || '-',
        'Última Marcación (Original)': originalLast || '-',
        'Primera Marcación (Corregida)': correction.correctedFirst,
        'Última Marcación (Corregida)': correction.correctedLast,
        'Última Marcación (Horas Extras)': finalExitTime,
        'Horas Extras Agregadas': addedOvertimeDisplay,
        'Tiempo Total (Original)': originalTime,
        'Tiempo Total (Corregido)': finalCorrectedTime,
      });
    });

    // Ordenar por nombre
    excelData.sort((a, b) => a['Nombres'].localeCompare(b['Nombres']));

    downloadExcel(excelData, `Marcaciones_Corregidas(HorasExtras)_${selectedPeriod}.xlsx`);
  };

  const downloadExcel = (data: any[], filename: string) => {
    // Crear CSV desde los datos
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join('\t'),
      ...data.map(row => headers.map(header => row[header]).join('\t'))
    ].join('\n');

    // Crear blob y descargar
    const blob = new Blob([csvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatExcessMinutes = (minutes: number): string => {
    if (minutes <= 59) {
      return `${minutes} minutos excedentes`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')} horas excedentes`;
  };

  const detectInconsistencies = (records: Marcacion[]) => {
    const inconsistencies: Array<{
      types: Array<'no_checkout' | 'excessive_hours' | 'no_entry' | 'missing_hours'>;
      record: Marcacion;
      details: string;
    }> = [];

    records.forEach((record, idx) => {
      const types: Array<'no_checkout' | 'excessive_hours' | 'no_entry' | 'missing_hours'> = [];
      const detailsParts: string[] = [];

      // Obtener configuración del departamento y cargo
      let departmentConfig = null;
      if (record.departmentId) {
        const deptConfigs = scheduleConfigs.get(record.departmentId);
        if (deptConfigs) {
          // Si hay positionId, buscar configuración específica para ese cargo
          if (record.positionId && Array.isArray(deptConfigs)) {
            departmentConfig = deptConfigs.find((c: any) => c.positionId === record.positionId);
          }
          // Si no hay configuración específica por cargo, usar la del departamento
          if (!departmentConfig) {
            departmentConfig = Array.isArray(deptConfigs) ? deptConfigs[0] : deptConfigs;
          }
        }
      }

      // Obtener horas de trabajo configuradas (por defecto 9)
      const workHours = departmentConfig?.workHours ? Number(departmentConfig.workHours) : 9;
      const workMinutes = workHours * 60;
      const toleranceMin = departmentConfig?.totalTimeMin ? Number(departmentConfig.totalTimeMin) : 15;

      // Inconsistencia 1: Sin marcación de salida o sin entrada (cuando entrada y salida son iguales)
      if (record.firstCheckIn && record.lastCheckOut && record.firstCheckIn === record.lastCheckOut) {
        // Determinar si es sin entrada o sin salida basándose en la hora
        const [hours] = record.firstCheckIn.split(':').map(Number);
        
        if (hours >= 12) {
          // Hora después del mediodía = sin entrada
          types.push('no_entry');
          detailsParts.push(`Sin Entrada: Marcación a las ${record.firstCheckIn} (sin registro de entrada)`);
        } else {
          // Hora antes del mediodía = sin salida
          types.push('no_checkout');
          detailsParts.push(`Primera marcación: ${record.firstCheckIn}, Última marcación: ${record.lastCheckOut} (igual a entrada)`);
        }
      }

      // Inconsistencia 2: Más de horas configuradas de trabajo (basado en totalTime si está disponible)
      // Tolerancia: según configuración
      if (record.totalTime && record.totalTime !== '00:00') {
        const parts = record.totalTime.split(':');
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        const totalMinutes = hours * 60 + minutes;

        const excessMinutes = totalMinutes - workMinutes;
        // Solo es inconsistencia si excede horas configuradas + tolerancia
        if (excessMinutes > toleranceMin) {
          if (!types.includes('excessive_hours')) {
            types.push('excessive_hours');
          }
          detailsParts.push(`Tiempo total: ${record.totalTime} (${formatExcessMinutes(excessMinutes)}, configurado: ${workHours}h).`);
        } 
      }

      // Inconsistencia 3: Verificar horas excesivas basándose en entrada/salida (solo si NO es un caso de sin salida)
      // Si entrada === salida, ya fue detectado como "Sin Salida", no calcular horas excesivas
      // Tolerancia: según configuración
      if (record.firstCheckIn && record.lastCheckOut && record.firstCheckIn !== record.lastCheckOut) {
        try {
          const [entryH, entryM] = record.firstCheckIn.split(':').map(Number);
          const [exitH, exitM] = record.lastCheckOut.split(':').map(Number);
          const entryMinutes = entryH * 60 + entryM;
          const exitMinutes = exitH * 60 + exitM;
          let diffMinutes = exitMinutes - entryMinutes;
          
          // Si la salida es del día siguiente
          if (diffMinutes < 0) {
            diffMinutes += 24 * 60;
          }
          
          const excessMinutes = diffMinutes - workMinutes;
          // Solo es inconsistencia si excede horas configuradas + tolerancia
          if (excessMinutes > toleranceMin) {
            if (!types.includes('excessive_hours')) {
              types.push('excessive_hours');
              detailsParts.push(`Tiempo calculado: ${Math.floor(diffMinutes / 60)}:${String(diffMinutes % 60).padStart(2, '0')} (${formatExcessMinutes(excessMinutes)}, configurado: ${workHours}h).`);
            }
          }
          
          // Inconsistencia 4: Verificar horas faltantes
          const missingMinutes = workMinutes - diffMinutes;
          // Solo es inconsistencia si falta más que la tolerancia
          if (missingMinutes > toleranceMin) {
            if (!types.includes('missing_hours')) {
              types.push('missing_hours');
              const missingHours = Math.floor(missingMinutes / 60);
              const missingMins = missingMinutes % 60;
              detailsParts.push(`Horas faltantes: ${String(missingHours).padStart(2, '0')}:${String(missingMins).padStart(2, '0')} (configurado: ${workHours}h).`);
            }
          }
        } catch (e) {
          console.log(`  Error en cálculo:`, e);
        }
      }

      // Solo agregar si tiene al menos una inconsistencia
      if (types.length > 0) {
        inconsistencies.push({
          types,
          record,
          details: detailsParts.join(' | '),
        });
      }
    });
    return inconsistencies;
  };

  const calculateEmployeeSummary = (records: Marcacion[]) => {
    const totalDays = records.length;
    
    // Calcular días con marcación válida (entrada diferente a salida) e inválida (entrada igual a salida)
    let validDays = 0;
    let invalidDays = 0;
    
    records.forEach(r => {
      if (r.firstCheckIn && r.lastCheckOut) {
        if (r.firstCheckIn === r.lastCheckOut) {
          invalidDays++;
        } else {
          validDays++;
        }
      }
    });
    
    const validInvalidDays = `${validDays}/${invalidDays}`;
    
    // Calcular días laborables del período
    const totalDiasLaborables = (() => {
      if (!selectedPeriod) {
        return 0;
      }
      
      // selectedPeriod es startDate en formato ISO (YYYY-MM-DD)
      const period = periods.find(p => p.startDate === selectedPeriod);
      if (!period) {
        return 0;
      }
      
      // Parsear fechas ISO correctamente (YYYY-MM-DD)
      const [startYear, startMonth, startDay] = period.startDate.split('-').map(Number);
      const [endYear, endMonth, endDay] = period.endDate.split('-').map(Number);
      
      const start = new Date(startYear, startMonth - 1, startDay);
      const end = new Date(endYear, endMonth - 1, endDay);
      
      let count = 0;
      // Iterar desde start hasta end (inclusive)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
      }
      
      return count;
    })();
    
    // Calcular total de horas (excluyendo registros con 00:00)
    let totalHours = 0;
    let totalMinutes = 0;
    let daysWithWork = 0;
    
    records.forEach(r => {
      if (r.totalTime && r.totalTime !== '00:00') {
        const parts = r.totalTime.split(':');
        if (parts.length >= 2) {
          const hours = parseInt(parts[0]) || 0;
          const minutes = parseInt(parts[1]) || 0;
          totalHours += hours;
          totalMinutes += minutes;
          daysWithWork++;
        }
      }
    });
    
    // Convertir minutos excedentes a horas
    totalHours += Math.floor(totalMinutes / 60);
    totalMinutes = totalMinutes % 60;
    
    const totalTimeFormatted = `${String(totalHours).padStart(2, '0')}:${String(totalMinutes).padStart(2, '0')}`;
    
    return { totalDays, attendanceDays: daysWithWork, totalHours, totalMinutes, totalTimeFormatted, totalDiasLaborables, validInvalidDays };
  };

  const columns = [
    { title: 'Cédula', data: 'cedula' },
    { title: 'Nombre', data: 'employeeName' },
    { title: 'Departamento', data: 'department' },
    { title: 'Total de Días', data: 'totalDays', render: (data: string) => data || '-' },
    { title: 'Total de Horas', data: 'totalTimeFormatted', render: (data: string) => data || '-' },
  ];

  const childColumns = [
    { title: 'Fecha', data: 'date', render: (data: string) => new Date(data).toLocaleDateString('es-ES') },
    { title: 'Asistencia', data: 'dailyAttendance' },
    { title: 'Primera Marcación', data: 'firstCheckIn', render: (data: string) => data || '-' },
    { title: 'Última Marcación', data: 'lastCheckOut', render: (data: string) => data || '-' },
    { title: 'Tiempo Total', data: 'totalTime', render: (data: string) => data || '-' },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <label style={{ color: theme === 'light' ? '#333' : '#e5e7eb', fontWeight: '500' }}>
          Período:
        </label>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          disabled={!periodsLoaded || periods.length === 0}
          style={{
            padding: '8px 12px',
            border: `1px solid ${theme === 'light' ? '#ddd' : '#4b5563'}`,
            borderRadius: '5px',
            fontSize: '14px',
            background: theme === 'light' ? 'white' : '#374151',
            color: theme === 'light' ? '#333' : '#e5e7eb',
            cursor: periods.length === 0 ? 'not-allowed' : 'pointer',
            minWidth: '300px',
            opacity: periods.length === 0 ? 0.6 : 1,
          }}
        >
          <option value="">Seleccionar período...</option>
          {periods.map((period) => (
            <option key={period.startDate} value={period.startDate}>
              {period.label}
            </option>
          ))}
        </select>
        {!periodsLoaded && (
          <span style={{ color: theme === 'light' ? '#666' : '#9ca3af', fontSize: '14px' }}>
            Cargando períodos...
          </span>
        )}
        {periodsLoaded && periods.length === 0 && (
          <span style={{ color: theme === 'light' ? '#999' : '#9ca3af', fontSize: '14px' }}>
            No hay datos de marcación disponibles
          </span>
        )}
      </div>

      {selectedPeriod && (
        <div style={{
          marginBottom: '20px',
          borderBottom: `2px solid ${theme === 'light' ? '#e5e7eb' : '#374151'}`,
          display: 'flex',
          gap: '0',
        }}>
          <button
            onClick={() => setActiveTab('marcacion')}
            style={{
              padding: '12px 20px',
              background: activeTab === 'marcacion' ? (theme === 'light' ? '#3b82f6' : '#2563eb') : 'transparent',
              color: activeTab === 'marcacion' ? 'white' : (theme === 'light' ? '#666' : '#9ca3af'),
              border: 'none',
              borderBottom: activeTab === 'marcacion' ? `3px solid ${theme === 'light' ? '#2563eb' : '#1d4ed8'}` : 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'marcacion' ? '600' : '500',
              transition: 'all 0.2s ease',
            }}
          >
            📋 Marcación
          </button>
          <button
            onClick={() => setActiveTab('inconsistencias')}
            style={{
              padding: '12px 20px',
              background: activeTab === 'inconsistencias' ? (theme === 'light' ? '#3b82f6' : '#2563eb') : 'transparent',
              color: activeTab === 'inconsistencias' ? 'white' : (theme === 'light' ? '#666' : '#9ca3af'),
              border: 'none',
              borderBottom: activeTab === 'inconsistencias' ? `3px solid ${theme === 'light' ? '#2563eb' : '#1d4ed8'}` : 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'inconsistencias' ? '600' : '500',
              transition: 'all 0.2s ease',
            }}
          >
            ⚠️ Inconsistencias
          </button>
          <button
            onClick={() => {
              setActiveTab('horas_extras');
              loadPayrollByPeriod();
            }}
            style={{
              padding: '12px 20px',
              background: activeTab === 'horas_extras' ? (theme === 'light' ? '#3b82f6' : '#2563eb') : 'transparent',
              color: activeTab === 'horas_extras' ? 'white' : (theme === 'light' ? '#666' : '#9ca3af'),
              border: 'none',
              borderBottom: activeTab === 'horas_extras' ? `3px solid ${theme === 'light' ? '#2563eb' : '#1d4ed8'}` : 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'horas_extras' ? '600' : '500',
              transition: 'all 0.2s ease',
            }}
          >
            ⏱️ Horas Extras
          </button>
          <button
            onClick={() => setActiveTab('generar')}
            style={{
              padding: '12px 20px',
              background: activeTab === 'generar' ? (theme === 'light' ? '#3b82f6' : '#2563eb') : 'transparent',
              color: activeTab === 'generar' ? 'white' : (theme === 'light' ? '#666' : '#9ca3af'),
              border: 'none',
              borderBottom: activeTab === 'generar' ? `3px solid ${theme === 'light' ? '#2563eb' : '#1d4ed8'}` : 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'generar' ? '600' : '500',
              transition: 'all 0.2s ease',
            }}
          >
            📥 Generar
          </button>
        </div>
      )}

      {selectedPeriod && activeTab === 'marcacion' && (
        <div style={{ marginBottom: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ color: theme === 'light' ? '#333' : '#e5e7eb', fontWeight: '500', display: 'block', marginBottom: '5px', fontSize: '14px' }}>
              Filtrar por Cédula:
            </label>
            <input
              type="text"
              placeholder="Buscar cédula..."
              value={filterCedulaMarcacion}
              onChange={(e) => setFilterCedulaMarcacion(e.target.value)}
              style={{
                padding: '8px 12px',
                border: `1px solid ${theme === 'light' ? '#ddd' : '#4b5563'}`,
                borderRadius: '5px',
                fontSize: '14px',
                background: theme === 'light' ? 'white' : '#374151',
                color: theme === 'light' ? '#333' : '#e5e7eb',
                width: '200px',
              }}
            />
          </div>

          <div>
            <label style={{ color: theme === 'light' ? '#333' : '#e5e7eb', fontWeight: '500', display: 'block', marginBottom: '5px', fontSize: '14px' }}>
              Filtrar por Nombre:
            </label>
            <input
              type="text"
              placeholder="Buscar nombre..."
              value={filterNombreMarcacion}
              onChange={(e) => setFilterNombreMarcacion(e.target.value)}
              style={{
                padding: '8px 12px',
                border: `1px solid ${theme === 'light' ? '#ddd' : '#4b5563'}`,
                borderRadius: '5px',
                fontSize: '14px',
                background: theme === 'light' ? 'white' : '#374151',
                color: theme === 'light' ? '#333' : '#e5e7eb',
                width: '200px',
              }}
            />
          </div>

          <div>
            <label style={{ color: theme === 'light' ? '#333' : '#e5e7eb', fontWeight: '500', display: 'block', marginBottom: '5px', fontSize: '14px' }}>
              Filtrar por Departamento:
            </label>
            <select
              value={filterDepartamentoMarcacion}
              onChange={(e) => setFilterDepartamentoMarcacion(e.target.value)}
              style={{
                padding: '8px 12px',
                border: `1px solid ${theme === 'light' ? '#ddd' : '#4b5563'}`,
                borderRadius: '5px',
                fontSize: '14px',
                background: theme === 'light' ? 'white' : '#374151',
                color: theme === 'light' ? '#333' : '#e5e7eb',
                width: '200px',
                cursor: 'pointer',
              }}
            >
              <option value="">Todos los departamentos</option>
              {uniqueDepartamentos.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {(filterCedulaMarcacion || filterNombreMarcacion || filterDepartamentoMarcacion) && (
            <button
              onClick={() => {
                setFilterCedulaMarcacion('');
                setFilterNombreMarcacion('');
                setFilterDepartamentoMarcacion('');
              }}
              style={{
                padding: '8px 16px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              Limpiar Filtros
            </button>
          )}

          <button
            onClick={deleteMarcacionesByPeriod}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#b91c1c')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#dc2626')}
          >
            🗑️ Eliminar Período
          </button>
        </div>
      )}

      {selectedPeriod && activeTab === 'marcacion' && (
        <div style={{
          background: theme === 'light' ? 'white' : '#1f2937',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          border: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`,
        }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: theme === 'light' ? '#999' : '#9ca3af' }}>
              Cargando marcaciones...
            </div>
          ) : filteredMarcaciones.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: theme === 'light' ? '#999' : '#9ca3af' }}>
              No hay registros de marcación para el período seleccionado
            </div>
          ) : (
            <DataTableWithChildRows
              data={filteredMarcaciones}
              columns={columns}
              childColumns={childColumns}
              pageLength={20}
              groupBy="cedula"
              calculateSummary={calculateEmployeeSummary}
            />
          )}
        </div>
      )}

      {selectedPeriod && activeTab === 'marcacion' && !loading && filteredMarcaciones.length > 0 && (
        <div style={{ marginTop: '20px', color: theme === 'light' ? '#666' : '#9ca3af', fontSize: '14px' }}>
          Total de registros: <strong>{filteredMarcaciones.length}</strong>
        </div>
      )}

      {selectedPeriod && activeTab === 'inconsistencias' && (
        <div>
          <div style={{ marginBottom: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={{ color: theme === 'light' ? '#333' : '#e5e7eb', fontWeight: '500', display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                Filtrar por Cédula:
              </label>
              <input
                type="text"
                placeholder="Buscar cédula..."
                value={filterCedulaInconsistencias}
                onChange={(e) => setFilterCedulaInconsistencias(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${theme === 'light' ? '#ddd' : '#4b5563'}`,
                  borderRadius: '5px',
                  fontSize: '14px',
                  background: theme === 'light' ? 'white' : '#374151',
                  color: theme === 'light' ? '#333' : '#e5e7eb',
                  width: '200px',
                }}
              />
            </div>

            <div>
              <label style={{ color: theme === 'light' ? '#333' : '#e5e7eb', fontWeight: '500', display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                Filtrar por Nombre:
              </label>
              <input
                type="text"
                placeholder="Buscar nombre..."
                value={filterNombreInconsistencias}
                onChange={(e) => setFilterNombreInconsistencias(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${theme === 'light' ? '#ddd' : '#4b5563'}`,
                  borderRadius: '5px',
                  fontSize: '14px',
                  background: theme === 'light' ? 'white' : '#374151',
                  color: theme === 'light' ? '#333' : '#e5e7eb',
                  width: '200px',
                }}
              />
            </div>

            <div>
              <label style={{ color: theme === 'light' ? '#333' : '#e5e7eb', fontWeight: '500', display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                Filtrar por Departamento:
              </label>
              <select
                value={filterDepartamentoInconsistencias}
                onChange={(e) => setFilterDepartamentoInconsistencias(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${theme === 'light' ? '#ddd' : '#4b5563'}`,
                  borderRadius: '5px',
                  fontSize: '14px',
                  background: theme === 'light' ? 'white' : '#374151',
                  color: theme === 'light' ? '#333' : '#e5e7eb',
                  width: '200px',
                  cursor: 'pointer',
                }}
              >
                <option value="">Todos los departamentos</option>
                {uniqueDepartamentos.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {(filterCedulaInconsistencias || filterNombreInconsistencias || filterDepartamentoInconsistencias) && (
              <button
                onClick={() => {
                  setFilterCedulaInconsistencias('');
                  setFilterNombreInconsistencias('');
                  setFilterDepartamentoInconsistencias('');
                }}
                style={{
                  padding: '8px 16px',
                  background: theme === 'light' ? '#ef4444' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {loading ? (
            <div style={{
              background: theme === 'light' ? 'white' : '#1f2937',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
              color: theme === 'light' ? '#999' : '#9ca3af',
            }}>
              Cargando inconsistencias...
            </div>
          ) : (() => {
            const inconsistencies = detectInconsistencies(allMarcaciones);
            
            // Preparar datos para DataTable agrupados por tipo de inconsistencia
            const inconsistenciesWithType = inconsistencies.map(issue => {
              const typeLabels = issue.types.map(t => {
                if (t === 'no_checkout') return '🔴 Sin Salida';
                if (t === 'no_entry') return '🟡 Sin Entrada';
                if (t === 'excessive_hours') return '🟠 Horas Excesivas';
                if (t === 'missing_hours') return '🔵 Horas Faltantes';
                return '⚪ Otro';
              }).join(' - ');
              
              return {
                ...issue.record,
                inconsistencyTypeDay: typeLabels,
                inconsistencyType: typeLabels,
                inconsistencyDetails: issue.details,
              };
            });

            // Agrupar por cédula para obtener todos los tipos de inconsistencias por empleado
            const inconsistenciesByCedula = new Map<string, Set<string>>();
            inconsistenciesWithType.forEach(record => {
              if (!inconsistenciesByCedula.has(record.cedula)) {
                inconsistenciesByCedula.set(record.cedula, new Set());
              }
              const types = record.inconsistencyType.split(' - ');
              types.forEach(type => inconsistenciesByCedula.get(record.cedula)!.add(type));
            });

            // Actualizar el inconsistencyType para que muestre todas las inconsistencias del empleado
            const inconsistenciesWithCombinedType = inconsistenciesWithType.map(record => ({
              ...record,
              inconsistencyType: Array.from(inconsistenciesByCedula.get(record.cedula) || new Set()).join(' - '),
            }));

            // Aplicar filtros DESPUÉS de procesar los datos
            const filteredInconsistencies = inconsistenciesWithCombinedType.filter(record => {
              const cedulaMatch = !filterCedulaInconsistencias || record.cedula.toLowerCase().includes(filterCedulaInconsistencias.toLowerCase());
              const nombreMatch = !filterNombreInconsistencias || record.employeeName.toLowerCase().includes(filterNombreInconsistencias.toLowerCase());
              const departamentoMatch = !filterDepartamentoInconsistencias || record.department === filterDepartamentoInconsistencias;
              return cedulaMatch && nombreMatch && departamentoMatch;
            });

            if (filteredInconsistencies.length === 0) {
              return (
                <div style={{
                  background: theme === 'light' ? '#d1fae5' : '#064e3b',
                  borderRadius: '8px',
                  padding: '20px',
                  textAlign: 'center',
                  border: `1px solid ${theme === 'light' ? '#6ee7b7' : '#10b981'}`,
                }}>
                  <div style={{ color: theme === 'light' ? '#065f46' : '#d1fae5', fontSize: '16px', fontWeight: '600' }}>
                    ✓ Sin inconsistencias detectadas
                  </div>
                  <div style={{ color: theme === 'light' ? '#047857' : '#a7f3d0', fontSize: '14px', marginTop: '5px' }}>
                    Todos los registros de marcación están correctos
                  </div>
                </div>
              );
            }

            const inconsistencyColumns = [
              { title: 'Cédula', data: 'cedula' },
              { title: 'Nombre', data: 'employeeName' },
              { title: 'Departamento', data: 'department' },
              { title: 'Tipo', data: 'inconsistencyType' },
            ];

            const inconsistencyChildColumns = [
              { title: 'Fecha', data: 'date', render: (data: string) => new Date(data).toLocaleDateString('es-ES') },
              { title: 'Tipo', data: 'inconsistencyTypeDay' },
              { title: 'Entrada', data: 'firstCheckIn', render: (data: string) => data || '-' },
              { title: 'Salida', data: 'lastCheckOut', render: (data: string) => data || '-' },
              { title: 'Tiempo Total', data: 'totalTime', render: (data: string) => data || '-' },
              { title: 'Detalles', data: 'inconsistencyDetails' },
            ];

            return (
              <div style={{
                background: theme === 'light' ? 'white' : '#1f2937',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                border: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`,
              }}>
                <DataTableWithChildRows
                  data={filteredInconsistencies}
                  columns={inconsistencyColumns}
                  childColumns={inconsistencyChildColumns}
                  pageLength={20}
                  groupBy="cedula"
                  calculateSummary={(records) => {
                    const totalDays = records.length;
                    const diasSinSalida = records.filter(r => r.inconsistencyTypeDay?.includes('Sin Salida')).length;
                    const diasSinEntrada = records.filter(r => r.inconsistencyTypeDay?.includes('Sin Entrada')).length;
                    const diasConExceso = records.filter(r => r.inconsistencyTypeDay?.includes('Horas Excesivas')).length;
                    
                    return {
                      totalDays,
                      diasSinSalida,
                      diasSinEntrada,
                      diasConExceso,
                      attendanceDays: totalDays,
                    };
                  }}
                />
              </div>
            );
          })()}
        </div>
      )}

      {selectedPeriod && activeTab === 'horas_extras' && (
        <div>
          <div style={{ marginBottom: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={{ color: theme === 'light' ? '#333' : '#e5e7eb', fontWeight: '500', display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                Filtrar por Cédula:
              </label>
              <input
                type="text"
                placeholder="Buscar cédula..."
                value={filterCedulaHorasExtras}
                onChange={(e) => setFilterCedulaHorasExtras(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${theme === 'light' ? '#ddd' : '#4b5563'}`,
                  borderRadius: '5px',
                  fontSize: '14px',
                  background: theme === 'light' ? 'white' : '#374151',
                  color: theme === 'light' ? '#333' : '#e5e7eb',
                  width: '200px',
                }}
              />
            </div>

            <div>
              <label style={{ color: theme === 'light' ? '#333' : '#e5e7eb', fontWeight: '500', display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                Filtrar por Nombre:
              </label>
              <input
                type="text"
                placeholder="Buscar nombre..."
                value={filterNombreHorasExtras}
                onChange={(e) => setFilterNombreHorasExtras(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${theme === 'light' ? '#ddd' : '#4b5563'}`,
                  borderRadius: '5px',
                  fontSize: '14px',
                  background: theme === 'light' ? 'white' : '#374151',
                  color: theme === 'light' ? '#333' : '#e5e7eb',
                  width: '200px',
                }}
              />
            </div>

            <div>
              <label style={{ color: theme === 'light' ? '#333' : '#e5e7eb', fontWeight: '500', display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                Filtrar por Departamento:
              </label>
              <select
                value={filterDepartamentoHorasExtras}
                onChange={(e) => setFilterDepartamentoHorasExtras(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${theme === 'light' ? '#ddd' : '#4b5563'}`,
                  borderRadius: '5px',
                  fontSize: '14px',
                  background: theme === 'light' ? 'white' : '#374151',
                  color: theme === 'light' ? '#333' : '#e5e7eb',
                  width: '200px',
                  cursor: 'pointer',
                }}
              >
                <option value="">Todos los departamentos</option>
                {uniqueDepartamentos.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {(filterCedulaHorasExtras || filterNombreHorasExtras || filterDepartamentoHorasExtras) && (
              <button
                onClick={() => {
                  setFilterCedulaHorasExtras('');
                  setFilterNombreHorasExtras('');
                  setFilterDepartamentoHorasExtras('');
                }}
                style={{
                  padding: '8px 16px',
                  background: theme === 'light' ? '#ef4444' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {loadingPayroll ? (
            <div style={{
              background: theme === 'light' ? 'white' : '#1f2937',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
              color: theme === 'light' ? '#999' : '#9ca3af',
            }}>
              Cargando datos de horas extras...
            </div>
          ) : payrollData.length === 0 ? (
            <div style={{
              background: theme === 'light' ? '#fef3c7' : '#78350f',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
              border: `1px solid ${theme === 'light' ? '#fcd34d' : '#b45309'}`,
            }}>
              <div style={{ color: theme === 'light' ? '#92400e' : '#fef3c7', fontSize: '16px', fontWeight: '600' }}>
                ℹ️ Sin horas extras
              </div>
              <div style={{ color: theme === 'light' ? '#78350f' : '#fde68a', fontSize: '14px', marginTop: '5px' }}>
                No hay empleados con horas extras en este período
              </div>
            </div>
          ) : (() => {
            // Aplicar filtros a payrollData
            const filteredPayrollData = payrollData.filter(row => {
              const cedulaMatch = !filterCedulaHorasExtras || row.cedula.toLowerCase().includes(filterCedulaHorasExtras.toLowerCase());
              const nombreMatch = !filterNombreHorasExtras || row.employeeName.toLowerCase().includes(filterNombreHorasExtras.toLowerCase());
              const departamentoMatch = !filterDepartamentoHorasExtras || row.departmentId === filterDepartamentoHorasExtras;
              return cedulaMatch && nombreMatch && departamentoMatch;
            });

            return (
              <DataTableAdvanced
                data={filteredPayrollData}
                columns={[
                  { title: 'Cédula', data: 'cedula' },
                  { title: 'Nombre', data: 'employeeName' },
                  { title: 'Departamento', data: 'departmentId', render: (data: string) => data || '-' },
                  { title: 'Horas Extras (Nómina)', data: 'overtimeHours50', render: (data: number) => `${data.toFixed(2)} hrs` },
                  { title: 'Horas Totales (Marcación)', data: 'marcacionTotalFormatted' },
                  { title: 'Tiempo Excedente (Marcación)', data: 'excessFormatted' },
                  { title: 'Ajuste de Horas', data: 'hoursDifferenceFormatted' },
                ]}
                pageLength={20}
              />
            );
          })()}
        </div>
      )}

      {selectedPeriod && activeTab === 'generar' && (
        <div style={{
          background: theme === 'light' ? 'white' : '#1f2937',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          border: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`,
          padding: '20px',
        }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: theme === 'light' ? '#333' : '#e5e7eb', marginBottom: '15px', fontSize: '16px', fontWeight: '600' }}>
              Selecciona el tipo de reporte a generar:
            </h3>
            
            <div style={{ display: 'flex', gap: '30px', marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: theme === 'light' ? '#333' : '#e5e7eb' }}>
                <input
                  type="radio"
                  name="generarOption"
                  value="marcaciones"
                  checked={generarOption === 'marcaciones'}
                  onChange={(e) => setGenerarOption(e.target.value as 'marcaciones' | 'horas_extras')}
                  style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: '14px', fontWeight: '500' }}>
                  📋 Corregir Marcaciones
                </span>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: theme === 'light' ? '#333' : '#e5e7eb' }}>
                <input
                  type="radio"
                  name="generarOption"
                  value="horas_extras"
                  checked={generarOption === 'horas_extras'}
                  onChange={(e) => setGenerarOption(e.target.value as 'marcaciones' | 'horas_extras')}
                  style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: '14px', fontWeight: '500' }}>
                  ⏱️ Corregir Marcación Horas Extras
                </span>
              </label>
            </div>

            <div style={{
              background: theme === 'light' ? '#f3f4f6' : '#374151',
              padding: '15px',
              borderRadius: '6px',
              marginBottom: '20px',
              borderLeft: `4px solid ${theme === 'light' ? '#3b82f6' : '#2563eb'}`,
            }}>
              <p style={{ color: theme === 'light' ? '#666' : '#d1d5db', fontSize: '13px', margin: '0' }}>
                {generarOption === 'marcaciones' 
                  ? 'Se generará un Excel con todas las marcaciones del período en el formato especificado.'
                  : 'Se generará un Excel con los empleados que tienen horas extras, incluyendo las correcciones calculadas y el ajuste final de horas.'}
              </p>
            </div>

            <button
              onClick={async () => {
                if (generarOption === 'horas_extras' && payrollData.length === 0) {
                  const loadedPayroll = await loadPayrollByPeriod();
                  generateCorrectedExcel(loadedPayroll);
                } else {
                  generateCorrectedExcel();
                }
              }}
              disabled={generatingExcel || (generarOption === 'horas_extras' && loadingPayroll)}
              style={{
                padding: '12px 24px',
                background: generatingExcel || (generarOption === 'horas_extras' && loadingPayroll) ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: generatingExcel || (generarOption === 'horas_extras' && loadingPayroll) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: generatingExcel || (generarOption === 'horas_extras' && loadingPayroll) ? 0.7 : 1,
              }}
            >
              {generatingExcel ? '⏳ Generando...' : '📥 Descargar Excel'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
