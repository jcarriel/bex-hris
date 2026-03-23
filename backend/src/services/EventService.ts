import EventRepository, { Event } from '@repositories/EventRepository';
import { getDatabase } from '@config/database';
import logger from '@utils/logger';

export interface AutoEvent {
  id: string;
  type: 'birthday' | 'contract_expiry';
  title: string;
  description: string;
  eventDate: string;
  employeeId: string;
  employeeName: string;
  daysAway: number;
  daysNotice: number;
}

export interface UnifiedEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  eventDate: string;
  employeeId?: string;
  employeeName?: string;
  daysAway: number;
  daysNotice: number;
  isAuto: boolean;
  createdBy?: string;
  createdAt?: string;
}

class EventService {
  // ── helpers ─────────────────────────────────────────────────────

  private todayStr(): string {
    return new Date().toISOString().split('T')[0];
  }

  private daysUntil(dateStr: string): number {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86400000);
  }

  // Next occurrence of a birthday (MM-DD) relative to today
  private nextBirthdayDate(dateOfBirth: string): string {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dob = new Date(dateOfBirth);
    const mm = String(dob.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dob.getUTCDate()).padStart(2, '0');
    const thisYear = today.getFullYear();
    let candidate = new Date(`${thisYear}-${mm}-${dd}`);
    if (candidate < today) candidate = new Date(`${thisYear + 1}-${mm}-${dd}`);
    return candidate.toISOString().split('T')[0];
  }

  // ── auto events ──────────────────────────────────────────────────

  async getUpcomingBirthdays(daysAhead: number): Promise<AutoEvent[]> {
    const db = getDatabase();
    const employees = await db.all(
      `SELECT id, firstName, lastName, dateOfBirth
       FROM employees WHERE dateOfBirth IS NOT NULL AND status = 'active'`
    );
    const results: AutoEvent[] = [];
    for (const emp of employees) {
      const nextBd = this.nextBirthdayDate(emp.dateOfBirth);
      const daysAway = this.daysUntil(nextBd);
      if (daysAway >= 0 && daysAway <= daysAhead) {
        const name = `${emp.firstName} ${emp.lastName}`;
        results.push({
          id: `bd-${emp.id}`,
          type: 'birthday',
          title: `Cumpleaños — ${name}`,
          description: `${name} cumple años el ${new Date(nextBd).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`,
          eventDate: nextBd,
          employeeId: emp.id,
          employeeName: name,
          daysAway,
          daysNotice: 7,
        });
      }
    }
    return results.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  }

  async getUpcomingContractExpiries(daysAhead: number): Promise<AutoEvent[]> {
    const db = getDatabase();
    const today = this.todayStr();
    const future = new Date(Date.now() + daysAhead * 86400000).toISOString().split('T')[0];
    const employees = await db.all(
      `SELECT id, firstName, lastName, contractEndDate
       FROM employees
       WHERE contractEndDate IS NOT NULL AND contractEndDate BETWEEN ? AND ? AND status = 'active'
       ORDER BY contractEndDate ASC`,
      [today, future]
    );
    return employees.map((emp: any) => {
      const name = `${emp.firstName} ${emp.lastName}`;
      return {
        id: `ce-${emp.id}`,
        type: 'contract_expiry' as const,
        title: `Contrato por vencer — ${name}`,
        description: `El contrato de ${name} vence el ${new Date(emp.contractEndDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        eventDate: emp.contractEndDate,
        employeeId: emp.id,
        employeeName: name,
        daysAway: this.daysUntil(emp.contractEndDate),
        daysNotice: 30,
      };
    });
  }

  // ── unified upcoming ─────────────────────────────────────────────

  async getUpcoming(daysAhead = 30): Promise<UnifiedEvent[]> {
    const [manualEvents, birthdays, contracts] = await Promise.all([
      EventRepository.getUpcomingManual(daysAhead),
      this.getUpcomingBirthdays(daysAhead),
      this.getUpcomingContractExpiries(daysAhead),
    ]);

    const manual: UnifiedEvent[] = manualEvents.map((e) => ({
      id: e.id,
      type: e.type,
      title: e.title,
      description: e.description,
      eventDate: e.eventDate,
      employeeId: e.employeeId,
      employeeName: e.employeeName,
      daysAway: this.daysUntil(e.eventDate),
      daysNotice: e.daysNotice,
      isAuto: false,
      createdBy: e.createdBy,
      createdAt: e.createdAt,
    }));

    const auto: UnifiedEvent[] = [...birthdays, ...contracts].map((e) => ({
      ...e,
      isAuto: true,
    }));

    return [...manual, ...auto].sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  }

  async getAll(filters?: { type?: string; startDate?: string; endDate?: string }): Promise<Event[]> {
    return EventRepository.getAll(filters);
  }

  async create(data: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> {
    return EventRepository.create(data);
  }

  async update(id: string, data: Partial<Event>): Promise<Event | null> {
    return EventRepository.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    return EventRepository.delete(id);
  }
}

export default new EventService();
