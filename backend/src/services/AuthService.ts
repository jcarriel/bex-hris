import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import UserRepository from '@repositories/UserRepository';
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

  async login(username: string, password: string): Promise<{ token: string; user: { id: string; username: string; email: string } }> {
    try {
      const user = await UserRepository.findByUsername(username);

      if (!user) {
        throw new Error('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        process.env.JWT_SECRET || 'secret',
        {
          expiresIn: process.env.JWT_EXPIRATION || '7d',
        }
      );

      logger.info(`User logged in: ${username}`);

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      };
    } catch (error) {
      logger.error('Login error', error);
      throw error;
    }
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    try {
      const user = await UserRepository.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

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
}

export default new AuthService();
