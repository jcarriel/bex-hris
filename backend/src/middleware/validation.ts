import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import logger from '@utils/logger';

export interface ValidationRequest extends Request {
  validatedData?: any;
}

/**
 * Middleware factory para validar datos contra un esquema Zod
 * @param schema - Esquema Zod para validar
 * @param source - Fuente de datos a validar ('body', 'query', 'params')
 */
export const validateRequest = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return async (req: ValidationRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dataToValidate = req[source];
      const validatedData = await schema.parseAsync(dataToValidate);
      
      // Guardar datos validados en la request
      req.validatedData = validatedData;
      
      // Reemplazar los datos originales con los validados
      if (source === 'body') {
        req.body = validatedData;
      } else if (source === 'query') {
        req.query = validatedData as any;
      } else if (source === 'params') {
        req.params = validatedData as any;
      }
      
      next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        const formattedErrors = error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        logger.warn(`Validation error on ${source}`, { errors: formattedErrors });

        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: formattedErrors,
        });
        return;
      }

      logger.error('Unexpected validation error', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during validation',
      });
    }
  };
};

/**
 * Middleware para validar múltiples fuentes (body, query, params)
 */
export const validateMultiple = (schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return async (req: ValidationRequest, res: Response, next: NextFunction): Promise<void> => {
    const errors: any[] = [];

    try {
      // Validar body
      if (schemas.body) {
        const validatedBody = await schemas.body.parseAsync(req.body);
        req.body = validatedBody;
      }

      // Validar query
      if (schemas.query) {
        const validatedQuery = await schemas.query.parseAsync(req.query);
        req.query = validatedQuery as any;
      }

      // Validar params
      if (schemas.params) {
        const validatedParams = await schemas.params.parseAsync(req.params);
        req.params = validatedParams as any;
      }

      next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        const formattedErrors = error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        logger.warn('Validation error on multiple sources', { errors: formattedErrors });

        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: formattedErrors,
        });
        return;
      }

      logger.error('Unexpected validation error', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during validation',
      });
    }
  };
};

/**
 * Middleware para manejo de errores centralizado
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Errores de validación Zod
  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((e: any) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: formattedErrors,
    });
    return;
  }

  // Errores conocidos
  if (err.message.includes('not found')) {
    res.status(404).json({
      success: false,
      message: err.message || 'Resource not found',
    });
    return;
  }

  if (err.message.includes('already exists')) {
    res.status(409).json({
      success: false,
      message: err.message || 'Resource already exists',
    });
    return;
  }

  if (err.message.includes('Unauthorized')) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized access',
    });
    return;
  }

  if (err.message.includes('Forbidden')) {
    res.status(403).json({
      success: false,
      message: 'Access forbidden',
    });
    return;
  }

  // Error genérico
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message }),
  });
};
