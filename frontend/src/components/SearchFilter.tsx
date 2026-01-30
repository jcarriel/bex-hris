import { useState } from 'react';
import { useThemeStore } from '../stores/themeStore';

interface FilterConfig {
  id: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number' | 'range';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface SearchFilterProps {
  onSearch: (query: string) => void;
  onFilter: (filters: any) => void;
  filters: FilterConfig[];
  placeholder?: string;
}

export default function SearchFilter({
  onSearch,
  onFilter,
  filters,
  placeholder = 'Buscar...',
}: SearchFilterProps) {
  const { theme } = useThemeStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterValues, setFilterValues] = useState<any>({});

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  const handleFilterChange = (filterId: string, value: any) => {
    const newFilters = { ...filterValues, [filterId]: value };
    setFilterValues(newFilters);
    onFilter(newFilters);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterValues({});
    onSearch('');
    onFilter({});
  };

  const activeFilterCount = Object.values(filterValues).filter((v) => v).length;

  return (
    <div style={{
      background: theme === 'light' ? 'white' : '#1f2937',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`,
    }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          style={{
            flex: 1,
            padding: '10px 12px',
            border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
            borderRadius: '5px',
            fontSize: '14px',
            background: theme === 'light' ? 'white' : '#374151',
            color: theme === 'light' ? '#333' : '#e5e7eb',
          }}
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            padding: '10px 20px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px',
            position: 'relative',
          }}
        >
          🔍 Filtros
          {activeFilterCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              background: '#dc3545',
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
            }}>
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button
            onClick={handleClearFilters}
            style={{
              padding: '10px 20px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ✕ Limpiar
          </button>
        )}
      </div>

      {showFilters && (
        <div style={{
          paddingTop: '15px',
          borderTop: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`,
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '15px',
            marginBottom: '15px',
          }}>
            {filters.slice(0, 4).map((filter) => (
              <div key={filter.id}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  color: theme === 'light' ? '#555' : '#d1d5db',
                  fontSize: '12px',
                  fontWeight: '600',
                  letterSpacing: '0.5px',
                }}>
                  {filter.label}
                </label>

                {filter.type === 'text' && (
                  <input
                    type="text"
                    placeholder={filter.placeholder}
                    value={filterValues[filter.id] || ''}
                    onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
                      borderRadius: '5px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      background: theme === 'light' ? 'white' : '#374151',
                      color: theme === 'light' ? '#333' : '#e5e7eb',
                      transition: 'border-color 0.2s',
                    }}
                  />
                )}

                {filter.type === 'select' && (
                  <select
                    value={filterValues[filter.id] || ''}
                    onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
                      borderRadius: '5px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      background: theme === 'light' ? 'white' : '#374151',
                      color: theme === 'light' ? '#333' : '#e5e7eb',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <option value="">Todos</option>
                    {filter.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                {filter.type === 'date' && (
                  <input
                    type="date"
                    value={filterValues[filter.id] || ''}
                    onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
                      borderRadius: '5px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      background: theme === 'light' ? 'white' : '#374151',
                      color: theme === 'light' ? '#333' : '#e5e7eb',
                      transition: 'border-color 0.2s',
                    }}
                  />
                )}

                {filter.type === 'range' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      placeholder="Min"
                      value={filterValues[`${filter.id}_min`] || ''}
                      onChange={(e) => handleFilterChange(`${filter.id}_min`, e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
                        borderRadius: '5px',
                        fontSize: '13px',
                        background: theme === 'light' ? 'white' : '#374151',
                        color: theme === 'light' ? '#333' : '#e5e7eb',
                        transition: 'border-color 0.2s',
                      }}
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filterValues[`${filter.id}_max`] || ''}
                      onChange={(e) => handleFilterChange(`${filter.id}_max`, e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
                        borderRadius: '5px',
                        fontSize: '13px',
                        background: theme === 'light' ? 'white' : '#374151',
                        color: theme === 'light' ? '#333' : '#e5e7eb',
                        transition: 'border-color 0.2s',
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {filters.length > 4 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '15px',
            }}>
              {filters.slice(4).map((filter) => (
                <div key={filter.id}>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    color: theme === 'light' ? '#555' : '#d1d5db',
                    fontSize: '12px',
                    fontWeight: '600',
                    letterSpacing: '0.5px',
                  }}>
                    {filter.label}
                  </label>

                  {filter.type === 'text' && (
                    <input
                      type="text"
                      placeholder={filter.placeholder}
                      value={filterValues[filter.id] || ''}
                      onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
                        borderRadius: '5px',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        background: theme === 'light' ? 'white' : '#374151',
                        color: theme === 'light' ? '#333' : '#e5e7eb',
                        transition: 'border-color 0.2s',
                      }}
                    />
                  )}

                  {filter.type === 'select' && (
                    <select
                      value={filterValues[filter.id] || ''}
                      onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
                        borderRadius: '5px',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        background: theme === 'light' ? 'white' : '#374151',
                        color: theme === 'light' ? '#333' : '#e5e7eb',
                        transition: 'border-color 0.2s',
                      }}
                    >
                      <option value="">Todos</option>
                      {filter.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {filter.type === 'date' && (
                    <input
                      type="date"
                      value={filterValues[filter.id] || ''}
                      onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
                        borderRadius: '5px',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        background: theme === 'light' ? 'white' : '#374151',
                        color: theme === 'light' ? '#333' : '#e5e7eb',
                        transition: 'border-color 0.2s',
                      }}
                    />
                  )}

                  {filter.type === 'range' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="number"
                        placeholder="Min"
                        value={filterValues[`${filter.id}_min`] || ''}
                        onChange={(e) => handleFilterChange(`${filter.id}_min`, e.target.value)}
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
                          borderRadius: '5px',
                          fontSize: '13px',
                          background: theme === 'light' ? 'white' : '#374151',
                          color: theme === 'light' ? '#333' : '#e5e7eb',
                          transition: 'border-color 0.2s',
                        }}
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filterValues[`${filter.id}_max`] || ''}
                        onChange={(e) => handleFilterChange(`${filter.id}_max`, e.target.value)}
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
                          borderRadius: '5px',
                          fontSize: '13px',
                          background: theme === 'light' ? 'white' : '#374151',
                          color: theme === 'light' ? '#333' : '#e5e7eb',
                          transition: 'border-color 0.2s',
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
