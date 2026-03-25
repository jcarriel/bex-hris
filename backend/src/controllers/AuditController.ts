import { Request, Response } from 'express'
import { getDatabase } from '@config/database'

export default class AuditController {
  static async getAll(req: Request, res: Response) {
    try {
      const db = getDatabase()
      const limit = parseInt(req.query.limit as string) || 100
      const offset = parseInt(req.query.offset as string) || 0
      const employeeId = req.query.employeeId as string | undefined

      let logs: any[]
      let total: number

      if (employeeId) {
        logs = await db.all(
          `SELECT al.*, u.nombre as userName
           FROM audit_logs al
           LEFT JOIN users u ON al.userId = u.id
           WHERE al.entityId = ? AND al.entityType = 'employee'
           ORDER BY al.createdAt DESC
           LIMIT ? OFFSET ?`,
          [employeeId, limit, offset]
        )
        const row = await db.get(
          `SELECT COUNT(*) as c FROM audit_logs WHERE entityId = ? AND entityType = 'employee'`,
          [employeeId]
        ) as any
        total = row.c
      } else {
        logs = await db.all(
          `SELECT al.*, u.nombre as userName
           FROM audit_logs al
           LEFT JOIN users u ON al.userId = u.id
           ORDER BY al.createdAt DESC
           LIMIT ? OFFSET ?`,
          [limit, offset]
        )
        const row = await db.get(`SELECT COUNT(*) as c FROM audit_logs`) as any
        total = row.c
      }

      res.json({ success: true, data: logs, total })
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error fetching audit logs' })
    }
  }
}
