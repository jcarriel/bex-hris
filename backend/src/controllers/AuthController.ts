import { Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import AuthService from '@services/AuthService';
import logger from '@utils/logger';

export class AuthController {
  async register(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { username, email, password, confirmPassword } = req.body;

      // Validation
      if (!username || !email || !password) {
        res.status(400).json({
          success: false,
          message: 'Username, email, and password are required',
        });
        return;
      }

      if (password !== confirmPassword) {
        res.status(400).json({
          success: false,
          message: 'Passwords do not match',
        });
        return;
      }

      const user = await AuthService.register(username, email, password);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: user,
      });
    } catch (error) {
      logger.error('Register error', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed',
      });
    }
  }

  async login(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({
          success: false,
          message: 'Username and password are required',
        });
        return;
      }

      const result = await AuthService.login(username, password);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      logger.error('Login error', error);
      res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : 'Login failed',
      });
    }
  }

  async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { oldPassword, newPassword, confirmPassword } = req.body;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      if (!oldPassword || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Old password and new password are required',
        });
        return;
      }

      if (newPassword !== confirmPassword) {
        res.status(400).json({
          success: false,
          message: 'New passwords do not match',
        });
        return;
      }

      await AuthService.changePassword(userId, oldPassword, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      logger.error('Change password error', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Password change failed',
      });
    }
  }
}

export default new AuthController();
