import { useState, useCallback, useEffect } from 'react';

export interface PaginationState {
  data: any[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface UsePaginationOptions {
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UsePaginationReturn extends PaginationState {
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  reset: () => void;
  setFilters: (filters: any) => void;
  currentPage: number;
}

/**
 * Hook para paginación offset-based
 */
export const usePagination = (
  fetchFn: (offset: number, limit: number, filters?: any) => Promise<any>,
  options: UsePaginationOptions = {}
): UsePaginationReturn => {
  const limit = options.limit || 10;
  const [state, setState] = useState<PaginationState>({
    data: [],
    total: 0,
    limit,
    offset: 0,
    hasMore: false,
    isLoading: false,
    error: null,
  });
  const [filters, setFilters] = useState<any>({});

  const fetchData = useCallback(
    async (offset: number) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const result = await fetchFn(offset, limit, filters);
        setState({
          data: result.data,
          total: result.pagination.total,
          limit: result.pagination.limit,
          offset: result.pagination.offset,
          hasMore: result.pagination.hasMore,
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
    [fetchFn, limit, filters]
  );

  useEffect(() => {
    fetchData(0);
  }, [filters, fetchData]);

  const nextPage = useCallback(() => {
    if (state.hasMore) {
      fetchData(state.offset + limit);
    }
  }, [state.offset, state.hasMore, limit, fetchData]);

  const prevPage = useCallback(() => {
    if (state.offset > 0) {
      fetchData(Math.max(0, state.offset - limit));
    }
  }, [state.offset, limit, fetchData]);

  const goToPage = useCallback(
    (page: number) => {
      const offset = Math.max(0, (page - 1) * limit);
      fetchData(offset);
    },
    [limit, fetchData]
  );

  const reset = useCallback(() => {
    fetchData(0);
  }, [fetchData]);

  const currentPage = Math.floor(state.offset / limit) + 1;

  return {
    ...state,
    nextPage,
    prevPage,
    goToPage,
    reset,
    setFilters,
    currentPage,
  };
};

export default usePagination;
