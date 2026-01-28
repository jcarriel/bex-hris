import { v4 as uuidv4 } from 'uuid';
import logger from '@utils/logger';

interface Benefit {
  id: string;
  name: string;
  description?: string;
  type: 'health' | 'retirement' | 'insurance' | 'bonus' | 'allowance' | 'other';
  value: number;
  frequency: 'monthly' | 'quarterly' | 'annual';
  applicable: 'all' | 'by-department' | 'by-position';
  createdAt: string;
  updatedAt: string;
}

interface EmployeeBenefit {
  id: string;
  employeeId: string;
  benefitId: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'inactive' | 'expired';
  createdAt: string;
  updatedAt: string;
}

export class BenefitService {
  private benefits: Map<string, Benefit> = new Map();
  private employeeBenefits: Map<string, EmployeeBenefit> = new Map();

  /**
   * Crear un nuevo beneficio
   */
  async createBenefit(data: Omit<Benefit, 'id' | 'createdAt' | 'updatedAt'>): Promise<Benefit> {
    try {
      const benefit: Benefit = {
        id: uuidv4(),
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.benefits.set(benefit.id, benefit);
      logger.info(`Benefit created: ${benefit.name}`);
      return benefit;
    } catch (error) {
      logger.error('Error creating benefit', error);
      throw error;
    }
  }

  /**
   * Obtener un beneficio por ID
   */
  async getBenefit(id: string): Promise<Benefit | null> {
    try {
      return this.benefits.get(id) || null;
    } catch (error) {
      logger.error('Error getting benefit', error);
      throw error;
    }
  }

  /**
   * Obtener todos los beneficios
   */
  async getAllBenefits(): Promise<Benefit[]> {
    try {
      return Array.from(this.benefits.values());
    } catch (error) {
      logger.error('Error getting all benefits', error);
      throw error;
    }
  }

  /**
   * Obtener beneficios por tipo
   */
  async getBenefitsByType(type: string): Promise<Benefit[]> {
    try {
      return Array.from(this.benefits.values()).filter(b => b.type === type);
    } catch (error) {
      logger.error('Error getting benefits by type', error);
      throw error;
    }
  }

  /**
   * Actualizar un beneficio
   */
  async updateBenefit(id: string, data: Partial<Benefit>): Promise<Benefit | null> {
    try {
      const benefit = this.benefits.get(id);
      if (!benefit) {
        throw new Error('Benefit not found');
      }

      const updated: Benefit = {
        ...benefit,
        ...data,
        id: benefit.id,
        createdAt: benefit.createdAt,
        updatedAt: new Date().toISOString(),
      };

      this.benefits.set(id, updated);
      logger.info(`Benefit updated: ${id}`);
      return updated;
    } catch (error) {
      logger.error('Error updating benefit', error);
      throw error;
    }
  }

  /**
   * Eliminar un beneficio
   */
  async deleteBenefit(id: string): Promise<boolean> {
    try {
      const deleted = this.benefits.delete(id);
      if (deleted) {
        logger.info(`Benefit deleted: ${id}`);
      }
      return deleted;
    } catch (error) {
      logger.error('Error deleting benefit', error);
      throw error;
    }
  }

  /**
   * Asignar un beneficio a un empleado
   */
  async assignBenefitToEmployee(
    employeeId: string,
    benefitId: string,
    startDate: string,
    endDate?: string
  ): Promise<EmployeeBenefit> {
    try {
      // Verificar que el beneficio existe
      const benefit = this.benefits.get(benefitId);
      if (!benefit) {
        throw new Error('Benefit not found');
      }

      const employeeBenefit: EmployeeBenefit = {
        id: uuidv4(),
        employeeId,
        benefitId,
        startDate,
        endDate,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.employeeBenefits.set(employeeBenefit.id, employeeBenefit);
      logger.info(`Benefit assigned to employee: ${employeeId}`);
      return employeeBenefit;
    } catch (error) {
      logger.error('Error assigning benefit to employee', error);
      throw error;
    }
  }

  /**
   * Obtener beneficios de un empleado
   */
  async getEmployeeBenefits(employeeId: string): Promise<(EmployeeBenefit & { benefit: Benefit })[]> {
    try {
      const employeeBenefitsList = Array.from(this.employeeBenefits.values()).filter(
        eb => eb.employeeId === employeeId && eb.status === 'active'
      );

      return employeeBenefitsList.map(eb => ({
        ...eb,
        benefit: this.benefits.get(eb.benefitId)!,
      }));
    } catch (error) {
      logger.error('Error getting employee benefits', error);
      throw error;
    }
  }

  /**
   * Calcular beneficios totales de un empleado
   */
  async calculateEmployeeBenefitsTotal(employeeId: string): Promise<{
    monthly: number;
    quarterly: number;
    annual: number;
    total: number;
  }> {
    try {
      const benefits = await this.getEmployeeBenefits(employeeId);

      const totals = {
        monthly: 0,
        quarterly: 0,
        annual: 0,
        total: 0,
      };

      benefits.forEach(eb => {
        const value = eb.benefit.value;
        if (eb.benefit.frequency === 'monthly') {
          totals.monthly += value;
          totals.total += value * 12;
        } else if (eb.benefit.frequency === 'quarterly') {
          totals.quarterly += value;
          totals.total += value * 4;
        } else if (eb.benefit.frequency === 'annual') {
          totals.annual += value;
          totals.total += value;
        }
      });

      return totals;
    } catch (error) {
      logger.error('Error calculating employee benefits total', error);
      throw error;
    }
  }

  /**
   * Remover un beneficio de un empleado
   */
  async removeEmployeeBenefit(employeeBenefitId: string): Promise<boolean> {
    try {
      const employeeBenefit = this.employeeBenefits.get(employeeBenefitId);
      if (!employeeBenefit) {
        throw new Error('Employee benefit not found');
      }

      employeeBenefit.status = 'inactive';
      employeeBenefit.updatedAt = new Date().toISOString();
      this.employeeBenefits.set(employeeBenefitId, employeeBenefit);

      logger.info(`Employee benefit removed: ${employeeBenefitId}`);
      return true;
    } catch (error) {
      logger.error('Error removing employee benefit', error);
      throw error;
    }
  }

  /**
   * Obtener beneficios por departamento
   */
  async getBenefitsByDepartment(departmentId: string): Promise<Benefit[]> {
    try {
      return Array.from(this.benefits.values()).filter(
        b => b.applicable === 'all' || b.applicable === 'by-department'
      );
    } catch (error) {
      logger.error('Error getting benefits by department', error);
      throw error;
    }
  }
}

export default new BenefitService();
