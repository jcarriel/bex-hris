import { Request, Response } from 'express'
import { getDatabase } from '@config/database'

export default class DashboardController {
  static async getStats(req: Request, res: Response) {
    try {
      const db = getDatabase()
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1

      // Total employees (all statuses)
      const totalRow = await db.get(
        `SELECT COUNT(*) as c FROM employees`
      ) as any
      const totalEmployees = totalRow.c

      // Employee status breakdown (for donut chart)
      const statusRows = await db.all(
        `SELECT status, COUNT(*) as count FROM employees GROUP BY status`
      ) as any[]
      const statusBreakdown = { active: 0, inactive: 0 }
      for (const row of statusRows) {
        if (row.status in statusBreakdown) {
          (statusBreakdown as any)[row.status] = row.count
        }
      }

      // Employees hired this month
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
      const newRow = await db.get(
        `SELECT COUNT(*) as c FROM employees WHERE hireDate >= ?`,
        [monthStart]
      ) as any
      const newThisMonth = newRow.c

      // Pending leaves
      const pendingRow = await db.get(
        `SELECT COUNT(*) as c FROM leaves WHERE status = 'pending'`
      ) as any
      const pendingLeaves = pendingRow.c

      // Pending novedades
      const novedadesRow = await db.get(
        `SELECT COUNT(*) as c FROM novedades WHERE status = 'pending'`
      ) as any
      const pendingNovedades = novedadesRow?.c ?? 0

      // Payroll sum for previous month
      const prevDate = new Date(year, month - 2, 1)
      const prevYear = prevDate.getFullYear()
      const prevMonth = prevDate.getMonth() + 1
      const payrollRow = await db.get(
        `SELECT COALESCE(SUM(totalToPay), 0) as total FROM payroll WHERE year = ? AND month = ?`,
        [prevYear, prevMonth]
      ) as any
      const payrollSum = payrollRow.total

      // Expiring contracts — anniversary-based (same logic for count AND list)
      const todayMidnight = new Date(now); todayMidnight.setHours(0, 0, 0, 0);
      const contractCandidates = await db.all(
        `SELECT e.id, e.firstName, e.lastName, e.hireDate, e.contractEndDate,
                c.name as positionName, cc.name as departmentName
         FROM employees e
         LEFT JOIN cargos c ON e.positionId = c.id
         LEFT JOIN centros_costo cc ON e.departmentId = cc.id
         LEFT JOIN catalogs ca ON e.contratoActualId = ca.id AND ca.type = 'contrato_actual'
         WHERE e.hireDate IS NOT NULL
           AND e.status = 'active'
           AND (COALESCE(ca.value, e.contratoActual) IS NULL
                OR COALESCE(ca.value, e.contratoActual) != 'CT- INDEFINIDO JORNADA COMPLETA')`
      ) as any[]

      const withDays = contractCandidates
        .map((row) => {
          // Prefer explicit contractEndDate if set
          if (row.contractEndDate && row.contractEndDate.length >= 10) {
            const endDate = new Date(row.contractEndDate.slice(0, 10) + 'T00:00:00');
            const daysAway = Math.round((endDate.getTime() - todayMidnight.getTime()) / 86400000);
            return { ...row, daysAway };
          }
          // Fall back to hireDate anniversary
          const parts = (row.hireDate as string).split('T')[0].split('-').map(Number);
          const mm = parts[1]; const dd = parts[2];
          const thisYear = todayMidnight.getFullYear();
          let next = new Date(thisYear, mm - 1, dd - 1);
          if (next < todayMidnight) next = new Date(thisYear + 1, mm - 1, dd - 1);
          const daysAway = Math.round((next.getTime() - todayMidnight.getTime()) / 86400000);
          return { ...row, daysAway };
        })
        .filter((row) => row.daysAway >= 0 && row.daysAway <= 30)
        .sort((a, b) => a.daysAway - b.daysAway)
        .slice(0, 10);

      const expiringContracts = withDays.length;
      const expiringContractsList = withDays.map(({ id, firstName, lastName, positionName, departmentName, daysAway, contractEndDate }) => ({
        id, firstName, lastName, positionName, departmentName, daysAway,
        contractEndDate: contractEndDate || null,
      }));

      // Employees by department
      const byDepartment = await db.all(`
        SELECT cc.name, COUNT(e.id) as value
        FROM centros_costo cc
        LEFT JOIN employees e ON e.departmentId = cc.id AND e.status = 'active'
        GROUP BY cc.id, cc.name
        ORDER BY value DESC
        LIMIT 8
      `)

      // Recent employees (last 5)
      const recentEmployees = await db.all(`
        SELECT e.id, e.firstName, e.lastName, e.status,
               c.name as positionName, cc.name as departmentName
        FROM employees e
        LEFT JOIN cargos c ON e.positionId = c.id
        LEFT JOIN centros_costo cc ON e.departmentId = cc.id
        ORDER BY e.createdAt DESC
        LIMIT 5
      `)

      // Recent audit logs
      const recentActivity = await db.all(`
        SELECT al.action, al.entityType, al.createdAt,
               u.nombre as userName
        FROM audit_logs al
        LEFT JOIN users u ON al.userId = u.id
        ORDER BY al.createdAt DESC
        LIMIT 8
      `)

      res.json({
        success: true,
        data: {
          totalEmployees,
          statusBreakdown,
          newThisMonth,
          pendingLeaves,
          pendingNovedades,
          payrollSum,
          expiringContracts,
          expiringContractsList,
          byDepartment,
          recentEmployees,
          recentActivity,
        },
      })
    } catch (err) {
      console.error(err)
      res.status(500).json({ success: false, message: 'Error fetching dashboard stats' })
    }
  }
}
