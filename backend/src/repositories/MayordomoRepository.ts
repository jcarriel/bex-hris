import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '@config/database'

export interface Mayordomo {
  id: string
  employeeId: string
  employeeName?: string
  employeePosition?: string
  notes?: string | null
  assignedEmployees: AssignedEmployee[]
  createdAt: string
  updatedAt: string
}

export interface AssignedEmployee {
  id: string
  firstName: string
  lastName: string
  positionName?: string
  mayordomoId: string
}

const MAYORDOMO_BASE = `
  SELECT
    m.*,
    e.firstName || ' ' || e.lastName AS employeeName,
    p.name AS employeePosition
  FROM mayordomos m
  LEFT JOIN employees e ON m.employeeId = e.id
  LEFT JOIN cargos p ON e.positionId = p.id
`

export const MayordomoRepository = {
  async getAll(): Promise<Mayordomo[]> {
    const db = getDatabase()
    const rows: any[] = await db.all(`${MAYORDOMO_BASE} ORDER BY employeeName ASC`)
    return Promise.all(rows.map((r) => this._withAssigned(r)))
  },

  async getById(id: string): Promise<Mayordomo | undefined> {
    const db = getDatabase()
    const row: any = await db.get(`${MAYORDOMO_BASE} WHERE m.id = ?`, [id])
    if (!row) return undefined
    return this._withAssigned(row)
  },

  async _withAssigned(row: any): Promise<Mayordomo> {
    const db = getDatabase()
    const assigned: AssignedEmployee[] = await db.all(
      `SELECT e.id, e.firstName, e.lastName, e.mayordomoId, p.name AS positionName
       FROM employees e
       LEFT JOIN cargos p ON e.positionId = p.id
       WHERE e.mayordomoId = ? AND e.status != 'inactive'
       ORDER BY e.firstName, e.lastName`,
      [row.id]
    )
    return { ...row, assignedEmployees: assigned }
  },

  async create(employeeId: string, notes?: string): Promise<Mayordomo> {
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()
    await db.run(
      `INSERT INTO mayordomos (id, employeeId, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`,
      [id, employeeId, notes ?? null, now, now]
    )
    return this.getById(id) as Promise<Mayordomo>
  },

  async update(id: string, data: { notes?: string | null }): Promise<Mayordomo> {
    const db = getDatabase()
    const now = new Date().toISOString()
    await db.run(
      `UPDATE mayordomos SET notes = ?, updatedAt = ? WHERE id = ?`,
      [data.notes ?? null, now, id]
    )
    return this.getById(id) as Promise<Mayordomo>
  },

  async delete(id: string): Promise<void> {
    const db = getDatabase()
    // Release all assigned employees
    await db.run(`UPDATE employees SET mayordomoId = NULL WHERE mayordomoId = ?`, [id])
    await db.run(`DELETE FROM mayordomos WHERE id = ?`, [id])
  },

  async assignEmployee(mayordomoId: string, employeeId: string): Promise<void> {
    const db = getDatabase()
    const now = new Date().toISOString()
    await db.run(
      `UPDATE employees SET mayordomoId = ?, updatedAt = ? WHERE id = ?`,
      [mayordomoId, now, employeeId]
    )
  },

  async removeEmployee(employeeId: string): Promise<void> {
    const db = getDatabase()
    const now = new Date().toISOString()
    await db.run(
      `UPDATE employees SET mayordomoId = NULL, updatedAt = ? WHERE id = ?`,
      [now, employeeId]
    )
  },
}
