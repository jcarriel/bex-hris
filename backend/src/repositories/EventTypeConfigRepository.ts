import { getDatabase } from '@config/database';

export interface EventTypeConfig {
  type: string;
  daysNotice: number;
  enabled: boolean;
  updatedAt: string;
}

const DEFAULTS: Omit<EventTypeConfig, 'updatedAt'>[] = [
  { type: 'birthday',        daysNotice: 5,  enabled: true },
  { type: 'contract_expiry', daysNotice: 30, enabled: true },
  { type: 'training',        daysNotice: 7,  enabled: true },
  { type: 'audit',           daysNotice: 7,  enabled: true },
  { type: 'meeting',         daysNotice: 1,  enabled: true },
  { type: 'other',           daysNotice: 3,  enabled: true },
];

export class EventTypeConfigRepository {
  /** Seed defaults if not present */
  async seed(): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();
    for (const d of DEFAULTS) {
      await db.run(
        `INSERT INTO event_type_configs (type, daysNotice, enabled, updatedAt)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (type) DO NOTHING`,
        [d.type, d.daysNotice, d.enabled ? 1 : 0, now],
      );
    }
  }

  async getAll(): Promise<EventTypeConfig[]> {
    const db = getDatabase();
    const rows = await db.all(`SELECT * FROM event_type_configs ORDER BY type`);
    return rows.map(this.parse);
  }

  async getByType(type: string): Promise<EventTypeConfig | null> {
    const db = getDatabase();
    const row = await db.get(`SELECT * FROM event_type_configs WHERE type = ?`, [type]);
    return row ? this.parse(row) : null;
  }

  async update(type: string, daysNotice: number, enabled: boolean): Promise<EventTypeConfig | null> {
    const db = getDatabase();
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO event_type_configs (type, daysNotice, enabled, updatedAt)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(type) DO UPDATE SET daysNotice = excluded.daysNotice, enabled = excluded.enabled, updatedAt = excluded.updatedAt`,
      [type, daysNotice, enabled ? 1 : 0, now],
    );
    return this.getByType(type);
  }

  private parse(row: any): EventTypeConfig {
    return { ...row, enabled: Boolean(row.enabled) };
  }
}

export default new EventTypeConfigRepository();
