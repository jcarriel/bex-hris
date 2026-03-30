import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore, hasAction } from '@/store/authStore'
import { mayordomosService } from '@/services/mayordomos.service'

/**
 * Returns scoping context for a given module.
 *
 * Rules:
 * - Admin or has '<module>:ver_todos' → no restriction (null scopedIds).
 * - User has an employeeId AND that employee IS a mayordomo → restrict to assigned employees.
 * - User has an employeeId AND that employee is NOT a mayordomo → empty set (sees nobody).
 * - User has no employeeId (system user) → no restriction.
 *
 * While the mayordomos query is still loading, an empty set is returned to avoid
 * flashing the full list before the restriction is known.
 */
export function useMayordomoScope(moduleId: string) {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.rol === 'admin'
  const canViewAll = isAdmin || hasAction(user?.permissions, `${moduleId}:ver_todos`, user?.rol)

  // Scoping only applies when: not admin, no ver_todos, and user is linked to an employee
  const needsCheck = !isAdmin && !canViewAll && !!user?.employeeId

  const { data: mayordomosData, isSuccess: mayordomosLoaded } = useQuery({
    queryKey: ['mayordomos'],
    queryFn: mayordomosService.getAll,
    enabled: needsCheck,
    staleTime: 60_000,
  })

  const scopedIds = useMemo<Set<string> | null>(() => {
    // Admin or ver_todos → unrestricted
    if (!needsCheck) return null

    // Still loading → return empty set to avoid showing all employees during the fetch
    if (!mayordomosLoaded) return new Set<string>()

    const mayordomos = mayordomosData ?? []
    const myMayordomo = mayordomos.find((m) => m.employeeId === user?.employeeId)

    if (!myMayordomo) {
      // Linked employee exists but is NOT a mayordomo → sees no one
      return new Set<string>()
    }

    // Mayordomo → sees only their assigned employees
    return new Set(myMayordomo.assignedEmployees.map((e) => e.id))
  }, [mayordomosData, mayordomosLoaded, needsCheck, user?.employeeId])

  return {
    /** True when the user can see all employees (admin or has ver_todos) */
    canViewAll,
    /** The set of employee IDs this user may see, or null if unrestricted */
    scopedIds,
    /** True when the list must be filtered to a subset */
    isScoped: needsCheck, // true from the start when restriction applies (no flash)
    /** Filter an array of objects that have an `id` field to those in scope */
    filterEmployees: <T extends { id: string }>(employees: T[]): T[] => {
      if (scopedIds === null) return employees
      return employees.filter((e) => scopedIds.has(e.id))
    },
    /** Filter records that reference an employeeId (leaves, nomina rows, etc.) */
    filterByEmployeeId: <T extends { employeeId: string }>(records: T[]): T[] => {
      if (scopedIds === null) return records
      return records.filter((r) => scopedIds.has(r.employeeId))
    },
  }
}
