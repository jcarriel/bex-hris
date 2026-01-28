import React, { useState } from 'react';
import { useThemeStore } from '../stores/themeStore';
import Button from './Button';
import Input from './Input';

export interface FilterField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number' | 'range';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface AdvancedFiltersProps {
  fields: FilterField[];
  onApply: (filters: Record<string, any>) => void;
  onReset: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  fields,
  onApply,
  onReset,
  isOpen = true,
  onClose,
}) => {
  const { theme } = useThemeStore();
  const [filters, setFilters] = useState<Record<string, any>>({});

  const handleChange = (fieldName: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleApply = () => {
    onApply(filters);
    onClose?.();
  };

  const handleReset = () => {
    setFilters({});
    onReset();
    onClose?.();
  };

  if (!isOpen) return null;

  const bgColor = theme === 'light' ? 'bg-white' : 'bg-gray-800';
  const borderColor = theme === 'light' ? 'border-gray-200' : 'border-gray-700';
  const textColor = theme === 'light' ? 'text-gray-900' : 'text-white';

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-6 mb-6`}>
      <h3 className={`text-lg font-semibold mb-4 ${textColor}`}>Filtros Avanzados</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {fields.map((field) => (
          <div key={field.name}>
            {field.type === 'text' && (
              <Input
                label={field.label}
                type="text"
                placeholder={field.placeholder}
                value={filters[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
              />
            )}

            {field.type === 'number' && (
              <Input
                label={field.label}
                type="number"
                placeholder={field.placeholder}
                value={filters[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
              />
            )}

            {field.type === 'date' && (
              <Input
                label={field.label}
                type="date"
                value={filters[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
              />
            )}

            {field.type === 'range' && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                  {field.label}
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters[`${field.name}_min`] || ''}
                    onChange={(e) => handleChange(`${field.name}_min`, e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters[`${field.name}_max`] || ''}
                    onChange={(e) => handleChange(`${field.name}_max`, e.target.value)}
                  />
                </div>
              </div>
            )}

            {field.type === 'select' && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                  {field.label}
                </label>
                <select
                  value={filters[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg transition-colors duration-200 ${
                    theme === 'light'
                      ? 'bg-white border-gray-300 text-gray-900'
                      : 'bg-gray-700 border-gray-600 text-white'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="">Seleccionar...</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={handleReset}>
          Limpiar Filtros
        </Button>
        <Button variant="primary" onClick={handleApply}>
          Aplicar Filtros
        </Button>
      </div>
    </div>
  );
};

export default AdvancedFilters;
