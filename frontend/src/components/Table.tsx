import React from 'react';
import { useThemeStore } from '../stores/themeStore';

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  striped?: boolean;
  hoverable?: boolean;
}

function Table<T extends { id: string }>({
  columns,
  data,
  loading = false,
  onRowClick,
  striped = true,
  hoverable = true,
}: TableProps<T>) {
  const { theme } = useThemeStore();

  const bgColor = theme === 'light' ? 'bg-white' : 'bg-gray-800';
  const headerBg = theme === 'light' ? 'bg-gray-100' : 'bg-gray-700';
  const borderColor = theme === 'light' ? 'border-gray-200' : 'border-gray-700';
  const textColor = theme === 'light' ? 'text-gray-900' : 'text-white';
  const stripedBg = theme === 'light' ? 'bg-gray-50' : 'bg-gray-750';
  const hoverBg = theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-gray-700';

  if (loading) {
    return (
      <div className={`${bgColor} rounded-lg p-8 text-center`}>
        <div className="inline-block animate-spin">
          <svg className="h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`${bgColor} rounded-lg p-8 text-center ${textColor}`}>
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto rounded-lg border ${borderColor}`}>
      <table className={`w-full ${bgColor}`}>
        <thead>
          <tr className={`${headerBg} border-b ${borderColor}`}>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={`px-6 py-3 text-left text-sm font-semibold ${textColor}`}
                style={{ width: column.width }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={row.id}
              className={`border-b ${borderColor} ${
                striped && index % 2 === 1 ? stripedBg : ''
              } ${hoverable && onRowClick ? `${hoverBg} cursor-pointer` : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <td key={String(column.key)} className={`px-6 py-4 text-sm ${textColor}`}>
                  {column.render ? column.render(row[column.key], row) : String(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
