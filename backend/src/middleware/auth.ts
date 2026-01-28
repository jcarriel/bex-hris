import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '@utils/logger';

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    username: string;
    email: string;
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
      id: string;
      username: string;
      email: string;
    };

    req.userId = decoded.id;
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Authentication error', error);
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

export const optionalAuthMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
        id: string;
        username: string;
        email: string;
      };

      req.userId = decoded.id;
      req.user = decoded;
    }
  } catch (error) {
    logger.debug('Optional auth failed, continuing without authentication');
  }

  next();
};
