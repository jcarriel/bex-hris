import { useState, useCallback, useEffect } from 'react';

export interface CursorPaginationState {
  data: any[];
  total: number;
  limit: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  nextCursor?: string;
  prevCursor?: string;
}

export interface UseCursorPaginationOptions {
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UseCursorPaginationReturn extends CursorPaginationState {
  loadMore: () => void;
  loadPrevious: () => void;
  reset: () => void;
  setFilters: (filters: any) => void;
}

/**
 * Hook para cursor-based pagination (ideal para infinite scroll)
 */
export const useCursorPagination = (
  fetchFn: (cursor?: string, limit?: number, filters?: any) => Promise<any>,
  options: UseCursorPaginationOptions = {}
): UseCursorPaginationReturn => {
  const limit = options.limit || 20;
  const [state, setState] = useState<CursorPaginationState>({
    data: [],
    total: 0,
    limit,
    hasMore: false,
    isLoading: false,
    error: null,
    nextCursor: undefined,
    prevCursor: undefined,
  });
  const [filters, setFilters] = useState<any>({});

  const fetchData = useCallback(
    async (cursor?: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const result = await fetchFn(cursor, limit, filters);
        setState({
          data: cursor ? [...state.data, ...result.data] : result.data,
          total: result.pagination.total,
          limit: result.pagination.limit,
          hasMore: result.pagination.hasMore,
          nextCursor: result.pagination.nextCursor,
          prevCursor: result.pagination.prevCursor,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Error loading data',
        }));
      }
    },
    [fetchFn, limit, filters, state.data]
  );

  useEffect(() => {
    fetchData();
  }, [filters]);

  const loadMore = useCallback(() => {
    if (state.hasMore && state.nextCursor) {
      fetchData(state.nextCursor);
    }
  }, [state.hasMore, state.nextCursor, fetchData]);

  const loadPrevious = useCallback(() => {
    if (state.prevCursor) {
      fetchData(state.prevCursor);
    }
  }, [state.prevCursor, fetchData]);

  const reset = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    loadMore,
    loadPrevious,
    reset,
    setFilters,
  };
};

export default useCursorPagination;
