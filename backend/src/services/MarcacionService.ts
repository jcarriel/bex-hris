import MarcacionRepository from '@repositories/MarcacionRepository';
import logger from '@utils/logger';
import type { Marcacion } from '../types';

export class MarcacionService {
  async getMarcacion(id: string): Promise<Marcacion | null> {
    try {
      return await MarcacionRepository.findById(id);
    } catch (error) {
      logger.error('Error getting marcacion', error);
      throw error;
    }
  }

  async getMarcacionByCedulaAndDate(cedula: string, date: string): Promise<Marcacion | null> {
    try {
      return await MarcacionRepository.findByCedulaAndDate(cedula, date);
    } catch (error) {
      logger.error('Error getting marcacion by cedula and date', error);
      throw error;
    }
  }

  async getMarcacionByCedula(cedula: string): Promise<Marcacion[]> {
    try {
      return await MarcacionRepository.findByCedula(cedula);
    } catch (error) {
      logger.error('Error getting marcacion by cedula', error);
      throw error;
    }
  }

  async getMarcacionByMonth(month: number): Promise<Marcacion[]> {
    try {
      return await MarcacionRepository.findByMonth(month);
    } catch (error) {
      logger.error('Error getting marcacion by month', error);
      throw error;
    }
  }

  async getMarcacionByCedulaAndMonth(cedula: string, month: number): Promise<Marcacion[]> {
    try {
      return await MarcacionRepository.findByCedulaAndMonth(cedula, month);
    } catch (error) {
      logger.error('Error getting marcacion by cedula and month', error);
      throw error;
    }
  }

  async getAllMarcacion(): Promise<Marcacion[]> {
    try {
      return await MarcacionRepository.findAll();
    } catch (error) {
      logger.error('Error getting all marcacion', error);
      throw error;
    }
  }

  async createMarcacion(data: Omit<Marcacion, 'id' | 'createdAt' | 'updatedAt'>): Promise<Marcacion> {
    try {
      // Validar datos requeridos
      if (!data.cedula || !data.employeeName || !data.date) {
        throw new Error('Missing required fields: cedula, employeeName, date');
      }

      return await MarcacionRepository.create(data);
    } catch (error) {
      logger.error('Error creating marcacion', error);
      throw error;
    }
  }

  async updateMarcacion(id: string, data: Partial<Marcacion>): Promise<Marcacion | null> {
    try {
      return await MarcacionRepository.update(id, data);
    } catch (error) {
      logger.error('Error updating marcacion', error);
      throw error;
    }
  }

  async deleteMarcacion(id: string): Promise<boolean> {
    try {
      return await MarcacionRepository.delete(id);
    } catch (error) {
      logger.error('Error deleting marcacion', error);
      throw error;
    }
  }

  async deleteMarcacionByMonth(month: number): Promise<boolean> {
    try {
      return await MarcacionRepository.deleteByMonth(month);
    } catch (error) {
      logger.error('Error deleting marcacion by month', error);
      throw error;
    }
  }

  async getAvailablePeriods(): Promise<Array<{ label: string; startDate: string; endDate: string; month: number }>> {
    try {
      const marcaciones = await MarcacionRepository.findAll();
      
      logger.info(`Found ${marcaciones.length} marcaciones for periods`);
      
      if (!marcaciones || marcaciones.length === 0) {
        logger.warn('No marcaciones found in database');
        return [];
      }

      // Obtener todas las fechas únicas y válidas
      const validDates = marcaciones
        .filter(m => m.date)
        .map(m => {
          const date = new Date(m.date);
          return isNaN(date.getTime()) ? null : date;
        })
        .filter((d): d is Date => d !== null)
        .sort((a, b) => a.getTime() - b.getTime());

      if (validDates.length === 0) {
        logger.warn('No valid dates found in marcaciones');
        return [];
      }

      const minDate = validDates[0];
      const maxDate = validDates[validDates.length - 1];

      logger.info(`Date range: ${minDate.toISOString()} to ${maxDate.toISOString()}`);

      const periods: Array<{ label: string; startDate: string; endDate: string; month: number }> = [];
      
      // Determinar el mes y año del primer período basado en minDate
      let year = minDate.getFullYear();
      let month = minDate.getMonth();
      
      // Si minDate es antes del 24, el período comienza en el mes anterior
      if (minDate.getDate() < 24) {
        month = month - 1;
        if (month < 0) {
          month = 11;
          year = year - 1;
        }
      }

      // Generar períodos del 24 de un mes al 23 del siguiente
      while (true) {
        // Período: del 24 del mes actual al 23 del siguiente mes
        const startDate = new Date(year, month, 24);
        const endDate = new Date(year, month + 1, 23);

        // Si el período comienza después de maxDate, detener
        if (startDate > maxDate) {
          break;
        }

        // Formatear fechas
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // Nombre del período
        const monthNames = [
          'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        const nextMonth = (month + 1) % 12;
        const nextYear = month === 11 ? year + 1 : year;
        const label = `${monthNames[month]} 24 - ${monthNames[nextMonth]} 23, ${nextYear}`;

        periods.push({
          label,
          startDate: startDateStr,
          endDate: endDateStr,
          month: nextMonth + 1,
        });

        // Avanzar al siguiente mes
        month = month + 1;
        if (month > 11) {
          month = 0;
          year = year + 1;
        }
      }

      logger.info(`Generated ${periods.length} periods`);
      return periods;
    } catch (error) {
      logger.error('Error getting available periods', error);
      throw error;
    }
  }

  async getMarcacionByPeriod(startDate: string, endDate: string): Promise<Marcacion[]> {
    try {
      const marcaciones = await MarcacionRepository.findAll();
      
      const start = new Date(startDate);
      const end = new Date(endDate);

      const filtered = marcaciones.filter(m => {
        const marcacionDate = new Date(m.date);
        return marcacionDate >= start && marcacionDate <= end;
      });

      return filtered;
    } catch (error) {
      logger.error('Error getting marcacion by period', error);
      throw error;
    }
  }
}

export default new MarcacionService();
