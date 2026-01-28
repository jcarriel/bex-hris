import { useState, useMemo } from 'react';
import { useThemeStore } from '../stores/themeStore';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
  width?: string;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  pageSize?: number;
  onRowClick?: (row: any) => void;
  actions?: (row: any) => React.ReactNode;
  onPageChange?: (page: number) => void;
}

export default function DataTable({
  columns,
  data,
  pageSize = 10,
  onRowClick,
  actions,
  onPageChange,
}: DataTableProps) {
  const { theme } = useThemeStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Aplicar filtros
  const filteredData = useMemo(() => {
    return data.filter(row => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const cellValue = String(row[key] || '').toLowerCase();
        return cellValue.includes(value.toLowerCase());
      });
    });
  }, [data, filters]);

  // Aplicar ordenamiento
  const sortedData = useMemo(() => {
    let sorted = [...filteredData];
    if (sortConfig) {
      sorted.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [filteredData, sortConfig]);

  // Paginar
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1);
  };

  return (
    <div style={{
      background: theme === 'light' ? 'white' : '#1f2937',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      overflow: 'hidden',
      border: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`,
    }}>
      {/* Filtros */}
      <div style={{
        padding: '16px',
        borderBottom: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
      }}>
        {columns.filter(col => col.filterable).map(col => (
          <div key={col.key}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              marginBottom: '4px',
              color: theme === 'light' ? '#666' : '#9ca3af',
              fontWeight: '500',
            }}>
              {col.label}
            </label>
            <input
              type="text"
              placeholder={`Filtrar ${col.label.toLowerCase()}...`}
              value={filters[col.key] || ''}
              onChange={(e) => handleFilterChange(col.key, e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
                borderRadius: '4px',
                background: theme === 'light' ? '#f9f9f9' : '#111827',
                color: theme === 'light' ? '#333' : '#ffffff',
                fontSize: '14px',
              }}
            />
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{
              background: theme === 'light' ? '#f5f7fa' : '#374151',
              borderBottom: `2px solid ${theme === 'light' ? '#eee' : '#374151'}`,
            }}>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    color: theme === 'light' ? '#666' : '#9ca3af',
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    width: col.width,
                    fontWeight: '600',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {col.label}
                    {col.sortable && sortConfig?.key === col.key && (
                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
              {actions && <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: theme === 'light' ? '#999' : '#9ca3af',
                  }}
                >
                  {data.length === 0 ? 'No hay datos' : 'No hay resultados que coincidan con los filtros'}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={idx}
                  onClick={() => onRowClick?.(row)}
                  style={{
                    borderBottom: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`,
                    background: theme === 'light' ? 'white' : '#111827',
                    color: theme === 'light' ? '#333' : '#ffffff',
                    cursor: onRowClick ? 'pointer' : 'default',
                    fontSize: '14px',
                  }}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      style={{
                        padding: '12px',
                        color: theme === 'light' ? '#333' : '#ffffff',
                        maxWidth: col.width || '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key] || '-'}
                    </td>
                  ))}
                  {actions && (
                    <td style={{ padding: '12px' }}>
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginador */}
      {totalPages > 1 && (
        <div style={{
          padding: '16px',
          borderTop: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ color: theme === 'light' ? '#666' : '#9ca3af', fontSize: '14px' }}>
            Página {currentPage} de {totalPages} ({sortedData.length} resultados)
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                const newPage = Math.max(1, currentPage - 1);
                setCurrentPage(newPage);
                onPageChange?.(newPage);
              }}
              disabled={currentPage === 1}
              style={{
                padding: '8px 12px',
                background: currentPage === 1 ? '#ddd' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
              }}
            >
              ← Anterior
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, currentPage - 2) + i;
              if (pageNum > totalPages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => {
                    setCurrentPage(pageNum);
                    onPageChange?.(pageNum);
                  }}
                  style={{
                    padding: '8px 12px',
                    background: currentPage === pageNum ? '#667eea' : theme === 'light' ? '#f0f0f0' : '#374151',
                    color: currentPage === pageNum ? 'white' : theme === 'light' ? '#333' : '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: currentPage === pageNum ? 'bold' : 'normal',
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => {
                const newPage = Math.min(totalPages, currentPage + 1);
                setCurrentPage(newPage);
                onPageChange?.(newPage);
              }}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 12px',
                background: currentPage === totalPages ? '#ddd' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '14px',
              }}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
