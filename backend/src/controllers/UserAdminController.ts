import { Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import UserRepository from '@repositories/UserRepository';
import RoleService from '@services/RoleService';
import EmailService from '@services/EmailService';
import bcrypt from 'bcryptjs';
import logger from '@utils/logger';

function generatePassword(): string {
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower   = 'abcdefghjkmnpqrstuvwxyz';
  const nums    = '23456789';
  const special = '@#$!';
  const all = upper + lower + nums + special;

  // Ensure at least one of each
  let pwd =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    nums[Math.floor(Math.random() * nums.length)] +
    special[Math.floor(Math.random() * special.length)];

  for (let i = 4; i < 10; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }

  return pwd.split('').sort(() => Math.random() - 0.5).join('');
}

class UserAdminController {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const users = await UserRepository.getAllWithRoles();
      const safe = users
        .filter((u) => u.id !== req.userId && u.username !== 'admin')
        .map(({ password: _p, ...u }) => u);
      res.json({ success: true, data: safe });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener usuarios' });
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { nombre, username, email, roleId, employeeId } = req.body;

      if (!nombre || !username || !email) {
        res.status(400).json({ success: false, message: 'Nombre, usuario y email son requeridos' });
        return;
      }

      // Check duplicates
      const existingUsername = await UserRepository.findByUsername(username);
      if (existingUsername) {
        res.status(400).json({ success: false, message: 'El nombre de usuario ya existe' });
        return;
      }
      const existingEmail = await UserRepository.findByEmail(email);
      if (existingEmail) {
        res.status(400).json({ success: false, message: 'El email ya está registrado' });
        return;
      }

      const plainPassword = generatePassword();
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const user = await UserRepository.createAdmin({
        nombre,
        username,
        email,
        password: hashedPassword,
        roleId: roleId || null,
        role: 'user',
        status: 'active',
        employeeId: employeeId || null,
      });

      // Send welcome email
      let emailSent = false;
      if (EmailService.isConfigured()) {
        emailSent = await EmailService.sendWelcome(email, nombre, username, plainPassword);
      }

      logger.info(`Admin created user: ${username}`);
      const { password: _p, ...safeUser } = user as any;
      res.status(201).json({
        success: true,
        data: { ...safeUser, plainPassword, emailSent },
        message: emailSent
          ? 'Usuario creado y credenciales enviadas por email'
          : 'Usuario creado (email no enviado — SMTP no configurado)',
      });
    } catch (error: any) {
      logger.error('Create user error', error);
      const msg = error?.message?.includes('UNIQUE')
        ? (error.message.includes('username') ? 'El nombre de usuario ya existe' : 'El email ya está registrado')
        : (error instanceof Error ? error.message : 'Error al crear usuario');
      res.status(400).json({ success: false, message: msg });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { nombre, email, roleId, status, employeeId } = req.body;

      const updateData: Record<string, unknown> = {};
      if (nombre     !== undefined) updateData.nombre     = nombre;
      if (email      !== undefined) updateData.email      = email;
      if (roleId     !== undefined) updateData.roleId     = roleId || null;
      if (status     !== undefined) updateData.status     = status;
      if (employeeId !== undefined) updateData.employeeId = employeeId || null;

      const user = await UserRepository.update(id, updateData);
      if (!user) {
        res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        return;
      }

      const { password: _p, ...safe } = user as any;
      res.json({ success: true, data: safe });
    } catch (error) {
      res.status(400).json({ success: false, message: 'Error al actualizar usuario' });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (id === req.userId) {
        res.status(400).json({ success: false, message: 'No puedes eliminar tu propia cuenta' });
        return;
      }

      const result = await UserRepository.delete(id);
      if (!result) {
        res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        return;
      }

      res.json({ success: true, message: 'Usuario eliminado' });
    } catch (error) {
      res.status(400).json({ success: false, message: 'Error al eliminar usuario' });
    }
  }

  async resetPassword(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const user = await UserRepository.findById(id);
      if (!user) {
        res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        return;
      }

      const plainPassword = generatePassword();
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      await UserRepository.update(id, { password: hashedPassword });

      let emailSent = false;
      if (user.email && EmailService.isConfigured()) {
        const nombre = (user as any).nombre || user.username;
        emailSent = await EmailService.sendPasswordReset(user.email, nombre, user.username, plainPassword);
      }

      res.json({
        success: true,
        data: { plainPassword, emailSent },
        message: emailSent
          ? 'Contraseña restablecida y enviada por email'
          : 'Contraseña restablecida',
      });
    } catch (error) {
      logger.error(`Reset password error [userId=${id}]`, error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al restablecer contraseña',
      });
    }
  }
}

export default new UserAdminController();
