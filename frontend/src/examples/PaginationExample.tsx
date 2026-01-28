import React, { useState } from 'react';
import { usePagination, useCursorPagination } from '../hooks';
import { AdvancedFilters, InfiniteScroll, Table, Button } from '../components';

/**
 * EJEMPLO 1: Paginación Offset-Based (Tradicional)
 */
export const OffsetPaginationExample = () => {
  const fetchEmployees = async (offset: number, limit: number, filters?: any) => {
    const params = new URLSearchParams({
      offset: offset.toString(),
      limit: limit.toString(),
      ...(filters && Object.entries(filters).reduce((acc, [key, value]) => {
        if (value) acc[key] = value;
        return acc;
      }, {} as Record<string, any>)),
    });

    const response = await fetch(`/api/employees?${params}`);
    return response.json();
  };

  const {
    data,
    total,
    currentPage,
    limit,
    isLoading,
    error,
    nextPage,
    prevPage,
    goToPage,
    setFilters,
  } = usePagination(fetchEmployees, { limit: 10 });

  const filterFields = [
    { name: 'firstName', label: 'Nombre', type: 'text' as const },
    { name: 'status', label: 'Estado', type: 'select' as const, options: [
      { value: 'active', label: 'Activo' },
      { value: 'inactive', label: 'Inactivo' },
    ]},
    { name: 'departmentId', label: 'Departamento', type: 'select' as const, options: [] },
  ];

  const columns = [
    { key: 'firstName', label: 'Nombre' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Estado' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Paginación Offset-Based</h2>

      <AdvancedFilters
        fields={filterFields}
        onApply={setFilters}
        onReset={() => setFilters({})}
      />

      {error && <div className="text-red-600">{error}</div>}

      <Table columns={columns} data={data} loading={isLoading} />

      <div className="flex justify-between items-center">
        <div>
          Página {currentPage} de {Math.ceil(total / limit)} ({total} resultados)
        </div>
        <div className="flex gap-2">
          <Button onClick={prevPage} disabled={currentPage === 1}>
            Anterior
          </Button>
          <Button onClick={nextPage} disabled={currentPage >= Math.ceil(total / limit)}>
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * EJEMPLO 2: Cursor-Based Pagination (Infinite Scroll)
 */
export const CursorPaginationExample = () => {
  const fetchEmployees = async (cursor?: string, limit?: number, filters?: any) => {
    const params = new URLSearchParams({
      limit: (limit || 20).toString(),
      ...(cursor && { cursor }),
      ...(filters && Object.entries(filters).reduce((acc, [key, value]) => {
        if (value) acc[key] = value;
        return acc;
      }, {} as Record<string, any>)),
    });

    const response = await fetch(`/api/employees/cursor?${params}`);
    return response.json();
  };

  const {
    data,
    total,
    isLoading,
    hasMore,
    error,
    loadMore,
    setFilters,
  } = useCursorPagination(fetchEmployees, { limit: 20 });

  const filterFields = [
    { name: 'firstName', label: 'Nombre', type: 'text' as const },
    { name: 'status', label: 'Estado', type: 'select' as const, options: [
      { value: 'active', label: 'Activo' },
      { value: 'inactive', label: 'Inactivo' },
    ]},
  ];

  const columns = [
    { key: 'firstName', label: 'Nombre' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Estado' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Cursor-Based Pagination (Infinite Scroll)</h2>

      <AdvancedFilters
        fields={filterFields}
        onApply={setFilters}
        onReset={() => setFilters({})}
      />

      {error && <div className="text-red-600">{error}</div>}

      <InfiniteScroll
        onLoadMore={loadMore}
        isLoading={isLoading}
        hasMore={hasMore}
        loadingComponent={<div>Cargando más empleados...</div>}
        endComponent={<div>Se cargaron todos los {total} empleados</div>}
      >
        <Table columns={columns} data={data} loading={false} />
      </InfiniteScroll>
    </div>
  );
};

/**
 * EJEMPLO 3: Filtros Avanzados
 */
export const AdvancedFiltersExample = () => {
  const [filters, setFilters] = useState<any>({});

  const filterFields = [
    { name: 'firstName', label: 'Nombre', type: 'text' as const, placeholder: 'Buscar por nombre' },
    { name: 'status', label: 'Estado', type: 'select' as const, options: [
      { value: 'active', label: 'Activo' },
      { value: 'inactive', label: 'Inactivo' },
      { value: 'terminated', label: 'Terminado' },
    ]},
    { name: 'salary', label: 'Salario', type: 'range' as const },
    { name: 'hireDate', label: 'Fecha de Contratación', type: 'date' as const },
  ];

  const handleApplyFilters = (appliedFilters: any) => {
    console.log('Filtros aplicados:', appliedFilters);
    setFilters(appliedFilters);
  };

  const handleResetFilters = () => {
    console.log('Filtros reseteados');
    setFilters({});
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Filtros Avanzados</h2>

      <AdvancedFilters
        fields={filterFields}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />

      <div className="bg-gray-100 p-4 rounded">
        <h3 className="font-bold mb-2">Filtros Activos:</h3>
        <pre>{JSON.stringify(filters, null, 2)}</pre>
      </div>
    </div>
  );
};

export default OffsetPaginationExample;
