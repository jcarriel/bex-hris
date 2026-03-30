import { getDatabase } from '@config/database';
import { v4 as uuidv4 } from 'uuid';

export const SYSTEM_MODULES = [
  { id: 'dashboard',     label: 'Dashboard' },
  { id: 'empleados',     label: 'Empleados',
    actions: ['empleados:ver','empleados:crear','empleados:editar','empleados:eliminar','empleados:ver_todos'] },
  { id: 'nomina',        label: 'Nómina',
    actions: ['nomina:eliminar','nomina:ver_todos'] },
  { id: 'asistencia',    label: 'Asistencia y Horarios',
    actions: ['asistencia:eliminar','asistencia:ver_todos'] },
  { id: 'eventos',       label: 'Eventos y Calendario',
    actions: ['eventos:ver_todos'] },
  { id: 'tareas',        label: 'Tareas',
    actions: ['tareas:crear','tareas:eliminar','tareas:ver_todos'] },
  { id: 'reclutamiento', label: 'Reclutamiento' },
  { id: 'fuerza-laboral', label: 'Fuerza Laboral',
    actions: ['fuerza-laboral:crear','fuerza-laboral:editar','fuerza-laboral:eliminar'] },
  { id: 'bienestar',     label: 'Bienestar',
    actions: ['bienestar:crear','bienestar:editar','bienestar:eliminar','bienestar:aprobar','bienestar:ver_todos'] },
  { id: 'casilleros',    label: 'Casilleros',
    actions: ['casilleros:crear','casilleros:editar','casilleros:eliminar','casilleros:ver_todos'] },
  { id: 'mayordomos',    label: 'Mayordomos',
    actions: ['mayordomos:crear','mayordomos:eliminar'] },
  { id: 'carga-masiva',  label: 'Carga Masiva',
    actions: ['carga-masiva:crear'] },
  { id: 'tablas',        label: 'Maestros',
    actions: ['tablas:crear','tablas:editar','tablas:eliminar'] },
  { id: 'configuracion', label: 'Configuración' },
];

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: number;
  createdAt: string;
  updatedAt: string;
}

function parseRole(row: any): Role {
  return { ...row, permissions: JSON.parse(row.permissions || '[]') };
}

class RoleService {
  async getAll(): Promise<Role[]> {
    const db = getDatabase();
    const rows = await db.all('SELECT * FROM roles ORDER BY isSystem DESC, name ASC');
    return rows.map(parseRole);
  }

  async findById(id: string): Promise<Role | null> {
    const db = getDatabase();
    const row = await db.get('SELECT * FROM roles WHERE id = ?', [id]);
    return row ? parseRole(row) : null;
  }

  async create(name: string, description: string, permissions: string[]): Promise<Role> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO roles (id, name, description, permissions, isSystem, createdAt, updatedAt) VALUES (?, ?, ?, ?, 0, ?, ?)`,
      [id, name, description || null, JSON.stringify(permissions), now, now]
    );
    return this.findById(id) as Promise<Role>;
  }

  async update(id: string, data: { name?: string; description?: string; permissions?: string[] }): Promise<Role | null> {
    const db = getDatabase();
    const role = await this.findById(id);
    if (!role) return null;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name       !== undefined) { updates.push('name = ?');        values.push(data.name); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
    if (data.permissions !== undefined) { updates.push('permissions = ?'); values.push(JSON.stringify(data.permissions)); }

    if (updates.length === 0) return role;

    updates.push('updatedAt = ?');
    values.push(new Date().toISOString(), id);

    await db.run(`UPDATE roles SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  async delete(id: string): Promise<{ success: boolean; reason?: string }> {
    const db = getDatabase();
    const role = await this.findById(id);
    if (!role) return { success: false, reason: 'Role not found' };
    if (role.isSystem) return { success: false, reason: 'Cannot delete system roles' };

    // Check if any user has this role
    const usersWithRole = await db.get('SELECT COUNT(*) as count FROM users WHERE roleId = ?', [id]);
    if (usersWithRole?.count > 0) return { success: false, reason: 'Hay usuarios asignados a este rol' };

    await db.run('DELETE FROM roles WHERE id = ?', [id]);
    return { success: true };
  }

  resolvePermissions(userRole: string, roleData: Role | null): string[] {
    if (userRole === 'admin') return ['*'];
    if (roleData) return roleData.permissions;
    return ['dashboard'];
  }
}

export default new RoleService();
