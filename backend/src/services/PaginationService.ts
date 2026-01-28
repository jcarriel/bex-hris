import logger from '@utils/logger';

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationFilters {
  [key: string]: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
  filters?: PaginationFilters;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    hasMore: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
  filters?: PaginationFilters;
}

export class PaginationService {
  /**
   * Validar y normalizar opciones de paginación
   */
  static validatePaginationOptions(options: PaginationOptions): PaginationOptions {
    const limit = Math.min(Math.max(options.limit || 10, 1), 100); // Min 1, Max 100
    const offset = Math.max(options.offset || 0, 0);
    const sortOrder = options.sortOrder === 'desc' ? 'desc' : 'asc';

    return {
      limit,
      offset,
      cursor: options.cursor,
      sortBy: options.sortBy || 'createdAt',
      sortOrder,
    };
  }

  /**
   * Crear respuesta paginada con offset
   */
  static createPaginatedResponse<T>(
    data: T[],
    total: number,
    options: PaginationOptions,
    filters?: PaginationFilters
  ): PaginatedResponse<T> {
    const limit = options.limit || 10;
    const offset = options.offset || 0;
    const hasMore = offset + data.length < total;

    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore,
      },
      filters,
    };
  }

  /**
   * Crear respuesta paginada con cursor
   */
  static createCursorPaginatedResponse<T extends { id: string }>(
    data: T[],
    total: number,
    limit: number,
    filters?: PaginationFilters
  ): CursorPaginatedResponse<T> {
    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;

    const nextCursor = hasMore && items.length > 0 ? this.encodeCursor(items[items.length - 1].id) : undefined;
    const prevCursor = items.length > 0 ? this.encodeCursor(items[0].id) : undefined;

    return {
      data: items,
      pagination: {
        total,
        limit,
        hasMore,
        nextCursor,
        prevCursor,
      },
      filters,
    };
  }

  /**
   * Codificar cursor (base64)
   */
  static encodeCursor(id: string): string {
    return Buffer.from(id).toString('base64');
  }

  /**
   * Decodificar cursor (base64)
   */
  static decodeCursor(cursor: string): string {
    try {
      return Buffer.from(cursor, 'base64').toString('utf-8');
    } catch (error) {
      logger.warn('Invalid cursor format', { cursor });
      return '';
    }
  }

  /**
   * Construir cláusula WHERE para filtros
   */
  static buildWhereClause(filters: PaginationFilters): { clause: string; values: any[] } {
    const conditions: string[] = [];
    const values: any[] = [];

    Object.entries(filters).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }

      // Soportar diferentes tipos de filtros
      if (typeof value === 'object' && value.operator) {
        // Filtros avanzados: { operator: 'like', value: 'text' }
        switch (value.operator) {
          case 'like':
            conditions.push(`${key} LIKE ?`);
            values.push(`%${value.value}%`);
            break;
          case 'eq':
            conditions.push(`${key} = ?`);
            values.push(value.value);
            break;
          case 'ne':
            conditions.push(`${key} != ?`);
            values.push(value.value);
            break;
          case 'gt':
            conditions.push(`${key} > ?`);
            values.push(value.value);
            break;
          case 'gte':
            conditions.push(`${key} >= ?`);
            values.push(value.value);
            break;
          case 'lt':
            conditions.push(`${key} < ?`);
            values.push(value.value);
            break;
          case 'lte':
            conditions.push(`${key} <= ?`);
            values.push(value.value);
            break;
          case 'in':
            if (Array.isArray(value.value)) {
              const placeholders = value.value.map(() => '?').join(',');
              conditions.push(`${key} IN (${placeholders})`);
              values.push(...value.value);
            }
            break;
          case 'between':
            conditions.push(`${key} BETWEEN ? AND ?`);
            values.push(value.value.min, value.value.max);
            break;
        }
      } else if (typeof value === 'string') {
        // Filtro simple: búsqueda por texto
        conditions.push(`${key} LIKE ?`);
        values.push(`%${value}%`);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        // Filtro simple: igualdad
        conditions.push(`${key} = ?`);
        values.push(value);
      }
    });

    const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { clause, values };
  }

  /**
   * Construir cláusula ORDER BY
   */
  static buildOrderClause(sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'asc'): string {
    // Validar para evitar SQL injection
    const validColumns = ['id', 'createdAt', 'updatedAt', 'name', 'email', 'status', 'salary', 'date'];
    const column = validColumns.includes(sortBy) ? sortBy : 'createdAt';
    const order = sortOrder === 'desc' ? 'DESC' : 'ASC';

    return `ORDER BY ${column} ${order}`;
  }

  /**
   * Construir cláusula LIMIT
   */
  static buildLimitClause(limit: number, offset: number): string {
    return `LIMIT ${limit} OFFSET ${offset}`;
  }

  /**
   * Construir cláusula LIMIT para cursor pagination
   */
  static buildCursorLimitClause(limit: number): string {
    return `LIMIT ${limit + 1}`; // +1 para detectar si hay más
  }
}

export default PaginationService;
