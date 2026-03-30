import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '@config/database'

export interface Locker {
  id: string
  number: string
  section: string
  status: 'available' | 'occupied' | 'maintenance'
  employeeId?: string | null
  employeeName?: string | null
  employeePosition?: string | null
  assignedDate?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateLockerDto {
  number: string
  section: string
  status?: 'available' | 'occupied' | 'maintenance'
  employeeId?: string | null
  notes?: string | null
}

const WITH_EMPLOYEE = `
  SELECT
    l.*,
    e.firstName || ' ' || e.lastName AS employeeName,
    p.name AS employeePosition
  FROM lockers l
  LEFT JOIN employees e ON l.employeeId = e.id
  LEFT JOIN cargos p ON e.positionId = p.id
`

export const LockerRepository = {
  async getAll(): Promise<Locker[]> {
    const db = getDatabase()
    return db.all(`${WITH_EMPLOYEE} ORDER BY l.section ASC, l.number ASC`)
  },

  async getById(id: string): Promise<Locker | undefined> {
    const db = getDatabase()
    return db.get(`${WITH_EMPLOYEE} WHERE l.id = ?`, [id])
  },

  async findByEmployee(employeeId: string): Promise<Locker | undefined> {
    const db = getDatabase()
    return db.get(`SELECT * FROM lockers WHERE employeeId = ?`, [employeeId])
  },

  async getStats(): Promise<{ total: number; available: number; occupied: number; maintenance: number }> {
    const db = getDatabase()
    const rows = await db.all(`SELECT status, COUNT(*) as count FROM lockers GROUP BY status`)
    const result = { total: 0, available: 0, occupied: 0, maintenance: 0 }
    for (const row of rows as any[]) {
      const key = row.status as keyof typeof result
      if (key in result) result[key] = row.count
      result.total += row.count
    }
    return result
  },

  async getSections(): Promise<string[]> {
    const db = getDatabase()
    const rows = await db.all(`SELECT DISTINCT section FROM lockers ORDER BY section ASC`)
    return (rows as any[]).map((r) => r.section)
  },

  async create(data: CreateLockerDto): Promise<Locker> {
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()
    const status = data.employeeId ? 'occupied' : (data.status ?? 'available')
    await db.run(
      `INSERT INTO lockers (id, number, section, status, employeeId, assignedDate, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.number, data.section, status, data.employeeId ?? null,
       data.employeeId ? now : null, data.notes ?? null, now, now],
    )
    return this.getById(id) as Promise<Locker>
  },

  async update(id: string, data: Partial<CreateLockerDto & { status: string }>): Promise<Locker> {
    const db = getDatabase()
    const now = new Date().toISOString()
    const fields: string[] = []
    const values: any[] = []

    if (data.number  !== undefined) { fields.push('number = ?');  values.push(data.number) }
    if (data.section !== undefined) { fields.push('section = ?'); values.push(data.section) }
    if (data.status  !== undefined) { fields.push('status = ?');  values.push(data.status) }
    if (data.notes   !== undefined) { fields.push('notes = ?');   values.push(data.notes ?? null) }

    if ('employeeId' in data) {
      const newEmpId = data.employeeId ?? null
      fields.push('employeeId = ?');    values.push(newEmpId)
      fields.push('assignedDate = ?'); values.push(newEmpId ? now : null)
      // Auto-set status
      if (!data.status) {
        fields.push('status = ?')
        values.push(newEmpId ? 'occupied' : 'available')
      }
    }

    fields.push('updatedAt = ?'); values.push(now)
    values.push(id)

    await db.run(`UPDATE lockers SET ${fields.join(', ')} WHERE id = ?`, values)
    return this.getById(id) as Promise<Locker>
  },

  async delete(id: string): Promise<void> {
    const db = getDatabase()
    await db.run(`DELETE FROM lockers WHERE id = ?`, [id])
  },
}
