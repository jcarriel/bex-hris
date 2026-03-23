import { Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import RoleService, { SYSTEM_MODULES } from '@services/RoleService';

class RoleController {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const roles = await RoleService.getAll();
      res.json({ success: true, data: roles });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener roles' });
    }
  }

  async getModules(_req: AuthRequest, res: Response): Promise<void> {
    res.json({ success: true, data: SYSTEM_MODULES });
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, description, permissions } = req.body;
      if (!name) {
        res.status(400).json({ success: false, message: 'El nombre es requerido' });
        return;
      }
      const role = await RoleService.create(name, description || '', permissions || []);
      res.status(201).json({ success: true, data: role });
    } catch (error: any) {
      const msg = error?.message?.includes('UNIQUE') ? 'Ya existe un rol con ese nombre' : 'Error al crear rol';
      res.status(400).json({ success: false, message: msg });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const role = await RoleService.update(id, req.body);
      if (!role) {
        res.status(404).json({ success: false, message: 'Rol no encontrado' });
        return;
      }
      res.json({ success: true, data: role });
    } catch (error) {
      res.status(400).json({ success: false, message: 'Error al actualizar rol' });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await RoleService.delete(req.params.id);
      if (!result.success) {
        res.status(400).json({ success: false, message: result.reason });
        return;
      }
      res.json({ success: true, message: 'Rol eliminado' });
    } catch (error) {
      res.status(400).json({ success: false, message: 'Error al eliminar rol' });
    }
  }
}

export default new RoleController();
