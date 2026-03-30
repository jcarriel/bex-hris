import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import RoleService from '@services/RoleService';
import logger from '@utils/logger';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  userRoleId?: string;
  user?: {
    id: string;
    username: string;
    email: string;
    role?: string;
    roleId?: string;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ success: false, message: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
      id: string; username: string; email: string; role?: string; roleId?: string;
    };

    req.userId    = decoded.id;
    req.userRole  = decoded.role;
    req.userRoleId = decoded.roleId;
    req.user      = decoded;
    next();
  } catch (error) {
    logger.error('Authentication error', error);
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.userRole !== 'admin') {
    res.status(403).json({ success: false, message: 'Se requiere rol de administrador' });
    return;
  }
  next();
};

/**
 * Middleware factory that enforces action-level permissions.
 * Admin role bypasses all checks. For other roles, the role's permissions
 * array must include '*' or the specific action string (e.g. 'empleados:crear').
 */
export function requireAction(action: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    // Admin bypasses all action checks
    if (req.userRole === 'admin') { next(); return; }

    // No role assigned → deny
    if (!req.userRoleId) {
      res.status(403).json({ success: false, message: 'No tienes permiso para realizar esta acción' });
      return;
    }

    try {
      const role = await RoleService.findById(req.userRoleId);
      if (!role) {
        res.status(403).json({ success: false, message: 'No tienes permiso para realizar esta acción' });
        return;
      }

      const perms = role.permissions;
      if (perms.includes('*') || perms.includes(action)) {
        next();
      } else {
        res.status(403).json({ success: false, message: 'No tienes permiso para realizar esta acción' });
      }
    } catch (err) {
      logger.error('requireAction error', err);
      res.status(500).json({ success: false, message: 'Error al verificar permisos' });
    }
  };
}

export const optionalAuthMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
        id: string; username: string; email: string; role?: string; roleId?: string;
      };
      req.userId    = decoded.id;
      req.userRole  = decoded.role;
      req.userRoleId = decoded.roleId;
      req.user      = decoded;
    }
  } catch (error) {
    logger.debug('Optional auth failed, continuing without authentication');
  }
  next();
};
