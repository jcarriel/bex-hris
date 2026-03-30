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
    // Parse as LOCAL date (not UTC) — "YYYY-MM-DD" parsed via new Date() assumes UTC midnight,
    // which shifts the date in negative-offset timezones (e.g. UTC-5 → day-1)
    const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
    const target = new Date(y, m - 1, d)
    return Math.round((target.getTime() - today.getTime()) / 86400000);
  }

  // Next occurrence of a MM-DD date relative to today (used for birthdays & contract anniversaries)
  // Uses local date construction to avoid UTC timezone offset issues
  private nextAnniversaryDate(dateStr: string): string {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const parts = dateStr.split('T')[0].split('-').map(Number);
    const mm = parts[1]; // 1-12
    const dd = parts[2];
    const thisYear = today.getFullYear();
    let candidate = new Date(thisYear, mm - 1, dd);
    if (candidate < today) candidate = new Date(thisYear + 1, mm - 1, dd);
    // Return as YYYY-MM-DD using local date parts
    const y = candidate.getFullYear();
    const mo = String(candidate.getMonth() + 1).padStart(2, '0');
    const dy = String(candidate.getDate()).padStart(2, '0');
    return `${y}-${mo}-${dy}`;
  }

  private nextBirthdayDate(dateOfBirth: string): string {
    return this.nextAnniversaryDate(dateOfBirth);
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
          description: `${name} cumple años el ${(() => { const [y,m,d] = nextBd.split('-').map(Number); return new Date(y, m-1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) })()}`,
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
    const employees = await db.all(
      `SELECT e.id, e.firstName, e.lastName, e.hireDate,
              COALESCE(ca.value, e.contratoActual) AS contratoActual
       FROM employees e
       LEFT JOIN catalogs ca ON e.contratoActualId = ca.id AND ca.type = 'contrato_actual'
       WHERE e.hireDate IS NOT NULL
       AND e.status = 'active'
       AND (COALESCE(ca.value, e.contratoActual) IS NULL OR COALESCE(ca.value, e.contratoActual) != 'CT- INDEFINIDO JORNADA COMPLETA')`
    );
    const results: AutoEvent[] = [];
    for (const emp of employees) {
      const nextExpiry = this.nextAnniversaryDate(emp.hireDate);
      const daysAway = this.daysUntil(nextExpiry);
      if (daysAway >= 0 && daysAway <= daysAhead) {
        const name = `${emp.firstName} ${emp.lastName}`;
        results.push({
          id: `ce-${emp.id}`,
          type: 'contract_expiry' as const,
          title: `Contrato por vencer — ${name}`,
          description: `El contrato de ${name} vence el ${(() => { const [y,m,d] = nextExpiry.split('-').map(Number); return new Date(y, m-1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) })()}`,
          eventDate: nextExpiry,
          employeeId: emp.id,
          employeeName: name,
          daysAway,
          daysNotice: 30,
        });
      }
    }
    return results.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
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
