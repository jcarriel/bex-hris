import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import UserRepository from '@repositories/UserRepository';
import RoleService from '@services/RoleService';
import logger from '@utils/logger';

export class AuthService {
  async register(username: string, email: string, password: string): Promise<{ id: string; username: string; email: string }> {
    try {
      // Check if user already exists
      const existingUser = await UserRepository.findByUsername(username);
      if (existingUser) {
        throw new Error('Username already exists');
      }

      const existingEmail = await UserRepository.findByEmail(email);
      if (existingEmail) {
        throw new Error('Email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await UserRepository.create(username, hashedPassword, email);

      logger.info(`User registered: ${username}`);
      return {
        id: user.id,
        username: user.username,
        email: user.email,
      };
    } catch (error) {
      logger.error('Registration error', error);
      throw error;
    }
  }

  async login(username: string, password: string): Promise<{
    token: string;
    user: { id: string; username: string; nombre: string; email: string; role: string; roleId?: string; permissions: string[] };
  }> {
    try {
      const user = await UserRepository.findByUsername(username);

      if (!user) throw new Error('Invalid credentials');

      // Block inactive users
      if ((user as any).status === 'inactive') throw new Error('Cuenta desactivada. Contacta al administrador.');

      let isPasswordValid = false;
      try {
        isPasswordValid = await bcrypt.compare(password, user.password);
      } catch (e) {
        isPasswordValid = password === user.password;
      }

      if (!isPasswordValid) throw new Error('Invalid credentials');

      if (password === user.password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await UserRepository.update(user.id, { password: hashedPassword });
        logger.info(`Password upgraded to bcrypt for user: ${username}`);
      }

      // Resolve permissions
      const userRole = (user as any).role || 'user';
      const userRoleId = (user as any).roleId;
      let permissions: string[];

      if (userRole === 'admin') {
        permissions = ['*'];
      } else if (userRoleId) {
        const roleData = await RoleService.findById(userRoleId);
        permissions = roleData ? roleData.permissions : ['dashboard'];
      } else {
        permissions = ['dashboard'];
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email, role: userRole, roleId: userRoleId },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: (process.env.JWT_EXPIRATION || '7d') as string | number } as any
      );

      logger.info(`User logged in: ${username}`);

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          nombre: (user as any).nombre || user.username,
          email: user.email,
          role: userRole,
          roleId: userRoleId,
          permissions,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Login error for user ${username}: ${errorMessage}`);
      throw error;
    }
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    try {
      const user = await UserRepository.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Try to compare with bcrypt first, then fallback to plain text comparison for legacy passwords
      let isPasswordValid = false;
      try {
        isPasswordValid = await bcrypt.compare(oldPassword, user.password);
      } catch (e) {
        // If bcrypt fails, it might be a plain text password, compare directly
        isPasswordValid = oldPassword === user.password;
      }

      if (!isPasswordValid) {
        throw new Error('Invalid current password');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await UserRepository.update(userId, { password: hashedPassword });

      logger.info(`Password changed for user: ${user.username}`);
    } catch (error) {
      logger.error('Change password error', error);
      throw error;
    }
  }

  async resetPassword(username: string, newPassword: string): Promise<void> {
    try {
      const user = await UserRepository.findByUsername(username);

      if (!user) {
        throw new Error('User not found');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await UserRepository.update(user.id, { password: hashedPassword });

      logger.info(`Password reset for user: ${username}`);
    } catch (error) {
      logger.error('Reset password error', error);
      throw error;
    }
  }
}

export default new AuthService();
