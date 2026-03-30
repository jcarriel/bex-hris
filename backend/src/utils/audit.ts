import { getDatabase } from '@config/database'
import { randomUUID } from 'crypto'

export async function logAudit(
  userId: string | undefined,
  action: string,
  entityType: string,
  entityId: string,
  changes?: Record<string, unknown>,
): Promise<void> {
  try {
    const db = getDatabase()
    await db.run(
      `INSERT INTO audit_logs (id, userId, action, entityType, entityId, changes, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        userId || null,
        action,
        entityType,
        entityId,
        changes ? JSON.stringify(changes) : null,
        new Date().toISOString(),
      ],
    )
  } catch {
    // Audit log failure must never break the main operation
  }
}
